import type { Competencia } from "../shared/competencia";
import { type Cents, somar, subtrair, ZERO_CENTS } from "../shared/money";
import type { Lancamento, ResumoMensal } from "../tipos";
import { type BlocoDoMes, blocoDoLancamento } from "./bloco-do-lancamento";

/**
 * As duas visões do mês, em objetos aninhados distintos (MOV-03). `futuro`
 * é produzido por `projetarProximosMeses` e montado pela camada de
 * aplicação, que é quem conhece a janela de projeção.
 *
 * A forma dos campos é derivada de `ResumoMensal` (tipos.ts) em vez de
 * redigitada: a definição dos totais exibidos vive num único lugar.
 */
export type ResumoDoMes = Omit<ResumoMensal, "futuro">;

/** Lançamento cancelado não entra em soma nenhuma (MOV-01). */
function vigente(lancamento: Lancamento): boolean {
  return lancamento.canceladoEm === null;
}

/**
 * Realizado é o que já saiu (ou entrou) na conta: `pagoEm` preenchido
 * (MOV-06, AC 1). `pagoEm` é a data local do movimento, então o mês de
 * caixa é o prefixo `'YYYY-MM'` — comparação textual, sem `Date` e sem
 * fuso implícito (AD-002).
 */
function realizadoEm(lancamento: Lancamento, competencia: Competencia): boolean {
  return lancamento.pagoEm?.startsWith(competencia) ?? false;
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

/**
 * Os três segmentos de despesa saem de `blocoDoLancamento`, a **mesma** função
 * que a tela usa para decidir em qual bloco cada linha aparece. Somar por
 * `origem` aqui e agrupar por meio de pagamento lá faria o indicador "Cartão"
 * prometer um total que a lista não confirma (BLOCO-01, AC 5).
 */
function somarPorBloco(
  despesas: readonly Lancamento[],
  cartoes: ReadonlySet<string>,
  bloco: BlocoDoMes,
): Cents {
  return total(despesas.filter((l) => blocoDoLancamento(l, cartoes) === bloco));
}

/**
 * Agregação das duas visões do mês.
 *
 * Eixo competência: o mês em que o gasto foi *assumido*. Eixo caixa: o mês
 * em que o dinheiro se moveu. Os dois usam filtros diferentes sobre a mesma
 * lista e legitimamente divergem — a parcela de fevereiro paga na fatura de
 * março conta em fevereiro no primeiro eixo e em março no segundo. Por isso
 * saem em objetos separados e nenhum campo soma valores dos dois (MOV-03).
 *
 * O investimento é somado à parte: fica fora do Total de Gastos e fora das
 * Saídas, e é subtraído dos dois saldos (MOV-04, AC 4). Cada saldo subtrai
 * a saída **do próprio eixo** (MOV-05, AC 5).
 *
 * `cartoes` são os meios que geram fatura, **inclusive arquivados**. Eles
 * entram porque os três segmentos de despesa deixaram de ser recortes de
 * `origem` e passaram a ser os blocos de `blocoDoLancamento`: "Cartão" quer
 * dizer "vai cair na fatura", e isso é uma propriedade do meio de pagamento,
 * não de onde o lançamento veio.
 */
export function resumoMensal(
  lancamentos: readonly Lancamento[],
  competencia: Competencia,
  cartoes: ReadonlySet<string>,
): ResumoDoMes {
  const vigentes = lancamentos.filter(vigente);
  const doMes = vigentes.filter((l) => l.competencia === competencia);
  const despesas = despesasDaCompetencia(lancamentos, competencia);

  const totalGastos = total(despesas);
  const entradas = total(doMes.filter((l) => l.natureza === "RECEITA"));
  const investimentos = total(doMes.filter((l) => l.natureza === "INVESTIMENTO"));

  const noCaixa = vigentes.filter((l) => realizadoEm(l, competencia));
  const saidas = total(noCaixa.filter((l) => l.natureza === "DESPESA"));
  const entradasRecebidas = total(noCaixa.filter((l) => l.natureza === "RECEITA"));
  const investimentosRealizados = total(noCaixa.filter((l) => l.natureza === "INVESTIMENTO"));

  return {
    competenciaView: {
      totalGastos,
      fixos: somarPorBloco(despesas, cartoes, "FIXOS"),
      cartao: somarPorBloco(despesas, cartoes, "CARTAO"),
      avulsos: somarPorBloco(despesas, cartoes, "AVULSOS"),
      entradas,
      investimentos,
      pendente: total(despesas.filter((l) => l.pagoEm === null)),
      saldo: subtrair(subtrair(entradas, totalGastos), investimentos),
    },
    caixaView: {
      saidas,
      entradasRecebidas,
      investimentosRealizados,
      saldo: subtrair(subtrair(entradasRecebidas, saidas), investimentosRealizados),
    },
  };
}
