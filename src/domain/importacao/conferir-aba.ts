import { type Cents, somar, subtrair, ZERO_CENTS } from "../shared/money";
import type { AbaLida, Bloco, LinhaLida } from "./ler-aba";

export interface ConferenciaDeBloco {
  readonly linhas: number;
  /** `ZERO_CENTS` quando o bloco não tem linha. */
  readonly somaLida: Cents;
  readonly totalDaPlanilha: Cents | null;
  readonly confere: boolean;
  /** `totalDaPlanilha − somaLida`, em centavos; `null` sem total. */
  readonly diferenca: number | null;
}

export interface Conferencia {
  readonly blocos: Readonly<Record<Bloco, ConferenciaDeBloco>>;
  /** Fixos + Cartão de Crédito + Gastos do Mês contra o total de Saídas. */
  readonly saidas: ConferenciaDeBloco;
  readonly temDivergencia: boolean;
}

function conferir(
  linhas: ReadonlyArray<LinhaLida>,
  totalDaPlanilha: Cents | null,
): ConferenciaDeBloco {
  let somaLida = ZERO_CENTS;
  for (const linha of linhas) {
    somaLida = somar(somaLida, linha.valor);
  }
  return {
    linhas: linhas.length,
    somaLida,
    totalDaPlanilha,
    // Total ilegível nunca é igual à soma: `null` não confere (IMP-05 AC 3).
    confere: totalDaPlanilha === somaLida,
    diferenca: totalDaPlanilha === null ? null : subtrair(totalDaPlanilha, somaLida),
  };
}

/**
 * Compara o que foi lido com os totais da própria planilha, bloco a bloco e,
 * de novo, todas as despesas contra Saídas (IMP-05 AC 1 a 4). As duas
 * conferências juntas separam "a planilha somou errado" de "o importador leu
 * errado": um total de bloco que não cobre o bloco falha sozinho, e Saídas,
 * que cobre tudo, passa.
 */
export function conferirAba(aba: AbaLida): Conferencia {
  const blocos = {
    FIXOS: conferir(aba.fixos, aba.totais.FIXOS),
    CARTAO: conferir(aba.cartao, aba.totais.CARTAO),
    GASTOS: conferir(aba.gastos, aba.totais.GASTOS),
    ENTRADAS: conferir(aba.entradas, aba.totais.ENTRADAS),
  };
  const saidas = conferir([...aba.fixos, ...aba.cartao, ...aba.gastos], aba.totais.SAIDAS);
  return {
    blocos,
    saidas,
    temDivergencia: [...Object.values(blocos), saidas].some((bloco) => !bloco.confere),
  };
}
