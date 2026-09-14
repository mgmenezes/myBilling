"use client";

import { WarningCircleIcon } from "@phosphor-icons/react";
import { useId, useState, useTransition } from "react";
import type { encerrarRecorrencia, registrarNovaVigencia } from "@/app/actions/recorrencias";
import { parseBRL } from "@/domain";
import { Chip } from "./ui";

/**
 * Os gastos fixos cadastrados, com os dois controles de ciclo de vida.
 *
 * **Os dois pedem a competência**, e não é burocracia: "mudou o valor" e
 * "cancelei" não significam nada sem o mês a partir do qual valem. Um botão que
 * assumisse "a partir de agora" acertaria na maioria das vezes e erraria em
 * silêncio justamente quando a pessoa está registrando algo do passado — que é
 * quando ela mais precisa que o app não invente.
 *
 * O campo de competência vem pré-preenchido com o mês aberto, que é o palpite
 * certo quase sempre, e continua editável.
 */

const ROTULO = "text-[14px] font-medium text-ink";
const CAMPO =
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-[15px] text-ink " +
  "transition-colors duration-200 hover:border-line-strong";

export interface ItemFixo {
  readonly id: string;
  readonly descricao: string;
  readonly natureza: "DESPESA" | "RECEITA" | "INVESTIMENTO";
  readonly valorVigente: string | null;
  readonly diaVencimento: number;
  readonly categoria: string | null;
  readonly meio: string;
  readonly inicio: string;
  readonly fim: string | null;
  readonly encerrada: boolean;
}

export function ListaDeFixos({
  competencia,
  rotuloDaCompetencia,
  itens,
  registrarVigencia,
  encerrar,
}: {
  readonly competencia: string;
  readonly rotuloDaCompetencia: string;
  readonly itens: ReadonlyArray<ItemFixo>;
  readonly registrarVigencia: typeof registrarNovaVigencia;
  readonly encerrar: typeof encerrarRecorrencia;
}) {
  if (itens.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-[15px] text-ink-muted">
        Nenhum gasto fixo cadastrado ainda. Cadastre abaixo: ele passa a aparecer em todo mês, sem
        você precisar repetir nada.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {itens.map((item) => (
        <LinhaDeFixo
          key={item.id}
          item={item}
          competencia={competencia}
          rotuloDaCompetencia={rotuloDaCompetencia}
          registrarVigencia={registrarVigencia}
          encerrar={encerrar}
        />
      ))}
    </ul>
  );
}

type Aberto = "nenhum" | "valor" | "encerrar";

function LinhaDeFixo({
  item,
  competencia,
  rotuloDaCompetencia,
  registrarVigencia,
  encerrar,
}: {
  readonly item: ItemFixo;
  readonly competencia: string;
  readonly rotuloDaCompetencia: string;
  readonly registrarVigencia: typeof registrarNovaVigencia;
  readonly encerrar: typeof encerrarRecorrencia;
}) {
  const id = useId();
  const [aberto, setAberto] = useState<Aberto>("nenhum");
  const [valor, setValor] = useState("");
  const [vigencia, setVigencia] = useState(competencia);
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();

  function fechar() {
    setAberto("nenhum");
    setValor("");
    setVigencia(competencia);
    setErro("");
  }

  function submeterValor() {
    const centavos = parseBRL(valor);
    if (!centavos.ok) {
      setErro("Informe um valor maior que zero.");
      return;
    }
    setErro("");
    iniciar(async () => {
      const resposta = await registrarVigencia({
        recorrenciaId: item.id,
        vigenteDesde: vigencia,
        valorCentavos: centavos.value,
      });
      if (!resposta.ok) {
        setErro(resposta.erro.mensagem);
        return;
      }
      fechar();
    });
  }

  function submeterEncerramento() {
    setErro("");
    iniciar(async () => {
      const resposta = await encerrar({ recorrenciaId: item.id, aPartirDe: vigencia });
      if (!resposta.ok) {
        setErro(resposta.erro.mensagem);
        return;
      }
      fechar();
    });
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[16px] font-semibold">{item.descricao}</span>
          {item.categoria === null ? null : <Chip>{item.categoria}</Chip>}
          {item.natureza === "RECEITA" ? <Chip tom="positivo">Receita</Chip> : null}
          {item.encerrada ? <Chip>Encerrado</Chip> : null}
        </div>
        <span
          className={`tabular text-[18px] ${item.natureza === "RECEITA" ? "text-positivo" : "text-ink"}`}
        >
          {item.valorVigente ?? "—"}
        </span>
      </div>

      <p className="text-[14px] text-ink-muted">
        Vence dia {item.diaVencimento} · {item.meio} · desde {item.inicio}
        {item.fim === null ? "" : ` · até ${item.fim}`}
      </p>

      {aberto === "nenhum" && !item.encerrada ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAberto("valor")}
            className="min-h-9 rounded-pill bg-surface-strong px-4 text-[14px] font-semibold text-ink transition-colors duration-200 hover:bg-line"
          >
            Mudar valor
          </button>
          <button
            type="button"
            onClick={() => setAberto("encerrar")}
            className="min-h-9 rounded-pill px-4 text-[14px] font-semibold text-ink-muted transition-colors duration-200 hover:text-negativo"
          >
            Encerrar
          </button>
        </div>
      ) : null}

      {aberto === "nenhum" ? null : (
        <fieldset className="flex flex-col gap-3 rounded-lg bg-surface-soft p-3">
          <legend className="sr-only">
            {aberto === "valor" ? "Mudar o valor" : "Encerrar"} de {item.descricao}
          </legend>

          {aberto === "valor" ? (
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
              {aberto === "valor" ? "Vale a partir de" : "Encerrar a partir de"}
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
              onClick={aberto === "valor" ? submeterValor : submeterEncerramento}
              className={`min-h-11 rounded-pill px-5 text-[15px] font-semibold transition-[transform,background-color] duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:bg-primary-inativo ${
                aberto === "valor"
                  ? "bg-primary text-on-primary hover:bg-primary-ativo"
                  : "bg-negativo text-on-primary"
              }`}
            >
              {pendente ? "Gravando…" : aberto === "valor" ? "Registrar" : "Encerrar mesmo assim"}
            </button>
            <button
              type="button"
              onClick={fechar}
              className="min-h-11 rounded-pill px-4 text-[15px] font-semibold text-ink-muted hover:text-ink"
            >
              Cancelar
            </button>
          </div>

          {erro === "" ? null : (
            <p
              role="alert"
              className="flex items-center gap-1.5 text-[14px] font-medium text-negativo"
            >
              <WarningCircleIcon size={15} weight="fill" aria-hidden="true" className="shrink-0" />
              {erro}
            </p>
          )}
        </fieldset>
      )}
    </li>
  );
}
