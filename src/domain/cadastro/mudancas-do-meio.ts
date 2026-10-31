import { geraFatura } from "../cartao/regras-cartao";
import { type DomainError, err, ok, type Result } from "../shared/result";
import type { MeioPagamento } from "../tipos";

/**
 * O que salvar a edição de um meio de pagamento muda, decidido sem I/O
 * (CADCOL-07).
 *
 * - **O ciclo acompanha o tipo.** Dia de fechamento e de vencimento existem só
 *   no cartão, e nele são obrigatórios. O pedido que traz dias para a conta ou
 *   o rótulo, ou um cartão sem eles, é recusado (AC 11).
 * - **Só o que mudou volta.** O nome por igualdade estrita: a caixa conta, e é
 *   assim que "cartão roxo" vira "Cartão Roxo" (AC 8). No cartão, cada dia
 *   diferente entra sozinho.
 * - **Nada mudou devolve `null`**, e quem chama não grava (AC 9).
 *
 * O tipo não está aqui de propósito: ele não muda (AC 4). Trocar conta por
 * cartão reclassificaria lançamentos já feitos entre os blocos do mês.
 */

export interface CicloDoCartao {
  readonly diaFechamento: number;
  readonly diaVencimento: number;
}

export interface PedidoDeEdicaoDoMeio {
  /** Já normalizado pelo schema (`nome.ts`). */
  readonly nome: string;
  /** Só no cartão; `null` na conta e no rótulo. */
  readonly ciclo: CicloDoCartao | null;
}

export interface MudancasDoMeio {
  readonly nome?: string;
  readonly diaFechamento?: number;
  readonly diaVencimento?: number;
}

/** `ok(null)` quando nada mudou. */
export function mudancasDoMeio(
  atual: MeioPagamento,
  pedido: PedidoDeEdicaoDoMeio,
): Result<MudancasDoMeio | null, DomainError> {
  const mudancas: { nome?: string; diaFechamento?: number; diaVencimento?: number } = {};

  if (geraFatura(atual)) {
    if (pedido.ciclo === null) {
      return err({ code: "CICLO_NAO_CORRESPONDE_AO_TIPO" });
    }
    if (pedido.ciclo.diaFechamento !== atual.diaFechamento) {
      mudancas.diaFechamento = pedido.ciclo.diaFechamento;
    }
    if (pedido.ciclo.diaVencimento !== atual.diaVencimento) {
      mudancas.diaVencimento = pedido.ciclo.diaVencimento;
    }
  } else if (pedido.ciclo !== null) {
    return err({ code: "CICLO_NAO_CORRESPONDE_AO_TIPO" });
  }

  if (pedido.nome !== atual.nome) {
    mudancas.nome = pedido.nome;
  }

  return ok(Object.keys(mudancas).length === 0 ? null : mudancas);
}
