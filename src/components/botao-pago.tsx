"use client";

import { useOptimistic, useTransition } from "react";
import type { alternarPagamento as alternarPagamentoAction } from "@/app/actions/pagamentos";

/**
 * O selo de situação **é** o botão que alterna o pagamento.
 *
 * A alternativa era um controle separado ao lado do selo. Perderia: a linha
 * ganharia um segundo elemento numa tabela que já disputa largura, e o alvo
 * ficaria longe de onde o olho já procura a informação.
 *
 * O custo dessa escolha é que uma pílula que clica convive, na mesma linha,
 * com a pílula de categoria, que não clica. É por isso que esta tem cursor,
 * `hover` e anel de foco, e a de categoria não tem nenhum dos três: a
 * diferença precisa estar no elemento, não na memória de quem usa.
 *
 * **Toggle, e não dois botões.** `aria-pressed` é o que diz a um leitor de
 * tela que isto liga e desliga — sem ele, o rótulo mudando de "Previsto" para
 * "Pago" seria indistinguível de um botão que sumiu e outro que apareceu. E o
 * nome acessível carrega a descrição do lançamento, senão quatorze botões da
 * mesma tabela se chamariam todos "Pago".
 *
 * É o **único** componente cliente da lista. A tabela continua renderizando no
 * servidor: marcar `TabelaLancamentos` inteira com `"use client"` arrastaria
 * formatação e agrupamento para o navegador sem nenhum ganho.
 */

const BASE =
  "inline-flex min-h-11 min-w-11 w-fit items-center justify-center rounded-pill px-2.5 py-0.5 text-[13px] " +
  "transition-[background-color,border-color,opacity] duration-200 " +
  "disabled:cursor-progress disabled:opacity-60";

export function BotaoPago({
  lancamentoId,
  descricao,
  pago,
  alternar,
}: {
  readonly lancamentoId: string;
  /** Só para o nome acessível: o texto visível continua sendo Pago ┊ Previsto. */
  readonly descricao: string;
  readonly pago: boolean;
  readonly alternar: typeof alternarPagamentoAction;
}) {
  const [pendente, iniciar] = useTransition();
  /*
   * O estado otimista existe porque a resposta desta action é uma revalidação
   * de duas rotas — a lista e o painel. Sem ele, o selo ficaria parado até o
   * servidor responder, e a pessoa clicaria de novo achando que não pegou.
   */
  const [otimista, definirOtimista] = useOptimistic(pago);

  function alternarPago() {
    iniciar(async () => {
      definirOtimista(!otimista);
      await alternar(lancamentoId, !otimista);
    });
  }

  return (
    <button
      type="button"
      aria-pressed={otimista}
      disabled={pendente}
      onClick={alternarPago}
      className={`${BASE} ${
        otimista
          ? "bg-surface-strong font-semibold text-ink hover:bg-line"
          : "border border-line text-ink-muted hover:border-line-strong hover:text-ink"
      }`}
    >
      {otimista ? "Pago" : "Previsto"}
      {/* O que distingue este botão dos outros treze da tabela. */}
      <span className="sr-only">, {descricao}</span>
    </button>
  );
}
