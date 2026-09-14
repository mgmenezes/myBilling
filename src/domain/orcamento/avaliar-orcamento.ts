import {
  CEM_PORCENTO,
  type Porcentagem,
  percentual,
  type ResumoCategoria,
} from "../mes/resumo-por-categoria";
import { type Cents, somar, ZERO_CENTS } from "../shared/money";

/** Limite de uma categoria **naquela competência** (ORC-02, AC 6). */
export interface LimiteCategoria {
  readonly categoriaId: string | null;
  readonly limite: Cents;
}

export interface AvaliacaoCategoria {
  readonly categoriaId: string | null;
  readonly gasto: Cents;
  readonly limite: Cents | null;
  /** `gasto ÷ limite`. Passa de 100,00% quando estoura; `null` sem limite. */
  readonly percentualConsumo: Porcentagem | null;
  /** `gasto ÷ total de gastos`. Campo distinto do consumo (ORC-01, AC 1). */
  readonly percentualDistribuicao: Porcentagem;
  readonly estourou: boolean;
}

export interface AvaliacaoOrcamento {
  readonly categorias: readonly AvaliacaoCategoria[];
  /** `total gasto ÷ soma dos limites`; `null` quando não há limite (ORC-02). */
  readonly percentualGlobal: Porcentagem | null;
}

/**
 * Limite vigente da categoria, ou `null` quando ela não tem limite no mês.
 * Limite zero também vira `null`: dividir por ele produziria infinito, que o
 * spec proíbe tanto quanto o zero (ORC-01, AC 3).
 */
function limiteDe(limites: readonly LimiteCategoria[], categoriaId: string | null): Cents | null {
  const declarado = limites.find((l) => l.categoriaId === categoriaId);
  if (declarado === undefined || declarado.limite === 0) {
    return null;
  }
  return declarado.limite;
}

/**
 * Avaliação de orçamento do mês.
 *
 * As duas porcentagens respondem perguntas diferentes e por isso são campos
 * distintos (ORC-01, AC 1): consumo é `gasto ÷ limite` — "posso gastar mais
 * nessa categoria?" — e passa de 100% sem truncar; distribuição é
 * `gasto ÷ total de gastos` — "para onde vai meu dinheiro?" — e vem pronta
 * de `resumoPorCategoria`, que já garante que a soma feche 100,00%.
 */
export function avaliarOrcamento(
  categorias: readonly ResumoCategoria[],
  limites: readonly LimiteCategoria[],
  totalGastos: Cents,
): AvaliacaoOrcamento {
  const avaliadas = categorias.map((categoria) => {
    const limite = limiteDe(limites, categoria.categoriaId);
    const percentualConsumo = limite === null ? null : percentual(categoria.gasto, limite);
    return {
      categoriaId: categoria.categoriaId,
      gasto: categoria.gasto,
      limite,
      percentualConsumo,
      percentualDistribuicao: categoria.percentualDistribuicao,
      estourou: percentualConsumo !== null && percentualConsumo > CEM_PORCENTO,
    };
  });

  const somaLimites = limites.reduce<Cents>(
    (acumulado, l) => somar(acumulado, l.limite),
    ZERO_CENTS,
  );

  return {
    categorias: avaliadas,
    percentualGlobal: somaLimites === 0 ? null : percentual(totalGastos, somaLimites),
  };
}
