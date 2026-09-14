import type { Competencia } from "../shared/competencia";
import { type Cents, somar } from "../shared/money";
import type { Lancamento } from "../tipos";
import { despesasDaCompetencia } from "./resumo-mensal";

/**
 * Porcentagem em **centésimos de ponto percentual**, sempre inteiro:
 * 100,00% = 10000, 25,00% = 2500, 246,0% = 24600.
 *
 * Dinheiro é centavo inteiro (AD-001); porcentagem não é dinheiro, mas a
 * mesma disciplina se aplica pelo mesmo motivo: em ponto flutuante a soma
 * das distribuições fecharia em 99,99% ou 100,01% conforme a ordem das
 * parcelas. Com inteiro na escala de duas casas, a soma é verificável por
 * igualdade exata, e a apresentação divide por 100 na borda.
 */
export type Porcentagem = number & { readonly __brand: "Porcentagem" };

/** 100,00% na escala de `Porcentagem`. */
export const CEM_PORCENTO = 10_000 as Porcentagem;

export interface ResumoCategoria {
  /** `null` agrupa as despesas sem categoria: sem elas a soma não fecharia 100,00%. */
  readonly categoriaId: string | null;
  readonly gasto: Cents;
  readonly percentualDistribuicao: Porcentagem;
}

export interface ResumoPessoa {
  readonly usuarioId: string;
  readonly gasto: Cents;
}

/**
 * `parte ÷ total` na escala de `Porcentagem`, arredondado para o centésimo
 * mais próximo. A divisão é feita em inteiros — quociente e resto — em vez
 * de `parte / total`, de modo que o critério de desempate seja explícito e
 * não herdado do arredondamento binário.
 */
function percentual(parte: Cents, total: Cents): Porcentagem {
  if (total === 0) {
    return 0 as Porcentagem;
  }
  const numerador = parte * CEM_PORCENTO;
  const base = Math.floor(numerador / total);
  const resto = numerador - base * total;
  return (resto * 2 >= total ? base + 1 : base) as Porcentagem;
}

function agrupar<C extends string | null>(
  lancamentos: readonly Lancamento[],
  chave: (lancamento: Lancamento) => C,
): Array<{ readonly chave: C; gasto: Cents }> {
  const grupos: Array<{ readonly chave: C; gasto: Cents }> = [];
  for (const lancamento of lancamentos) {
    const atual = grupos.find((grupo) => grupo.chave === chave(lancamento));
    if (atual) {
      atual.gasto = somar(atual.gasto, lancamento.valor);
    } else {
      grupos.push({ chave: chave(lancamento), gasto: lancamento.valor });
    }
  }
  return grupos;
}

function indiceDoMaiorGasto(itens: ReadonlyArray<{ readonly gasto: Cents }>): number {
  let indice = -1;
  let maior = -1;
  itens.forEach((item, posicao) => {
    if (item.gasto > maior) {
      indice = posicao;
      maior = item.gasto;
    }
  });
  return indice;
}

/**
 * Distribuição de gasto por categoria (MOV-01, AC 7).
 *
 * O denominador é o Total de Gastos produzido por `resumoMensal` sobre o
 * mesmo conjunto — existe num único lugar. Os numeradores saem de
 * `despesasDaCompetencia`, a mesma função que alimenta aquele total.
 *
 * A soma das porcentagens é exatamente 100,00%: cada uma é arredondada ao
 * centésimo e a sobra vai inteira para a categoria de maior gasto (empate
 * fica com a primeira). Total zero devolve 0% para todas, sem divisão
 * (MOV-01, AC 8).
 */
export function resumoPorCategoria(
  lancamentos: readonly Lancamento[],
  competencia: Competencia,
  totalGastos: Cents,
): readonly ResumoCategoria[] {
  const grupos = agrupar(despesasDaCompetencia(lancamentos, competencia), (l) => l.categoriaId);
  const categorias = grupos.map((grupo) => ({
    categoriaId: grupo.chave,
    gasto: grupo.gasto,
    percentualDistribuicao: percentual(grupo.gasto, totalGastos),
  }));

  if (totalGastos === 0) {
    return categorias;
  }

  const soma = categorias.reduce((acumulado, c) => acumulado + c.percentualDistribuicao, 0);
  const sobra = CEM_PORCENTO - soma;
  const maior = indiceDoMaiorGasto(categorias);
  return categorias.map((categoria, posicao) =>
    posicao === maior
      ? {
          ...categoria,
          percentualDistribuicao: (categoria.percentualDistribuicao + sobra) as Porcentagem,
        }
      : categoria,
  );
}

/** Gasto por pessoa dona. Soma exatamente o Total de Gastos da competência. */
export function resumoPorPessoa(
  lancamentos: readonly Lancamento[],
  competencia: Competencia,
): readonly ResumoPessoa[] {
  return agrupar(despesasDaCompetencia(lancamentos, competencia), (l) => l.usuarioId).map(
    (grupo) => ({ usuarioId: grupo.chave, gasto: grupo.gasto }),
  );
}
