import { type DomainError, err, ok, type Result } from "../shared/result";
import type { Lancamento } from "../tipos";

/**
 * Quem pode ser cancelado.
 *
 * **Só o lançamento avulso.** As outras duas origens não são recusadas por
 * cautela, e sim porque cancelá-las produziria estado errado:
 *
 * - **Parcela** — a soma das parcelas é igual ao total da compra, e essa
 *   conservação é invariante do domínio, com assert antes do commit em
 *   `salvarComParcelas`. Remover uma parcela isolada a quebra, e o total da
 *   compra passa a não corresponder a nada.
 * - **Ocorrência de recorrência** — ela renasce na próxima materialização, que
 *   roda na abertura de qualquer mês da janela. Cancelar seria um gesto que se
 *   desfaz sozinho. O gesto equivalente é encerrar a recorrência.
 *
 * Esta regra vive em dois lugares por necessidade: aqui e no `WHERE` do
 * `UPDATE` que cancela. É o mesmo par que `ocorrenciaProtegida` formou, e vale
 * o mesmo contrato — há teste de concordância confrontando os dois. Sem ele,
 * esta função vira dívida e o `WHERE` vira a única verdade.
 *
 * Não olha `canceladoEm`: cancelar de novo é inofensivo e o `WHERE` já o filtra
 * (AVUL-03, AC 4). Não olha `pagoEm` tampouco — pagar um gasto avulso não o
 * torna permanente, e digitar valor errado num gasto já pago é justamente
 * quando corrigir importa.
 */
export function cancelamentoPermitido(lancamento: Lancamento): Result<void, DomainError> {
  if (lancamento.origem !== "AVULSO") {
    return err({
      code: "LANCAMENTO_NAO_CANCELAVEL",
      detalhes: { origem: lancamento.origem },
    });
  }
  return ok(undefined);
}
