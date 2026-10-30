"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import type { Cents } from "@/domain";
import { formatarBRL } from "@/lib/formatar";

gsap.registerPlugin(ScrollTrigger);

/**
 * O horizonte dos próximos meses: quanto já está comprometido e quanto vai
 * sobrar ou faltar em cada um.
 *
 * É a informação que a planilha nunca deu: quanto dos próximos meses já está
 * gasto antes de começarem. **Uma linha por mês**, com os dois valores
 * alinhados à direita, um mês embaixo do outro: é assim que dá para comparar
 * os meses de relance, e é o que cabe ao lado de "Gastos por categoria" na
 * Visão geral em colunas (TRES-02, AC 4). Ela já foi uma régua de cartões com
 * rolagem lateral, que ao lado das categorias esconderia um dos meses.
 *
 * **O saldo não usa o rótulo do card.** É o mesmo número do "Saldo previsto"
 * daquele mês (SALDO-03, AC 7), mas esta seção aparece também em
 * Movimentações, onde o rótulo do eixo competência não pode existir
 * (MOV-03). "Vai sobrar" e "Vai faltar" são as palavras do dono, e dizem o
 * sentido sem depender do sinal nem da cor.
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
 * o fim sozinha. `once: true` porque reanimar a lista a cada rolagem para
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
  readonly comprometido: Cents;
  readonly saldo: Cents;
}

/**
 * O rótulo carrega o sentido e a cor só o repete (`docs/design.md`, "Semântica
 * de valor"). Por isso o valor sai sem sinal: "Vai faltar R$ 500,00", e não
 * "Vai faltar -R$ 500,00". O zero não é sobra nem falta, e fica sem cor. As
 * classes ficam escritas por extenso porque o Tailwind só gera o que lê.
 */
function apresentarSaldo(saldo: Cents): {
  readonly rotulo: string;
  readonly valor: string;
  readonly classe: string;
} {
  if (saldo < 0) {
    return { rotulo: "Vai faltar", valor: formatarBRL(Math.abs(saldo)), classe: "text-negativo" };
  }
  return {
    rotulo: "Vai sobrar",
    valor: formatarBRL(saldo),
    classe: saldo > 0 ? "text-positivo" : "text-ink",
  };
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
        nesta lista automaticamente.
      </p>
    );
  }

  return (
    <div ref={raiz}>
      <ul className="flex flex-col">
        {meses.map((mes) => {
          const saldo = apresentarSaldo(mes.saldo);
          return (
            <li
              key={mes.competencia}
              className="mes-futuro flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line py-3.5 last:border-b-0"
            >
              <span className="text-[15px] font-semibold">{mes.rotulo}</span>
              {/* `dt` e `dd` ligam cada rótulo ao seu valor para o leitor de tela. */}
              <dl className="flex gap-6">
                <div className="flex flex-col gap-0.5 text-right">
                  <dt className="text-[13px] text-ink-muted">Comprometido</dt>
                  <dd className="tabular whitespace-nowrap text-[15px]">
                    {formatarBRL(mes.comprometido)}
                  </dd>
                </div>
                <div className="flex min-w-28 flex-col gap-0.5 text-right">
                  <dt className="text-[13px] text-ink-muted">{saldo.rotulo}</dt>
                  <dd className={`tabular whitespace-nowrap text-[15px] ${saldo.classe}`}>
                    {saldo.valor}
                  </dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
