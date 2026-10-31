"use client";

import { WarningCircleIcon } from "@phosphor-icons/react";
import { useId, useState, useTransition } from "react";
import type { encerrarRecorrencia, registrarNovaVigencia } from "@/app/actions/recorrencias";
import { parseBRL } from "@/domain";

/**
 * "Mudar o valor" e "Encerrar" de um fixo, no painel (FIXCOL-05, ACs 1, 3, 6
 * e 7). É o controle que morava no cartão de cada fixo, tirado dele sem mudar
 * o comportamento; a `legend` invisível virou o título à vista.
 *
 * **Os dois pedem a competência**, e não é burocracia: "mudou o valor" e
 * "cancelei" não significam nada sem o mês a partir do qual valem. Um botão
 * que assumisse "a partir de agora" acertaria na maioria das vezes e erraria
 * em silêncio justamente quando a pessoa está registrando algo do passado.
 *
 * O campo de competência vem pré-preenchido com o mês aberto, que é o palpite
 * certo quase sempre, e continua editável. Gravar com sucesso chama
 * `aoConcluir`; a recusa da action fica aqui, em alerta, com o que foi
 * digitado. Quem desmonta o controle é o painel.
 */

const ROTULO = "text-[14px] font-medium text-ink";
const CAMPO =
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-[15px] text-ink " +
  "transition-colors duration-200 hover:border-line-strong";

export function CicloDoFixo({
  modo,
  recorrenciaId,
  competencia,
  rotuloDaCompetencia,
  registrarVigencia,
  encerrar,
  aoConcluir,
  aoCancelar,
}: {
  readonly modo: "valor" | "encerrar";
  readonly recorrenciaId: string;
  /** O mês aberto, `'YYYY-MM'`: o palpite do campo de competência. */
  readonly competencia: string;
  /** "Março de 2026". */
  readonly rotuloDaCompetencia: string;
  readonly registrarVigencia: typeof registrarNovaVigencia;
  readonly encerrar: typeof encerrarRecorrencia;
  readonly aoConcluir: () => void;
  readonly aoCancelar: () => void;
}) {
  const id = useId();
  const [valor, setValor] = useState("");
  const [vigencia, setVigencia] = useState(competencia);
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();
  const ehValor = modo === "valor";

  function submeterValor() {
    const centavos = parseBRL(valor);
    if (!centavos.ok) {
      setErro("Informe um valor maior que zero.");
      return;
    }
    setErro("");
    iniciar(async () => {
      const resposta = await registrarVigencia({
        recorrenciaId,
        vigenteDesde: vigencia,
        valorCentavos: centavos.value,
      });
      if (!resposta.ok) {
        setErro(resposta.erro.mensagem);
        return;
      }
      aoConcluir();
    });
  }

  function submeterEncerramento() {
    setErro("");
    iniciar(async () => {
      const resposta = await encerrar({ recorrenciaId, aPartirDe: vigencia });
      if (!resposta.ok) {
        setErro(resposta.erro.mensagem);
        return;
      }
      aoConcluir();
    });
  }

  return (
    <fieldset
      aria-labelledby={`${id}-titulo`}
      className="flex flex-col gap-3 rounded-lg bg-surface-soft p-3"
    >
      <h3 id={`${id}-titulo`} className="text-[15px] font-medium">
        {ehValor ? "Mudar o valor" : "Encerrar"}
      </h3>

      {ehValor ? (
        <div className="flex flex-col gap-1">
          <label className={ROTULO} htmlFor={`${id}-valor`}>
            Novo valor (R$)
          </label>
          <input
            id={`${id}-valor`}
            className={CAMPO}
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="240,00"
          />
        </div>
      ) : (
        <p className="text-[14px] text-ink-muted">
          As ocorrências ainda não pagas deste mês em diante somem. As já pagas ficam.
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label className={ROTULO} htmlFor={`${id}-vigencia`}>
          {ehValor ? "Vale a partir de" : "Encerrar a partir de"}
        </label>
        <input
          id={`${id}-vigencia`}
          className={`${CAMPO} tabular`}
          type="month"
          value={vigencia}
          onChange={(e) => setVigencia(e.target.value)}
        />
        <p className="text-[13px] text-ink-muted">
          Vem preenchido com {rotuloDaCompetencia}, o mês que você está vendo.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pendente}
          onClick={ehValor ? submeterValor : submeterEncerramento}
          className={`min-h-11 rounded-pill px-5 text-[15px] font-semibold transition-[transform,background-color] duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:bg-primary-inativo ${
            ehValor
              ? "bg-primary text-on-primary hover:bg-primary-ativo"
              : "bg-negativo text-on-primary"
          }`}
        >
          {pendente ? "Gravando…" : ehValor ? "Registrar" : "Encerrar mesmo assim"}
        </button>
        <button
          type="button"
          onClick={aoCancelar}
          className="min-h-11 rounded-pill px-4 text-[15px] font-semibold text-ink-muted hover:text-ink"
        >
          Cancelar
        </button>
      </div>

      {erro === "" ? null : (
        <p role="alert" className="flex items-center gap-1.5 text-[14px] font-medium text-negativo">
          <WarningCircleIcon size={15} weight="fill" aria-hidden="true" className="shrink-0" />
          {erro}
        </p>
      )}
    </fieldset>
  );
}
