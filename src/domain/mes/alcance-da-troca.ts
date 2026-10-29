import { type DomainError, err, ok, type Result } from "../shared/result";
import type { Lancamento } from "../tipos";

/**
 * Até onde vai a troca de categoria feita na linha de um gasto (TRC-03).
 *
 * - **FIXO**: a ocorrência é de um fixo, e a categoria muda no fixo e em todas
 *   as ocorrências dele, meses passados inclusive. Uma categoria errada num
 *   fixo está errada em todos os meses.
 * - **COMPRA**: a parcela é de uma compra, e a categoria muda na compra e em
 *   todas as parcelas.
 * - **LANCAMENTO**: o gasto do mês, e só ele.
 *
 * O vínculo com o fixo é conferido primeiro. Um lançamento nunca tem os dois,
 * mas a ordem fica fixada para não depender disso.
 *
 * Entrada não tem categoria: a lista a mostra como "Receita" (TRC-05 AC 4).
 */
export type AlcanceDaTroca = "FIXO" | "COMPRA" | "LANCAMENTO";

export function alcanceDaTroca(
  lancamento: Pick<Lancamento, "natureza" | "recorrenciaId" | "compraId">,
): Result<AlcanceDaTroca, DomainError> {
  if (lancamento.natureza === "RECEITA") {
    return err({ code: "CATEGORIA_EM_RECEITA" });
  }
  if (lancamento.recorrenciaId !== null) {
    return ok("FIXO");
  }
  if (lancamento.compraId !== null) {
    return ok("COMPRA");
  }
  return ok("LANCAMENTO");
}
