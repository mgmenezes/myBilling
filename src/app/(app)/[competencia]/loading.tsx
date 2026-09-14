/** Estado de carregamento do mês (UI-01, AC 7). */
export default function CarregandoMes() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4">
      <p className="text-sm text-zinc-700 dark:text-zinc-300">Carregando o mês…</p>
      <div className="h-10 w-full animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-32 w-full animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}
