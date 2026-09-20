import { dataParaCompetencia } from "@/domain";

/**
 * O relógio, num lugar só.
 *
 * O domínio não conhece `Date.now()` (AD-006), então alguém na borda precisa
 * resolver "hoje". Este módulo é esse alguém, e existe separado porque a regra
 * já vivia duplicada em potencial: a action de pagamentos precisava dela para
 * gravar a data de pagamento, e o formulário de lançamento passou a precisar
 * para propor a data. Duas cópias de uma regra de fuso divergem na primeira
 * correção, e a segunda fica errada por um dia.
 */

/** O fuso da casa. Explícito, nunca o da máquina. */
export const FUSO_DA_CASA = "America/Sao_Paulo";

/**
 * A data de hoje em `'YYYY-MM-DD'`, no fuso informado.
 *
 * O ano e o mês saem de `dataParaCompetencia`, que já resolve fuso sem objeto
 * de data; o dia sai do mesmo `Intl`, pela mesma razão. **Às 21h de 31/03 em
 * São Paulo o UTC já é 1º de abril**, e usar o dia da máquina gravaria o
 * lançamento no dia seguinte — e, uma vez por mês, na competência seguinte.
 */
export function hojeEm(fuso: string = FUSO_DA_CASA): string {
  const agora = new Date().toISOString();
  const competencia = dataParaCompetencia(agora, fuso);
  if (!competencia.ok) {
    throw new Error("não foi possível resolver a data corrente");
  }
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: fuso, day: "2-digit" }).formatToParts(
    new Date(agora),
  );
  const dia = partes.find((parte) => parte.type === "day")?.value;
  if (dia === undefined) {
    throw new Error("não foi possível resolver o dia corrente");
  }
  return `${competencia.value}-${dia}`;
}
