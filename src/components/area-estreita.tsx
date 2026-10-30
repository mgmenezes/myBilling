import type { ReactNode } from "react";

/**
 * A largura de leitura das telas que ainda não foram redesenhadas para a
 * moldura com o menu na borda (TRES-01, AC 8).
 *
 * O `<main>` deixou de limitar a largura para a Visão geral poder ocupar a tela
 * inteira. As outras telas continuam em 1.024 px, centradas no espaço à
 * direita do menu, com o mesmo respiro que o `<main>` antigo dava: a razão dos
 * 1.024 px, linha larga afastando a descrição do valor, segue valendo para
 * elas (`--container-conteudo` em `globals.css`).
 */
export function AreaEstreita({ children }: { readonly children: ReactNode }) {
  return <div className="mx-auto w-full max-w-conteudo px-4 py-8 sm:px-6 sm:py-10">{children}</div>;
}
