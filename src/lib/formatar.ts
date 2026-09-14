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

const MES_E_ANO = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

/** `'2026-01'` → `'Janeiro de 2026'`. Só o nome do mês, em pt-BR. */
export function formatarCompetencia(competencia: string): string {
  const texto = MES_E_ANO.format(new Date(`${competencia}-01T00:00:00Z`));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** `'2026-01'` → `'Janeiro'`. */
export function nomeDoMes(competencia: string): string {
  return formatarCompetencia(competencia).split(" de ")[0] ?? "";
}

/**
 * Porcentagem em centésimos de ponto percentual: `2183` vira `"21,83%"`.
 *
 * Mora aqui pelo mesmo motivo que `formatarBRL`: formatação de número é
 * fronteira de apresentação, e espalhá-la produz duas convenções de vírgula no
 * mesmo produto. O teste de fronteira deste arquivo recusa `toFixed` em
 * qualquer outro lugar, e foi ele que pegou a primeira versão do gráfico.
 */
export function formatarPercentual(centesimos: number): string {
  const formatado = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centesimos / 100);
  return `${formatado}%`;
}
