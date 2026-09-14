import Link from "next/link";

/** Competência malformada na URL cai aqui, sem erro não tratado (UI-02, AC 3). */
export default function NaoEncontrado() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Página não encontrada
        </h1>
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
          O endereço não corresponde a nenhum mês. Os meses usam o formato ano-mês, como 2026-03.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-md border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800"
        >
          Ir para o mês corrente
        </Link>
      </div>
    </main>
  );
}
