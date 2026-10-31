import type { ReactNode } from "react";

/**
 * A largura de leitura das telas que ainda não foram redesenhadas para a
 * moldura com o menu na borda (TRES-01, AC 8).
 *
 * O `<main>` deixou de limitar a largura para a Visão geral poder ocupar a tela
 * inteira. A home do ano e a tela de erro do mês continuam em 1.024 px,
 * centradas no espaço à direita do menu, com o mesmo respiro que o `<main>`
 * antigo dava: a razão dos 1.024 px, linha larga afastando a descrição do
 * valor, segue valendo para elas (`--container-conteudo` em `globals.css`).
 * Lançamentos, Todo mês e as duas abas de Cadastros desenham a própria grade,
 * com os mesmos 1.024 px abaixo de 1.536 px e uma coluna à direita a partir daí
 * (AD-020, AD-021, AD-022).
 */
export function AreaEstreita({ children }: { readonly children: ReactNode }) {
  return <div className="mx-auto w-full max-w-conteudo px-4 py-8 sm:px-6 sm:py-10">{children}</div>;
}
