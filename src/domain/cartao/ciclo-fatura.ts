import { addMeses, type Competencia } from "../shared/competencia";
import { type DomainError, err, ok, type Result } from "../shared/result";
import type { Cartao } from "../tipos";

export interface CicloFatura {
  readonly competenciaFatura: Competencia;
  /** `'YYYY-MM-DD'` */
  readonly cicloInicio: string;
  readonly cicloFim: string;
  readonly dataVencimento: string;
}

const REGEX_DATA = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;

function ehBissexto(ano: number): boolean {
  return ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0);
}

export function ultimoDiaDoMes(ano: number, mes: number): number {
  if (mes === 2) {
    return ehBissexto(ano) ? 29 : 28;
  }
  if (mes === 4 || mes === 6 || mes === 9 || mes === 11) {
    return 30;
  }
  return 31;
}

/** `min(dia, último dia do mês)`: fechamento 31 em fevereiro vira 28 (CART-03, AC 3). */
export function diaEfetivo(dia: number, ano: number, mes: number): number {
  return Math.min(dia, ultimoDiaDoMes(ano, mes));
}

function anoDe(competencia: Competencia): number {
  return Number.parseInt(competencia.slice(0, 4), 10);
}

function mesDe(competencia: Competencia): number {
  return Number.parseInt(competencia.slice(5, 7), 10);
}

function dataDe(competencia: Competencia, dia: number): string {
  return `${competencia}-${String(dia).padStart(2, "0")}`;
}

/** Dia seguinte, virando o mês quando `dia` é o último. */
function diaSeguinte(competencia: Competencia, dia: number): string {
  if (dia < ultimoDiaDoMes(anoDe(competencia), mesDe(competencia))) {
    return dataDe(competencia, dia + 1);
  }
  return dataDe(addMeses(competencia, 1), 1);
}

/**
 * Resolve em que fatura uma compra cai.
 *
 * A competência do lançamento **não** é afetada por esta função: o dia de
 * fechamento move a fatura, nunca o mês do gasto (CART-01, AC 1). É a
 * separação que impede o "meu gasto de março sumiu".
 */
export function resolverCicloFatura(
  cartao: Cartao,
  dataCompra: string,
): Result<CicloFatura, DomainError> {
  if (!REGEX_DATA.test(dataCompra)) {
    return err({ code: "COMPETENCIA_INVALIDA", detalhes: { dataCompra } });
  }
  // A regex acima já provou o formato `'YYYY-MM'` do prefixo.
  const competenciaCompra = dataCompra.slice(0, 7) as Competencia;
  const diaCompra = Number.parseInt(dataCompra.slice(8, 10), 10);

  const fechamentoDoMes = diaEfetivo(
    cartao.diaFechamento,
    anoDe(competenciaCompra),
    mesDe(competenciaCompra),
  );
  const entraNoCicloDoMes =
    diaCompra < fechamentoDoMes ||
    (diaCompra === fechamentoDoMes && !cartao.fechamentoVaiParaFaturaSeguinte);

  const competenciaFim = entraNoCicloDoMes ? competenciaCompra : addMeses(competenciaCompra, 1);
  const competenciaAnterior = addMeses(competenciaFim, -1);
  const competenciaFatura = addMeses(competenciaFim, 1);

  return ok({
    competenciaFatura,
    cicloInicio: diaSeguinte(
      competenciaAnterior,
      diaEfetivo(cartao.diaFechamento, anoDe(competenciaAnterior), mesDe(competenciaAnterior)),
    ),
    cicloFim: dataDe(
      competenciaFim,
      diaEfetivo(cartao.diaFechamento, anoDe(competenciaFim), mesDe(competenciaFim)),
    ),
    dataVencimento: dataDe(
      competenciaFatura,
      diaEfetivo(cartao.diaVencimento, anoDe(competenciaFatura), mesDe(competenciaFatura)),
    ),
  });
}
