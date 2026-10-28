"use client";

import { type ReactNode, useState } from "react";
import type {
  criarMeioDePagamento as criarMeioAction,
  MeioPagamentoGravado,
} from "@/app/actions/meios-de-pagamento";
import {
  entradaMeioPagamentoSchema,
  MAX_NOME_MEIO,
  TIPOS_DE_MEIO,
} from "@/application/schemas/meio-pagamento.schema";
import { descreverMeio } from "@/lib/formatar";
import { CadastroInline } from "./cadastro-inline";

/**
 * Cadastrar um meio de pagamento sem sair de onde se está.
 *
 * Saiu de `form-lancamento-avulso.tsx`, movido e não copiado, para que a
 * importação da planilha cadastre o meio que falta no passo "O que precisa de
 * você" (IMP-04, AC 2) com os mesmos campos, a mesma validação e a mesma
 * action. Os campos de `form-compra.tsx` e `form-recorrencia.tsx` continuam
 * duplicados; é dívida registrada no design da importação.
 *
 * O componente guarda o estado dos campos do cadastro. Quem o usa recebe o
 * meio criado e o que ele é, em `aoCriado`, e decide o que fazer com eles:
 * selecioná-lo, acrescentá-lo à lista. O que ele é sai do que foi enviado,
 * porque a action devolve só id, nome e se gera fatura.
 */

// SPEC_DEVIATION: a interface do design não lista `rotuloDoAtalho` nem `ajuda`.
// Reason: o formulário de avulso diz "+ novo" e troca a ajuda quando é receita,
// e o passo das pendências diz "+ cadastrar". Sem as duas props, mover o
// cadastro mudaria o texto de um dos dois lugares.

export interface CadastroDeMeioInlineProps {
  readonly rotulo: string;
  readonly idDoControle: string;
  /** O nome com que o campo abre. Some ao fechar e volta ao reabrir. */
  readonly nomeInicial?: string;
  /** "+ novo" quando não informado. */
  readonly rotuloDoAtalho?: string;
  /** Substitui o texto de apoio, que por padrão depende do tipo escolhido. */
  readonly ajuda?: string;
  /** Os tipos que o seletor oferece, todos quando não informado. Abre no primeiro. */
  readonly tiposPermitidos?: ReadonlyArray<TipoDeMeio>;
  readonly criarMeioDePagamento: typeof criarMeioAction;
  /** `detalhe` é o `descreverMeio` do que foi cadastrado. */
  readonly aoCriado: (criado: MeioPagamentoGravado, detalhe: string) => void;
  /** O seletor de meio, renderizado abaixo do rótulo. */
  readonly children: ReactNode;
}

export type TipoDeMeio = (typeof TIPOS_DE_MEIO)[number]["valor"];

const TODOS_OS_TIPOS = TIPOS_DE_MEIO.map((opcao) => opcao.valor);

const ROTULO_CLASSE = "text-[14px] font-medium text-ink";
const CONTROLE_CLASSE =
  "w-full rounded-md border border-line bg-surface px-4 py-2.5 text-[15px] text-ink " +
  "transition-colors duration-200 hover:border-line-strong " +
  "aria-[invalid=true]:border-negativo aria-[invalid=true]:border-2";

function inteiro(texto: string): number {
  const valor = Number.parseInt(texto, 10);
  return Number.isNaN(valor) ? Number.NaN : valor;
}

export function CadastroDeMeioInline({
  rotulo,
  idDoControle,
  nomeInicial = "",
  rotuloDoAtalho = "+ novo",
  ajuda,
  tiposPermitidos = TODOS_OS_TIPOS,
  criarMeioDePagamento,
  aoCriado,
  children,
}: CadastroDeMeioInlineProps) {
  const tipos = TIPOS_DE_MEIO.filter((opcao) => tiposPermitidos.includes(opcao.valor));
  const tipoInicial = tipos[0]?.valor ?? "CARTAO_CREDITO";
  const [nomeMeio, setNomeMeio] = useState("");
  const [tipoMeio, setTipoMeio] = useState<TipoDeMeio>(tipoInicial);
  const [diaFechamento, setDiaFechamento] = useState("");
  const [diaVencimento, setDiaVencimento] = useState("");

  function payloadDeMeio() {
    return entradaMeioPagamentoSchema.safeParse(
      tipoMeio === "CARTAO_CREDITO"
        ? {
            nome: nomeMeio,
            tipo: tipoMeio,
            diaFechamento: inteiro(diaFechamento),
            diaVencimento: inteiro(diaVencimento),
          }
        : { nome: nomeMeio, tipo: tipoMeio },
    );
  }

  return (
    <CadastroInline
      rotulo={rotulo}
      idDoControle={idDoControle}
      rotuloDoAtalho={rotuloDoAtalho}
      descricaoDoGrupo="Novo meio de pagamento"
      validar={() => {
        const resultado = payloadDeMeio();
        return resultado.success ? null : (resultado.error.issues[0]?.message ?? "Dado inválido.");
      }}
      aoCriar={async () => {
        const validado = payloadDeMeio();
        if (!validado.success) {
          throw new Error("payload inválido chegou ao envio");
        }
        const resposta = await criarMeioDePagamento(validado.data);
        return resposta.ok
          ? { ok: true, data: { criado: resposta.data, detalhe: descreverMeio(validado.data) } }
          : resposta;
      }}
      aoCriado={({ criado, detalhe }) => aoCriado(criado, detalhe)}
      aoLimpar={() => {
        setNomeMeio(nomeInicial);
        setTipoMeio(tipoInicial);
        setDiaFechamento("");
        setDiaVencimento("");
      }}
      ajuda={
        ajuda ??
        (tipoMeio === "ROTULO"
          ? "Rótulo não é meio de pagamento: é uma etiqueta para separar um gasto específico, sem ciclo e sem fatura."
          : "Ele passa a valer para todos os meses, inclusive os que ainda não chegaram.")
      }
      campos={(idCadastro) => (
        <>
          <div className="flex flex-col gap-1">
            <label className={ROTULO_CLASSE} htmlFor={`${idCadastro}-nome-meio`}>
              Nome do novo meio de pagamento
            </label>
            <input
              id={`${idCadastro}-nome-meio`}
              className={CONTROLE_CLASSE}
              value={nomeMeio}
              onChange={(e) => setNomeMeio(e.target.value)}
              maxLength={MAX_NOME_MEIO}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={ROTULO_CLASSE} htmlFor={`${idCadastro}-tipo-meio`}>
              Tipo
            </label>
            <select
              id={`${idCadastro}-tipo-meio`}
              className={CONTROLE_CLASSE}
              value={tipoMeio}
              onChange={(e) => setTipoMeio(e.target.value as TipoDeMeio)}
            >
              {tipos.map((opcao) => (
                <option key={opcao.valor} value={opcao.valor}>
                  {opcao.rotulo}
                </option>
              ))}
            </select>
          </div>
          {tipoMeio === "CARTAO_CREDITO" ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex w-full flex-col gap-1">
                <label className={ROTULO_CLASSE} htmlFor={`${idCadastro}-fechamento`}>
                  Dia de fechamento
                </label>
                <input
                  id={`${idCadastro}-fechamento`}
                  className={CONTROLE_CLASSE}
                  inputMode="numeric"
                  value={diaFechamento}
                  onChange={(e) => setDiaFechamento(e.target.value)}
                  placeholder="25"
                />
              </div>
              <div className="flex w-full flex-col gap-1">
                <label className={ROTULO_CLASSE} htmlFor={`${idCadastro}-vencimento`}>
                  Dia de vencimento
                </label>
                <input
                  id={`${idCadastro}-vencimento`}
                  className={CONTROLE_CLASSE}
                  inputMode="numeric"
                  value={diaVencimento}
                  onChange={(e) => setDiaVencimento(e.target.value)}
                  placeholder="5"
                />
              </div>
            </div>
          ) : null}
        </>
      )}
    >
      {children}
    </CadastroInline>
  );
}
