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

/**
 * Instante UTC em ISO 8601 com `Z`. Mês, dia, hora, minuto e segundo têm
 * seus limites codificados na própria regex.
 */
const REGEX_INSTANTE_UTC =
  /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{3})?Z$/;

const MS_POR_DIA = 86_400_000;

/**
 * Dias decorridos desde 1970-01-01 (algoritmo `days_from_civil`, de Howard
 * Hinnant). É aritmética inteira pura: nenhum objeto de data participa.
 */
function diasDesdeEpoch(ano: number, mes: number, dia: number): number {
  const anoDeslocado = mes <= 2 ? ano - 1 : ano;
  const era = Math.floor(anoDeslocado / 400);
  const anoNaEra = anoDeslocado - era * 400;
  const deslocamentoDoMes = mes > 2 ? -3 : 9;
  const diaDoAno = Math.floor((153 * (mes + deslocamentoDoMes) + 2) / 5) + dia - 1;
  const diaNaEra =
    anoNaEra * 365 + Math.floor(anoNaEra / 4) - Math.floor(anoNaEra / 100) + diaDoAno;
  return era * 146_097 + diaNaEra - 719_468;
}

/**
 * Converte um instante UTC na competência do fuso informado (COMP-03).
 *
 * O fuso é parâmetro obrigatório: sem ele, uma compra às 20h30 de 31/03 em
 * São Paulo cairia em abril, porque o instante em UTC já é 31/03 23h30 —
 * ou pior, 01/04 conforme o fuso da máquina. Esta é a única porta do
 * domínio por onde tempo de relógio entra, e ela não lê nada do ambiente.
 */
export function dataParaCompetencia(dataISO: string, tz: string): Result<Competencia, DomainError> {
  if (!REGEX_INSTANTE_UTC.test(dataISO)) {
    return err({ code: "COMPETENCIA_INVALIDA", detalhes: { dataISO } });
  }
  const dias = diasDesdeEpoch(
    Number.parseInt(dataISO.slice(0, 4), 10),
    Number.parseInt(dataISO.slice(5, 7), 10),
    Number.parseInt(dataISO.slice(8, 10), 10),
  );
  const segundosDoDia =
    Number.parseInt(dataISO.slice(11, 13), 10) * 3600 +
    Number.parseInt(dataISO.slice(14, 16), 10) * 60 +
    Number.parseInt(dataISO.slice(17, 19), 10);
  const instante = dias * MS_POR_DIA + segundosDoDia * 1000;

  let partes: Intl.DateTimeFormatPart[];
  try {
    partes = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
    }).formatToParts(instante);
  } catch {
    // Fuso inexistente faz o Intl lançar RangeError. O domínio não lança
    // (AD-006): a falha vira um Result de erro.
    return err({ code: "COMPETENCIA_INVALIDA", detalhes: { tz } });
  }

  let ano = "";
  let mes = "";
  for (const parte of partes) {
    if (parte.type === "year") {
      ano = parte.value;
    }
    if (parte.type === "month") {
      mes = parte.value;
    }
  }
  return criarCompetencia(`${ano}-${mes}`);
}
