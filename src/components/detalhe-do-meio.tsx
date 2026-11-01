"use client";

import { WarningCircleIcon } from "@phosphor-icons/react";
import { type FormEvent, useId, useState, useTransition } from "react";
import type { editarMeioDePagamento } from "@/app/actions/meios-de-pagamento";
import { entradaEdicaoDoMeioSchema } from "@/application/schemas/meio-pagamento.schema";
import { useAvisos } from "./avisos";
import { CamposDoMeio, type ErrosDoMeio, type ValoresDoMeio } from "./campos-do-meio";
import { TituloDoPainel } from "./coluna-de-cadastro";
import { OndeAparece } from "./onde-aparece";
import { type ItemDeMeio, rotuloDoTipo } from "./tabela-de-meios";

/**
 * O meio aberto no painel: o nome, os dias do cartão e onde ele aparece
 * (CADCOL-07, ACs 1 a 6 e 8 a 13).
 *
 * **O tipo não muda** (AC 4): os campos são os de `CamposDoMeio`, com o tipo
 * em texto e a frase que diz como trocar. No cartão, os dois dias vêm
 * preenchidos com os gravados, com a nota de que mudá-los não move compra
 * nenhuma; na conta e no rótulo, nem dias nem nota (AC 3).
 *
 * **A regra também roda no navegador** (L-041), com o mesmo schema da action:
 * o nome vazio ou com mais de 40 caracteres e o dia fora de 1 a 31 não chegam
 * ao servidor, e cada mensagem fica junto do campo dela (AC 10). O nome e os
 * dias iguais aos gravados, depois da mesma normalização, não chamam o
 * servidor nem avisam (AC 9); o nome que muda só na caixa grava (AC 8).
 *
 * **Sem otimista.** O título e o subtítulo são os gravados; a resposta da
 * action já traz a lista nova, e com ela o nome e os dias novos na linha e no
 * painel (AC 5). A recusa num campo aparece junto dele; a sem campo, como o
 * meio que não existe mais, no formulário (ACs 6, 11 e 12).
 */

const NOTA_DOS_DIAS =
  "Mudar os dias não move nenhuma compra: cada uma fica no mês em que foi lançada.";

/** "Cartão de crédito · fecha dia 25 · vence dia 5", "Conta corrente" ou "Rótulo". */
function subtitulo(meio: ItemDeMeio): string {
  const tipo = rotuloDoTipo(meio.tipo);
  return meio.diaFechamento === null || meio.diaVencimento === null
    ? tipo
    : `${tipo} · fecha dia ${meio.diaFechamento} · vence dia ${meio.diaVencimento}`;
}

function gravados(meio: ItemDeMeio): ValoresDoMeio {
  return {
    nome: meio.nome,
    tipo: meio.tipo,
    diaFechamento: meio.diaFechamento === null ? "" : String(meio.diaFechamento),
    diaVencimento: meio.diaVencimento === null ? "" : String(meio.diaVencimento),
  };
}

/** O dia como número; o que não é número vira `NaN`, e o schema o recusa. */
function inteiro(texto: string): number {
  return Number.parseInt(texto, 10);
}

/** A chave de cada campo na recusa, do schema e da action, para o campo da tela. */
const CAMPO_DA_RECUSA: Readonly<Record<string, keyof ErrosDoMeio>> = {
  nome: "nome",
  "ciclo.diaFechamento": "diaFechamento",
  "ciclo.diaVencimento": "diaVencimento",
};

/** As mensagens dos campos da tela; a de outra chave, como `meioPagamentoId`, fica de fora. */
function errosDosCampos(campos: Readonly<Record<string, string>>): ErrosDoMeio {
  const erros: Record<string, string> = {};
  for (const [chave, mensagem] of Object.entries(campos)) {
    const campo = CAMPO_DA_RECUSA[chave];
    if (campo !== undefined) {
      erros[campo] = mensagem;
    }
  }
  return erros;
}

export function DetalheDoMeio({
  meio,
  competencia,
  rotuloDaCompetencia,
  editar,
}: {
  readonly meio: ItemDeMeio;
  /** O mês aberto, `'YYYY-MM'`, para o link de Lançamentos. */
  readonly competencia: string;
  /** "Março de 2026". */
  readonly rotuloDaCompetencia: string;
  readonly editar: typeof editarMeioDePagamento;
}) {
  const id = useId();
  const { avisar } = useAvisos();
  const [, iniciar] = useTransition();
  const [valores, setValores] = useState<ValoresDoMeio>(() => gravados(meio));
  const [erros, setErros] = useState<ErrosDoMeio>({});
  const [erroGeral, setErroGeral] = useState("");
  const cartao = meio.tipo === "CARTAO_CREDITO";

  /** Junto do campo quando a recusa é de um campo da tela; senão, no formulário. */
  function recusar(campos: Readonly<Record<string, string>>, mensagem: string) {
    const doCampo = errosDosCampos(campos);
    const temCampo = Object.keys(doCampo).length > 0;
    setErros(doCampo);
    setErroGeral(temCampo ? "" : mensagem);
  }

  function salvarAlteracoes(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const validado = entradaEdicaoDoMeioSchema.safeParse({
      meioPagamentoId: meio.id,
      nome: valores.nome,
      ciclo: cartao
        ? {
            diaFechamento: inteiro(valores.diaFechamento),
            diaVencimento: inteiro(valores.diaVencimento),
          }
        : null,
    });
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
    const pedido = validado.data;
    /* Nada mudou: não grava e não avisa (CADCOL-07, AC 9). */
    if (
      pedido.nome === meio.nome &&
      (pedido.ciclo?.diaFechamento ?? null) === meio.diaFechamento &&
      (pedido.ciclo?.diaVencimento ?? null) === meio.diaVencimento
    ) {
      return;
    }
    iniciar(async () => {
      const resposta = await editar(pedido);
      if (!resposta.ok) {
        recusar(resposta.erro.campos ?? {}, resposta.erro.mensagem);
        return;
      }
      setValores((atuais) => ({ ...atuais, nome: pedido.nome }));
      if (resposta.data.alterado) {
        avisar("Meio de pagamento salvo.");
      }
    });
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <TituloDoPainel>{meio.nome}</TituloDoPainel>
        <p className="text-[15px] text-ink-muted">{subtitulo(meio)}</p>
      </div>

      {/* Os dois dias seguem a largura do formulário, e não a da janela:
          na coluna de 384 px ficam um embaixo do outro (FPC-01). */}
      <form
        aria-label={`Editar ${meio.nome}`}
        onSubmit={salvarAlteracoes}
        noValidate
        className="@container flex flex-col gap-4"
      >
        <CamposDoMeio
          idBase={id}
          valores={valores}
          aoMudar={(parcial) => setValores((atuais) => ({ ...atuais, ...parcial }))}
          rotuloDoNome="Nome"
          tipos={null}
          diasPelaLargura
          erros={erros}
        />
        {cartao ? <p className="text-[13px] text-ink-muted">{NOTA_DOS_DIAS}</p> : null}
        {erroGeral === "" ? null : (
          <p
            role="alert"
            className="flex items-center gap-1.5 text-[14px] font-medium text-negativo"
          >
            <WarningCircleIcon size={15} weight="fill" aria-hidden="true" className="shrink-0" />
            {erroGeral}
          </p>
        )}
        <button
          type="submit"
          className="min-h-11 w-fit rounded-pill bg-primary px-5 text-[15px] font-semibold text-on-primary transition-[transform,background-color] duration-200 hover:bg-primary-ativo active:scale-[0.97]"
        >
          Salvar alterações
        </button>
      </form>

      <OndeAparece
        genero="ele"
        fixos={meio.fixos}
        lancamentos={meio.lancamentos}
        rotuloDaCompetencia={rotuloDaCompetencia}
        href={`/${competencia}/lancamentos?meioPagamentoId=${meio.id}`}
      />
    </>
  );
}
