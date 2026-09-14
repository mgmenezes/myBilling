"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addMeses, type Competencia, criarCompetencia } from "@/domain";
import { formatarCompetencia, nomeDoMes } from "@/lib/formatar";

/**
 * Navegação entre meses. Toda aritmética de mês vem de `addMeses` (AD-002):
 * este arquivo não soma nem subtrai mês em lugar nenhum, e é por isso que a
 * virada de ano funciona de graça.
 *
 * Anterior e próximo são links de verdade, não botões com `onClick`: o
 * navegador já dá foco, teclado, abrir em nova aba, e o Next já pré-carrega.
 *
 * O conjunto inteiro é um pill sobre a superfície elevada. É o controle que
 * mais recebe clique no app, então ele é o único elemento da tela com alvo
 * de toque generoso e posição fixa na composição.
 */

/** Quantos anos para cada lado o seletor de ano oferece. */
const ALCANCE_EM_ANOS = 5;

function anosVizinhos(competencia: Competencia): string[] {
  const anos: string[] = [];
  for (let k = -ALCANCE_EM_ANOS; k <= ALCANCE_EM_ANOS; k += 1) {
    anos.push(addMeses(competencia, k * 12).slice(0, 4));
  }
  return anos;
}

const MESES = Array.from({ length: 12 }, (_, indice) => {
  const numero = String(indice + 1).padStart(2, "0");
  return { numero, nome: nomeDoMes(`2000-${numero}`) };
});

const SETA =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-chip border border-line " +
  "text-ink transition-[transform,background-color,border-color] duration-200 " +
  "hover:border-line-strong hover:bg-canvas active:scale-[0.94]";

const CAMPO =
  "rounded-chip border border-line bg-surface-strong px-4 py-2.5 text-[15px] text-ink " +
  "transition-colors duration-200 hover:border-line-strong";

export function SeletorCompetencia({ competencia }: { competencia: Competencia }) {
  const router = useRouter();
  const anterior = addMeses(competencia, -1);
  const proxima = addMeses(competencia, 1);
  const [ano, mes] = [competencia.slice(0, 4), competencia.slice(5, 7)];

  function irPara(anoAlvo: string, mesAlvo: string) {
    const alvo = criarCompetencia(`${anoAlvo}-${mesAlvo}`);
    if (alvo.ok) {
      router.push(`/${alvo.value}`);
    }
  }

  return (
    <nav
      aria-label="Navegação entre meses"
      className="flex flex-wrap items-center gap-2 rounded-chip bg-surface p-2 shadow-lift sm:gap-3"
    >
      <Link
        href={`/${anterior}`}
        aria-label={`Mês anterior: ${formatarCompetencia(anterior)}`}
        className={SETA}
      >
        <CaretLeftIcon size={18} weight="bold" aria-hidden="true" />
      </Link>

      <label className="sr-only" htmlFor="seletor-mes">
        Mês
      </label>
      <select
        id="seletor-mes"
        value={mes}
        onChange={(evento) => irPara(ano, evento.target.value)}
        className={CAMPO}
      >
        {MESES.map((item) => (
          <option key={item.numero} value={item.numero}>
            {item.nome}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="seletor-ano">
        Ano
      </label>
      <select
        id="seletor-ano"
        value={ano}
        onChange={(evento) => irPara(evento.target.value, mes)}
        className={`${CAMPO} tabular`}
      >
        {anosVizinhos(competencia).map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <Link
        href={`/${proxima}`}
        aria-label={`Próximo mês: ${formatarCompetencia(proxima)}`}
        className={SETA}
      >
        <CaretRightIcon size={18} weight="bold" aria-hidden="true" />
      </Link>

      {/* Anuncia a mudança para leitor de tela sem depender da animação. */}
      <p aria-live="polite" className="sr-only">
        {formatarCompetencia(competencia)}
      </p>
    </nav>
  );
}
