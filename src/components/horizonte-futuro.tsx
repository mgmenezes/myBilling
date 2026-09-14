"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

/**
 * O horizonte de meses já comprometidos.
 *
 * É a informação que a planilha nunca deu: quanto dos próximos meses já está
 * gasto antes de começarem. Por isso ela não é uma lista de texto, é uma
 * régua onde dá para comparar os meses de relance.
 *
 * **Por que GSAP e não Motion aqui.** Motion cobre melhor entrada e saída de
 * elemento. O que esta seção faz é *scrub*: a revelação acompanha a posição
 * do scroll de forma contínua e reversível, avançando e voltando conforme a
 * pessoa rola para cima e para baixo. Isso é o trabalho do ScrollTrigger.
 * Folha isolada, sem nenhum componente de Motion nesta árvore: as duas
 * bibliotecas disputam os mesmos frames.
 *
 * Só `transform` e `opacity` animam, e `gsap.context` devolve tudo no
 * desmonte. Sem cleanup, trocar de mês acumula ScrollTriggers órfãos e o
 * scroll fica progressivamente mais pesado.
 */

interface MesFuturo {
  readonly competencia: string;
  readonly rotulo: string;
  readonly valor: string;
}

export function HorizonteFuturo({ meses }: { readonly meses: ReadonlyArray<MesFuturo> }) {
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const elemento = raiz.current;
    if (elemento === null || meses.length === 0) {
      return;
    }
    // A preferência do sistema é lida aqui, e não por hook de outra
    // biblioteca, para esta árvore não importar nada de Motion.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const contexto = gsap.context(() => {
      gsap.from(".mes-futuro", {
        opacity: 0,
        y: 18,
        stagger: 0.08,
        ease: "none",
        scrollTrigger: {
          trigger: elemento,
          start: "top 85%",
          end: "top 45%",
          scrub: 0.6,
        },
      });
    }, elemento);

    return () => contexto.revert();
  }, [meses.length]);

  if (meses.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-line px-5 py-8 text-center text-[15px] text-ink-muted">
        Nenhum mês à frente tem valor comprometido. Compras parceladas cadastradas aqui aparecem
        nesta régua automaticamente.
      </p>
    );
  }

  return (
    <div ref={raiz}>
      <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
        {meses.map((mes) => (
          <li
            key={mes.competencia}
            className="mes-futuro flex min-w-[9.5rem] shrink-0 snap-start flex-col gap-2 rounded-card bg-surface p-5 shadow-lift"
          >
            <span className="text-[14px] text-ink-muted">{mes.rotulo}</span>
            <span className="tabular text-[19px] font-medium">{mes.valor}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
