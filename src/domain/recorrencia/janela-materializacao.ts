import { type Competencia, compararCompetencias, rangeCompetencias } from "../shared/competencia";

/**
 * O período de vida de uma recorrência.
 *
 * `fim` e `encerradaDesde` são coisas diferentes e convivem: o primeiro é o
 * fim planejado desde o cadastro (um consórcio que acaba em dezembro), o
 * segundo é a interrupção decidida depois (cancelei a internet em maio). Os
 * dois cortam, e vale o que cortar mais cedo.
 */
export interface PeriodoRecorrencia {
  readonly inicio: Competencia;
  /** `null` = sem fim planejado. */
  readonly fim: Competencia | null;
  /** `null` = não encerrada. A competência informada **já não** materializa. */
  readonly encerradaDesde: Competencia | null;
}

/**
 * Quais competências de `[de, ate]` precisam ter ocorrência materializada.
 *
 * Concentra as quatro bordas num lugar só — antes do início, depois do fim, a
 * partir do encerramento, e fora da janela. Espalhadas pelo caso de uso, cada
 * uma seria testada por acidente; aqui cada uma tem um teste com nome.
 *
 * A assimetria entre `fim` e `encerradaDesde` é deliberada e é a parte fácil
 * de errar: o mês do **fim** entra, porque a recorrência vale até ele; o mês
 * do **encerramento** não entra, porque é a partir dele que ela deixou de
 * valer. São duas semânticas diferentes e por isso duas colunas.
 *
 * Janela invertida devolve vazio em vez de inventar meses: `rangeCompetencias`
 * já se comporta assim, e depender disso é mais honesto que redigitar a
 * verificação.
 */
export function janelaMaterializacao(
  periodo: PeriodoRecorrencia,
  de: Competencia,
  ate: Competencia,
): readonly Competencia[] {
  return rangeCompetencias(de, ate).filter((competencia) => {
    if (compararCompetencias(competencia, periodo.inicio) < 0) {
      return false;
    }
    if (periodo.fim !== null && compararCompetencias(competencia, periodo.fim) > 0) {
      return false;
    }
    if (
      periodo.encerradaDesde !== null &&
      compararCompetencias(competencia, periodo.encerradaDesde) >= 0
    ) {
      return false;
    }
    return true;
  });
}
