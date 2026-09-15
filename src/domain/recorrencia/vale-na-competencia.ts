import { type Competencia, compararCompetencias } from "../shared/competencia";
import type { PeriodoRecorrencia } from "./janela-materializacao";

/**
 * Se uma recorrência ainda vale no mês aberto.
 *
 * **Só o fim é verificado.** Recorrência que ainda não começou continua
 * aparecendo, e a assimetria é deliberada: um gasto fixo que começa em novembro,
 * visto em setembro, é um compromisso recém-assumido que a pessoa precisa ver
 * confirmado — escondê-lo pareceria falha na gravação. Um encerrado é história,
 * e os meses em que ele valeu se alcançam navegando.
 *
 * O mês do fim **entra**, pela mesma razão que entra em `janelaMaterializacao`:
 * ele é a última competência em que a recorrência vale, não a primeira em que
 * ela deixa de valer.
 *
 * **Não olha `encerradaEm`.** Aquele campo é o instante do clique, registro de
 * auditoria; o que decide é `competenciaFim`, que o caso de uso de encerrar já
 * traduziu. Olhar os dois criaria duas verdades sobre o mesmo fato.
 *
 * Há teste de concordância contra `janelaMaterializacao`: onde esta função
 * devolve `false`, aquela não produz ocorrência. Sem ele a lista poderia
 * esconder um mês que ainda recebe lançamento — o pior dos dois erros, porque o
 * número apareceria no total sem linha que o explicasse.
 */
export function valeNaCompetencia(periodo: PeriodoRecorrencia, competencia: Competencia): boolean {
  return periodo.fim === null || compararCompetencias(competencia, periodo.fim) <= 0;
}
