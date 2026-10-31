"use client";

import { WarningCircleIcon } from "@phosphor-icons/react";
import { type FormEvent, useId, useState, useTransition } from "react";
import type { criarMeioDePagamento as criarMeioAction } from "@/app/actions/meios-de-pagamento";
import {
  entradaMeioPagamentoSchema,
  TIPOS_DE_MEIO,
} from "@/application/schemas/meio-pagamento.schema";
import { CamposDoMeio, type ErrosDoMeio, type ValoresDoMeio } from "./campos-do-meio";
import { TituloDoPainel } from "./coluna-de-cadastro";

/**
 * Cadastrar um meio de pagamento pelo painel de Cadastros (CADCOL-08).
 *
 * Os campos, as regras, a ajuda e as mensagens são os do cadastro inline de
 * hoje (AC 3): o mesmo `CamposDoMeio`, o mesmo schema e a mesma action, que
 * recusa o nome de um meio ativo, em qualquer caixa (AC 5). O tipo começa em
 * Cartão de crédito, e os dois dias só existem nele (ACs 1 e 2).
 *
 * **A regra também roda no navegador** (L-041): o nome vazio ou com mais de 40
 * caracteres e o dia fora de 1 a 31 não chegam ao servidor, e cada mensagem
 * fica junto do campo dela. A recusa do servidor num campo também; a sem
 * campo, no formulário.
 *
 * O formulário entrega à aba o id do meio criado; é a aba que avisa e o abre
 * no painel (AC 4).
 */

const AJUDA = "Ele passa a valer para todos os meses, inclusive os que ainda não chegaram.";
const AJUDA_DO_ROTULO =
  "Rótulo não é meio de pagamento: é uma etiqueta para separar um gasto específico, sem ciclo e sem fatura.";

const TODOS_OS_TIPOS = TIPOS_DE_MEIO.map((opcao) => opcao.valor);

const VAZIO: ValoresDoMeio = {
  nome: "",
  tipo: "CARTAO_CREDITO",
  diaFechamento: "",
  diaVencimento: "",
};

/** O dia como número; o que não é número vira `NaN`, e o schema o recusa. */
function inteiro(texto: string): number {
  return Number.parseInt(texto, 10);
}

/** As mensagens dos campos da tela; a de outra chave fica de fora. */
function errosDosCampos(campos: Readonly<Record<string, string>>): ErrosDoMeio {
  const erros: Record<string, string> = {};
  for (const chave of ["nome", "diaFechamento", "diaVencimento"] as const) {
    const mensagem = campos[chave];
    if (mensagem !== undefined) {
      erros[chave] = mensagem;
    }
  }
  return erros;
}

export function NovoMeio({
  criarMeioDePagamento,
  aoCriado,
  aoCancelar,
}: {
  readonly criarMeioDePagamento: typeof criarMeioAction;
  /** O id do meio criado. */
  readonly aoCriado: (id: string) => void;
  readonly aoCancelar: () => void;
}) {
  const id = useId();
  const [, iniciar] = useTransition();
  const [valores, setValores] = useState<ValoresDoMeio>(VAZIO);
  const [erros, setErros] = useState<ErrosDoMeio>({});
  const [erroGeral, setErroGeral] = useState("");

  /** Junto do campo quando a recusa é de um campo da tela; senão, no formulário. */
  function recusar(campos: Readonly<Record<string, string>>, mensagem: string) {
    const doCampo = errosDosCampos(campos);
    setErros(doCampo);
    setErroGeral(Object.keys(doCampo).length > 0 ? "" : mensagem);
  }

  function criar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const validado = entradaMeioPagamentoSchema.safeParse(
      valores.tipo === "CARTAO_CREDITO"
        ? {
            nome: valores.nome,
            tipo: valores.tipo,
            diaFechamento: inteiro(valores.diaFechamento),
            diaVencimento: inteiro(valores.diaVencimento),
          }
        : { nome: valores.nome, tipo: valores.tipo },
    );
    if (!validado.success) {
      const campos: Record<string, string> = {};
      for (const issue of validado.error.issues) {
        campos[issue.path.join(".")] ??= issue.message;
      }
      recusar(campos, validado.error.issues[0]?.message ?? "");
      return;
    }
    setErros({});
    setErroGeral("");
    iniciar(async () => {
      const resposta = await criarMeioDePagamento(validado.data);
      if (!resposta.ok) {
        recusar(resposta.erro.campos ?? {}, resposta.erro.mensagem);
        return;
      }
      aoCriado(resposta.data.id);
    });
  }

  return (
    <>
      <TituloDoPainel>Novo meio de pagamento</TituloDoPainel>
      {/* Os dois dias seguem a largura do formulário, e não a da janela:
          na coluna de 384 px ficam um embaixo do outro (FPC-01). */}
      <form
        aria-label="Novo meio de pagamento"
        onSubmit={criar}
        noValidate
        className="@container flex flex-col gap-4"
      >
        <CamposDoMeio
          idBase={id}
          valores={valores}
          aoMudar={(parcial) => setValores((atuais) => ({ ...atuais, ...parcial }))}
          rotuloDoNome="Nome"
          tipos={TODOS_OS_TIPOS}
          diasPelaLargura
          erros={erros}
        />
        <p className="text-[13px] text-ink-muted">
          {valores.tipo === "ROTULO" ? AJUDA_DO_ROTULO : AJUDA}
        </p>
        {erroGeral === "" ? null : (
          <p
            role="alert"
            className="flex items-center gap-1.5 text-[14px] font-medium text-negativo"
          >
            <WarningCircleIcon size={15} weight="fill" aria-hidden="true" className="shrink-0" />
            {erroGeral}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className="min-h-11 rounded-pill bg-primary px-5 text-[15px] font-semibold text-on-primary transition-[transform,background-color] duration-200 hover:bg-primary-ativo active:scale-[0.97]"
          >
            Criar meio
          </button>
          <button
            type="button"
            onClick={aoCancelar}
            className="min-h-11 rounded-pill px-4 text-[15px] font-semibold text-ink-muted transition-colors duration-200 hover:bg-surface-strong hover:text-ink"
          >
            Cancelar
          </button>
        </div>
      </form>
    </>
  );
}
