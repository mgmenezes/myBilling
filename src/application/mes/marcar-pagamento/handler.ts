import type { MovimentoRepository } from "@/application/ports/repositories";
import type { Lancamento, Result } from "@/domain";
import { err, ok } from "@/domain";

/**
 * Marcar um lançamento como pago, e desfazer.
 *
 * O repositório já sabia fazer isso desde a fase 3 e ficou sem nenhum chamador
 * até aqui. O que este caso de uso acrescenta é a **verificação de existência**:
 * `marcarPagamento` é idempotente e silencioso — id inexistente não levanta
 * nada, nem no Drizzle nem no fake. Sem a busca antes, a interface confirmaria
 * alegremente um pagamento que não aconteceu.
 *
 * **Quem decide a data é quem chama.** `pagoEm` chega pronto, em
 * `'YYYY-MM-DD'`, porque saber que dia é hoje depende de fuso e o fuso é
 * decisão da borda (AD-002). `null` desfaz a marcação (MOV-06, AC 1).
 *
 * Desfazer é operação de primeira classe, e não um desvio: a regra registrada
 * no spec é que alterar um lançamento pago exige **primeiro** desmarcá-lo, em
 * duas ações deliberadas. Uma interface que dificultasse o desfazer
 * transformaria essa proteção em obstáculo.
 */

export type CodigoErroPagamento = "LANCAMENTO_NAO_ENCONTRADO";

export interface DependenciasMarcarPagamento {
  readonly movimentos: MovimentoRepository;
}

export interface EntradaMarcarPagamento {
  readonly lancamentoId: string;
  /** `'YYYY-MM-DD'` marca como pago; `null` desfaz. */
  readonly pagoEm: string | null;
}

export async function marcarPagamento(
  deps: DependenciasMarcarPagamento,
  entrada: EntradaMarcarPagamento,
): Promise<Result<Lancamento, { readonly code: CodigoErroPagamento }>> {
  const existente = await deps.movimentos.buscarPorId(entrada.lancamentoId);
  if (existente === null) {
    return err({ code: "LANCAMENTO_NAO_ENCONTRADO" });
  }

  await deps.movimentos.marcarPagamento(entrada.lancamentoId, entrada.pagoEm);

  /*
   * Relê em vez de devolver o objeto montado à mão. Custa uma consulta e
   * garante que o que a tela recebe é o que ficou gravado — montar aqui um
   * `{ ...existente, pagoEm }` faria a interface concordar consigo mesma
   * mesmo que a escrita não tivesse surtido efeito.
   */
  const atualizado = await deps.movimentos.buscarPorId(entrada.lancamentoId);
  if (atualizado === null) {
    return err({ code: "LANCAMENTO_NAO_ENCONTRADO" });
  }
  return ok(atualizado);
}
