"use client";

import { WarningCircleIcon } from "@phosphor-icons/react";
import { useId, useMemo, useState } from "react";
import type { criarCategoria as criarCategoriaAction } from "@/app/actions/categorias";
import type { criarCompra } from "@/app/actions/compras";
import type { criarMeioDePagamento as criarMeioAction } from "@/app/actions/meios-de-pagamento";
import { planoDaCompra } from "@/application/compras/plano-da-compra";
import {
  type Competencia,
  dataPadraoDoLancamento,
  menorParcelamentoQueCabe,
  parseBRL,
  type SaldoDoMes,
  simularCompra,
} from "@/domain";
import { mensagemDoErro } from "@/lib/erros";
import { formatarCompetencia } from "@/lib/formatar";
import { FormCompra, type OpcaoDeCadastro } from "./form-compra";
import { RespostaDaSimulacao } from "./resposta-da-simulacao";
import { TEXTO_SEM_VALOR } from "./texto-do-veredito";
import { Botao } from "./ui";

/**
 * "Dá pra comprar?" (SIM-02, SIM-04): a cena da loja.
 *
 * Quatro campos e a resposta, recalculada a cada tecla e sem servidor: o
 * plano sai de `planoDaCompra`, a mesma função que grava a compra, e a
 * simulação subtrai cada parcela do saldo que a página já leu. Não existe
 * botão "calcular" porque não há nada a enviar.
 *
 * **O formulário de compra nasce só no clique.** Antes dele, a tela pede o
 * mínimo para responder; descrição, categoria, meio e pessoa são pedidos na
 * hora de lançar (SIM-04, AC 7). É o `FormCompra` de sempre, preenchido, e a
 * chave de idempotência nasce quando ele monta, como sempre (PARC-05, AC 9).
 *
 * As mensagens de erro são as do cadastro de compra (`src/lib/erros.ts`,
 * SIM-02, AC 11): a mesma regra, provada no domínio, com o mesmo texto.
 */

export interface SimuladorProps {
  /** O mês aberto, C: a primeira parcela cai nele por padrão. */
  readonly competencia: Competencia;
  /** Hoje, no fuso da casa, para a data padrão da compra lançada. */
  readonly hoje: string;
  /** Os saldos de C a C + 12. */
  readonly horizonte: ReadonlyArray<SaldoDoMes>;
  readonly meios: ReadonlyArray<OpcaoDeCadastro>;
  readonly categorias: ReadonlyArray<OpcaoDeCadastro>;
  readonly usuarios: ReadonlyArray<OpcaoDeCadastro>;
  readonly enviar: typeof criarCompra;
  readonly criarCategoria: typeof criarCategoriaAction;
  readonly criarMeioDePagamento: typeof criarMeioAction;
}

const ROTULO_CLASSE = "text-[14px] font-medium text-ink";
const CONTROLE_CLASSE =
  "w-full rounded-md border border-line bg-surface px-4 py-2.5 text-[15px] text-ink " +
  "transition-colors duration-200 hover:border-line-strong " +
  "aria-[invalid=true]:border-negativo aria-[invalid=true]:border-2";
const ERRO_CLASSE = "flex items-center gap-1.5 text-[14px] font-medium text-negativo";

function inteiro(texto: string): number {
  const valor = Number.parseInt(texto, 10);
  return Number.isNaN(valor) ? Number.NaN : valor;
}

type Resultado =
  | { readonly tipo: "SEM_VALOR" }
  | { readonly tipo: "ERRO"; readonly campo: "valor" | "qtd" | null; readonly mensagem: string }
  | {
      readonly tipo: "RESPOSTA";
      readonly simulacao: ReturnType<typeof simularCompra> extends infer R
        ? R extends { ok: true; value: infer V }
          ? V
          : never
        : never;
      readonly menorQueCabe: number | null;
    };

export function Simulador({
  competencia,
  hoje,
  horizonte,
  meios,
  categorias,
  usuarios,
  enviar,
  criarCategoria,
  criarMeioDePagamento,
}: SimuladorProps) {
  const id = useId();
  const [modo, setModo] = useState<"TOTAL" | "VALOR_PARCELA">("TOTAL");
  const [valor, setValor] = useState("");
  const [qtdParcelas, setQtdParcelas] = useState("1");
  const [primeira, setPrimeira] = useState<Competencia>(competencia);
  const [lancando, setLancando] = useState(false);

  const resultado = useMemo((): Resultado => {
    const valorEmCentavos = parseBRL(valor);
    if (!valorEmCentavos.ok) {
      return { tipo: "SEM_VALOR" };
    }
    const plano = planoDaCompra({
      modo,
      valorCentavos: valorEmCentavos.value,
      qtdParcelas: inteiro(qtdParcelas),
      parcelaInicial: 1,
      competenciaInicial: primeira,
      politicaResiduo: "PRIMEIRAS",
    });
    if (!plano.ok) {
      const campo = plano.error.code === "QTD_PARCELAS_INVALIDA" ? "qtd" : "valor";
      return { tipo: "ERRO", campo, mensagem: mensagemDoErro(plano.error.code) };
    }
    const simulacao = simularCompra(horizonte, plano.value.plano);
    if (!simulacao.ok) {
      return { tipo: "ERRO", campo: null, mensagem: mensagemDoErro(simulacao.error.code) };
    }
    const menorQueCabe = simulacao.value.cabe
      ? null
      : menorParcelamentoQueCabe(horizonte, {
          valorTotal: plano.value.plano.valorTotal,
          competenciaPrimeiraParcela: primeira,
          politicaResiduo: "PRIMEIRAS",
        });
    return { tipo: "RESPOSTA", simulacao: simulacao.value, menorQueCabe };
  }, [valor, modo, qtdParcelas, primeira, horizonte]);

  function erroDe(campo: "valor" | "qtd") {
    if (resultado.tipo !== "ERRO" || resultado.campo !== campo) {
      return { props: {}, no: null };
    }
    return {
      props: { "aria-invalid": true, "aria-describedby": `${id}-${campo}-erro` },
      no: (
        <p id={`${id}-${campo}-erro`} className={ERRO_CLASSE}>
          <WarningCircleIcon
            size={16}
            weight="fill"
            aria-hidden="true"
            className="shrink-0 text-negativo"
          />
          {resultado.mensagem}
        </p>
      ),
    };
  }

  const erroValor = erroDe("valor");
  const erroQtd = erroDe("qtd");

  return (
    <div className="flex flex-col gap-6">
      <form
        aria-label="Simulação"
        onSubmit={(evento) => evento.preventDefault()}
        className="flex flex-col gap-4"
      >
        <fieldset className="flex flex-col gap-2">
          <legend className={ROTULO_CLASSE}>O valor informado é</legend>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-[15px] text-ink">
              <input
                type="radio"
                name="modo"
                value="TOTAL"
                checked={modo === "TOTAL"}
                onChange={() => setModo("TOTAL")}
              />
              Valor total
            </label>
            <label className="flex items-center gap-2 text-[15px] text-ink">
              <input
                type="radio"
                name="modo"
                value="VALOR_PARCELA"
                checked={modo === "VALOR_PARCELA"}
                onChange={() => setModo("VALOR_PARCELA")}
              />
              Valor da parcela
            </label>
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className={ROTULO_CLASSE} htmlFor={`${id}-valor`}>
              {modo === "TOTAL" ? "Valor total (R$)" : "Valor da parcela (R$)"}
            </label>
            <input
              id={`${id}-valor`}
              className={CONTROLE_CLASSE}
              inputMode="decimal"
              placeholder="1.000,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              {...erroValor.props}
            />
            {erroValor.no}
          </div>
          <div className="flex flex-col gap-1">
            <label className={ROTULO_CLASSE} htmlFor={`${id}-qtd`}>
              Quantidade de parcelas
            </label>
            <input
              id={`${id}-qtd`}
              className={CONTROLE_CLASSE}
              type="number"
              min={1}
              max={120}
              inputMode="numeric"
              value={qtdParcelas}
              onChange={(e) => setQtdParcelas(e.target.value)}
              {...erroQtd.props}
            />
            {erroQtd.no}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className={ROTULO_CLASSE} htmlFor={`${id}-mes`}>
            Mês da primeira parcela
          </label>
          <select
            id={`${id}-mes`}
            className={CONTROLE_CLASSE}
            value={primeira}
            onChange={(e) => {
              const mes = horizonte.find((m) => m.competencia === e.target.value);
              if (mes !== undefined) {
                setPrimeira(mes.competencia);
              }
            }}
          >
            {horizonte.map((mes) => (
              <option key={mes.competencia} value={mes.competencia}>
                {formatarCompetencia(mes.competencia)}
              </option>
            ))}
          </select>
        </div>
      </form>

      {resultado.tipo === "RESPOSTA" ? (
        <RespostaDaSimulacao
          simulacao={resultado.simulacao}
          qtdParcelas={inteiro(qtdParcelas)}
          menorQueCabe={resultado.menorQueCabe}
          competenciaAberta={competencia}
        />
      ) : resultado.tipo === "ERRO" && resultado.campo === null ? (
        <p role="alert" className={ERRO_CLASSE}>
          {resultado.mensagem}
        </p>
      ) : (
        <p className="text-[15px] text-ink-muted">
          {resultado.tipo === "SEM_VALOR"
            ? TEXTO_SEM_VALOR
            : "Corrija o campo para ver a resposta."}
        </p>
      )}

      {resultado.tipo === "RESPOSTA" && !lancando ? (
        <Botao type="button" onClick={() => setLancando(true)} className="self-start">
          Lançar esta compra
        </Botao>
      ) : null}

      {lancando ? (
        <section
          aria-label="Lançar esta compra"
          className="flex flex-col gap-4 border-t border-line pt-6"
        >
          <h2 className="text-[17px] font-semibold">Lançar esta compra</h2>
          <FormCompra
            key={`${primeira}-${modo}-${valor}-${qtdParcelas}`}
            competencia={primeira}
            dataPadrao={dataPadraoDoLancamento(primeira, hoje)}
            meios={meios}
            categorias={categorias}
            usuarios={usuarios}
            enviar={enviar}
            criarCategoria={criarCategoria}
            criarMeioDePagamento={criarMeioDePagamento}
            valoresIniciais={{ modo, valor, qtdParcelas: inteiro(qtdParcelas) }}
          />
        </section>
      ) : null}
    </div>
  );
}
