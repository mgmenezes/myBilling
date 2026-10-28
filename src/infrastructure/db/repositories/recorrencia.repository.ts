import { asc, eq, type SQL } from "drizzle-orm";
import type {
  EntradaCriarRecorrencia,
  RecorrenciaComVersoes,
  RecorrenciaRepository,
} from "@/application/ports/repositories";
import type { CamposDaSerie, Cents, Competencia, Recorrencia } from "@/domain";
import type { Executor } from "../client";
import { recorrencia, recorrenciaVersao } from "../schema";
import { deCompetencia, paraCompetencia } from "./mapeadores";

/**
 * Recorrências e o histórico de valor delas.
 *
 * **Criar é transacional**, e não por precaução genérica: recorrência sem
 * versão é um estado que não pode existir. Ela não teria valor em competência
 * nenhuma, apareceria na tela sem número e nunca materializaria — um registro
 * que só serve para confundir quem o encontrar.
 *
 * A leitura traz recorrência e versões numa consulta só, e não uma consulta
 * por recorrência: a materialização roda a cada abertura de mês, e N+1 ali
 * multiplicaria por recorrência o custo de toda página do app (AD-008).
 */

function paraRecorrencia(linha: typeof recorrencia.$inferSelect): Recorrencia {
  return {
    id: linha.id,
    descricao: linha.descricao,
    natureza: linha.natureza,
    categoriaId: linha.categoriaId,
    usuarioId: linha.usuarioId,
    meioPagamentoId: linha.meioPagamentoId,
    competenciaInicio: paraCompetencia(linha.competenciaInicio, "recorrencia.competencia_inicio"),
    competenciaFim:
      linha.competenciaFim === null
        ? null
        : paraCompetencia(linha.competenciaFim, "recorrencia.competencia_fim"),
    diaVencimento: linha.diaVencimento,
    encerradaEm: linha.encerradaEm === null ? null : linha.encerradaEm.toISOString(),
  };
}

export class RecorrenciaRepositoryDrizzle implements RecorrenciaRepository {
  constructor(private readonly db: Executor) {}

  async listarComVersoes(): Promise<ReadonlyArray<RecorrenciaComVersoes>> {
    return this.comVersoes();
  }

  async buscarComVersoes(recorrenciaId: string): Promise<RecorrenciaComVersoes | null> {
    const [encontrada] = await this.comVersoes(eq(recorrencia.id, recorrenciaId));
    return encontrada ?? null;
  }

  /** A mesma consulta para todas ou para uma: o filtro é o único que muda. */
  private async comVersoes(filtro?: SQL): Promise<RecorrenciaComVersoes[]> {
    const linhas = await this.db
      .select()
      .from(recorrencia)
      .leftJoin(recorrenciaVersao, eq(recorrenciaVersao.recorrenciaId, recorrencia.id))
      .where(filtro)
      .orderBy(asc(recorrencia.descricao), asc(recorrenciaVersao.vigenteDesde));

    /*
     * O join devolve uma linha por versão. A ordenação da consulta já entrega
     * as versões em ordem de vigência, então o agrupamento preserva a ordem
     * sem reordenar em memória.
     */
    const porId = new Map<
      string,
      {
        recorrencia: Recorrencia;
        versoes: Array<{ vigenteDesde: Competencia; valorPrevisto: Cents }>;
      }
    >();
    for (const linha of linhas) {
      const atual = porId.get(linha.recorrencia.id) ?? {
        recorrencia: paraRecorrencia(linha.recorrencia),
        versoes: [],
      };
      if (linha.recorrencia_versao !== null) {
        atual.versoes.push({
          vigenteDesde: paraCompetencia(
            linha.recorrencia_versao.vigenteDesde,
            "recorrencia_versao.vigente_desde",
          ),
          valorPrevisto: linha.recorrencia_versao.valorPrevistoCentavos as Cents,
        });
      }
      porId.set(linha.recorrencia.id, atual);
    }
    return [...porId.values()];
  }

  async criar(entrada: EntradaCriarRecorrencia): Promise<Recorrencia> {
    return this.db.transaction(async (tx) => {
      const [linha] = await tx
        .insert(recorrencia)
        .values({
          descricao: entrada.dados.descricao,
          natureza: entrada.dados.natureza,
          categoriaId: entrada.dados.categoriaId,
          usuarioId: entrada.dados.usuarioId,
          meioPagamentoId: entrada.dados.meioPagamentoId,
          competenciaInicio: deCompetencia(entrada.dados.competenciaInicio),
          competenciaFim:
            entrada.dados.competenciaFim === null
              ? null
              : deCompetencia(entrada.dados.competenciaFim),
          diaVencimento: entrada.dados.diaVencimento,
          encerradaEm: null,
        })
        .returning();
      if (!linha) {
        throw new Error("insert de recorrencia não retornou linha");
      }

      await tx.insert(recorrenciaVersao).values({
        recorrenciaId: linha.id,
        vigenteDesde: deCompetencia(entrada.dados.competenciaInicio),
        valorPrevistoCentavos: entrada.valorInicial,
      });

      return paraRecorrencia(linha);
    });
  }

  /**
   * Vigência repetida **substitui** o valor (FIXO-03, AC 4). O índice único
   * `(recorrencia, vigência)` já impede a segunda linha; o `onConflictDoUpdate`
   * transforma o que seria uma violação em atualização, que é o que a pessoa
   * quis dizer ao registrar duas vezes o mesmo mês.
   */
  async registrarVersao(
    recorrenciaId: string,
    vigenteDesde: Competencia,
    valorPrevisto: Cents,
  ): Promise<void> {
    await this.db
      .insert(recorrenciaVersao)
      .values({
        recorrenciaId,
        vigenteDesde: deCompetencia(vigenteDesde),
        valorPrevistoCentavos: valorPrevisto,
      })
      .onConflictDoUpdate({
        target: [recorrenciaVersao.recorrenciaId, recorrenciaVersao.vigenteDesde],
        set: { valorPrevistoCentavos: valorPrevisto },
      });
  }

  async encerrar(
    recorrenciaId: string,
    competenciaFim: Competencia,
    encerradaEm: string,
  ): Promise<void> {
    await this.db
      .update(recorrencia)
      .set({ competenciaFim: deCompetencia(competenciaFim), encerradaEm: new Date(encerradaEm) })
      .where(eq(recorrencia.id, recorrenciaId));
  }

  async atualizarSerie(recorrenciaId: string, campos: CamposDaSerie): Promise<void> {
    await this.db
      .update(recorrencia)
      .set({
        descricao: campos.descricao,
        diaVencimento: campos.diaVencimento,
        meioPagamentoId: campos.meioPagamentoId,
        categoriaId: campos.categoriaId,
        usuarioId: campos.usuarioId,
      })
      .where(eq(recorrencia.id, recorrenciaId));
  }

  async reabrir(recorrenciaId: string): Promise<void> {
    await this.db
      .update(recorrencia)
      .set({ competenciaFim: null, encerradaEm: null })
      .where(eq(recorrencia.id, recorrenciaId));
  }

  async estenderFim(recorrenciaId: string, competenciaFim: Competencia): Promise<void> {
    await this.db
      .update(recorrencia)
      .set({ competenciaFim: deCompetencia(competenciaFim) })
      .where(eq(recorrencia.id, recorrenciaId));
  }
}
