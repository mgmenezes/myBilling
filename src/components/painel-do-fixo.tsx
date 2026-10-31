"use client";

import { XIcon } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";
import type { criarCategoria as criarCategoriaAction } from "@/app/actions/categorias";
import type { criarMeioDePagamento as criarMeioAction } from "@/app/actions/meios-de-pagamento";
import type {
  criarRecorrencia as criarRecorrenciaAction,
  editarRecorrencia as editarRecorrenciaAction,
  encerrarRecorrencia as encerrarAction,
  registrarNovaVigencia as registrarVigenciaAction,
} from "@/app/actions/recorrencias";
import { CicloDoFixo } from "./ciclo-do-fixo";
import { DetalheDoFixo } from "./detalhe-do-fixo";
import { FormRecorrencia } from "./form-recorrencia";
import { ID_DO_PAINEL, type ItemDeFixo } from "./tabela-de-fixos";

/**
 * O painel de Todo mês: o fixo aberto, ou o cadastro, ao lado da lista
 * (FIXCOL-04 a 06). Substitui os diálogos de cadastro e de edição e os
 * controles de cada cartão: um painel só, com um formulário por vez.
 *
 * **O título é o alvo do foco.** Abrir um fixo ou o cadastro, pela pessoa,
 * muda `focarTitulo`, e o `h2` recebe o foco (FIXCOL-08, AC 2): o painel vem
 * antes da lista no DOM, e sem isso quem usa teclado não chegaria a ele. A
 * carga da página com `?fixo=` passa 0 e não rouba o foco. O painel pode
 * nascer junto com o pedido, quando nada estava aberto: por isso o pedido vale
 * também na montagem, se não for 0.
 *
 * **O sub-modo vive aqui, um por fixo.** Detalhe, mudar o valor, encerrar ou
 * editar nascem no detalhe a cada fixo aberto, porque o conteúdo é montado com
 * a chave do fixo: trocar de fixo, ou fechar e reabrir, descarta o que foi
 * digitado (FIXCOL-04, AC 9), como fechar o diálogo de edição já fazia.
 *
 * **Trocar de sub-modo também leva o foco.** O botão que a pessoa acionou some
 * com o modo dele, e o foco cairia no `body`. Ele vai ao título do que
 * aparece: o do controle ou da edição, ou o do painel na volta ao detalhe.
 * Do mesmo jeito, o botão de envio que se desabilita enquanto grava
 * ("Gravando…") devolve o foco ao título do painel, e não ao `body`: sem isso,
 * o `Escape` depois de salvar não alcançaria o painel (FIXCOL-08, AC 3). Esse
 * foco vai **sem rolar**: a pessoa está no pé do formulário, e a confirmação,
 * ou o alerta da recusa, aparece ali, junto do botão que ela clicou, à vista
 * (FIXCOL-05, AC 5; FIXCOL-06, AC 3). Rolando, a tela ia ao título e a
 * mensagem saía da janela. Quando a confirmação aparece, o formulário leva o
 * foco a ela.
 *
 * **O fixo que sai do mês depois de uma ação** (encerrado a partir do mês
 * aberto, ou com "Termina em" antes dele) deixa de estar em `itens` quando a
 * página relê. O painel não pode oferecer ações de um fixo que já não está na
 * lista: mostra o aviso com a descrição guardada na abertura (FIXCOL-05, AC 8).
 */

export type Aberto =
  | { readonly tipo: "nada" }
  | { readonly tipo: "novo" }
  | { readonly tipo: "fixo"; readonly id: string; readonly descricao: string };

/** As listas e as actions do formulário, as mesmas no cadastro e na edição. */
export interface ContextoDoFormulario {
  readonly meios: ReadonlyArray<{
    readonly id: string;
    readonly nome: string;
    readonly geraFatura: boolean;
  }>;
  readonly categorias: ReadonlyArray<{ readonly id: string; readonly nome: string }>;
  readonly usuarios: ReadonlyArray<{ readonly id: string; readonly nome: string }>;
  readonly criar: typeof criarRecorrenciaAction;
  readonly editar: typeof editarRecorrenciaAction;
  readonly criarCategoria: typeof criarCategoriaAction;
  readonly criarMeioDePagamento: typeof criarMeioAction;
}

export function PainelDoFixo({
  aberto,
  itens,
  focarTitulo,
  aoFechar,
  competencia,
  rotuloDaCompetencia,
  nomeDoMes,
  formulario,
  registrarVigencia,
  encerrar,
}: {
  readonly aberto: Aberto;
  /** Os fixos da lista do mês, entradas e saídas. */
  readonly itens: ReadonlyArray<ItemDeFixo>;
  /** Muda a cada abertura feita pela pessoa; 0 enquanto nenhuma foi feita. */
  readonly focarTitulo: number;
  readonly aoFechar: () => void;
  /** O mês aberto, `'YYYY-MM'`. */
  readonly competencia: string;
  /** "Março de 2026". */
  readonly rotuloDaCompetencia: string;
  /** "Março". */
  readonly nomeDoMes: string;
  readonly formulario: ContextoDoFormulario;
  readonly registrarVigencia: typeof registrarVigenciaAction;
  readonly encerrar: typeof encerrarAction;
}) {
  const titulo = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focarTitulo !== 0) {
      titulo.current?.focus();
    }
  }, [focarTitulo]);

  const item = aberto.tipo === "fixo" ? itens.find((i) => i.id === aberto.id) : undefined;

  return (
    <aside
      id={ID_DO_PAINEL}
      aria-label="Painel do fixo"
      onKeyDown={(evento) => {
        if (evento.key === "Escape" && aberto.tipo !== "nada") {
          aoFechar();
        }
      }}
      onBlur={(evento) => {
        /* Sem destino e com o botão desabilitado: é o navegador tirando o
           foco de quem passou a gravar, e não a pessoa saindo do painel. O
           foco fica no painel sem levar a tela ao título. */
        if (
          evento.relatedTarget === null &&
          evento.target instanceof HTMLButtonElement &&
          evento.target.disabled
        ) {
          titulo.current?.focus({ preventScroll: true });
        }
      }}
      /* Abaixo de 1.536 px, um cartão entre os totais e a lista. Na coluna, o
         cartão perde a moldura, fica preso no alto e rola por conta própria
         quando é mais alto que a janela (FIXCOL-07, AC 2). */
      className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-5 2xl:sticky 2xl:top-0 2xl:max-h-dvh 2xl:overflow-y-auto 2xl:rounded-none 2xl:border-0 2xl:bg-transparent 2xl:px-6 2xl:py-10"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 ref={titulo} tabIndex={-1} className="text-[22px] leading-[1.2] tracking-[-0.01em]">
            {aberto.tipo === "nada"
              ? "Nenhum fixo aberto"
              : aberto.tipo === "novo"
                ? "Novo gasto fixo ou entrada"
                : (item?.descricao ?? aberto.descricao)}
          </h2>
          {item === undefined ? null : (
            <p className="text-[14px] text-ink-muted">
              {item.natureza === "DESPESA"
                ? `Saída fixa · vence dia ${item.diaVencimento}`
                : `Entrada fixa · cai dia ${item.diaVencimento}`}
            </p>
          )}
        </div>
        {aberto.tipo === "nada" ? null : (
          <button
            type="button"
            aria-label="Fechar"
            onClick={aoFechar}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-pill text-ink-muted transition-colors duration-200 hover:bg-surface-strong hover:text-ink"
          >
            <XIcon size={20} aria-hidden="true" />
          </button>
        )}
      </div>

      {aberto.tipo === "nada" ? (
        <p className="text-[15px] text-ink-muted">
          Escolha um fixo na lista para ver o valor ao longo dos meses e para mudar o valor, editar
          ou encerrar.
        </p>
      ) : null}

      {aberto.tipo === "novo" ? (
        <FormRecorrencia
          competencia={competencia}
          meios={formulario.meios}
          categorias={formulario.categorias}
          usuarios={formulario.usuarios}
          criar={formulario.criar}
          criarCategoria={formulario.criarCategoria}
          criarMeioDePagamento={formulario.criarMeioDePagamento}
        />
      ) : null}

      {aberto.tipo === "fixo" && item === undefined ? (
        <p className="text-[15px] text-ink">
          {aberto.descricao} não aparece mais em {rotuloDaCompetencia}.
        </p>
      ) : null}

      {item === undefined ? null : (
        <ConteudoDoFixo
          key={item.id}
          item={item}
          focarTituloDoPainel={() => titulo.current?.focus()}
          competencia={competencia}
          rotuloDaCompetencia={rotuloDaCompetencia}
          nomeDoMes={nomeDoMes}
          formulario={formulario}
          registrarVigencia={registrarVigencia}
          encerrar={encerrar}
        />
      )}
    </aside>
  );
}

type SubModo = "detalhe" | "valor" | "encerrar" | "editar";

function ConteudoDoFixo({
  item,
  focarTituloDoPainel,
  competencia,
  rotuloDaCompetencia,
  nomeDoMes,
  formulario,
  registrarVigencia,
  encerrar,
}: {
  readonly item: ItemDeFixo;
  /** A volta ao detalhe leva o foco ao título do painel, que é o nome do fixo. */
  readonly focarTituloDoPainel: () => void;
  readonly competencia: string;
  readonly rotuloDaCompetencia: string;
  readonly nomeDoMes: string;
  readonly formulario: ContextoDoFormulario;
  readonly registrarVigencia: typeof registrarVigenciaAction;
  readonly encerrar: typeof encerrarAction;
}) {
  const [modo, setModo] = useState<SubModo>("detalhe");
  const idDaEdicao = useId();
  const tituloDoModo = useRef<HTMLHeadingElement>(null);
  /* Só a troca feita pela pessoa move o foco, e uma vez: abrir o fixo já
     cuida do título do painel, e reler a página não pode roubá-lo. */
  const pediuFoco = useRef(false);

  useEffect(() => {
    if (!pediuFoco.current) {
      return;
    }
    pediuFoco.current = false;
    if (modo === "detalhe") {
      focarTituloDoPainel();
    } else {
      tituloDoModo.current?.focus();
    }
  }, [modo, focarTituloDoPainel]);

  function trocar(proximo: SubModo): void {
    pediuFoco.current = true;
    setModo(proximo);
  }

  if (modo === "detalhe") {
    return (
      <DetalheDoFixo
        item={item}
        rotuloDaCompetencia={rotuloDaCompetencia}
        nomeDoMes={nomeDoMes}
        aoMudarValor={() => trocar("valor")}
        aoEditar={() => trocar("editar")}
        aoEncerrar={() => trocar("encerrar")}
      />
    );
  }

  if (modo === "editar") {
    return (
      <section aria-labelledby={idDaEdicao} className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h3 id={idDaEdicao} ref={tituloDoModo} tabIndex={-1} className="text-[17px] font-medium">
            {item.natureza === "RECEITA" ? "Editar entrada" : "Editar gasto fixo"}
          </h3>
          <button
            type="button"
            onClick={() => trocar("detalhe")}
            className="min-h-11 rounded-pill px-4 text-[14px] font-semibold text-ink-muted transition-colors duration-200 hover:bg-surface-strong hover:text-ink md:pointer-fine:min-h-9"
          >
            Voltar
          </button>
        </div>
        {/* A edição de hoje, sem o diálogo. Depois de salvar, o formulário
            fica com a confirmação, e `router.refresh()` relê a lista e o
            painel. O valor é a previsão do mês, e não o confirmado (EDF-03,
            AC 3). */}
        <FormRecorrencia
          competencia={competencia}
          meios={formulario.meios}
          categorias={formulario.categorias}
          usuarios={formulario.usuarios}
          criarCategoria={formulario.criarCategoria}
          criarMeioDePagamento={formulario.criarMeioDePagamento}
          edicao={{
            fixo: {
              recorrenciaId: item.id,
              descricao: item.descricao,
              natureza: item.natureza,
              valorCentavos: item.valorNoMesCentavos,
              diaVencimento: item.diaVencimento,
              competenciaInicio: item.competenciaInicio,
              competenciaFim: item.competenciaFim,
              meioPagamentoId: item.meioPagamentoId,
              categoriaId: item.categoriaId,
              usuarioId: item.usuarioId,
            },
            editar: formulario.editar,
          }}
        />
      </section>
    );
  }

  return (
    <CicloDoFixo
      modo={modo}
      recorrenciaId={item.id}
      competencia={competencia}
      rotuloDaCompetencia={rotuloDaCompetencia}
      registrarVigencia={registrarVigencia}
      encerrar={encerrar}
      aoConcluir={() => trocar("detalhe")}
      aoCancelar={() => trocar("detalhe")}
      refDoTitulo={tituloDoModo}
    />
  );
}
