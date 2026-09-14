import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

/** Competência malformada na URL cai aqui, sem erro não tratado (UI-02, AC 3). */
export default function NaoEncontrado() {
  return (
    <main className="flex min-h-[100dvh] flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-panel bg-surface px-6 py-10 shadow-float sm:px-10">
        <h1 className="text-[30px] leading-[1.1]">Página não encontrada</h1>
        <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-ink-muted">
          O endereço não corresponde a nenhum mês. Os meses usam o formato ano-mês, como 2026-03.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex w-fit items-center gap-2 rounded-cta border border-ink bg-surface-strong px-6 py-3 text-[15px] font-medium text-ink transition-[transform,background-color] duration-200 hover:bg-canvas active:scale-[0.97]"
        >
          <ArrowLeftIcon size={17} weight="bold" aria-hidden="true" />
          Ir para o mês corrente
        </Link>
      </div>
    </main>
  );
}
