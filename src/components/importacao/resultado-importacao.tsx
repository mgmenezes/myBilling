"use client";

import { CheckCircleIcon } from "@phosphor-icons/react";
import Link from "next/link";
import type { ResumoDaImportacao } from "@/application/importacao/gravar-importacao/handler";
import { formatarCompetencia } from "@/lib/formatar";

/**
 * O fim da importação de uma aba (IMP-08, AC 6): o que foi criado, alterado e
 * encerrado, o atalho para o mês importado e qual é a aba seguinte.
 *
 * "Importar a próxima aba" volta ao passo do arquivo, já esperando o mês
 * seguinte. As três abas entram de uma vez; fechar e reabrir o diálogo entre
 * uma e outra seria trabalho à toa.
 */

export interface ResultadoImportacaoProps {
  readonly resumo: ResumoDaImportacao;
  readonly aoImportarOutra: () => void;
}

const BOTAO_PRIMARIO =
  "inline-flex min-h-11 w-fit items-center justify-center rounded-pill bg-primary px-6 text-[15px] font-semibold text-on-primary transition-[transform,background-color] duration-200 hover:bg-primary-ativo active:scale-[0.97]";

function contagem(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

export function ResultadoImportacao({ resumo, aoImportarOutra }: ResultadoImportacaoProps) {
  const mes = formatarCompetencia(resumo.competencia);
  return (
    <div className="flex flex-col gap-5">
      <p className="flex items-center gap-2 text-[22px] leading-tight text-ink">
        <CheckCircleIcon size={24} weight="fill" aria-hidden="true" className="shrink-0" />
        {`${mes} importado`}
      </p>

      <ul className="flex flex-wrap gap-2">
        {[
          contagem(resumo.criados, "criado", "criados"),
          contagem(resumo.alterados, "alterado", "alterados"),
          contagem(resumo.encerrados, "encerrado", "encerrados"),
        ].map((texto) => (
          <li
            key={texto}
            className="rounded-pill bg-surface-strong px-3 py-1 text-[13px] font-semibold text-ink"
          >
            {texto}
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-1">
        <Link
          href={`/${resumo.competencia}`}
          /* O link leva ao mês por baixo do diálogo; fechá-lo é o que deixa ver. */
          onClick={(evento) => evento.currentTarget.closest("dialog")?.close()}
          className="w-fit text-[15px] font-semibold text-primary-texto hover:underline"
        >
          {`Abrir ${mes}`}
        </Link>
        <p className="text-[15px] text-ink-muted">{`Próximo: ${formatarCompetencia(resumo.proxima)}`}</p>
      </div>

      <button type="button" onClick={aoImportarOutra} className={BOTAO_PRIMARIO}>
        Importar a próxima aba
      </button>
    </div>
  );
}
