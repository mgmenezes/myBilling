"use client";

import { ArrowsClockwiseIcon, ChartPieSliceIcon, ListBulletsIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Navegação principal entre as áreas do app.
 *
 * **Área não implementada não entra nesta lista** (NAV-03, AC 5). Link para
 * página vazia é pior que ausência de link: promete algo que não existe e
 * gasta um clique para descobrir.
 *
 * A área ativa é marcada por peso tipográfico, fundo e uma barra de forma,
 * nunca só por cor. Quem não separa matiz continua sabendo onde está.
 *
 * Lateral a partir de 768px, barra inferior abaixo disso: no celular o polegar
 * alcança a base da tela, não o topo.
 */

interface Area {
  readonly slug: string;
  readonly rotulo: string;
  readonly Icone: typeof ChartPieSliceIcon;
}

const AREAS: ReadonlyArray<Area> = [
  { slug: "", rotulo: "Visão geral", Icone: ChartPieSliceIcon },
  { slug: "lancamentos", rotulo: "Lançamentos", Icone: ListBulletsIcon },
  /* "Fixos" tem o mesmo nome do bloco da lista que ele administra. Dois nomes
     para a mesma coisa obrigariam a pessoa a aprender a tradução. */
  { slug: "fixos", rotulo: "Fixos", Icone: ArrowsClockwiseIcon },
];

export function NavegacaoPrincipal({ competencia }: { readonly competencia: string }) {
  const caminho = usePathname();

  return (
    <nav aria-label="Áreas do myBilling" className="contents">
      <ul
        className="fixed inset-x-0 bottom-0 z-20 flex gap-1 border-t border-line bg-surface p-2 md:static md:flex-col md:gap-1 md:border-0 md:bg-transparent md:p-0"
        /* Espaço para a barra inferior não cobrir conteúdo no celular. */
      >
        {AREAS.map(({ slug, rotulo, Icone }) => {
          const destino = slug === "" ? `/${competencia}` : `/${competencia}/${slug}`;
          const ativa = slug === "" ? caminho === `/${competencia}` : caminho.endsWith(`/${slug}`);

          return (
            <li key={slug} className="flex-1 md:flex-none">
              <Link
                href={destino}
                aria-current={ativa ? "page" : undefined}
                className={`relative flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-pill px-3 py-2 text-[13px] transition-colors duration-200 md:min-h-11 md:flex-row md:justify-start md:gap-2.5 md:text-[15px] ${
                  ativa
                    ? "bg-surface-strong font-semibold text-ink"
                    : "font-normal text-ink-muted hover:text-ink"
                }`}
              >
                {/* Marca de forma, além do peso e do fundo: cor nunca sozinha. */}
                {ativa ? (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-pill bg-primary md:top-1/2 md:left-0 md:h-6 md:w-0.5 md:-translate-x-0 md:-translate-y-1/2"
                  />
                ) : null}
                <Icone size={20} weight={ativa ? "fill" : "regular"} aria-hidden="true" />
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
