"use client";

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
 * navegador já dá foco, teclado, abrir em nova aba e o Next já pré-carrega.
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
    <nav aria-label="Navegação entre meses" className="flex flex-wrap items-center gap-2">
      <Link
        href={`/${anterior}`}
        aria-label={`Mês anterior: ${formatarCompetencia(anterior)}`}
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800"
      >
        <span aria-hidden="true">←</span>
      </Link>

      <label className="sr-only" htmlFor="seletor-mes">
        Mês
      </label>
      <select
        id="seletor-mes"
        value={mes}
        onChange={(evento) => irPara(ano, evento.target.value)}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
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
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
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
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800"
      >
        <span aria-hidden="true">→</span>
      </Link>

      <p aria-live="polite" className="ml-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
        {formatarCompetencia(competencia)}
      </p>
    </nav>
  );
}
