import type { Cents } from "@/domain";

/**
 * A **única** fronteira onde centavos viram texto (AD-001).
 *
 * Dinheiro é inteiro em centavos em toda parte, e a divisão por 100 acontece
 * só aqui. `toFixed` sobre valor monetário fora deste arquivo é bug, e o teste
 * ao lado varre `src/` para provar que não existe.
 */

const MOEDA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const DATA = new Intl.DateTimeFormat("pt-BR", {
  // Fixo em UTC de propósito: sem isso, `2026-03-05` renderiza `04/03/2026`
  // em qualquer fuso a oeste de Greenwich (AD-002).
  timeZone: "UTC",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** O `Intl` separa `R$` do número com espaço não separável; normalizamos. */
function espacoNormal(texto: string): string {
  return texto.replace(/[  ]/g, " ");
}

/** `123456` → `'R$ 1.234,56'`. */
export function formatarBRL(centavos: Cents | number): string {
  return espacoNormal(MOEDA.format(centavos / 100));
}

/** `'2026-03-05'` ou `'2026-03-05T12:00:00Z'` → `'05/03/2026'`. */
export function formatarData(iso: string): string {
  return DATA.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
}
