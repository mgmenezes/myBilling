import type { MovimentoRepository } from "@/application/ports/repositories";
import { type Cents, err, type Lancamento, ok, type Result } from "@/domain";

/**
 * Escrever quanto a conta realmente veio.
 *
 * O previsto não é apagado: os dois convivem, e é a diferença entre eles que
 * permite comparar planejado com realizado — e que protege a ocorrência de um
 * reajuste registrado depois (FIXO-04, AC 1).
 *
 * **Só ocorrência de recorrência é confirmável.** Parcela de compra tem valor
 * decidido pelo rateio, e alterá-lo isoladamente quebraria a conservação da
 * soma, que é invariante do domínio. Lançamento avulso não tem previsto: o
 * valor dele já é o real desde que foi digitado.
 *
 * **`resolverValorEfetivo` não é chamada aqui**, e a tentação era grande — ela
 * está sem chamador desde a fase 3 do MVP. Mas o lugar dela é a **leitura**:
 * decidir qual valor vale ao exibir uma ocorrência. Chamá-la na escrita, para
 * conferir o que acabou de ser gravado, seria encenação: a condição nunca
 * falharia. Ela ganha chamador de verdade na interface (T20).
 *
 * Confirmar **não** marca como pago. Os dois costumam acontecer juntos e por
 * isso ficam lado a lado na interface, mas são fatos diferentes: a conta chegou
 * com um valor, e o dinheiro saiu da conta. Juntá-los aqui tornaria impossível
 * registrar o primeiro sem afirmar o segundo.
 */

export type CodigoErroConfirmacao =
  | "LANCAMENTO_NAO_ENCONTRADO"
  | "LANCAMENTO_NAO_CONFIRMAVEL"
  | "VALOR_NAO_POSITIVO";

export interface DependenciasConfirmarValor {
  readonly movimentos: MovimentoRepository;
}

export interface EntradaConfirmarValor {
  readonly lancamentoId: string;
  readonly valor: Cents;
}

export async function confirmarValor(
  deps: DependenciasConfirmarValor,
  entrada: EntradaConfirmarValor,
): Promise<Result<Lancamento, { readonly code: CodigoErroConfirmacao }>> {
  if (entrada.valor <= 0) {
    return err({ code: "VALOR_NAO_POSITIVO" });
  }

  const existente = await deps.movimentos.buscarPorId(entrada.lancamentoId);
  if (existente === null) {
    return err({ code: "LANCAMENTO_NAO_ENCONTRADO" });
  }
  if (existente.origem !== "RECORRENCIA" || existente.valorPrevisto === null) {
    return err({ code: "LANCAMENTO_NAO_CONFIRMAVEL" });
  }

  await deps.movimentos.confirmarValorReal(entrada.lancamentoId, entrada.valor);

  /*
   * Relê em vez de montar o objeto à mão, como `marcar-pagamento` faz: custa
   * uma consulta e garante que o que a tela recebe é o que ficou gravado.
   */
  const atualizado = await deps.movimentos.buscarPorId(entrada.lancamentoId);
  if (atualizado === null) {
    return err({ code: "LANCAMENTO_NAO_ENCONTRADO" });
  }
  return ok(atualizado);
}
