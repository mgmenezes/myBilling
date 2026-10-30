import { WalletIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ReactNode } from "react";
import { AlternadorDeTema } from "./alternador-de-tema";
import { NavegacaoPrincipal } from "./navegacao-principal";

/**
 * O menu encostado na borda esquerda, da altura da página (TRES-01).
 *
 * Ele substitui a pílula do topo e a coluna de navegação que morava dentro dos
 * 1.024 px. Com o menu na borda, a largura que sobrava dos dois lados num
 * monitor grande passa a ser do conteúdo.
 *
 * **Uma estrutura, dois arranjos.** A partir de 768 px é uma coluna: marca,
 * áreas e, no pé, o importar, o nome e o tema. Abaixo disso vira a barra do
 * topo, com a marca de um lado e o pé do outro. As áreas continuam na barra
 * fixa de baixo, como sempre foram no celular, porque o polegar alcança a base
 * da tela (TRES-01, AC 9).
 *
 * **O importar chega pronto, por `importar`.** Ele precisa de dados do banco e
 * de server actions, que são da camada `app`; o menu só decide onde ele fica.
 *
 * **Nada aqui é `h1`, `h3` ou `role="status"` visível.** Outras telas os
 * consultam sem escopo, e o menu está em todas elas.
 */
export function MenuLateral({
  nomeDaPessoa,
  importar,
}: {
  readonly nomeDaPessoa: string;
  readonly importar: ReactNode;
}) {
  return (
    <aside
      aria-label="Menu do myBilling"
      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line px-4 py-3 md:w-60 md:shrink-0 md:flex-col md:flex-nowrap md:items-stretch md:justify-start md:gap-6 md:border-r md:border-b-0 md:py-5"
    >
      {/* A marca leva para a home do ano, que é a porta de entrada do app. */}
      <Link
        href="/"
        className="flex min-h-11 items-center gap-2 rounded-pill text-[17px] font-medium tracking-[-0.02em] transition-colors duration-200 hover:text-primary-texto md:px-3"
      >
        <WalletIcon size={22} weight="fill" aria-hidden="true" className="text-primary-texto" />
        myBilling
      </Link>

      <NavegacaoPrincipal />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 md:mt-auto md:flex-col md:items-stretch">
        {importar}
        <div className="flex items-center gap-3 md:justify-between md:pl-3">
          <p className="text-[15px] text-ink-muted">{nomeDaPessoa}</p>
          <AlternadorDeTema />
        </div>
      </div>
    </aside>
  );
}
