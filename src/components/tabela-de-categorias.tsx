"use client";

import { type CorDeCategoria, corAutomatica, corDaCategoria } from "@/domain";
import { textoDaCor } from "./cor-de-categoria";
import { Chip } from "./ui";

/**
 * As categorias numa tabela de linhas baixas, com a cor e o uso no mês aberto
 * (CADCOL-02; CADCOL-04, ACs 1 e 13).
 *
 * **A linha não tem botão de ação.** As onze opções de cor e o "Renomear"
 * moravam em cada cartão e faziam dez categorias passarem da altura da tela;
 * agora moram no painel da categoria aberta. O único botão da linha é o da
 * pill, que abre a categoria e é o alvo do teclado. Com o mouse, a linha
 * inteira abre: o clique no botão sobe até ela, e a categoria abre uma vez só.
 *
 * **As contagens chegam prontas** (CADCOL-03): quantos fixos valem no mês e
 * quantos lançamentos do mês usam a categoria. A tabela não conta nem soma.
 * O nome de cada contagem fica escrito na célula ("1 fixo"): abaixo de 768 px
 * ele aparece, porque não há cabeçalho; a partir de 768 px fica só para leitor
 * de tela, e o cabeçalho diz o que é.
 *
 * **Uma árvore de DOM só para as duas larguras**, como Todo mês: abaixo de
 * 768 px cada linha vira um cartão de duas linhas de texto, a pill em cima e
 * a cor e as contagens embaixo, por grade; a partir de 768 px, tabela.
 *
 * O tipo `ItemDeCategoria` nasce aqui, no primeiro componente que o usa.
 */

export interface ItemDeCategoria {
  readonly id: string;
  readonly nome: string;
  /** A escolhida, ou `null` na automática. */
  readonly cor: CorDeCategoria | null;
  readonly fixos: number;
  readonly lancamentos: number;
}

/** O id do painel que a linha abre; o botão da linha aponta para ele. */
export const ID_DO_PAINEL_DA_CATEGORIA = "painel-da-categoria";

/** O id do botão da linha, para quem fecha o painel devolver o foco a ele. */
export function idDoBotaoDaCategoria(id: string): string {
  return `abrir-categoria-${id}`;
}

/* O padrão de célula de Lançamentos e de Todo mês: com ponteiro fino, 4 px de
   respiro em cima e 12 px dos lados, e a linha fica com até 48 px (CADCOL-02,
   AC 7). No toque, o respiro de sempre. */
const CELULA =
  "block md:table-cell md:px-4 md:py-3.5 md:align-top md:pointer-fine:px-3 md:pointer-fine:py-1 md:pointer-fine:align-middle";
const CABECALHO = "md:px-4 md:pb-2 text-left text-[13px] font-medium text-ink-muted";

export function TabelaDeCategorias({
  categorias,
  nomeDoMes,
  abertaId,
  aoAbrir,
}: {
  /** Já em ordem alfabética: a página ordena pela regra do português. */
  readonly categorias: ReadonlyArray<ItemDeCategoria>;
  /** "Março", para os cabeçalhos das contagens. */
  readonly nomeDoMes: string;
  readonly abertaId: string | null;
  readonly aoAbrir: (id: string) => void;
}) {
  if (categorias.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line px-5 py-10 text-center text-[15px] text-ink-muted">
        Nenhuma categoria ainda. Crie a primeira pelo “+ Nova categoria”.
      </p>
    );
  }

  return (
    <table aria-label="Categorias" className="w-full border-collapse text-[15px]">
      <thead className="hidden md:table-header-group">
        <tr>
          {/* Uma largura mínima para a pill: entre 768 e 900 px a tabela tem uns
              500 px, e sem ela a coluna encolhia até a pill de um nome curto,
              como "Categoria Dois", quebrar em duas linhas e o botão voltar a
              44 px (CADCOL-10, AC 6). O nome longo continua quebrando. */}
          <th scope="col" className={`${CABECALHO} md:min-w-34`}>
            Categoria
          </th>
          <th scope="col" className={CABECALHO}>
            Cor
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
        {categorias.map((categoria) => (
          <LinhaDeCategoria
            key={categoria.id}
            categoria={categoria}
            aberta={categoria.id === abertaId}
            aoAbrir={aoAbrir}
          />
        ))}
      </tbody>
    </table>
  );
}

/** O número e, só para leitor de tela a partir de 768 px, o nome dele. */
function Contagem({
  quantos,
  singular,
  plural,
}: {
  readonly quantos: number;
  readonly singular: string;
  readonly plural: string;
}) {
  return (
    <>
      <span>{quantos}</span>
      <span className="md:sr-only"> {quantos === 1 ? singular : plural}</span>
    </>
  );
}

function LinhaDeCategoria({
  categoria,
  aberta,
  aoAbrir,
}: {
  readonly categoria: ItemDeCategoria;
  readonly aberta: boolean;
  readonly aoAbrir: (id: string) => void;
}) {
  return (
    /* A linha inteira é o alvo do mouse; o do teclado é o botão da pill,
       cujo clique sobe até aqui. */
    <tr
      onClick={() => aoAbrir(categoria.id)}
      /*
       * Abaixo de 768 px, uma grade de duas linhas: a pill em cima, a cor e as
       * contagens embaixo (CADCOL-02, AC 8). A aberta ganha o fundo de
       * elevação e um filete de 2 px na cor primária, à esquerda (CADCOL-04,
       * AC 13), como em Todo mês.
       */
      className={`mb-3 grid cursor-pointer grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 rounded-xl border p-4 transition-colors duration-200 md:mb-0 md:table-row md:rounded-none md:border-0 md:p-0 md:[&:not(:last-child)>td]:border-b md:[&:not(:last-child)>td]:border-line ${
        aberta
          ? "border-primary bg-surface-strong md:[&>td:first-child]:shadow-[inset_2px_0_0_var(--color-primary)]"
          : "border-line bg-surface hover:bg-surface-soft md:bg-transparent"
      }`}
    >
      <td className={`${CELULA} col-span-3 col-start-1 row-start-1`}>
        <button
          type="button"
          id={idDoBotaoDaCategoria(categoria.id)}
          aria-expanded={aberta}
          aria-controls={ID_DO_PAINEL_DA_CATEGORIA}
          /* `flex`, e não `inline-flex`, como em Todo mês: alinhado pela base
             da linha de texto, o botão ganhava a folga da letra e a linha
             passava de 48 px. Com ponteiro fino a partir de 768 px ele baixa
             para 36 px; no toque e abaixo de 768 px, 44 × 44 (TOQUE-01). */
          className="flex min-h-11 w-fit min-w-11 items-center rounded-xs text-left md:pointer-fine:min-h-9"
        >
          <Chip cor={corDaCategoria(categoria)}>{categoria.nome}</Chip>
        </button>
      </td>
      <td
        className={`${CELULA} col-start-1 row-start-2 text-[14px] text-ink-muted md:whitespace-nowrap`}
      >
        {textoDaCor(categoria.cor, corAutomatica(categoria.nome))}
      </td>
      <td
        className={`${CELULA} col-start-2 row-start-2 tabular text-[14px] text-ink-muted md:text-right md:text-[15px] md:text-ink`}
      >
        <Contagem quantos={categoria.fixos} singular="fixo" plural="fixos" />
      </td>
      <td
        className={`${CELULA} col-start-3 row-start-2 tabular text-[14px] text-ink-muted md:text-right md:text-[15px] md:text-ink`}
      >
        <Contagem quantos={categoria.lancamentos} singular="lançamento" plural="lançamentos" />
      </td>
    </tr>
  );
}
