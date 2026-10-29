"use client";

import { useId, useState } from "react";
import { formatarBRL } from "@/lib/formatar";

/**
 * O filtro de categoria da lista, em chips com o gasto do mês (LST-01).
 *
 * **Um toque filtra, e tocar de novo tira o filtro.** Cada chip é um toggle,
 * com `aria-pressed`, e só um fica pressionado por vez: a URL guarda uma
 * categoria só, e os links que já existem continuam valendo.
 *
 * **O total é o da Visão geral.** O componente não calcula nada: recebe o
 * gasto de cada categoria, já em ordem decrescente, da página que o tirou de
 * `resumoPorCategoria`. Ordenar aqui de novo criaria uma segunda opinião sobre
 * qual categoria pesa mais.
 *
 * **"+N categorias" revela, não corta.** Seis chips cabem em uma linha e meia
 * no computador. O resto entra na mesma coleção quando a pessoa pede, e a
 * coleção quebra linha: nenhum chip some atrás de `overflow`, nem encolhe até
 * perder o valor.
 */

export interface TotalDeCategoria {
  readonly id: string;
  readonly nome: string;
  /** Centavos (AD-001). */
  readonly gasto: number;
}

/** Quantos chips aparecem antes do "+N". */
const VISIVEIS = 6;

const CHIP =
  "inline-flex min-h-11 items-center rounded-pill border px-3.5 py-1.5 text-left text-[14px] " +
  "transition-colors duration-200";

export function ChipsDeCategoria({
  categorias,
  ativa,
  aoEscolher,
}: {
  /** Já em ordem decrescente de gasto. */
  readonly categorias: ReadonlyArray<TotalDeCategoria>;
  readonly ativa: string | null;
  readonly aoEscolher: (id: string | null) => void;
}) {
  const id = useId();
  /* A ativa escondida atrás do "+N" seria um filtro aplicado sem o chip que o
     mostra: quem chega pelo link da Visão geral com uma categoria pequena
     encontra a coleção já aberta. */
  const [abertas, setAbertas] = useState(
    () => categorias.findIndex((categoria) => categoria.id === ativa) >= VISIVEIS,
  );

  if (categorias.length === 0) {
    return null;
  }

  const escondidas = categorias.length - VISIVEIS;
  const mostradas = abertas || escondidas <= 0 ? categorias : categorias.slice(0, VISIVEIS);

  return (
    <div className="flex flex-col gap-1">
      <span id={`${id}-rotulo`} className="text-[13px] text-ink-muted">
        Categoria
      </span>
      <ul id={`${id}-lista`} aria-labelledby={`${id}-rotulo`} className="flex flex-wrap gap-2">
        {mostradas.map((categoria) => {
          const pressionado = categoria.id === ativa;
          return (
            <li key={categoria.id}>
              <button
                type="button"
                aria-pressed={pressionado}
                onClick={() => aoEscolher(pressionado ? null : categoria.id)}
                className={`${CHIP} ${
                  pressionado
                    ? "border-inverso bg-inverso text-on-inverso"
                    : "border-line bg-surface text-ink hover:border-line-strong"
                }`}
              >
                {categoria.nome}
                {" · "}
                <span className="tabular">{formatarBRL(categoria.gasto)}</span>
              </button>
            </li>
          );
        })}
        {escondidas > 0 ? (
          <li>
            <button
              type="button"
              aria-expanded={abertas}
              aria-controls={`${id}-lista`}
              onClick={() => setAbertas(!abertas)}
              className={`${CHIP} border-dashed border-line-strong text-ink-muted hover:text-ink`}
            >
              {abertas
                ? "Mostrar menos"
                : `+${escondidas} ${escondidas === 1 ? "categoria" : "categorias"}`}
            </button>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
