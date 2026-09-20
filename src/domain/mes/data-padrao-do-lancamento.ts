import type { Competencia } from "../shared/competencia";

/**
 * Que data um formulário de lançamento deve propor.
 *
 * **Hoje, quando hoje pertence ao mês aberto. Dia 1, quando não.**
 *
 * O formulário propunha sempre o dia 1, e isso cobrava uma correção manual em
 * todo lançamento do mês corrente — que é a maioria deles. Propor hoje resolve
 * o caso frequente.
 *
 * A segunda metade da regra existe porque a primeira sozinha estaria errada:
 * quem abre **março** a partir de setembro não quer a data de hoje ali. Ela cai
 * fora da competência, e o lançamento nasceria com data que não pertence ao mês
 * em que está sendo criado. Nesses meses o dia 1 continua sendo o palpite
 * menos errado.
 *
 * `hojeISO` entra como parâmetro porque o domínio não conhece o relógio
 * (AD-006). Quem o resolve — no fuso da casa, nunca no da máquina — é
 * `hojeEm`, em `src/lib/relogio.ts`.
 *
 * A comparação é de prefixo textual, sem `Date`, como em `realizadoEm`: uma
 * competência é o prefixo `'YYYY-MM'` de uma data `'YYYY-MM-DD'` (AD-002).
 */
export function dataPadraoDoLancamento(competencia: Competencia, hojeISO: string): string {
  return hojeISO.startsWith(`${competencia}-`) ? hojeISO : `${competencia}-01`;
}
