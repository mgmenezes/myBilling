import { type DomainError, err, ok, type Result } from "./result";

/**
 * Competência é a string `'YYYY-MM'` (AD-002). O deslocamento de meses é
 * feito em aritmética inteira sobre `ano * 12 + (mes - 1)`. Nenhum objeto
 * de data nativo é usado aqui: nem overflow de dia (31/03 + 1 mês virando
 * 01/05), nem deslocamento de fuso à meia-noite.
 */
export type Competencia = string & { readonly __brand: "Competencia" };

/** O mês válido está na própria regex: `'2026-13'` e `'2026-00'` não casam. */
const REGEX_COMPETENCIA = /^\d{4}-(?:0[1-9]|1[0-2])$/;

export function criarCompetencia(texto: string): Result<Competencia, DomainError> {
  if (!REGEX_COMPETENCIA.test(texto)) {
    return err({ code: "COMPETENCIA_INVALIDA", detalhes: { texto } });
  }
  return ok(texto as Competencia);
}

/** Meses decorridos desde o ano 0. Só existe dentro deste módulo. */
function paraIndice(competencia: Competencia): number {
  const ano = Number.parseInt(competencia.slice(0, 4), 10);
  const mes = Number.parseInt(competencia.slice(5, 7), 10);
  return ano * 12 + (mes - 1);
}

function deIndice(indice: number): Competencia {
  const ano = Math.floor(indice / 12);
  const mes = indice - ano * 12 + 1;
  return `${String(ano).padStart(4, "0")}-${String(mes).padStart(2, "0")}` as Competencia;
}

/** Aceita `n` negativo: `addMeses('2026-01', -1)` é `'2025-12'` (COMP-04). */
export function addMeses(competencia: Competencia, n: number): Competencia {
  return deIndice(paraIndice(competencia) + n);
}

export function compararCompetencias(a: Competencia, b: Competencia): -1 | 0 | 1 {
  const indiceA = paraIndice(a);
  const indiceB = paraIndice(b);
  if (indiceA < indiceB) {
    return -1;
  }
  if (indiceA > indiceB) {
    return 1;
  }
  return 0;
}

/** Meses de `a` até `b`; negativo quando `b` é anterior a `a`. */
export function diffMeses(a: Competencia, b: Competencia): number {
  return paraIndice(b) - paraIndice(a);
}

/** Intervalo inclusivo nas duas pontas; vazio quando `ate` é anterior a `de`. */
export function rangeCompetencias(de: Competencia, ate: Competencia): Competencia[] {
  const inicio = paraIndice(de);
  const fim = paraIndice(ate);
  const competencias: Competencia[] = [];
  for (let indice = inicio; indice <= fim; indice += 1) {
    competencias.push(deIndice(indice));
  }
  return competencias;
}
