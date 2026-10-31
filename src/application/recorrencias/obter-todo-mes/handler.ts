import type { MovimentoRepository, RecorrenciaRepository } from "@/application/ports/repositories";
import {
  MESES_DE_PROJECAO,
  materializarRecorrencias,
} from "@/application/recorrencias/materializar/handler";
import { type Competencia, type FixosDoMes, fixosDoMes } from "@/domain";

export interface DependenciasTodoMes {
  readonly recorrencias: RecorrenciaRepository;
  readonly movimentos: MovimentoRepository;
}

/**
 * A leitura de Todo mês: os fixos do mês aberto, com o valor da ocorrência.
 *
 * **Materializa antes de ler, e não em paralelo** (FIXCOL-02, AC 3). A linha e
 * os totais leem a ocorrência do mês; num mês que ainda não foi aberto em tela
 * nenhuma ela não existe, e ler primeiro daria "—" em toda linha e total zero.
 * A chamada é a mesma de Lançamentos e da Visão geral, com a mesma janela:
 * abrir uma tela ou outra primeiro não pode mudar o que existe.
 *
 * A materialização já lê as recorrências uma vez, e aqui elas são lidas de
 * novo. É uma consulta a mais por página, aceita (AD-008): devolver a lista de
 * lá mexeria nas três telas que a chamam.
 */
export async function obterTodoMes(
  deps: DependenciasTodoMes,
  competencia: Competencia,
): Promise<FixosDoMes> {
  await materializarRecorrencias(deps, competencia, MESES_DE_PROJECAO);
  const [recorrencias, lancamentos] = await Promise.all([
    deps.recorrencias.listarComVersoes(),
    deps.movimentos.listarPorCompetencia(competencia),
  ]);
  return fixosDoMes(recorrencias, lancamentos, competencia);
}
