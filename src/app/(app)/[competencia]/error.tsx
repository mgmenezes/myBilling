"use client";

import { ArrowClockwiseIcon, WarningCircleIcon } from "@phosphor-icons/react";

/**
 * Estado de erro do mês (UI-02, AC 8). O `digest` do Next é o identificador de
 * correlação: ele aparece aqui e no log do servidor, e a mensagem original
 * fica só no servidor. **Stack trace nunca chega ao navegador.**
 *
 * O identificador vem em fonte de largura fixa e selecionável, porque a pessoa
 * vai precisar copiá-lo para relatar o problema.
 */
export default function ErroDoMes({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-5 rounded-xl border border-line bg-surface p-6 sm:p-8"
    >
      <WarningCircleIcon size={30} weight="duotone" aria-hidden="true" className="text-negativo" />

      <div className="flex flex-col gap-3">
        <h1 className="text-[26px] leading-[1.15]">Não foi possível carregar este mês</h1>
        <p className="max-w-[52ch] text-[15px] leading-relaxed text-ink-muted">
          Tente de novo. Se continuar, informe o código abaixo.
        </p>
      </div>

      <p className="rounded-pill bg-canvas px-4 py-2.5 font-mono text-[14px] select-all">
        Código: {error.digest ?? "sem-identificador"}
      </p>

      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-pill bg-primary px-6 py-3 text-[16px] font-semibold text-on-primary transition-[transform,background-color] duration-200 hover:bg-primary-ativo active:scale-[0.97]"
      >
        <ArrowClockwiseIcon size={17} weight="bold" aria-hidden="true" />
        Tentar novamente
      </button>
    </div>
  );
}
