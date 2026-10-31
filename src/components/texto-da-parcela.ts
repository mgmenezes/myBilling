/**
 * O que vem depois do número da parcela na linha da compra (DENS-01, AC 2):
 * "2/4 · faltam 2", e "4/4 · última" na última.
 *
 * Curto de propósito: a parcela mora na mesma linha da descrição, e
 * "(faltam 2 depois desta)" empurrava a linha para duas. O número diz em qual
 * parcela se está; o resto diz quanto ainda vem.
 */
export function restoDaParcela(restantes: number): string {
  return restantes === 0 ? "última" : `faltam ${restantes}`;
}
