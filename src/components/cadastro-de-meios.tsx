"use client";

import { useEffect, useRef, useState } from "react";
import type {
  criarMeioDePagamento as criarMeioAction,
  editarMeioDePagamento,
} from "@/app/actions/meios-de-pagamento";
import { useAvisos } from "./avisos";
import { CabecalhoDeCadastros } from "./cabecalho-de-cadastros";
import { ColunaDeCadastro } from "./coluna-de-cadastro";
import { DetalheDoMeio } from "./detalhe-do-meio";
import { NovoMeio } from "./novo-meio";
import { useParametroNaUrl } from "./parametro-na-url";
import {
  ID_DO_PAINEL_DO_MEIO,
  type ItemDeMeio,
  idDoBotaoDoMeio,
  TabelaDeMeios,
} from "./tabela-de-meios";

/**
 * A aba Meios de pagamento de Cadastros: o cabeçalho com "+ Novo meio", o
 * painel e a tabela (CADCOL-01, AC 6; CADCOL-07; CADCOL-08; CADCOL-10;
 * CADCOL-11).
 *
 * É a forma de `CadastroDeCategorias`, com as mesmas regras:
 * - **um componente cliente só**, porque o "+ Novo meio", as linhas e o painel
 *   dividem o mesmo estado: o que está aberto;
 * - **o meio aberto fica no endereço**, em `?meio=<id>`, pelo roteador do Next
 *   (`useParametroNaUrl`), lido no servidor e entregue em `meioInicial`; um id
 *   que não está na lista é ignorado (CADCOL-11). O formulário de criação não
 *   vai para o endereço; depois de criar, o meio criado vai;
 * - **trocar de item descarta o que foi digitado** (CADCOL-07, AC 15): o
 *   detalhe é montado com a chave do meio, e fechar desmonta o painel;
 * - **o painel só fecha, e o parâmetro só sai, quando o meio aberto estava na
 *   lista anterior e não está na nova.** O Next resolve o pedido de
 *   `criarMeioDePagamento` antes de desenhar a página relida, e o meio criado
 *   pode ainda não estar na tabela; ele espera, e o foco no título vai quando
 *   ele chega (Edge Case do item que deixa a lista).
 *
 * Abrir leva o foco ao título do painel; fechar devolve o foco a quem abriu: o
 * botão da linha, ou o "+ Novo meio" quando era o formulário (CADCOL-10,
 * ACs 2 e 4).
 */

type Aberto =
  | { readonly tipo: "nada" }
  | { readonly tipo: "novo" }
  | { readonly tipo: "meio"; readonly id: string };

const VAZIO = {
  titulo: "Nenhum meio aberto",
  texto:
    "Escolha um meio na lista para renomear, corrigir os dias do cartão e ver onde ele aparece.",
};

export function CadastroDeMeios({
  competencia,
  rotuloDaCompetencia,
  nomeDoMes,
  meios,
  meioInicial,
  criarMeioDePagamento,
  editar,
}: {
  /** O mês aberto, `'YYYY-MM'`. */
  readonly competencia: string;
  /** "Março de 2026". */
  readonly rotuloDaCompetencia: string;
  /** "Março". */
  readonly nomeDoMes: string;
  /** Já em ordem alfabética, pela regra do português. */
  readonly meios: ReadonlyArray<ItemDeMeio>;
  /** O `?meio=` com que a página foi carregada, lido no servidor. */
  readonly meioInicial: string | null;
  readonly criarMeioDePagamento: typeof criarMeioAction;
  readonly editar: typeof editarMeioDePagamento;
}) {
  const [aberto, setAberto] = useState<Aberto>(() => {
    const inicial = meios.find((meio) => meio.id === meioInicial);
    return inicial === undefined ? { tipo: "nada" } : { tipo: "meio", id: inicial.id };
  });
  /* 0 na carga: o painel aberto por `?meio=` não rouba o foco. */
  const [focarTitulo, setFocarTitulo] = useState(0);
  /* Depois de criar, o foco espera o meio criado chegar à lista. */
  const [focoPendente, setFocoPendente] = useState(false);
  const botaoNovo = useRef<HTMLButtonElement>(null);
  const mudarEndereco = useParametroNaUrl("meio", meioInicial);
  const { avisar } = useAvisos();

  const meioAberto =
    aberto.tipo === "meio" ? meios.find((meio) => meio.id === aberto.id) : undefined;

  useEffect(() => {
    if (focoPendente && meioAberto !== undefined) {
      setFocoPendente(false);
      setFocarTitulo((n) => n + 1);
    }
  }, [focoPendente, meioAberto]);

  /* A lista da renderização anterior, para saber se o aberto saiu dela. */
  const listaAnterior = useRef(meios);
  useEffect(() => {
    const anterior = listaAnterior.current;
    listaAnterior.current = meios;
    if (aberto.tipo !== "meio" || anterior === meios) {
      return;
    }
    const { id } = aberto;
    const estava = anterior.some((meio) => meio.id === id);
    const esta = meios.some((meio) => meio.id === id);
    if (estava && !esta) {
      setAberto({ tipo: "nada" });
      mudarEndereco(null);
    }
  }, [meios, aberto, mudarEndereco]);

  function abrirMeio(id: string): void {
    setAberto({ tipo: "meio", id });
    setFocarTitulo((n) => n + 1);
    mudarEndereco(id);
  }

  function abrirNovo(): void {
    setAberto({ tipo: "novo" });
    setFocarTitulo((n) => n + 1);
    mudarEndereco(null);
  }

  function fechar(): void {
    const linha =
      aberto.tipo === "meio" ? document.getElementById(idDoBotaoDoMeio(aberto.id)) : null;
    (linha ?? botaoNovo.current)?.focus();
    setAberto({ tipo: "nada" });
    mudarEndereco(null);
  }

  function aoCriado(id: string): void {
    setAberto({ tipo: "meio", id });
    setFocoPendente(true);
    mudarEndereco(id);
    avisar("Meio de pagamento criado.");
  }

  const conteudo =
    aberto.tipo === "novo" ? (
      <NovoMeio
        criarMeioDePagamento={criarMeioDePagamento}
        aoCriado={aoCriado}
        aoCancelar={fechar}
      />
    ) : meioAberto === undefined ? null : (
      <DetalheDoMeio
        key={meioAberto.id}
        meio={meioAberto}
        competencia={competencia}
        rotuloDaCompetencia={rotuloDaCompetencia}
        editar={editar}
      />
    );

  return (
    <ColunaDeCadastro
      cabecalho={
        <CabecalhoDeCadastros
          competencia={competencia}
          aba="meios"
          acao={
            <button
              ref={botaoNovo}
              type="button"
              onClick={abrirNovo}
              aria-controls={ID_DO_PAINEL_DO_MEIO}
              aria-expanded={aberto.tipo === "novo"}
              className="inline-flex min-h-11 w-fit items-center justify-center rounded-pill bg-primary px-6 text-[15px] font-semibold text-on-primary transition-[transform,background-color] duration-200 hover:bg-primary-ativo active:scale-[0.97]"
            >
              + Novo meio
            </button>
          }
        />
      }
      lista={
        <TabelaDeMeios
          meios={meios}
          nomeDoMes={nomeDoMes}
          abertoId={aberto.tipo === "meio" ? aberto.id : null}
          aoAbrir={abrirMeio}
        />
      }
      idDoPainel={ID_DO_PAINEL_DO_MEIO}
      rotuloDoPainel="Painel do meio de pagamento"
      aberto={conteudo}
      vazio={VAZIO}
      focarTitulo={focarTitulo}
      aoFechar={fechar}
    />
  );
}
