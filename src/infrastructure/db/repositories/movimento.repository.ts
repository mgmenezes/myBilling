import { and, asc, eq, gte, isNull, sql } from "drizzle-orm";
import type {
  MovimentoRepository,
  OcorrenciaParaMaterializar,
} from "@/application/ports/repositories";
import type { Cents, Competencia, Lancamento } from "@/domain";
import type { BancoDeDados } from "../client";
import { movimento } from "../schema";
import { deCompetencia, paraLancamento } from "./mapeadores";

/**
 * Leitura e marcação de pagamento sobre o razão (AD-003). A consulta por
 * competência filtra os cancelados no próprio SQL: um lançamento cancelado
 * que chegasse à camada de aplicação já seria um total errado esperando
 * acontecer.
 */
export class MovimentoRepositoryDrizzle implements MovimentoRepository {
  constructor(private readonly db: BancoDeDados) {}

  async listarPorCompetencia(competencia: Competencia): Promise<ReadonlyArray<Lancamento>> {
    const linhas = await this.db
      .select()
      .from(movimento)
      .where(
        and(eq(movimento.competencia, deCompetencia(competencia)), isNull(movimento.canceladoEm)),
      )
      .orderBy(asc(movimento.dataEvento), asc(movimento.id));
    return linhas.map(paraLancamento);
  }

  async buscarPorId(id: string): Promise<Lancamento | null> {
    const linhas = await this.db.select().from(movimento).where(eq(movimento.id, id)).limit(1);
    const linha = linhas[0];
    return linha ? paraLancamento(linha) : null;
  }

  async marcarPagamento(id: string, pagoEm: string | null): Promise<void> {
    await this.db.update(movimento).set({ pagoEm }).where(eq(movimento.id, id));
  }

  /**
   * Cria as ocorrências que faltam, ignorando as que já existem.
   *
   * `onConflictDoNothing` sobre `movimento_recorrencia_competencia_uq` é o que
   * torna a materialização segura durante a **leitura** de uma página. A
   * alternativa — consultar o que existe e inserir o resto — perderia a corrida
   * entre dois carregamentos simultâneos, e o sintoma seria a conta de luz
   * aparecendo duas vezes no mês (FIXO-02, AC 2).
   *
   * O lote entra numa chamada só: a janela tem quatro competências por
   * recorrência, e uma ida ao banco por ocorrência multiplicaria por vinte o
   * custo de abrir um mês (AD-008).
   */
  async materializarOcorrencias(
    ocorrencias: ReadonlyArray<OcorrenciaParaMaterializar>,
  ): Promise<number> {
    if (ocorrencias.length === 0) {
      return 0;
    }
    const criadas = await this.db
      .insert(movimento)
      .values(
        ocorrencias.map((o) => ({
          natureza: o.natureza,
          origem: "RECORRENCIA" as const,
          descricao: o.descricao,
          competencia: deCompetencia(o.competencia),
          dataEvento: o.dataEvento,
          valorCentavos: o.valorPrevisto,
          valorPrevistoCentavos: o.valorPrevisto,
          pagoEm: null,
          categoriaId: o.categoriaId,
          usuarioId: o.usuarioId,
          meioPagamentoId: o.meioPagamentoId,
          recorrenciaId: o.recorrenciaId,
        })),
      )
      .onConflictDoNothing({
        target: [movimento.recorrenciaId, movimento.competencia],
      })
      .returning({ id: movimento.id });
    return criadas.length;
  }

  /**
   * Propaga o valor previsto novo a partir de uma competência.
   *
   * O `WHERE` é a implementação de `ocorrenciaProtegida`: pula o que está pago
   * e o que tem valor diferente do previsto. Os dois caminhos — este e a função
   * pura — são confrontados por um teste de concordância, porque afrouxar este
   * filtro numa revisão apagaria em silêncio o valor real que a pessoa digitou.
   *
   * `valor` e `previsto` andam juntos aqui de propósito: quem não confirmou
   * nada continua tendo os dois iguais, que é a condição de estar desprotegido.
   */
  async atualizarPrevistoNaoProtegido(
    recorrenciaId: string,
    desde: Competencia,
    valorPrevisto: Cents,
  ): Promise<void> {
    await this.db
      .update(movimento)
      .set({ valorCentavos: valorPrevisto, valorPrevistoCentavos: valorPrevisto })
      .where(
        and(
          eq(movimento.recorrenciaId, recorrenciaId),
          gte(movimento.competencia, deCompetencia(desde)),
          isNull(movimento.pagoEm),
          sql`${movimento.valorCentavos} = ${movimento.valorPrevistoCentavos}`,
        ),
      );
  }
}
