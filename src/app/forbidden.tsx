import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
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
    <main className="flex min-h-[100dvh] flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-line bg-surface px-6 py-10 sm:px-10">
        <h1 className="text-[30px] leading-[1.1]">Acesso não autorizado</h1>
        <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-ink-muted">
          Esta conta não tem permissão para usar o myBilling. Se você acredita que deveria ter
          acesso, peça para ser incluído na lista de pessoas autorizadas.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex w-fit items-center gap-2 rounded-pill bg-primary px-6 py-3 text-[16px] font-semibold text-on-primary transition-[transform,background-color] duration-200 hover:bg-primary-ativo active:scale-[0.97]"
        >
          <ArrowLeftIcon size={17} weight="bold" aria-hidden="true" />
          Entrar com outra conta
        </Link>
      </div>
    </main>
  );
}
