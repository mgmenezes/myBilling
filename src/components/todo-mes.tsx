"use client";

import { useRef, useState } from "react";
import type {
  encerrarRecorrencia as encerrarAction,
  registrarNovaVigencia as registrarVigenciaAction,
} from "@/app/actions/recorrencias";
import { type Aberto, type ContextoDoFormulario, PainelDoFixo } from "./painel-do-fixo";
import { ID_DO_PAINEL, type ItemDeFixo, idDoBotaoDaLinha, TabelaDeFixos } from "./tabela-de-fixos";

/**
 * A tela de Todo mês: o cabeçalho com "+ Novo fixo", os dois totais do mês, o
 * painel e as seções (FIXCOL-03, 06 a 09).
 *
 * **Um componente cliente só**, porque o botão do topo, as linhas e o painel
 * dividem o mesmo estado: o que está aberto. Um contexto só para isso seria
 * mais peça.
 *
 * **O fixo aberto fica no endereço**, em `?fixo=<id>`, por `replaceState`:
 * recarregar ou mandar o link abre o mesmo fixo, e o "Voltar" do navegador
 * continua saindo da tela, sem uma entrada por clique (FIXCOL-09). A página lê
 * o parâmetro no servidor e o entrega em `fixoInicial`; um id que não está na
 * lista do mês é ignorado. O cadastro não vai para o endereço.
 *
 * **O painel vem antes das seções no DOM**, entre os totais e a lista, e só
 * existe enquanto algo está aberto (FIXCOL-07, ACs 5 e 6). Abrir leva o foco ao
 * título dele; fechar devolve o foco a quem abriu: o botão da linha, ou o
 * "+ Novo fixo" quando era o cadastro ou quando o fixo saiu da lista
 * (FIXCOL-08, ACs 2 e 4).
 */

/** Põe ou tira `?fixo=` sem mexer nos outros parâmetros e sem entrada nova no histórico. */
function gravarNoEndereco(id: string | null): void {
  const parametros = new URLSearchParams(window.location.search);
  if (id === null) {
    parametros.delete("fixo");
  } else {
    parametros.set("fixo", id);
  }
  const busca = parametros.toString();
  window.history.replaceState(null, "", busca === "" ? window.location.pathname : `?${busca}`);
}

export function TodoMes({
  competencia,
  rotuloDaCompetencia,
  nomeDoMes,
  entradas,
  saidas,
  totalEntradas,
  totalSaidas,
  fixoInicial,
  formulario,
  registrarVigencia,
  encerrar,
}: {
  /** O mês aberto, `'YYYY-MM'`. */
  readonly competencia: string;
  /** "Março de 2026". */
  readonly rotuloDaCompetencia: string;
  /** "Março". */
  readonly nomeDoMes: string;
  readonly entradas: ReadonlyArray<ItemDeFixo>;
  readonly saidas: ReadonlyArray<ItemDeFixo>;
  /** Formatados: "R$ 185,00". */
  readonly totalEntradas: string;
  readonly totalSaidas: string;
  /** O `?fixo=` com que a página foi carregada, lido no servidor. */
  readonly fixoInicial: string | null;
  readonly formulario: ContextoDoFormulario;
  readonly registrarVigencia: typeof registrarVigenciaAction;
  readonly encerrar: typeof encerrarAction;
}) {
  const itens = [...entradas, ...saidas];
  const [aberto, setAberto] = useState<Aberto>(() => {
    const inicial = itens.find((item) => item.id === fixoInicial);
    return inicial === undefined
      ? { tipo: "nada" }
      : { tipo: "fixo", id: inicial.id, descricao: inicial.descricao };
  });
  /* 0 na carga: o painel aberto por `?fixo=` não rouba o foco. */
  const [focarTitulo, setFocarTitulo] = useState(0);
  const botaoNovo = useRef<HTMLButtonElement>(null);

  function abrirFixo(id: string): void {
    const item = itens.find((i) => i.id === id);
    if (item === undefined) {
      return;
    }
    setAberto({ tipo: "fixo", id, descricao: item.descricao });
    setFocarTitulo((n) => n + 1);
    gravarNoEndereco(id);
  }

  function abrirCadastro(): void {
    setAberto({ tipo: "novo" });
    setFocarTitulo((n) => n + 1);
    gravarNoEndereco(null);
  }

  function fechar(): void {
    const linha =
      aberto.tipo === "fixo" ? document.getElementById(idDoBotaoDaLinha(aberto.id)) : null;
    (linha ?? botaoNovo.current)?.focus();
    setAberto({ tipo: "nada" });
    gravarNoEndereco(null);
  }

  return (
    <div className="mx-auto grid w-full max-w-conteudo gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-[28px] leading-[1.1] sm:text-[34px]">Todo mês</h1>
        <button
          ref={botaoNovo}
          type="button"
          onClick={abrirCadastro}
          aria-controls={ID_DO_PAINEL}
          aria-expanded={aberto.tipo === "novo"}
          className="inline-flex min-h-11 w-fit items-center justify-center rounded-pill bg-primary px-6 text-[15px] font-semibold text-on-primary transition-[transform,background-color] duration-200 hover:bg-primary-ativo active:scale-[0.97]"
        >
          + Novo fixo
        </button>
      </div>

      {/* Só valores de ocorrência: o total de saídas é o do bloco "Fixos" de
          Lançamentos no mesmo mês (FIXCOL-03). */}
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="text-[14px] text-ink-muted">Saídas fixas em {rotuloDaCompetencia}</dt>
          <dd className="tabular text-[28px] leading-[1.1] tracking-[-0.01em]">{totalSaidas}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-[14px] text-ink-muted">Entradas fixas em {rotuloDaCompetencia}</dt>
          <dd className="tabular text-[28px] leading-[1.1] tracking-[-0.01em] text-positivo">
            {totalEntradas}
          </dd>
        </div>
      </dl>

      {aberto.tipo === "nada" ? null : (
        <PainelDoFixo
          aberto={aberto}
          itens={itens}
          focarTitulo={focarTitulo}
          aoFechar={fechar}
          competencia={competencia}
          rotuloDaCompetencia={rotuloDaCompetencia}
          nomeDoMes={nomeDoMes}
          formulario={formulario}
          registrarVigencia={registrarVigencia}
          encerrar={encerrar}
        />
      )}

      <TabelaDeFixos
        entradas={entradas}
        saidas={saidas}
        totalEntradas={totalEntradas}
        totalSaidas={totalSaidas}
        nomeDoMes={nomeDoMes}
        abertoId={aberto.tipo === "fixo" ? aberto.id : null}
        aoAbrir={abrirFixo}
      />
    </div>
  );
}
