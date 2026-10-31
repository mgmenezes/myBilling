"use client";

import type { CorDeCategoria, Natureza } from "@/domain";
import { Chip } from "./ui";

/**
 * Os fixos do mês aberto, em duas seções: "Entradas fixas" e depois "Saídas
 * fixas", uma linha baixa por fixo (FIXCOL-01).
 *
 * **A linha não tem botão de ação.** "Mudar valor", "Editar" e "Encerrar"
 * moram no painel do fixo aberto; repetidos em cada cartão, eles faziam dez
 * fixos passarem da altura da tela. O único botão da linha é o da descrição,
 * que abre o fixo e é o alvo do teclado. Com o mouse, a linha inteira abre:
 * o clique no botão sobe até ela, e o fixo abre uma vez só.
 *
 * **O valor é o do mês aberto**, já formatado pela página a partir da
 * ocorrência (FIXCOL-02), e não o da vigência. A tabela não soma nada: os
 * totais chegam prontos, da mesma conta que o bloco "Fixos" de Lançamentos.
 *
 * **Uma árvore de DOM só para as duas larguras**, como a lista de
 * Lançamentos: abaixo de 768 px cada linha vira um cartão de duas linhas de
 * texto, a descrição e o valor em cima, a categoria, o dia e o meio embaixo,
 * por grade; a partir de 768 px, tabela.
 *
 * O tipo `ItemDeFixo` nasce aqui, no primeiro componente que o usa.
 */

export interface ItemDeFixo {
  readonly id: string;
  readonly descricao: string;
  readonly natureza: Natureza;
  readonly diaVencimento: number;
  /** "Receita" nas entradas; nas saídas, o nome, "Sem categoria" ou "Categoria removida". */
  readonly categoria: string;
  /** A cor em uso, por `corDaCategoria`; `null` nas neutras. */
  readonly corDaCategoria: CorDeCategoria | null;
  readonly meio: string;
  readonly pessoa: string;
  /** O valor da ocorrência do mês, formatado; `null` sem ocorrência. */
  readonly valorDoMes: string | null;
  readonly previstoDoMes: string | null;
  readonly confirmado: boolean;
  /** "Janeiro de 2026". */
  readonly inicio: string;
  /** O início é posterior ao mês aberto. */
  readonly comecaDepois: boolean;
  readonly fim: string | null;
  readonly encerrada: boolean;
  /** As vigências da mais antiga para a mais nova; `valeNoMes` na do mês aberto. */
  readonly historico: ReadonlyArray<{
    readonly desde: string;
    readonly valor: string;
    readonly valeNoMes: boolean;
  }>;
  /* O que a edição preenche: os ids e meses gravados, não os nomes exibidos. */
  readonly competenciaInicio: string;
  readonly competenciaFim: string | null;
  readonly meioPagamentoId: string;
  readonly categoriaId: string | null;
  readonly usuarioId: string;
  /** O vigente no mês exibido, por `valorNoMesExibido`: o número com que a edição compara. */
  readonly valorNoMesCentavos: number | null;
}

/** O id do painel que a linha abre; o botão da linha aponta para ele. */
export const ID_DO_PAINEL = "painel-do-fixo";

/** O id do botão da linha, para quem fecha o painel devolver o foco a ele. */
export function idDoBotaoDaLinha(id: string): string {
  return `abrir-fixo-${id}`;
}

/**
 * A categoria como a linha a mostra, e o painel repete: "Receita" em toda
 * entrada (TRC-01); nas saídas, a pill na cor da categoria, ou na neutra
 * quando não há cor (COR-03; COR-02, AC 5).
 */
export function CategoriaDoFixo({ item }: { readonly item: ItemDeFixo }) {
  if (item.natureza !== "DESPESA") {
    return <Chip tom="positivo">Receita</Chip>;
  }
  return <Chip cor={item.corDaCategoria ?? undefined}>{item.categoria}</Chip>;
}

/* O padrão de célula de Lançamentos: com ponteiro fino, 4 px de respiro em
   cima e 12 px dos lados, e a linha fica com até 48 px (FIXCOL-01, AC 10). No
   toque, o respiro de sempre. */
const CELULA =
  "block md:table-cell md:px-4 md:py-3.5 md:align-top md:pointer-fine:px-3 md:pointer-fine:py-1 md:pointer-fine:align-middle";
const CABECALHO = "md:px-4 md:pb-2 text-left text-[13px] font-medium text-ink-muted";

export function TabelaDeFixos({
  entradas,
  saidas,
  totalEntradas,
  totalSaidas,
  nomeDoMes,
  abertoId,
  aoAbrir,
}: {
  /** Já ordenados pelo dia e pela descrição, por `fixosDoMes`. */
  readonly entradas: ReadonlyArray<ItemDeFixo>;
  readonly saidas: ReadonlyArray<ItemDeFixo>;
  /** Formatados: "R$ 185,00". */
  readonly totalEntradas: string;
  readonly totalSaidas: string;
  /** "Março", para o cabeçalho "Valor em Março". */
  readonly nomeDoMes: string;
  readonly abertoId: string | null;
  readonly aoAbrir: (id: string) => void;
}) {
  if (entradas.length === 0 && saidas.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-[15px] text-ink-muted">
        Nenhum gasto fixo ou entrada neste mês. Cadastre pelo “+ Novo fixo”: ele passa a aparecer em
        todo mês, sem você precisar repetir nada.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <SecaoDeFixos
        id="entradas"
        titulo="Entradas fixas"
        vazio="Nenhuma entrada fixa neste mês."
        colunaDoDia="Cai"
        colunaDoMeio="Onde cai"
        itens={entradas}
        total={totalEntradas}
        nomeDoMes={nomeDoMes}
        abertoId={abertoId}
        aoAbrir={aoAbrir}
      />
      <SecaoDeFixos
        id="saidas"
        titulo="Saídas fixas"
        vazio="Nenhuma saída fixa neste mês."
        colunaDoDia="Vence"
        colunaDoMeio="Meio"
        itens={saidas}
        total={totalSaidas}
        nomeDoMes={nomeDoMes}
        abertoId={abertoId}
        aoAbrir={aoAbrir}
      />
    </div>
  );
}

function SecaoDeFixos({
  id,
  titulo,
  vazio,
  colunaDoDia,
  colunaDoMeio,
  itens,
  total,
  nomeDoMes,
  abertoId,
  aoAbrir,
}: {
  /** Identificador sem espaço: `aria-labelledby` é uma lista de ids. */
  readonly id: string;
  readonly titulo: string;
  readonly vazio: string;
  readonly colunaDoDia: string;
  readonly colunaDoMeio: string;
  readonly itens: ReadonlyArray<ItemDeFixo>;
  readonly total: string;
  readonly nomeDoMes: string;
  readonly abertoId: string | null;
  readonly aoAbrir: (id: string) => void;
}) {
  return (
    <section aria-labelledby={`secao-${id}`} className="flex flex-col gap-3">
      {/* O resumo fica ao lado do título, fora dele: o nome da região
          continua sendo só o da seção (FIXCOL-01, AC 4). */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id={`secao-${id}`} className="text-[17px] font-medium tracking-[-0.01em]">
          {titulo}
        </h2>
        <span className="tabular text-[14px] text-ink-muted">
          {itens.length} · {total}
        </span>
      </div>

      {itens.length === 0 ? (
        <p className="text-[15px] text-ink-muted">{vazio}</p>
      ) : (
        <table className="w-full border-collapse text-[15px]">
          <caption className="sr-only">{titulo}</caption>
          <thead className="hidden md:table-header-group">
            <tr>
              <th scope="col" className={CABECALHO}>
                Descrição
              </th>
              <th scope="col" className={CABECALHO}>
                Categoria
              </th>
              <th scope="col" className={CABECALHO}>
                {colunaDoDia}
              </th>
              <th scope="col" className={CABECALHO}>
                {colunaDoMeio}
              </th>
              <th scope="col" className={`${CABECALHO} md:text-right`}>
                Valor em {nomeDoMes}
              </th>
            </tr>
          </thead>
          <tbody className="block md:table-row-group">
            {itens.map((item) => (
              <LinhaDeFixo
                key={item.id}
                item={item}
                aberto={item.id === abertoId}
                aoAbrir={aoAbrir}
              />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function LinhaDeFixo({
  item,
  aberto,
  aoAbrir,
}: {
  readonly item: ItemDeFixo;
  readonly aberto: boolean;
  readonly aoAbrir: (id: string) => void;
}) {
  return (
    /* A linha inteira é o alvo do mouse; o do teclado é o botão da descrição,
       cujo clique sobe até aqui. */
    <tr
      onClick={() => aoAbrir(item.id)}
      /*
       * Abaixo de 768 px, uma grade de duas linhas: a descrição e o valor em
       * cima, a categoria, o dia e o meio embaixo (FIXCOL-01, AC 11). Uma
       * régua só entre as linhas da tabela, como em Lançamentos. A aberta
       * ganha o fundo de elevação e um filete de 2 px na cor primária, à
       * esquerda (FIXCOL-04, AC 7).
       */
      className={`mb-3 grid cursor-pointer grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-xl border p-4 transition-colors duration-200 md:mb-0 md:table-row md:rounded-none md:border-0 md:p-0 md:[&:not(:last-child)>td]:border-b md:[&:not(:last-child)>td]:border-line ${
        aberto
          ? "border-primary bg-surface-strong md:[&>td:first-child]:shadow-[inset_2px_0_0_var(--color-primary)]"
          : "border-line bg-surface hover:bg-surface-soft md:bg-transparent"
      }`}
    >
      <td className={`${CELULA} col-span-3 col-start-1 row-start-1 font-medium`}>
        <button
          type="button"
          id={idDoBotaoDaLinha(item.id)}
          aria-expanded={aberto}
          aria-controls={ID_DO_PAINEL}
          className="inline-flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 rounded-xs text-left md:pointer-fine:min-h-9"
        >
          {item.descricao}
          {item.encerrada ? <Chip>Encerrado</Chip> : null}
          {item.comecaDepois ? <Chip>Começa em {item.inicio}</Chip> : null}
        </button>
      </td>
      <td className={`${CELULA} col-start-1 row-start-2`}>
        <CategoriaDoFixo item={item} />
      </td>
      <td className={`${CELULA} col-start-2 row-start-2 tabular text-[14px] text-ink-muted`}>
        dia {item.diaVencimento}
      </td>
      <td className={`${CELULA} col-span-2 col-start-3 row-start-2 text-[14px] text-ink-muted`}>
        {item.meio}
      </td>
      <td
        className={`${CELULA} col-start-4 row-start-1 tabular whitespace-nowrap text-right ${
          item.natureza === "RECEITA" ? "text-positivo" : "text-ink"
        }`}
      >
        {item.valorDoMes === null ? (
          "—"
        ) : (
          /* "confirmado" à esquerda do valor, na mesma linha: a confirmação
             não depende de cor (FIXO-04, AC 3). */
          <span className="inline-flex items-baseline justify-end gap-2">
            {item.confirmado ? (
              <span className="text-[13px] text-ink-muted">confirmado</span>
            ) : null}
            {item.valorDoMes}
          </span>
        )}
      </td>
    </tr>
  );
}
