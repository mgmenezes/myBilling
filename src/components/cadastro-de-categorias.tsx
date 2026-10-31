"use client";

import { useEffect, useRef, useState } from "react";
import type {
  criarCategoria as criarCategoriaAction,
  renomearCategoria,
  trocarCorDaCategoria,
} from "@/app/actions/categorias";
import { useAvisos } from "./avisos";
import { CabecalhoDeCadastros } from "./cabecalho-de-cadastros";
import { ColunaDeCadastro } from "./coluna-de-cadastro";
import { DetalheDaCategoria } from "./detalhe-da-categoria";
import { NovaCategoria } from "./nova-categoria";
import { useParametroNaUrl } from "./parametro-na-url";
import {
  ID_DO_PAINEL_DA_CATEGORIA,
  type ItemDeCategoria,
  idDoBotaoDaCategoria,
  TabelaDeCategorias,
} from "./tabela-de-categorias";

/**
 * A aba Categorias de Cadastros: o cabeçalho com "+ Nova categoria", o painel
 * e a tabela (CADCOL-01, AC 6; CADCOL-04; CADCOL-05; CADCOL-10; CADCOL-11).
 *
 * **Um componente cliente só**, porque o "+ Nova categoria", as linhas e o
 * painel dividem o mesmo estado: o que está aberto.
 *
 * **A categoria aberta fica no endereço**, em `?categoria=<id>`, pelo roteador
 * do Next (`useParametroNaUrl`): recarregar ou mandar o link abre a mesma
 * categoria, e o "Voltar" do navegador continua saindo da tela. A página lê o
 * parâmetro no servidor e o entrega em `categoriaInicial`; um id que não está
 * na lista é ignorado (CADCOL-11). O formulário de criação não vai para o
 * endereço; depois de criar, a categoria criada vai.
 *
 * **Trocar de item descarta o que foi digitado** (CADCOL-04, AC 14): o detalhe
 * é montado com a chave da categoria, e fechar desmonta o painel.
 *
 * **A lista nova chega depois da resposta da action.** O Next resolve o pedido
 * de `criarCategoria` antes de desenhar a página relida, e a categoria criada
 * pode ainda não estar na tabela. Por isso o painel só fecha, e o parâmetro só
 * sai, quando a categoria aberta **estava** na lista anterior e não está na
 * nova (Edge Case do item que deixa a lista). A criada, que ainda não chegou,
 * espera; o foco no título vai quando ela chega.
 *
 * Abrir leva o foco ao título do painel; fechar devolve o foco a quem abriu: o
 * botão da linha, ou o "+ Nova categoria" quando era o formulário (CADCOL-10,
 * ACs 2 e 4).
 */

type Aberto =
  | { readonly tipo: "nada" }
  | { readonly tipo: "nova" }
  | { readonly tipo: "categoria"; readonly id: string };

const VAZIO = {
  titulo: "Nenhuma categoria aberta",
  texto: "Escolha uma categoria na lista para trocar a cor, renomear e ver onde ela aparece.",
};

export function CadastroDeCategorias({
  competencia,
  rotuloDaCompetencia,
  nomeDoMes,
  categorias,
  categoriaInicial,
  criarCategoria,
  trocarCor,
  renomear,
}: {
  /** O mês aberto, `'YYYY-MM'`. */
  readonly competencia: string;
  /** "Março de 2026". */
  readonly rotuloDaCompetencia: string;
  /** "Março". */
  readonly nomeDoMes: string;
  /** Já em ordem alfabética, pela regra do português. */
  readonly categorias: ReadonlyArray<ItemDeCategoria>;
  /** O `?categoria=` com que a página foi carregada, lido no servidor. */
  readonly categoriaInicial: string | null;
  readonly criarCategoria: typeof criarCategoriaAction;
  readonly trocarCor: typeof trocarCorDaCategoria;
  readonly renomear: typeof renomearCategoria;
}) {
  const [aberto, setAberto] = useState<Aberto>(() => {
    const inicial = categorias.find((categoria) => categoria.id === categoriaInicial);
    return inicial === undefined ? { tipo: "nada" } : { tipo: "categoria", id: inicial.id };
  });
  /* 0 na carga: o painel aberto por `?categoria=` não rouba o foco. */
  const [focarTitulo, setFocarTitulo] = useState(0);
  /* Depois de criar, o foco espera a categoria criada chegar à lista. */
  const [focoPendente, setFocoPendente] = useState(false);
  const botaoNova = useRef<HTMLButtonElement>(null);
  const mudarEndereco = useParametroNaUrl("categoria", categoriaInicial);
  const { avisar } = useAvisos();

  const aberta =
    aberto.tipo === "categoria"
      ? categorias.find((categoria) => categoria.id === aberto.id)
      : undefined;

  useEffect(() => {
    if (focoPendente && aberta !== undefined) {
      setFocoPendente(false);
      setFocarTitulo((n) => n + 1);
    }
  }, [focoPendente, aberta]);

  /* A lista da renderização anterior, para saber se a aberta saiu dela. */
  const listaAnterior = useRef(categorias);
  useEffect(() => {
    const anterior = listaAnterior.current;
    listaAnterior.current = categorias;
    if (aberto.tipo !== "categoria" || anterior === categorias) {
      return;
    }
    const { id } = aberto;
    const estava = anterior.some((categoria) => categoria.id === id);
    const esta = categorias.some((categoria) => categoria.id === id);
    if (estava && !esta) {
      setAberto({ tipo: "nada" });
      mudarEndereco(null);
    }
  }, [categorias, aberto, mudarEndereco]);

  function abrirCategoria(id: string): void {
    setAberto({ tipo: "categoria", id });
    setFocarTitulo((n) => n + 1);
    mudarEndereco(id);
  }

  function abrirNova(): void {
    setAberto({ tipo: "nova" });
    setFocarTitulo((n) => n + 1);
    mudarEndereco(null);
  }

  function fechar(): void {
    const linha =
      aberto.tipo === "categoria" ? document.getElementById(idDoBotaoDaCategoria(aberto.id)) : null;
    (linha ?? botaoNova.current)?.focus();
    setAberto({ tipo: "nada" });
    mudarEndereco(null);
  }

  function aoCriada(id: string, aviso: string): void {
    setAberto({ tipo: "categoria", id });
    setFocoPendente(true);
    mudarEndereco(id);
    avisar(aviso);
  }

  const conteudo =
    aberto.tipo === "nova" ? (
      <NovaCategoria criarCategoria={criarCategoria} aoCriada={aoCriada} aoCancelar={fechar} />
    ) : aberta === undefined ? null : (
      <DetalheDaCategoria
        key={aberta.id}
        categoria={aberta}
        competencia={competencia}
        rotuloDaCompetencia={rotuloDaCompetencia}
        trocarCor={trocarCor}
        renomear={renomear}
      />
    );

  return (
    <ColunaDeCadastro
      cabecalho={
        <CabecalhoDeCadastros
          competencia={competencia}
          aba="categorias"
          acao={
            <button
              ref={botaoNova}
              type="button"
              onClick={abrirNova}
              aria-controls={ID_DO_PAINEL_DA_CATEGORIA}
              aria-expanded={aberto.tipo === "nova"}
              className="inline-flex min-h-11 w-fit items-center justify-center rounded-pill bg-primary px-6 text-[15px] font-semibold text-on-primary transition-[transform,background-color] duration-200 hover:bg-primary-ativo active:scale-[0.97]"
            >
              + Nova categoria
            </button>
          }
        />
      }
      lista={
        <TabelaDeCategorias
          categorias={categorias}
          nomeDoMes={nomeDoMes}
          abertaId={aberto.tipo === "categoria" ? aberto.id : null}
          aoAbrir={abrirCategoria}
        />
      }
      idDoPainel={ID_DO_PAINEL_DA_CATEGORIA}
      rotuloDoPainel="Painel da categoria"
      aberto={conteudo}
      vazio={VAZIO}
      focarTitulo={focarTitulo}
      aoFechar={fechar}
    />
  );
}
