import { forbidden } from "next/navigation";
import { signIn } from "@/infrastructure/auth/auth";

/**
 * Tela de entrada. Pública por definição: é o destino do middleware quando
 * falta sessão (AUTH-01, AC 1).
 *
 * `AccessDenied` é o erro que o Auth.js devolve quando o callback `signIn`
 * recusa o e-mail. Ele vira `forbidden()`, e não um alerta de 200: a resposta
 * precisa ser 403 de fato (AUTH-01, AC 2). Os demais erros do fluxo viram uma
 * mensagem genérica — nenhum detalhe técnico chega ao navegador.
 */

async function entrarComGoogle() {
  "use server";
  await signIn("google", { redirectTo: "/" });
}

export default async function PaginaDeLogin({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  if (error === "AccessDenied") {
    forbidden();
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          myBilling
        </h1>
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
          Controle financeiro da casa. O acesso é restrito às pessoas autorizadas.
        </p>

        {error !== undefined && error !== "AccessDenied" ? (
          <p
            role="alert"
            className="mt-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
          >
            Não foi possível concluir a entrada. Tente novamente.
          </p>
        ) : null}

        <form action={entrarComGoogle} className="mt-8">
          <button
            type="submit"
            className="w-full rounded-md bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus-visible:outline-zinc-50"
          >
            Entrar com o Google
          </button>
        </form>
      </div>
    </main>
  );
}
