"use client";

import { TIPOS_DE_MEIO } from "@/application/schemas/meio-pagamento.schema";
import type { TipoMeio } from "@/domain";

/**
 * Os meios de pagamento numa tabela de linhas baixas, com o tipo, os dias do
 * cartão e o uso no mês aberto (CADCOL-06; CADCOL-07, ACs 1 e 15).
 *
 * É a forma de `TabelaDeCategorias`. **A linha não tem botão de ação:** o
 * único botão é o do nome, em texto, sem pill, que abre o meio e é o alvo do
 * teclado. Com o mouse, a linha inteira abre: o clique no botão sobe até ela,
 * e o meio abre uma vez só.
 *
 * **As contagens chegam prontas** (CADCOL-03). A tabela não conta nem soma.
 *
 * **Abaixo de 768 px não há cabeçalho**, e cada linha vira um cartão de duas
 * linhas de texto: o nome em cima e, embaixo, o tipo, os dias e as contagens,
 * cada um com o nome escrito ("fecha dia 25", "1 fixo") (CADCOL-06, AC 8). A
 * partir de 768 px, o nome do dia e o da contagem ficam só para leitor de
 * tela, e o cabeçalho diz o que é. A conta e o rótulo não têm dia: no cartão
 * de duas linhas o "—" some, e na tabela fica em Fecha e em Vence (AC 4). Em
 * 400 px, o que vai embaixo do nome de um cartão de crédito quebra em duas
 * linhas: o tipo, os dois dias e as duas contagens não cabem em 336 px.
 *
 * O tipo `ItemDeMeio` nasce aqui, no primeiro componente que o usa.
 */

export interface ItemDeMeio {
  readonly id: string;
  readonly nome: string;
  readonly tipo: TipoMeio;
  /** `null` na conta e no rótulo. */
  readonly diaFechamento: number | null;
  readonly diaVencimento: number | null;
  readonly fixos: number;
  readonly lancamentos: number;
}

/** O id do painel que a linha abre; o botão da linha aponta para ele. */
export const ID_DO_PAINEL_DO_MEIO = "painel-do-meio";

/** O id do botão da linha, para quem fecha o painel devolver o foco a ele. */
export function idDoBotaoDoMeio(id: string): string {
  return `abrir-meio-${id}`;
}

/** "Cartão de crédito", "Conta corrente" ou "Rótulo". */
export function rotuloDoTipo(tipo: TipoMeio): string {
  return TIPOS_DE_MEIO.find((opcao) => opcao.valor === tipo)?.rotulo ?? tipo;
}

/*
 * O padrão de célula de Categorias, de Lançamentos e de Todo mês: com ponteiro
 * fino, 4 px de respiro em cima e 12 px dos lados, e a linha fica com até
 * 48 px (CADCOL-06, AC 7). No toque, o respiro de sempre.
 *
 * **Entre 768 e 1.023 px, 8 px dos lados, e o tipo pode quebrar.** São seis
 * colunas nos 480 px que a tabela tem em 768 px. Com o respiro de Categorias,
 * ela pedia 577 px, a página rolava de lado e "Cartão Roxo" quebrava em duas
 * linhas, com o botão de 45 px (CADCOL-10, AC 6). Assim ela cabe nos 480 px; o
 * tipo do cartão quebra e a linha dele fica mais alta nessa faixa, que nenhum
 * AC mede. A partir de 1.024 px volta o respiro de Categorias, e o tipo fica
 * numa linha.
 */
const CELULA =
  "block md:table-cell md:px-2 md:py-3.5 md:align-top lg:px-4 md:pointer-fine:px-2 md:pointer-fine:py-1 md:pointer-fine:align-middle lg:pointer-fine:px-3";
const CABECALHO = "md:px-2 lg:px-4 md:pb-2 text-left text-[13px] font-medium text-ink-muted";
const NUMERO =
  "tabular text-[14px] text-ink-muted md:text-right md:text-[15px] md:text-ink md:whitespace-nowrap";

export function TabelaDeMeios({
  meios,
  nomeDoMes,
  abertoId,
  aoAbrir,
}: {
  /** Já em ordem alfabética: a página ordena pela regra do português. */
  readonly meios: ReadonlyArray<ItemDeMeio>;
  /** "Março", para os cabeçalhos das contagens. */
  readonly nomeDoMes: string;
  readonly abertoId: string | null;
  readonly aoAbrir: (id: string) => void;
}) {
  if (meios.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line px-5 py-10 text-center text-[15px] text-ink-muted">
        Nenhum meio de pagamento ainda. Cadastre o primeiro pelo “+ Novo meio”.
      </p>
    );
  }

  return (
    <table aria-label="Meios de pagamento" className="w-full border-collapse text-[15px]">
      <thead className="hidden md:table-header-group">
        <tr>
          {/* Uma largura mínima para o nome: sem ela, a coluna encolhia até
              "Conta Corrente" quebrar em duas linhas em 768 px. O nome longo
              continua quebrando. */}
          <th scope="col" className={`${CABECALHO} md:min-w-32`}>
            Meio de pagamento
          </th>
          <th scope="col" className={CABECALHO}>
            Tipo
          </th>
          <th scope="col" className={CABECALHO}>
            Fecha
          </th>
          <th scope="col" className={CABECALHO}>
            Vence
          </th>
          <th scope="col" className={`${CABECALHO} md:text-right`}>
            Fixos em {nomeDoMes}
          </th>
          <th scope="col" className={`${CABECALHO} md:text-right`}>
            Lançamentos em {nomeDoMes}
          </th>
        </tr>
      </thead>
      <tbody className="block md:table-row-group">
        {meios.map((meio) => (
          <LinhaDeMeio key={meio.id} meio={meio} aberto={meio.id === abertoId} aoAbrir={aoAbrir} />
        ))}
      </tbody>
    </table>
  );
}

/** Um valor e, só para leitor de tela a partir de 768 px, o nome dele. */
function ComNome({
  antes,
  depois,
  valor,
}: {
  readonly antes?: string;
  readonly depois?: string;
  readonly valor: string | number;
}) {
  return (
    <>
      {antes === undefined ? null : <span className="md:sr-only">{antes} </span>}
      <span>{valor}</span>
      {depois === undefined ? null : <span className="md:sr-only"> {depois}</span>}
    </>
  );
}

/** A célula de um dia: "dia N" no cartão; "—" na conta e no rótulo, que some no cartão de duas linhas. */
function CelulaDoDia({ nome, dia }: { readonly nome: string; readonly dia: number | null }) {
  if (dia === null) {
    return <td className={`${CELULA} hidden text-ink-muted md:table-cell`}>—</td>;
  }
  return (
    <td
      className={`${CELULA} text-[14px] text-ink-muted md:text-[15px] md:text-ink md:whitespace-nowrap`}
    >
      <ComNome antes={nome} valor={`dia ${dia}`} />
    </td>
  );
}

function LinhaDeMeio({
  meio,
  aberto,
  aoAbrir,
}: {
  readonly meio: ItemDeMeio;
  readonly aberto: boolean;
  readonly aoAbrir: (id: string) => void;
}) {
  return (
    /* A linha inteira é o alvo do mouse; o do teclado é o botão do nome,
       cujo clique sobe até aqui. */
    <tr
      onClick={() => aoAbrir(meio.id)}
      /*
       * Abaixo de 768 px, duas linhas de texto: o nome ocupa a primeira
       * inteira, e o resto quebra na segunda (CADCOL-06, AC 8). O aberto
       * ganha o fundo de elevação e um filete de 2 px na cor primária, à
       * esquerda (CADCOL-07, AC 15), como em Categorias e em Todo mês.
       */
      className={`mb-3 flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border p-4 transition-colors duration-200 md:mb-0 md:table-row md:rounded-none md:border-0 md:p-0 md:[&:not(:last-child)>td]:border-b md:[&:not(:last-child)>td]:border-line ${
        aberto
          ? "border-primary bg-surface-strong md:[&>td:first-child]:shadow-[inset_2px_0_0_var(--color-primary)]"
          : "border-line bg-surface hover:bg-surface-soft md:bg-transparent"
      }`}
    >
      <td className={`${CELULA} w-full md:w-auto`}>
        <button
          type="button"
          id={idDoBotaoDoMeio(meio.id)}
          aria-expanded={aberto}
          aria-controls={ID_DO_PAINEL_DO_MEIO}
          /* `flex`, e não `inline-flex`, como em Categorias: alinhado pela
             base da linha de texto, o botão ganhava a folga da letra e a linha
             passava de 48 px. Com ponteiro fino a partir de 768 px ele baixa
             para 36 px; no toque e abaixo de 768 px, 44 × 44 (TOQUE-01). */
          className="flex min-h-11 w-fit min-w-11 items-center rounded-xs text-left font-medium text-ink md:pointer-fine:min-h-9"
        >
          {meio.nome}
        </button>
      </td>
      <td className={`${CELULA} text-[14px] text-ink-muted md:text-[15px] lg:whitespace-nowrap`}>
        {rotuloDoTipo(meio.tipo)}
      </td>
      <CelulaDoDia nome="fecha" dia={meio.diaFechamento} />
      <CelulaDoDia nome="vence" dia={meio.diaVencimento} />
      <td className={`${CELULA} ${NUMERO}`}>
        <ComNome valor={meio.fixos} depois={meio.fixos === 1 ? "fixo" : "fixos"} />
      </td>
      <td className={`${CELULA} ${NUMERO}`}>
        <ComNome
          valor={meio.lancamentos}
          depois={meio.lancamentos === 1 ? "lançamento" : "lançamentos"}
        />
      </td>
    </tr>
  );
}
