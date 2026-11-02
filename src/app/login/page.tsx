import { GoogleLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { forbidden } from "next/navigation";
import { MarcaJano } from "@/components/marca-jano";
import { signIn } from "@/infrastructure/auth/auth";

/**
 * Tela de entrada. Pública por definição: é o destino do proxy quando falta
 * sessão (AUTH-01, AC 1).
 *
 * `AccessDenied` é o erro que o Auth.js devolve quando o callback `signIn`
 * recusa o e-mail. Ele vira `forbidden()`, e não um alerta de 200: a resposta
 * precisa ser 403 de fato (AUTH-01, AC 2). Os demais erros do fluxo viram uma
 * mensagem genérica, e nenhum detalhe técnico chega ao navegador.
 *
 * O herói fala com a voz da landing (NOME-02): a marca, a manchete e uma
 * frase sobre o que o Jano faz, para quem veio de lá reconhecer o lugar. Fora
 * isso, sem marketing: quem chega aqui quer entrar, e um login que se comporta
 * como landing page é atrito.
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
    <main className="flex min-h-[100dvh] flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-line bg-surface px-6 py-10 sm:px-10">
        <p className="flex items-center gap-2 text-[17px] font-medium tracking-[-0.02em]">
          <MarcaJano tamanho={26} />
          Jano
        </p>

        <h1 className="mt-8 text-[32px] leading-[1.1] sm:text-[38px]">
          Antes de parcelar, pergunte ao Jano.
        </h1>

        <p className="mt-4 max-w-[42ch] text-ink-muted">
          Cadastre a compra parcelada e as contas fixas uma vez. O Jano mostra quanto vai sobrar em
          cada um dos próximos meses.
        </p>

        {error !== undefined && error !== "AccessDenied" ? (
          <p
            role="alert"
            className="mt-8 rounded-lg border border-negativo bg-surface-soft px-4 py-3 text-[15px] text-ink"
          >
            Não foi possível concluir a entrada. Tente novamente.
          </p>
        ) : null}

        <form action={entrarComGoogle} className="mt-8">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2.5 rounded-pill bg-primary px-6 py-4 text-[16px] font-semibold text-on-primary transition-[transform,background-color] duration-200 hover:bg-primary-ativo active:scale-[0.97]"
          >
            <GoogleLogoIcon size={19} weight="bold" aria-hidden="true" />
            Entrar com o Google
          </button>
        </form>

        <p className="mt-6 text-[13px] text-ink-muted">
          O acesso é restrito às pessoas autorizadas.
        </p>
      </div>
    </main>
  );
}
