/**
 * A casa inventada do simulador da landing (JANO-04).
 *
 * **Valores inventados, de ninguém** (AD-009): redondos, escolhidos para a
 * cena e não por realismo. Nenhum vem do uso real da família, do seed ou de
 * captura.
 *
 * Doze saldos previstos, em centavos inteiros (AD-001), um por mês a partir do
 * mês corrente: o que "Vai sobrar" em cada mês, com as contas fixas e as
 * parcelas que a casa já tem. O quinto e o sexto mês são apertados de
 * propósito: R$ 2.400,00 em 10x derruba os dois, e em 12x cabe.
 */
export const SALDOS_DA_CASA: ReadonlyArray<number> = [
  82000, 41000, 56000, 69000, 21500, 20500, 64000, 59000, 72000, 65000, 70000, 86000,
];
