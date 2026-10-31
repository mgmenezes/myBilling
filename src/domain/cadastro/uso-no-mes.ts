import { janelaMaterializacao } from "../recorrencia/janela-materializacao";
import type { Competencia } from "../shared/competencia";
import type { Lancamento, Recorrencia } from "../tipos";

/**
 * Quanto o mês aberto usa cada categoria e cada meio de pagamento (CADCOL-03).
 *
 * - **Fixos**: os fixos, de qualquer natureza, cujo período contém o mês. É
 *   `janelaMaterializacao` que decide, a mesma função que decide se o mês tem
 *   ocorrência do fixo: uma segunda definição das bordas poderia discordar
 *   dela no começo ou no fim.
 * - **Lançamentos**: os não cancelados da competência, de qualquer natureza e
 *   origem, inclusive a ocorrência de cada fixo. São as linhas que Lançamentos
 *   mostra com o filtro da categoria ou do meio. O fixo do mês conta nas duas
 *   colunas: como plano em `fixos` e como linha em `lancamentos`.
 *
 * O meio conta sempre; a categoria, só quando existe. Receita e item sem
 * categoria contam para o meio e para categoria nenhuma.
 *
 * **Só contagem de linhas.** Nenhum valor é lido (AD-003).
 */

export interface UsoDoCadastro {
  readonly fixos: number;
  readonly lancamentos: number;
}

export const SEM_USO: UsoDoCadastro = { fixos: 0, lancamentos: 0 };

export interface UsoNoMes {
  /** Por id de categoria; categoria sem uso fica fora do mapa. */
  readonly porCategoria: ReadonlyMap<string, UsoDoCadastro>;
  /** Por id de meio; meio sem uso fica fora do mapa. */
  readonly porMeio: ReadonlyMap<string, UsoDoCadastro>;
}

export function usoNoMes(
  recorrencias: readonly Recorrencia[],
  lancamentos: readonly Lancamento[],
  competencia: Competencia,
): UsoNoMes {
  const porCategoria = new Map<string, UsoDoCadastro>();
  const porMeio = new Map<string, UsoDoCadastro>();

  for (const recorrencia of recorrencias) {
    const periodo = { inicio: recorrencia.competenciaInicio, fim: recorrencia.competenciaFim };
    if (janelaMaterializacao(periodo, competencia, competencia).length === 0) {
      continue;
    }
    contar(porMeio, recorrencia.meioPagamentoId, "fixos");
    if (recorrencia.categoriaId !== null) {
      contar(porCategoria, recorrencia.categoriaId, "fixos");
    }
  }

  /*
   * O repositório já entrega só a competência pedida e sem cancelados; a
   * função confere de novo para não depender de quem chama.
   */
  for (const lancamento of lancamentos) {
    if (lancamento.competencia !== competencia || lancamento.canceladoEm !== null) {
      continue;
    }
    contar(porMeio, lancamento.meioPagamentoId, "lancamentos");
    if (lancamento.categoriaId !== null) {
      contar(porCategoria, lancamento.categoriaId, "lancamentos");
    }
  }

  return { porCategoria, porMeio };
}

function contar(mapa: Map<string, UsoDoCadastro>, id: string, coluna: keyof UsoDoCadastro): void {
  const atual = mapa.get(id) ?? SEM_USO;
  mapa.set(id, { ...atual, [coluna]: atual[coluna] + 1 });
}
