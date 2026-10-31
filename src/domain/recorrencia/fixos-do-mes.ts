import { despesasDaCompetencia } from "../mes/resumo-mensal";
import type { Competencia } from "../shared/competencia";
import { type Cents, somar, ZERO_CENTS } from "../shared/money";
import type { Lancamento, Recorrencia } from "../tipos";
import { valeNaCompetencia } from "./vale-na-competencia";
import type { VersaoRecorrencia } from "./versao-vigente";

export interface RecorrenciaComVigencias {
  readonly recorrencia: Recorrencia;
  readonly versoes: readonly VersaoRecorrencia[];
}

export interface FixoDoMes {
  readonly recorrencia: Recorrencia;
  readonly versoes: readonly VersaoRecorrencia[];
  /** Valor da ocorrência no mês; `null` sem ocorrência (o fixo ainda não começou). */
  readonly valorDoMes: Cents | null;
  /** Previsto gravado na ocorrência; `null` sem ocorrência. */
  readonly previstoDoMes: Cents | null;
  /** Confirmado diferente do previsto, pelo mesmo critério da linha de Lançamentos. */
  readonly confirmado: boolean;
}

export interface FixosDoMes {
  readonly entradas: readonly FixoDoMes[];
  readonly saidas: readonly FixoDoMes[];
  readonly totalEntradas: Cents;
  readonly totalSaidas: Cents;
}

function total(lancamentos: readonly Lancamento[]): Cents {
  return lancamentos.reduce<Cents>((acumulado, l) => somar(acumulado, l.valor), ZERO_CENTS);
}

/**
 * Pelo dia de vencimento; no mesmo dia, pela descrição em pt-BR; e, por fim,
 * pelo id, para a ordem não depender da ordem em que o banco devolveu as linhas.
 */
function compararFixos(a: FixoDoMes, b: FixoDoMes): number {
  return (
    a.recorrencia.diaVencimento - b.recorrencia.diaVencimento ||
    a.recorrencia.descricao.localeCompare(b.recorrencia.descricao, "pt-BR") ||
    a.recorrencia.id.localeCompare(b.recorrencia.id, "pt-BR")
  );
}

/**
 * O valor da linha é o da ocorrência. `confirmado` repete o critério da linha
 * de fixo em Lançamentos: a materialização grava valor e previsto iguais, então
 * valor diferente do previsto é conta que chegou diferente (FIXO-04).
 */
function valoresDaOcorrencia(
  ocorrencia: Lancamento | undefined,
): Pick<FixoDoMes, "valorDoMes" | "previstoDoMes" | "confirmado"> {
  if (ocorrencia === undefined) {
    return { valorDoMes: null, previstoDoMes: null, confirmado: false };
  }
  return {
    valorDoMes: ocorrencia.valor,
    previstoDoMes: ocorrencia.valorPrevisto,
    confirmado: ocorrencia.valorPrevisto !== null && ocorrencia.valor !== ocorrencia.valorPrevisto,
  };
}

/**
 * Os fixos do mês aberto, em duas seções, com o valor que o mês de fato tem
 * (FIXCOL-01 a 03).
 *
 * **Só `movimento` soma** (AD-003). A linha e os totais leem a ocorrência do
 * mês; a vigência só passa adiante, para o histórico. Um fixo que começa
 * depois do mês aparece sem valor e soma zero, por maior que seja a vigência.
 *
 * **Quem aparece:** o fixo que ainda vale no mês (FIXO-07) **ou** que tem
 * ocorrência nele. O segundo ramo é o encerrado com ocorrência paga depois do
 * fim: encerrar apaga só as não pagas, a paga fica e entra no bloco "Fixos" de
 * Lançamentos. Sem a linha, o total seria maior que a soma das linhas.
 *
 * **O total de saídas sai de `despesasDaCompetencia`**, a lista de que
 * `resumoMensal` tira o bloco "Fixos". Há teste de concordância entre os dois:
 * o dono pediu que o número bata com Lançamentos em qualquer mês.
 *
 * A seção é decidida pela natureza do fixo, com o corte de Lançamentos:
 * despesa em "Saídas fixas", o resto em "Entradas fixas".
 */
export function fixosDoMes(
  recorrencias: readonly RecorrenciaComVigencias[],
  lancamentos: readonly Lancamento[],
  competencia: Competencia,
): FixosDoMes {
  const ocorrencias = lancamentos.filter(
    (l) => l.origem === "RECORRENCIA" && l.canceladoEm === null && l.competencia === competencia,
  );
  /* A restrição única `(recorrência, competência)` garante uma por fixo. */
  const ocorrenciaPorFixo = new Map(ocorrencias.map((l) => [l.recorrenciaId, l]));

  const fixos = recorrencias
    .filter(
      ({ recorrencia }) =>
        valeNaCompetencia(
          { inicio: recorrencia.competenciaInicio, fim: recorrencia.competenciaFim },
          competencia,
        ) || ocorrenciaPorFixo.has(recorrencia.id),
    )
    .map(({ recorrencia, versoes }) => ({
      recorrencia,
      versoes,
      ...valoresDaOcorrencia(ocorrenciaPorFixo.get(recorrencia.id)),
    }))
    .sort(compararFixos);

  return {
    entradas: fixos.filter((f) => f.recorrencia.natureza !== "DESPESA"),
    saidas: fixos.filter((f) => f.recorrencia.natureza === "DESPESA"),
    totalEntradas: total(ocorrencias.filter((l) => l.natureza !== "DESPESA")),
    totalSaidas: total(
      despesasDaCompetencia(lancamentos, competencia).filter((l) => l.origem === "RECORRENCIA"),
    ),
  };
}
