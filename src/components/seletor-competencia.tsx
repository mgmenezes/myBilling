"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
 *
 * **"Mês atual" mora aqui, ao lado das setas** (MES-01). É onde a pessoa já
 * está navegando, e voltar ao mês de hoje era o único trajeto que obrigava a
 * passar pela home — perdendo a área em que se estava. O `design.md` previa um
 * `seletor-periodo.tsx` próprio que nunca existiu; criar componente novo para
 * um botão seria inventar estrutura.
 *
 * **Ele preserva a área**, lida do caminho: de `/2026-03/lancamentos` vai para
 * `/<corrente>/lancamentos`, e não para a visão geral.
 *
 * **No mês corrente ele fica desabilitado, e não some.** Sumir mudaria o
 * layout do seletor conforme o mês, e um controle que aparece e desaparece é
 * mais confuso que um apagado. Desabilitado ele é `<button>`, porque link
 * desabilitado não existe em HTML; habilitado ele é `<Link>`, como as setas,
 * para ganhar teclado, nova aba e pré-carregamento de graça.
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
  "inline-flex size-11 shrink-0 items-center justify-center rounded-pill border border-line " +
  "text-ink transition-[transform,background-color,border-color] duration-200 " +
  "hover:border-line-strong hover:bg-canvas active:scale-[0.94]";

const CAMPO =
  "rounded-md border border-line bg-surface px-4 py-2.5 text-[15px] text-ink " +
  "transition-colors duration-200 hover:border-line-strong";

const ATALHO =
  "inline-flex min-h-11 items-center rounded-pill border border-line px-4 text-[14px] " +
  "text-ink transition-[transform,background-color,border-color] duration-200 " +
  "hover:border-line-strong hover:bg-canvas active:scale-[0.97] " +
  "disabled:cursor-default disabled:opacity-50 disabled:hover:border-line disabled:hover:bg-transparent";

export function SeletorCompetencia({
  competencia,
  competenciaCorrente,
}: {
  competencia: Competencia;
  /**
   * O mês de hoje, resolvido no servidor, no fuso da casa. Chega por prop
   * porque o relógio é da borda: derivá-lo aqui daria o fuso do navegador, que
   * às 21h de 31/03 já está em abril.
   */
  competenciaCorrente: Competencia;
}) {
  const router = useRouter();
  const caminho = usePathname();
  const anterior = addMeses(competencia, -1);
  const proxima = addMeses(competencia, 1);
  const [ano, mes] = [competencia.slice(0, 4), competencia.slice(5, 7)];
  /* O que vem depois da competência no caminho é a área: "/lancamentos",
     "/fixos", ou nada na visão geral. */
  const area = caminho.startsWith(`/${competencia}`) ? caminho.slice(`/${competencia}`.length) : "";
  const noMesCorrente = competencia === competenciaCorrente;
  const rotuloDoAtalho = `Ir para o mês atual: ${formatarCompetencia(competenciaCorrente)}`;

  function irPara(anoAlvo: string, mesAlvo: string) {
    const alvo = criarCompetencia(`${anoAlvo}-${mesAlvo}`);
    if (alvo.ok) {
      router.push(`/${alvo.value}`);
    }
  }

  return (
    <nav
      aria-label="Navegação entre meses"
      className="flex flex-wrap items-center gap-2 rounded-pill border border-line bg-surface p-2 sm:gap-3"
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

      {noMesCorrente ? (
        <button type="button" disabled aria-label={rotuloDoAtalho} className={ATALHO}>
          Mês atual
        </button>
      ) : (
        <Link
          href={`/${competenciaCorrente}${area}`}
          aria-label={rotuloDoAtalho}
          className={ATALHO}
        >
          Mês atual
        </Link>
      )}

      {/* Anuncia a mudança para leitor de tela sem depender da animação. */}
      <p aria-live="polite" className="sr-only">
        {formatarCompetencia(competencia)}
      </p>
    </nav>
  );
}
