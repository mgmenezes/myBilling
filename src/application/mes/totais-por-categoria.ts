import { type Cents, type Competencia, resumoPorCategoria } from "@/domain";
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
 */

export interface TotalPorCategoria {
  readonly id: string;
  readonly nome: string;
  readonly gasto: Cents;
}

export function totaisPorCategoria(
  lancamentos: ReadonlyArray<LancamentoDoMes>,
  competencia: Competencia,
  totalGastos: Cents,
  nomePorCategoria: ReadonlyMap<string, string>,
): ReadonlyArray<TotalPorCategoria> {
  return resumoPorCategoria(
    lancamentos.map((item) => item.lancamento),
    competencia,
    totalGastos,
  )
    .map((resumo) => ({
      id: resumo.categoriaId ?? SEM_CATEGORIA,
      nome:
        resumo.categoriaId === null
          ? "Sem categoria"
          : (nomePorCategoria.get(resumo.categoriaId) ?? "Categoria removida"),
      gasto: resumo.gasto,
    }))
    .sort((a, b) => b.gasto - a.gasto);
}
