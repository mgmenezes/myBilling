import Link from "next/link";

/**
 * Resposta 403. Renderizada por `forbidden()`, é o que um e-mail fora da
 * allowlist recebe ao concluir o fluxo do Google (AUTH-01, AC 2).
 *
 * A mensagem diz o que aconteceu e nada além disso: nenhum código de erro,
 * nenhum nome de provider, nenhuma pista sobre quem está na lista.
 */
export default function AcessoNegado() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Acesso não autorizado
        </h1>
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
          Esta conta não tem permissão para usar o myBilling. Se você acredita que deveria ter
          acesso, peça para ser incluído na lista de pessoas autorizadas.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-block rounded-md border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800 dark:focus-visible:outline-zinc-50"
        >
          Entrar com outra conta
        </Link>
      </div>
    </main>
  );
}
