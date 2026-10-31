"use client";

import { useRouter } from "next/navigation";
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
 * **O fixo aberto fica no endereço**, em `?fixo=<id>`, por `router.replace`:
 * recarregar ou mandar o link abre o mesmo fixo, e o "Voltar" do navegador
 * continua saindo da tela, sem uma entrada por clique (FIXCOL-09). A página lê
 * o parâmetro no servidor e o entrega em `fixoInicial`; um id que não está na
 * lista do mês é ignorado. O cadastro não vai para o endereço.
 *
 * **Trocar o `?fixo=` passa pelo roteador do Next**, com
 * `router.replace(…, { scroll: false })`, e não por `history.replaceState`.
 * O `replaceState` muda o endereço sem que o Next desenhe a página dele, e
 * deixa no Next uma rolagem até o alto pendente, que a próxima página relida
 * executa: a da action ao salvar, ou qualquer outra. A confirmação de salvar
 * saía da janela uns 200 ms depois de aparecer (FIXCOL-05, AC 5; FIXCOL-06,
 * AC 3). Pelo roteador, a navegação lê no servidor a página do endereço novo
 * e não rola. Custa uma ida ao servidor a cada abrir ou fechar que muda o
 * endereço; o painel abre na hora, pelo estado da tela.
 *
 * **Um painel só, que muda de lugar por CSS** (FIXCOL-07), como o cartão de
 * filtros de Lançamentos. Abaixo de 1.536 px a tela é uma coluna de até
 * 1.024 px, e o painel vem entre os totais e a lista, só enquanto algo está
 * aberto: sem nada aberto, a coluna dele fica escondida (ACs 5 e 6). A partir
 * de 1.536 px vira uma grade: a lista no centro, com até 1.100 px, e o painel
 * preso numa coluna de 384 px à direita, separada por uma linha fina, que
 * mostra a dica quando nada está aberto (ACs 1 a 4). A ordem do DOM é a da
 * tela estreita; a grade só põe a coluna do lado.
 *
 * Abrir leva o foco ao título do painel; fechar devolve o foco a quem abriu:
 * o botão da linha, ou o "+ Novo fixo" quando era o cadastro ou quando o fixo
 * saiu da lista (FIXCOL-08, ACs 2 e 4).
 */

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
  const router = useRouter();

  /* O `fixo` do último endereço pedido. Pelo `router.replace`, a URL só muda
     quando o servidor responde, uns 100 ms depois; até lá `window.location`
     ainda mostra o endereço de antes. Comparar com ele errava quem fechava
     logo depois de abrir, ou reabria logo depois de fechar (FIXCOL-09, ACs 1
     e 4). Vale o último pedido, porque o Next descarta a navegação pendente
     quando chega outra. Começa com o `?fixo=` da carga, mesmo fora da lista:
     é o que está na URL, e abrir o cadastro o tira. */
  const fixoPedido = useRef<string | null>(fixoInicial);

  /** Põe ou tira `?fixo=`, sem mexer nos outros parâmetros, sem entrada nova no histórico e sem rolar. */
  function mudarEndereco(id: string | null): void {
    if (id === fixoPedido.current) {
      return;
    }
    fixoPedido.current = id;
    const parametros = new URLSearchParams(window.location.search);
    if (id === null) {
      parametros.delete("fixo");
    } else {
      parametros.set("fixo", id);
    }
    const busca = parametros.toString();
    router.replace(busca === "" ? window.location.pathname : `?${busca}`, { scroll: false });
  }

  function abrirFixo(id: string): void {
    const item = itens.find((i) => i.id === id);
    if (item === undefined) {
      return;
    }
    setAberto({ tipo: "fixo", id, descricao: item.descricao });
    setFocarTitulo((n) => n + 1);
    mudarEndereco(id);
  }

  function abrirCadastro(): void {
    setAberto({ tipo: "novo" });
    setFocarTitulo((n) => n + 1);
    mudarEndereco(null);
  }

  function fechar(): void {
    const linha =
      aberto.tipo === "fixo" ? document.getElementById(idDoBotaoDaLinha(aberto.id)) : null;
    (linha ?? botaoNovo.current)?.focus();
    setAberto({ tipo: "nada" });
    mudarEndereco(null);
  }

  return (
    /* Uma quarta linha, flexível, recebe a altura que a coluna tiver a mais
       que a lista: sem ela, um painel alto abriria espaço entre o título, os
       totais e as seções. */
    <div className="mx-auto grid w-full max-w-conteudo gap-6 px-4 py-8 sm:px-6 sm:py-10 2xl:max-w-none 2xl:grid-cols-[minmax(0,1fr)_24rem] 2xl:grid-rows-[auto_auto_auto_1fr] 2xl:gap-0 2xl:p-0">
      <div className="flex flex-wrap items-start justify-between gap-4 2xl:col-start-1 2xl:row-start-1 2xl:mx-auto 2xl:w-full 2xl:max-w-[1100px] 2xl:px-6 2xl:pt-10 2xl:pb-6">
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
      <dl className="grid gap-4 sm:grid-cols-2 2xl:col-start-1 2xl:row-start-2 2xl:mx-auto 2xl:w-full 2xl:max-w-[1100px] 2xl:px-6 2xl:pb-8">
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

      {/* A coluna, da altura da página, leva a linha fina; o painel dentro
          dela fica preso no alto. Sem nada aberto, ela só aparece a partir de
          1.536 px, com a dica. */}
      <div
        className={`2xl:col-start-2 2xl:row-span-4 2xl:row-start-1 2xl:border-l 2xl:border-line ${
          aberto.tipo === "nada" ? "hidden 2xl:block" : ""
        }`}
      >
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
      </div>

      <div className="min-w-0 2xl:col-start-1 2xl:row-start-3 2xl:mx-auto 2xl:w-full 2xl:max-w-[1100px] 2xl:px-6 2xl:pb-10">
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
    </div>
  );
}
