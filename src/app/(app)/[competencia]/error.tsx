"use client";

/**
 * Estado de erro do mês (UI-01, AC 8). O `digest` do Next é o identificador de
 * correlação: ele aparece aqui e no log do servidor, e a mensagem original
 * fica só no servidor. **Stack trace nunca chega ao navegador.**
 */
export default function ErroDoMes({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-start gap-4">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Não foi possível carregar este mês
      </h1>
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        Tente de novo. Se continuar, informe o código abaixo.
      </p>
      <p className="font-mono text-sm text-zinc-900 dark:text-zinc-50">
        Código: {error.digest ?? "sem-identificador"}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800"
      >
        Tentar novamente
      </button>
    </div>
  );
}
