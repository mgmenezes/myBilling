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
 * **Por que a revelação não é mais scrub.** A versão anterior amarrava a
 * opacidade ao progresso do scroll (`scrub`, de `top 85%` até `top 45%`).
 * Isso pressupõe que exista rolagem suficiente *depois* da seção — e não
 * existe: esta é a última seção da página. O progresso empacava perto de
 * zero e os cartões ficavam invisíveis, com o valor lá, legível por leitor de
 * tela e apagado para quem enxerga. Animação que depende de um scroll que a
 * página não tem é uma forma de esconder conteúdo.
 *
 * Agora o ScrollTrigger só decide **quando** começar, e a revelação roda até
 * o fim sozinha. `once: true` porque reanimar a régua a cada rolagem para
 * cima e para baixo não informa nada.
 *
 * O gatilho é `top bottom` — o topo da seção encostando na base da janela — e
 * não uma fração como `top 85%`. A diferença não é de gosto: se a página
 * couber inteira na janela, ela não rola, e qualquer gatilho acima da base
 * jamais seria alcançado. Com `top bottom`, uma página que não rola é uma
 * página onde a seção já está visível, e o ScrollTrigger dispara na criação.
 *
 * Só `transform` e `opacity` animam, e `gsap.context` devolve tudo no
 * desmonte. Sem cleanup, trocar de mês acumula ScrollTriggers órfãos e o
 * scroll fica progressivamente mais pesado.
 *
 * **Esta árvore não pode ter Motion em nenhum ancestral.** Fora a disputa por
 * frames, um ancestral com `transform` desloca todas as medidas do
 * ScrollTrigger e o gatilho nunca dispara na posição certa. É por isso que a
 * seção fica fora do `TransicaoMes` em `page.tsx`.
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
        duration: 0.45,
        stagger: 0.08,
        ease: "power2.out",
        // `clearProps` devolve o controle ao CSS quando termina: nenhum
        // `opacity` inline sobra para mascarar um bug de estilo depois.
        clearProps: "opacity,transform",
        scrollTrigger: {
          trigger: elemento,
          start: "top bottom",
          once: true,
        },
      });
    }, elemento);

    return () => contexto.revert();
  }, [meses.length]);

  if (meses.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line px-5 py-8 text-center text-[15px] text-ink-muted">
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
            className="mes-futuro flex min-w-[9.5rem] shrink-0 snap-start flex-col gap-2 rounded-xl border border-line bg-surface p-5"
          >
            <span className="text-[14px] text-ink-muted">{mes.rotulo}</span>
            <span className="tabular text-[17px]">{mes.valor}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
