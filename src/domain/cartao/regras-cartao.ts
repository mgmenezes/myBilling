import { type DomainError, err, ok, type Result } from "../shared/result";
import type { Cartao, MeioPagamento } from "../tipos";

/**
 * Só cartão de crédito gera fatura. Conta corrente e rótulo — o meio que
 * apenas etiqueta um gasto — não têm ciclo (CART-02, AC 5).
 *
 * É um type guard: quem passa por aqui ganha acesso a `diaFechamento` e
 * `diaVencimento`, que só existem em `Cartao`.
 */
export function geraFatura(meio: MeioPagamento): meio is Cartao {
  return meio.tipo === "CARTAO_CREDITO";
}

/**
 * Meio arquivado não recebe compra nova (CART-03, AC 7). Arquivar não
 * apaga nada: as parcelas pendentes seguem contabilizadas e o cartão segue
 * gerando fatura até a última ser quitada (CART-03, AC 6).
 */
export function podeReceberNovaCompra(meio: MeioPagamento): Result<void, DomainError> {
  if (meio.arquivadoEm !== null) {
    return err({ code: "MEIO_PAGAMENTO_ARQUIVADO", detalhes: { meioPagamentoId: meio.id } });
  }
  return ok(undefined);
}
