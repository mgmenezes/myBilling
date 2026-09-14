import { asc, eq, inArray, sql } from "drizzle-orm";
import type {
  CompraPersistida,
  CompraRepository,
  EntradaSalvarCompra,
} from "@/application/ports/repositories";
import { type DomainError, err, ok, type Result } from "@/domain";
import type { BancoDeDados } from "../client";
import { compraParcelada, movimento } from "../schema";
import { deCompetencia, paraCents, paraCentsOuZero, paraLancamento } from "./mapeadores";

/**
 * Escrita transacional da compra parcelada.
 *
 * Duas garantias vivem aqui, e as duas precisam ser verdadeiras **antes** do
 * commit:
 *
 * 1. **Atomicidade** — o plano e as N parcelas entram na mesma transação.
 *    Falha ao inserir a k-ésima parcela reverte tudo; o banco nunca fica com
 *    uma compra sem suas parcelas (PARC-05, AC 8).
 * 2. **Conservação** — a soma das parcelas **lidas de volta do banco** mais o
 *    valor amortizado anterior tem que dar exatamente o total. A leitura é
 *    do banco, e não do plano em memória, porque é o que está prestes a ser
 *    commitado que precisa fechar. Divergência reverte com
 *    `CONSERVACAO_VIOLADA` (PARC-01, AC 2).
 */

/** Sinal interno: sobe para abortar a transação e vira `Result` na borda. */
class ErroDeConservacao extends Error {
  constructor(
    readonly somaGravada: number,
    readonly valorTotal: number,
  ) {
    super(`conservação violada: ${somaGravada} != ${valorTotal}`);
    this.name = "ErroDeConservacao";
  }
}

const CODIGO_UNICIDADE = "23505";
const RESTRICAO_IDEMPOTENCIA = "compra_parcelada_idempotency_key_unique";

/**
 * O Drizzle embrulha o erro do driver, então o código e o nome da restrição
 * ficam na cadeia de `cause`, não no topo. Olhar só o topo faria a colisão
 * passar batida e o duplo-clique virar erro na cara do usuário.
 */
function ehColisaoDeIdempotencia(erro: unknown): boolean {
  let atual: unknown = erro;
  for (let profundidade = 0; atual && profundidade < 5; profundidade += 1) {
    const candidato = atual as { code?: string; constraint?: string; cause?: unknown };
    if (candidato.code === CODIGO_UNICIDADE && candidato.constraint === RESTRICAO_IDEMPOTENCIA) {
      return true;
    }
    atual = candidato.cause;
  }
  return false;
}

export class CompraRepositoryDrizzle implements CompraRepository {
  constructor(private readonly db: BancoDeDados) {}

  async buscarPorIdempotencyKey(idempotencyKey: string): Promise<CompraPersistida | null> {
    const linhas = await this.db
      .select()
      .from(compraParcelada)
      .where(eq(compraParcelada.idempotencyKey, idempotencyKey))
      .limit(1);
    const compra = linhas[0];
    if (!compra) {
      return null;
    }
    const parcelas = await this.db
      .select()
      .from(movimento)
      .where(eq(movimento.compraId, compra.id))
      .orderBy(asc(movimento.numeroParcela));
    return {
      id: compra.id,
      idempotencyKey: compra.idempotencyKey,
      valorTotal: paraCents(compra.valorTotalCentavos, "compra_parcelada.valor_total_centavos"),
      qtdParcelas: compra.qtdParcelas,
      parcelaInicial: compra.parcelaInicial,
      valorAmortizadoAnterior: paraCentsOuZero(
        compra.valorAmortizadoAnteriorCentavos,
        "compra_parcelada.valor_amortizado_anterior_centavos",
      ),
      parcelas: parcelas.map(paraLancamento),
    };
  }

  async totaisDeParcelas(compraIds: ReadonlyArray<string>): Promise<ReadonlyMap<string, number>> {
    if (compraIds.length === 0) {
      return new Map();
    }
    const linhas = await this.db
      .select({ id: compraParcelada.id, qtdParcelas: compraParcelada.qtdParcelas })
      .from(compraParcelada)
      .where(inArray(compraParcelada.id, [...compraIds]));
    return new Map(linhas.map((linha) => [linha.id, linha.qtdParcelas]));
  }

  async salvarComParcelas(
    entrada: EntradaSalvarCompra,
  ): Promise<Result<CompraPersistida, DomainError>> {
    const jaExistente = await this.buscarPorIdempotencyKey(entrada.idempotencyKey);
    if (jaExistente) {
      return ok(jaExistente);
    }

    const { dados, plano } = entrada;
    try {
      const persistida = await this.db.transaction(async (tx) => {
        const [linhaCompra] = await tx
          .insert(compraParcelada)
          .values({
            descricao: dados.descricao,
            modoEntrada: dados.modo,
            valorTotalCentavos: plano.valorTotal,
            qtdParcelas: dados.qtdParcelas,
            parcelaInicial: dados.parcelaInicial,
            competenciaCompra: deCompetencia(dados.competenciaCompra),
            politicaResiduo: dados.politicaResiduo,
            valorAmortizadoAnteriorCentavos: plano.valorAmortizadoAnterior,
            categoriaId: dados.categoriaId,
            usuarioId: dados.usuarioId,
            meioPagamentoId: dados.meioPagamentoId,
            idempotencyKey: entrada.idempotencyKey,
          })
          .returning({ id: compraParcelada.id });
        if (!linhaCompra) {
          throw new Error("insert de compra_parcelada não retornou id");
        }
        const compraId = linhaCompra.id;

        // Uma parcela por vez, de propósito: se a k-ésima falhar, é a
        // k-ésima que aparece no erro, e a transação inteira volta atrás.
        for (const parcela of plano.parcelas) {
          await tx.insert(movimento).values({
            natureza: "DESPESA",
            origem: "PARCELA",
            descricao: dados.descricao,
            competencia: deCompetencia(parcela.competencia),
            dataEvento: dados.dataEvento,
            valorCentavos: parcela.valor,
            categoriaId: dados.categoriaId,
            usuarioId: dados.usuarioId,
            meioPagamentoId: dados.meioPagamentoId,
            compraId,
            numeroParcela: parcela.numero,
          });
        }

        const [agregado] = await tx
          .select({ soma: sql<string>`coalesce(sum(${movimento.valorCentavos}), 0)::text` })
          .from(movimento)
          .where(eq(movimento.compraId, compraId));
        const somaGravada = Number.parseInt(agregado?.soma ?? "0", 10);
        if (somaGravada + plano.valorAmortizadoAnterior !== plano.valorTotal) {
          throw new ErroDeConservacao(somaGravada, plano.valorTotal);
        }

        const parcelas = await tx
          .select()
          .from(movimento)
          .where(eq(movimento.compraId, compraId))
          .orderBy(asc(movimento.numeroParcela));

        return {
          id: compraId,
          idempotencyKey: entrada.idempotencyKey,
          valorTotal: plano.valorTotal,
          qtdParcelas: dados.qtdParcelas,
          parcelaInicial: dados.parcelaInicial,
          valorAmortizadoAnterior: plano.valorAmortizadoAnterior,
          parcelas: parcelas.map(paraLancamento),
        } satisfies CompraPersistida;
      });
      return ok(persistida);
    } catch (erro) {
      if (erro instanceof ErroDeConservacao) {
        return err<DomainError>({
          code: "CONSERVACAO_VIOLADA",
          detalhes: { somaGravada: erro.somaGravada, valorTotal: erro.valorTotal },
        });
      }
      // Duplo-clique real: a outra submissão venceu a corrida e já commitou.
      // O retry é observacionalmente idêntico ao sucesso (PARC-05, AC 9).
      if (ehColisaoDeIdempotencia(erro)) {
        const existente = await this.buscarPorIdempotencyKey(entrada.idempotencyKey);
        if (existente) {
          return ok(existente);
        }
      }
      throw erro;
    }
  }
}
