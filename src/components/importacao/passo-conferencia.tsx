"use client";

import { CaretDownIcon, CheckIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useId, useState } from "react";
import type { PreviaParaATela } from "@/app/actions/importacao";
import {
  addMeses,
  type Bloco,
  type Competencia,
  type ConferenciaDeBloco,
  type LinhaDaPrevia,
  type MotivoNaoLida,
  TITULOS,
} from "@/domain";
import { formatarBRL, formatarCompetencia } from "@/lib/formatar";

/**
 * Passo 3 da importação: conferir antes de gravar (IMP-05).
 *
 * É a única defesa antes de uma gravação que só se desfaz recomeçando. Duas
 * perguntas são respondidas aqui, nesta ordem:
 *
 * 1. **O que o app leu bate com os totais da própria planilha?** Por bloco e,
 *    depois, a soma das despesas contra o `Total:` de Saídas. A segunda é o que
 *    distingue "a planilha somou errado" de "o importador leu errado": se só o
 *    bloco diverge e Saídas confere, quem errou foi o total do bloco.
 * 2. **O que vai acontecer com cada linha?** Cada bloco abre para mostrar o
 *    destino de cada uma, com os valores de antes e de depois.
 *
 * Os meses das frases não vêm nas linhas: "continua de" é o mês anterior à
 * competência, e "reajuste a partir de" e "deixa de valer a partir de" são a
 * própria competência.
 */

export interface PassoConferenciaProps {
  readonly previa: PreviaParaATela;
  readonly gravando: boolean;
  /** A mensagem de uma recusa do servidor, exibida dentro do passo (IMP-08, AC 8). */
  readonly erro: string | null;
  readonly aoImportar: (confirmouDivergencia: boolean) => void;
}

const BLOCOS: ReadonlyArray<Bloco> = ["FIXOS", "CARTAO", "GASTOS", "ENTRADAS"];

const MOTIVO: Readonly<Record<MotivoNaoLida, string>> = {
  VALOR_VAZIO: "sem valor",
  VALOR_ZERO: "valor zero",
  VALOR_INVALIDO: "valor não é dinheiro",
  PARCELA_INVALIDA: "parcela fora do formato n/t",
  NOME_VAZIO: "sem nome",
};

const BOTAO_PRIMARIO =
  "inline-flex min-h-11 w-fit items-center justify-center rounded-pill bg-primary px-6 text-[15px] font-semibold text-on-primary transition-[transform,background-color] duration-200 hover:bg-primary-ativo active:scale-[0.97] disabled:pointer-events-none disabled:bg-primary-inativo";

function quantas(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

function destinoDaLinha(linha: LinhaDaPrevia, competencia: Competencia): string {
  const anterior = formatarCompetencia(addMeses(competencia, -1));
  const deAte =
    linha.valorAnterior === null
      ? ""
      : `: ${formatarBRL(linha.valorAnterior)} → ${formatarBRL(linha.valor)}`;
  switch (linha.destino) {
    case "NOVO":
      return "novo";
    case "JA_EXISTE":
      return "já existe";
    case "REAJUSTE":
      return `reajuste a partir de ${formatarCompetencia(competencia)}${deAte}`;
    case "CONTINUA":
      return `continua de ${anterior}`;
    case "CONTINUA_COM_NOVO_VALOR":
      return `continua de ${anterior}, com valor novo${deAte}`;
    case "COMPRA_NOVA":
      return "compra nova";
  }
}

/** Os números de um bloco na linha de resumo: linhas, lido, planilha e a marcação. */
function Numeros({ conferencia }: { readonly conferencia: ConferenciaDeBloco }) {
  return (
    <>
      <span className="text-[14px] text-ink-muted">
        {quantas(conferencia.linhas, "linha", "linhas")}
      </span>
      <span className="text-[14px]">
        <span className="text-ink-muted">Lido </span>
        <span className="font-mono">{formatarBRL(conferencia.somaLida)}</span>
      </span>
      <span className="text-[14px]">
        <span className="text-ink-muted">Planilha </span>
        <span className="font-mono">
          {conferencia.totalDaPlanilha === null ? "—" : formatarBRL(conferencia.totalDaPlanilha)}
        </span>
      </span>
      <Marcacao conferencia={conferencia} />
    </>
  );
}

/**
 * Conferido ou divergente, sempre com texto e ícone. O vermelho é só cor de
 * texto e nunca anda sozinho (docs/design.md, "Semântica de valor").
 */
function Marcacao({ conferencia }: { readonly conferencia: ConferenciaDeBloco }) {
  if (conferencia.confere) {
    return (
      <span className="flex items-center gap-1 text-[14px] font-semibold text-ink sm:ml-auto">
        <CheckIcon size={16} weight="bold" aria-hidden="true" />
        Confere
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[14px] font-semibold text-negativo sm:ml-auto">
      <WarningCircleIcon size={16} weight="fill" aria-hidden="true" />
      {conferencia.diferenca === null
        ? "Sem total na planilha"
        : `Diverge em ${formatarBRL(Math.abs(conferencia.diferenca))}`}
    </span>
  );
}

export function PassoConferencia({ previa, gravando, erro, aoImportar }: PassoConferenciaProps) {
  const id = useId();
  const [confirmou, setConfirmou] = useState(false);
  const { conferencia, competencia } = previa;
  const bloqueado = gravando || (conferencia.temDivergencia && !confirmou);

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby={`${id}-conferencia`} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 id={`${id}-conferencia`} className="text-[17px] font-semibold">
            {`Conferência de ${formatarCompetencia(competencia)}`}
          </h3>
          <p className="text-[14px] text-ink-muted">
            O que foi lido, bloco a bloco, contra os totais da própria planilha. Abra um bloco para
            ver o que acontece com cada linha.
          </p>
        </div>

        <ul className="flex flex-col gap-2">
          {BLOCOS.map((bloco) => {
            const linhas = previa.linhas.filter((linha) => linha.bloco === bloco);
            return (
              <li key={bloco} className="rounded-xl border border-line bg-surface">
                <details className="group">
                  <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                    <span className="flex min-w-[10rem] items-center gap-1.5 font-semibold text-ink">
                      <CaretDownIcon
                        size={14}
                        weight="bold"
                        aria-hidden="true"
                        className="shrink-0 transition-transform duration-200 group-open:rotate-180"
                      />
                      <span>{TITULOS[bloco]}</span>
                    </span>
                    <Numeros conferencia={conferencia.blocos[bloco]} />
                  </summary>
                  {linhas.length === 0 ? (
                    <p className="border-t border-line px-4 py-3 text-[14px] text-ink-muted">
                      Nenhuma linha lida neste bloco.
                    </p>
                  ) : (
                    <ul className="flex flex-col border-t border-line">
                      {linhas.map((linha) => (
                        <li
                          key={linha.posicao}
                          className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2 text-[14px] [&+&]:border-t [&+&]:border-line"
                        >
                          <span className="font-medium text-ink">{linha.nome}</span>
                          <span className="font-mono text-ink">{formatarBRL(linha.valor)}</span>
                          <span className="text-ink-muted">
                            {destinoDaLinha(linha, competencia)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </details>
              </li>
            );
          })}

          <li className="flex flex-col gap-1 rounded-xl border border-line bg-surface-soft px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="min-w-[10rem] pl-5 font-semibold text-ink">Saídas</span>
              <Numeros conferencia={conferencia.saidas} />
            </div>
            <p className="pl-5 text-[13px] text-ink-muted">
              Fixos, Cartão de Crédito e Gastos do Mês somados, contra o total de Saídas da
              planilha.
            </p>
          </li>
        </ul>
      </section>

      {previa.deixamDeValer.length === 0 ? null : (
        <section className="flex flex-col gap-2">
          <h3 id={`${id}-deixam`} className="text-[15px] font-semibold">
            {`Deixa de valer a partir de ${formatarCompetencia(competencia)}`}
          </h3>
          <ul aria-labelledby={`${id}-deixam`} className="flex flex-col gap-1 text-[14px]">
            {previa.deixamDeValer.map((item) => (
              <li key={item.recorrenciaId}>{item.descricao}</li>
            ))}
          </ul>
        </section>
      )}

      {previa.naoAparecem.length === 0 ? null : (
        <section className="flex flex-col gap-2">
          <h3 id={`${id}-nao-aparecem`} className="text-[15px] font-semibold">
            Não aparece nesta aba
          </h3>
          <p className="text-[14px] text-ink-muted">
            Compras de importações anteriores que continuam como estão.
          </p>
          <ul aria-labelledby={`${id}-nao-aparecem`} className="flex flex-col gap-1 text-[14px]">
            {previa.naoAparecem.map((item) => (
              <li key={item.compraId}>{item.descricao}</li>
            ))}
          </ul>
        </section>
      )}

      {previa.naoLidas.length === 0 ? null : (
        <section className="flex flex-col gap-2">
          <h3 id={`${id}-nao-lidas`} className="text-[15px] font-semibold">
            Linhas não lidas
          </h3>
          <p className="text-[14px] text-ink-muted">
            Ficam de fora da importação. A correção é na planilha.
          </p>
          <ul aria-labelledby={`${id}-nao-lidas`} className="flex flex-col gap-1 text-[14px]">
            {previa.naoLidas.map((linha) => (
              <li key={`${linha.bloco}-${linha.posicao}`}>
                {[TITULOS[linha.bloco], linha.nome, MOTIVO[linha.motivo]]
                  .filter((parte) => parte !== "")
                  .join(" · ")}
              </li>
            ))}
          </ul>
        </section>
      )}

      {conferencia.temDivergencia ? (
        <label className="flex items-start gap-2.5 text-[15px] text-ink">
          <input
            type="checkbox"
            className="mt-1"
            checked={confirmou}
            onChange={(evento) => setConfirmou(evento.target.checked)}
          />
          Entendi a diferença, importar mesmo assim
        </label>
      ) : null}

      {erro === null || erro === "" ? null : (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-negativo px-4 py-3 text-[14px] font-medium text-negativo"
        >
          <WarningCircleIcon
            size={18}
            weight="fill"
            aria-hidden="true"
            className="mt-px shrink-0"
          />
          {erro}
        </p>
      )}

      <button
        type="button"
        disabled={bloqueado}
        aria-busy={gravando}
        onClick={() => aoImportar(confirmou)}
        className={BOTAO_PRIMARIO}
      >
        {gravando
          ? "Importando…"
          : `Importar ${quantas(previa.quantidadeAImportar, "lançamento", "lançamentos")}`}
      </button>
    </div>
  );
}
