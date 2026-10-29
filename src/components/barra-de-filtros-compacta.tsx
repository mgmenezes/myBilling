"use client";

import { FunnelSimpleIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useEffect, useId, useState } from "react";
import { useFiltrosNaUrl } from "./filtros-na-url";

/**
 * A barra de filtros que aparece no topo quando o cartão de filtros sai da
 * tela (LST-03). Quem desceu até o meio da lista busca, tira um filtro ou
 * volta ao cartão sem rolar até o topo.
 *
 * **Não existe um segundo estado de filtro.** A barra lê e grava os mesmos
 * parâmetros da URL que o cartão, pelo mesmo `useFiltrosNaUrl`, inclusive a
 * espera de 250ms da busca.
 *
 * **Aparece pelo `IntersectionObserver`, e não pela posição da rolagem.** O
 * observador diz quando o cartão sai e quando volta; medir `scrollY` a cada
 * quadro seria refazer isso à mão, e pior.
 *
 * **A altura é um token só**, `--altura-da-barra-de-filtros`, que o `html`
 * reserva em `scroll-padding-top`: o elemento que recebe foco por teclado não
 * para debaixo da barra (WCAG 2.4.11).
 *
 * Em 400 px cabem a busca, dois filtros e o "+N"; o resto aparece a partir de
 * `sm`. O rótulo longo encolhe dentro do próprio botão, e o nome inteiro fica
 * no nome acessível e no `title`.
 */

/** O que recebe foco quando "Filtros" leva ao cartão: o primeiro controle. */
const CONTROLE = "input, select, textarea, button, a[href], [tabindex]:not([tabindex='-1'])";

/** Quantos filtros cabem na barra em 400 px. */
const NO_CELULAR = 2;

export function BarraDeFiltrosCompacta({
  alvo,
  ativos,
}: {
  /** O id do cartão de filtros, que a barra observa. */
  readonly alvo: string;
  /** O parâmetro da URL de cada filtro ativo e o nome que a pessoa lê. */
  readonly ativos: ReadonlyArray<{ readonly chave: string; readonly rotulo: string }>;
}) {
  const { busca, setBusca, navegarCom } = useFiltrosNaUrl();
  const [visivel, setVisivel] = useState(false);
  const id = useId();

  useEffect(() => {
    const cartao = document.getElementById(alvo);
    if (cartao === null) {
      return;
    }
    const observador = new IntersectionObserver(([entrada]) => {
      if (entrada !== undefined) {
        setVisivel(!entrada.isIntersecting);
      }
    });
    observador.observe(cartao);
    return () => observador.disconnect();
  }, [alvo]);

  function irAoCartao() {
    const cartao = document.getElementById(alvo);
    if (cartao === null) {
      return;
    }
    cartao.scrollIntoView({ block: "start" });
    /* O foco vai antes de a barra sumir: quando o cartão volta à tela a
       barra sai do DOM, e o foco que estava nela cairia no `body`. */
    cartao.querySelector<HTMLElement>(CONTROLE)?.focus({ preventScroll: true });
  }

  if (!visivel) {
    return null;
  }

  const escondidos = ativos.length - NO_CELULAR;

  return (
    <search
      aria-label="Busca e filtros ativos"
      className="fixed inset-x-0 top-0 z-30 h-(--altura-da-barra-de-filtros) border-b border-line bg-surface shadow-lift"
    >
      <div className="mx-auto flex h-full w-full max-w-conteudo items-center gap-2 px-4 sm:px-6">
        <div className="relative min-w-24 flex-1">
          <label htmlFor={`${id}-busca`} className="sr-only">
            Buscar por descrição
          </label>
          <MagnifyingGlassIcon
            size={17}
            weight="bold"
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted"
          />
          <input
            id={`${id}-busca`}
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar"
            className="min-h-11 w-full rounded-pill border border-line bg-surface py-2 pr-3 pl-9 text-[15px] text-ink transition-colors duration-200 hover:border-line-strong"
          />
        </div>

        {ativos.length === 0 ? null : (
          <ul aria-label="Filtros ativos" className="flex min-w-0 items-center gap-1.5">
            {ativos.map((filtro, posicao) => (
              <li
                key={filtro.chave}
                className={posicao < NO_CELULAR ? "flex min-w-0" : "hidden min-w-0 sm:flex"}
              >
                <button
                  type="button"
                  aria-label={`Tirar o filtro ${filtro.rotulo}`}
                  title={filtro.rotulo}
                  onClick={() => navegarCom({ [filtro.chave]: "" })}
                  className="inline-flex min-h-11 min-w-0 max-w-[6.5rem] items-center gap-1 rounded-pill bg-surface-strong px-3 text-[13px] font-semibold text-ink transition-colors duration-200 hover:bg-line sm:max-w-[11rem]"
                >
                  <span className="truncate">{filtro.rotulo}</span>{" "}
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
            {escondidos > 0 ? (
              <li className="shrink-0 text-[13px] text-ink-muted sm:hidden">
                <span aria-hidden="true" className="tabular">
                  +{escondidos}
                </span>
                <span className="sr-only">
                  {escondidos === 1
                    ? "e mais 1 filtro no cartão de filtros"
                    : `e mais ${escondidos} filtros no cartão de filtros`}
                </span>
              </li>
            ) : null}
          </ul>
        )}

        <button
          type="button"
          onClick={irAoCartao}
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-pill border border-line px-3 text-[14px] text-ink transition-colors duration-200 hover:border-line-strong hover:bg-canvas"
        >
          <FunnelSimpleIcon size={17} weight="bold" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Filtros</span>
        </button>
      </div>
    </search>
  );
}
