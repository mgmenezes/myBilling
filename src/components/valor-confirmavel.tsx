"use client";

import { useState, useTransition } from "react";
import type { confirmarValorDaOcorrencia } from "@/app/actions/pagamentos";
import { parseBRL } from "@/domain";

/**
 * O valor de uma ocorrência de gasto fixo, que pode ser confirmado.
 *
 * A previsão fica visível ao lado do valor confirmado — **os dois convivem**, e
 * é a diferença entre eles que dá sentido ao mês: "previa 180, veio 192,40".
 * Esconder a previsão depois de confirmar transformaria a comparação numa
 * lembrança.
 *
 * A confirmação é anunciada por **texto**, não por cor (FIXO-04, AC 3). A cor
 * do valor já significa outra coisa nesta tabela — despesa e receita — e
 * empilhar dois significados no mesmo canal deixaria os dois ilegíveis.
 */

export function ValorConfirmavel({
  lancamentoId,
  descricao,
  sinal,
  valorFormatado,
  previstoFormatado,
  confirmado,
  confirmar,
}: {
  readonly lancamentoId: string;
  /** Só para o nome acessível: distingue esta linha das outras da tabela. */
  readonly descricao: string;
  /** `+` ou `−`, o mesmo das demais linhas da tabela. */
  readonly sinal: string;
  readonly valorFormatado: string;
  readonly previstoFormatado: string;
  readonly confirmado: boolean;
  readonly confirmar: typeof confirmarValorDaOcorrencia;
}) {
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();

  function submeter() {
    const centavos = parseBRL(valor);
    if (!centavos.ok) {
      setErro("Informe um valor maior que zero.");
      return;
    }
    setErro("");
    iniciar(async () => {
      const resposta = await confirmar(lancamentoId, centavos.value);
      if (!resposta.ok) {
        setErro(resposta.erro.mensagem);
        return;
      }
      setAberto(false);
      setValor("");
    });
  }

  if (!aberto) {
    return (
      <span className="flex flex-col items-start gap-0.5 md:items-end">
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="cursor-pointer rounded-xs underline decoration-line underline-offset-4 transition-colors duration-200 hover:decoration-ink"
        >
          <span aria-hidden="true">{sinal}</span>
          {valorFormatado}
          <span className="sr-only">, confirmar o valor de {descricao}</span>
        </button>
        {confirmado ? (
          <span className="text-[12px] text-ink-muted">
            confirmado · previa {previstoFormatado}
          </span>
        ) : (
          <span className="text-[12px] text-ink-soft">previsto</span>
        )}
      </span>
    );
  }

  return (
    <span className="flex flex-col items-start gap-1 md:items-end">
      <label className="sr-only" htmlFor={`confirmar-${lancamentoId}`}>
        Valor real de {descricao}
      </label>
      <input
        id={`confirmar-${lancamentoId}`}
        className="w-32 rounded-md border border-line bg-surface px-2 py-1 text-[15px] text-ink"
        inputMode="decimal"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder={previstoFormatado}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submeter();
          }
          if (e.key === "Escape") {
            setAberto(false);
          }
        }}
        // biome-ignore lint/a11y/noAutofocus: o campo nasce de um clique explícito no valor, e não na carga da página — não mover o foco obrigaria a procurar com o mouse o campo que se acabou de abrir.
        autoFocus
      />
      <span className="flex gap-2">
        <button
          type="button"
          onClick={submeter}
          disabled={pendente}
          className="text-[13px] font-semibold text-primary-texto hover:underline disabled:opacity-60"
        >
          {pendente ? "Gravando…" : "Confirmar"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="text-[13px] font-semibold text-ink-muted hover:text-ink"
        >
          Cancelar
        </button>
      </span>
      {erro === "" ? null : (
        <span role="alert" className="text-[12px] font-medium text-negativo">
          {erro}
        </span>
      )}
    </span>
  );
}
