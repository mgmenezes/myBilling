import { type Competencia, compararCompetencias, rangeCompetencias } from "../shared/competencia";

/**
 * O período de vida de uma recorrência.
 *
 * `fim` é a **última competência em que ela ainda vale**, e carrega os dois
 * casos: o fim planejado no cadastro (um consórcio que acaba em dezembro) e a
 * interrupção decidida depois (cancelei a internet em maio — o fim vira abril).
 *
 * Os dois moram na mesma coluna de propósito. A alternativa considerada era uma
 * segunda coluna para o encerramento, e ela foi descartada: duas datas
 * significando quase a mesma coisa são um convite a alguém preencher uma e
 * esquecer a outra. O que distingue um caso do outro é `encerrada_em` estar
 * preenchido, que é registro de auditoria e não entra neste cálculo.
 */
export interface PeriodoRecorrencia {
  readonly inicio: Competencia;
  /** Última competência em que vale. `null` = sem fim. */
  readonly fim: Competencia | null;
}

/**
 * Quais competências de `[de, ate]` precisam ter ocorrência materializada.
 *
 * Concentra as três bordas num lugar só — antes do início, depois do fim, e
 * fora da janela. Espalhadas pelo caso de uso, cada uma seria testada por
 * acidente; aqui cada uma tem um teste com nome.
 *
 * O mês do `fim` **entra**: ele é a última competência em que a recorrência
 * vale, não a primeira em que ela deixa de valer. Quem encerra a partir de maio
 * grava abril, e é na tradução — não aqui — que mora o off-by-one.
 *
 * Janela invertida devolve vazio em vez de inventar meses: `rangeCompetencias`
 * já se comporta assim, e redigitar a verificação criaria uma segunda
 * definição do mesmo limite.
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
    return true;
  });
}
