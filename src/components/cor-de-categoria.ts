import type { CorDeCategoria } from "@/domain";

/**
 * As classes de cada cor de categoria (COR-02), **escritas por extenso**.
 *
 * O Tailwind v4 só gera a classe que lê no fonte. Montada por template, como
 * `` `bg-cat-${cor}-fundo` ``, ela existiria no objeto e faltaria no CSS, e a
 * pill sairia sem cor só em produção. Toda tela pega a classe daqui, nunca a
 * monta.
 *
 * - `pill`: o fundo tingido e o texto em tinta da mesma família. É a pill de
 *   "Todo mês", o seletor da linha e o chip de filtro inativo.
 * - `barra`: o tom médio da barra de "Gastos por categoria".
 *
 * Os valores e as medições estão em `docs/design.md`, "Cor por categoria".
 */
export const CLASSES_DA_COR: Readonly<
  Record<CorDeCategoria, { readonly pill: string; readonly barra: string }>
> = {
  vermelho: {
    pill: "bg-cat-vermelho-fundo text-cat-vermelho-texto",
    barra: "bg-cat-vermelho-barra",
  },
  laranja: {
    pill: "bg-cat-laranja-fundo text-cat-laranja-texto",
    barra: "bg-cat-laranja-barra",
  },
  ambar: {
    pill: "bg-cat-ambar-fundo text-cat-ambar-texto",
    barra: "bg-cat-ambar-barra",
  },
  verde: {
    pill: "bg-cat-verde-fundo text-cat-verde-texto",
    barra: "bg-cat-verde-barra",
  },
  "verde-agua": {
    pill: "bg-cat-verde-agua-fundo text-cat-verde-agua-texto",
    barra: "bg-cat-verde-agua-barra",
  },
  ciano: {
    pill: "bg-cat-ciano-fundo text-cat-ciano-texto",
    barra: "bg-cat-ciano-barra",
  },
  azul: {
    pill: "bg-cat-azul-fundo text-cat-azul-texto",
    barra: "bg-cat-azul-barra",
  },
  roxo: {
    pill: "bg-cat-roxo-fundo text-cat-roxo-texto",
    barra: "bg-cat-roxo-barra",
  },
  rosa: {
    pill: "bg-cat-rosa-fundo text-cat-rosa-texto",
    barra: "bg-cat-rosa-barra",
  },
  marrom: {
    pill: "bg-cat-marrom-fundo text-cat-marrom-texto",
    barra: "bg-cat-marrom-barra",
  },
};
