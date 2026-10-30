import {
  type Cents,
  type Competencia,
  type CorDeCategoria,
  corDaCategoria,
  resumoPorCategoria,
} from "@/domain";
import { SEM_CATEGORIA } from "./filtrar-lancamentos";
import type { LancamentoDoMes } from "./obter-visao-mensal/handler";

/**
 * O gasto do mês por categoria, na forma dos chips da lista (LST-01).
 *
 * **É o número de "Gastos por categoria" da Visão geral.** O cálculo é o de
 * `resumoPorCategoria`, sobre a lista inteira do mês: quem chama passa os
 * lançamentos **antes** de filtrar, para que o chip não mude de valor quando
 * outro filtro entra (LST-01, AC 2).
 *
 * O grupo nulo vira `SEM_CATEGORIA`, a mesma chave que o filtro reconhece, e
 * a ordem é do maior gasto para o menor, a mesma do gráfico.
 *
 * Cada total leva a **cor em uso** da categoria (COR-03, AC 4), a escolhida ou
 * a automática, para o chip ter a mesma cor da pill e da barra. "Sem
 * categoria" e "Categoria removida" vão com cor nula e ficam na neutra.
 */

export interface TotalPorCategoria {
  readonly id: string;
  readonly nome: string;
  readonly gasto: Cents;
  readonly cor: CorDeCategoria | null;
}

export function totaisPorCategoria(
  lancamentos: ReadonlyArray<LancamentoDoMes>,
  competencia: Competencia,
  totalGastos: Cents,
  categoriaPorId: ReadonlyMap<
    string,
    { readonly nome: string; readonly cor: CorDeCategoria | null }
  >,
): ReadonlyArray<TotalPorCategoria> {
  return resumoPorCategoria(
    lancamentos.map((item) => item.lancamento),
    competencia,
    totalGastos,
  )
    .map((resumo) => {
      const categoria =
        resumo.categoriaId === null ? undefined : categoriaPorId.get(resumo.categoriaId);
      return {
        id: resumo.categoriaId ?? SEM_CATEGORIA,
        nome:
          resumo.categoriaId === null ? "Sem categoria" : (categoria?.nome ?? "Categoria removida"),
        gasto: resumo.gasto,
        cor: categoria === undefined ? null : corDaCategoria(categoria),
      };
    })
    .sort((a, b) => b.gasto - a.gasto);
}
