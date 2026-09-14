import type { Competencia } from "../shared/competencia";
import { type Cents, somar, subtrair, ZERO_CENTS } from "../shared/money";
import type { Lancamento, Origem, ResumoMensal } from "../tipos";

/**
 * Eixo competência do mês. `pendente` entra em T21, junto com o eixo caixa.
 *
 * A forma dos campos é derivada de `ResumoMensal` (tipos.ts) em vez de
 * redigitada: a definição dos totais exibidos vive num único lugar.
 */
export type VisaoCompetencia = Omit<ResumoMensal["competenciaView"], "pendente">;

/** Lançamento cancelado não entra em soma nenhuma (MOV-01). */
function vigente(lancamento: Lancamento): boolean {
  return lancamento.canceladoEm === null;
}

function total(lancamentos: readonly Lancamento[]): Cents {
  return lancamentos.reduce<Cents>((acumulado, l) => somar(acumulado, l.valor), ZERO_CENTS);
}

/**
 * Único lugar que decide o que é despesa somável de uma competência:
 * natureza despesa, não cancelada, daquela competência (MOV-01, AD-003).
 * `resumoPorCategoria` consome esta mesma lista, de modo que o numerador e
 * o denominador das porcentagens nunca divirjam.
 */
export function despesasDaCompetencia(
  lancamentos: readonly Lancamento[],
  competencia: Competencia,
): readonly Lancamento[] {
  return lancamentos.filter(
    (l) => vigente(l) && l.natureza === "DESPESA" && l.competencia === competencia,
  );
}

function somarPorOrigem(despesas: readonly Lancamento[], origem: Origem): Cents {
  return total(despesas.filter((l) => l.origem === origem));
}

/**
 * Agregação do eixo competência: o mês em que o gasto foi *assumido*,
 * independentemente de quando o dinheiro sai da conta.
 *
 * O investimento é somado à parte: fica fora do Total de Gastos e é
 * subtraído do saldo (MOV-04, AC 4). O saldo subtrai a saída **do próprio
 * eixo** — o Total de Gastos — nunca a Saída do caixa (MOV-03, MOV-05).
 */
export function resumoMensal(
  lancamentos: readonly Lancamento[],
  competencia: Competencia,
): { readonly competenciaView: VisaoCompetencia } {
  const doMes = lancamentos.filter((l) => vigente(l) && l.competencia === competencia);
  const despesas = despesasDaCompetencia(lancamentos, competencia);

  const totalGastos = total(despesas);
  const entradas = total(doMes.filter((l) => l.natureza === "RECEITA"));
  const investimentos = total(doMes.filter((l) => l.natureza === "INVESTIMENTO"));

  return {
    competenciaView: {
      totalGastos,
      fixos: somarPorOrigem(despesas, "RECORRENCIA"),
      cartao: somarPorOrigem(despesas, "PARCELA"),
      avulsos: somarPorOrigem(despesas, "AVULSO"),
      entradas,
      investimentos,
      saldo: subtrair(subtrair(entradas, totalGastos), investimentos),
    },
  };
}
