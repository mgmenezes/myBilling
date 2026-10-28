import { diaEfetivo } from "../cartao/ciclo-fatura";
import type { Competencia } from "../shared/competencia";

/**
 * O dia de vencimento aplicado à competência, reduzido ao último dia do mês
 * quando ele não existe (FIXO-01, AC 5). Vencimento dia 31 em fevereiro é 28,
 * e `diaEfetivo` já resolvia isso para o ciclo de fatura.
 *
 * Mora no domínio porque duas operações precisam dela: a materialização, que
 * cria a ocorrência, e a edição do fixo, que recalcula a data de todas quando o
 * dia muda (EDF-02 AC 2). Uma cópia em cada caso de uso seria a primeira
 * divergência esperando acontecer.
 */
export function dataDeVencimento(competencia: Competencia, diaVencimento: number): string {
  const ano = Number.parseInt(competencia.slice(0, 4), 10);
  const mes = Number.parseInt(competencia.slice(5, 7), 10);
  const dia = diaEfetivo(diaVencimento, ano, mes);
  return `${competencia}-${String(dia).padStart(2, "0")}`;
}
