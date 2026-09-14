import { addMeses, type Competencia, rangeCompetencias } from "../shared/competencia";
import { type Cents, somar, ZERO_CENTS } from "../shared/money";
import type { Lancamento, ResumoMensal } from "../tipos";
import { despesasDaCompetencia } from "./resumo-mensal";

/** Uma linha da projeção: quanto já está comprometido naquela competência. */
export type ComprometimentoFuturo = ResumoMensal["futuro"][number];

/**
 * Comprometimento das competências seguintes, **quebrado por competência**
 * (MOV-06, AC 3).
 *
 * Um número agregado esconderia a informação que o usuário precisa — se os
 * R$ X caem no mês que vem ou daqui a seis meses — e não teria como ser
 * conferido contra nenhuma tela.
 *
 * A janela é fechada em `meses`: uma recorrência sem competência de fim
 * materializa ocorrências indefinidamente, e a projeção só enxerga o que
 * está dentro dela (REC-02, AC 5). A lista sai completa, com zero nos meses
 * sem comprometimento, para que nenhum consumidor precise inferir a
 * ausência de um mês.
 */
export function projetarProximosMeses(
  lancamentos: readonly Lancamento[],
  competenciaAtual: Competencia,
  meses: number,
): readonly ComprometimentoFuturo[] {
  const janela = rangeCompetencias(
    addMeses(competenciaAtual, 1),
    addMeses(competenciaAtual, meses),
  );

  return janela.map((competencia) => ({
    competencia,
    comprometido: despesasDaCompetencia(lancamentos, competencia)
      .filter((l) => l.pagoEm === null)
      .reduce<Cents>((acumulado, l) => somar(acumulado, l.valor), ZERO_CENTS),
  }));
}
