import { gerarParcelas } from "../parcelamento/gerar-parcelas";
import { MAX_PARCELAS } from "../parcelamento/ratear-parcelas";
import { addMeses, type Competencia } from "../shared/competencia";
import { type Cents, subtrair } from "../shared/money";
import { type DomainError, err, ok, type Result } from "../shared/result";
import type { PlanoParcelamento, PoliticaResiduo } from "../tipos";

/**
 * "Dá pra comprar?" (SIM-01).
 *
 * O domínio recebe o **saldo previsto de cada mês do horizonte**, e não a
 * lista de lançamentos: o saldo "antes" é o número que o card "Saldo
 * previsto" e "Próximos meses" já mostram (`saldoPrevistoDaCompetencia`), e a
 * simulação só subtrai a parcela dele. É o que permite a mesma função rodar
 * na tela, dentro do cadastro de compra e, na fatia seguinte, na landing, sem
 * que uma lista de lançamentos viaje ao cliente.
 *
 * **"Cabe" é definido sobre o que o app enxerga.** O horizonte é a janela
 * materializada (AD-023); uma parcela além dela não tem saldo para ser
 * comparada, e inventar um a partir dos planos de recorrência somaria plano
 * com razão (AD-003). Por isso a resposta diz até onde enxerga, em vez de
 * fingir que viu.
 *
 * **Mês que já faltava não conta contra a compra.** A linha diz que já
 * estava no vermelho; o veredito culpa a compra só pelo mês que ela derruba.
 */

export interface SaldoDoMes {
  readonly competencia: Competencia;
  /** O saldo previsto do mês, antes da compra: pode ser negativo. */
  readonly saldo: Cents;
}

export interface LinhaDaSimulacao {
  readonly competencia: Competencia;
  readonly parcela: Cents;
  readonly saldoAntes: Cents;
  readonly saldoDepois: Cents;
  /** `saldoAntes < 0`: o mês já estava no vermelho antes da compra. */
  readonly jaFaltava: boolean;
}

export interface Simulacao {
  /** Uma por parcela dentro do horizonte, na ordem das parcelas. */
  readonly linhas: ReadonlyArray<LinhaDaSimulacao>;
  /** Nenhuma linha com `saldoAntes >= 0` ficou com `saldoDepois < 0`. */
  readonly cabe: boolean;
  /** A última competência do horizonte. */
  readonly enxergaAte: Competencia;
  /** Parcelas depois de `enxergaAte`, sem linha. */
  readonly parcelasForaDoHorizonte: number;
}

/**
 * Competências consecutivas, ao menos uma (SIM-01, AC 6). Devolve a última,
 * que é até onde a simulação enxerga, ou `null` quando o horizonte não serve.
 */
function ultimaCompetenciaDoHorizonte(horizonte: ReadonlyArray<SaldoDoMes>): Competencia | null {
  const [primeiro, ...seguintes] = horizonte;
  if (primeiro === undefined) {
    return null;
  }
  let esperada = primeiro.competencia;
  for (const mes of seguintes) {
    esperada = addMeses(esperada, 1);
    if (mes.competencia !== esperada) {
      return null;
    }
  }
  return esperada;
}

export function simularCompra(
  horizonte: ReadonlyArray<SaldoDoMes>,
  plano: PlanoParcelamento,
): Result<Simulacao, DomainError> {
  const enxergaAte = ultimaCompetenciaDoHorizonte(horizonte);
  if (enxergaAte === null) {
    return err({ code: "HORIZONTE_INVALIDO" });
  }
  const saldoPorMes = new Map(horizonte.map((mes) => [mes.competencia, mes.saldo]));
  const primeira = plano.parcelas[0];
  if (primeira === undefined || !saldoPorMes.has(primeira.competencia)) {
    return err({
      code: "PRIMEIRA_PARCELA_FORA_DO_HORIZONTE",
      detalhes: { competencia: primeira?.competencia },
    });
  }

  // As parcelas são consecutivas a partir da parcela 1, que está no
  // horizonte, e o horizonte é contíguo: uma parcela sem saldo é uma parcela
  // depois do fim dele, nunca um buraco no meio.
  const linhas = plano.parcelas.flatMap((parcela): LinhaDaSimulacao[] => {
    const saldoAntes = saldoPorMes.get(parcela.competencia);
    if (saldoAntes === undefined) {
      return [];
    }
    return [
      {
        competencia: parcela.competencia,
        parcela: parcela.valor,
        saldoAntes,
        saldoDepois: subtrair(saldoAntes, parcela.valor),
        jaFaltava: saldoAntes < 0,
      },
    ];
  });

  return ok({
    linhas,
    cabe: linhas.every((linha) => linha.jaFaltava || linha.saldoDepois >= 0),
    enxergaAte,
    parcelasForaDoHorizonte: plano.parcelas.length - linhas.length,
  });
}

export interface EntradaDoMenorParcelamento {
  /** O total da compra. No modo "valor da parcela", parcela × n informado. */
  readonly valorTotal: Cents;
  readonly competenciaPrimeiraParcela: Competencia;
  readonly politicaResiduo: PoliticaResiduo;
}

/**
 * O menor `n`, de 1 a `maximo`, em que a compra cabe; `null` se nenhum cabe
 * (SIM-01, AC 8). Busca linear: cada `n` muda o conjunto de meses alcançados,
 * então a monotonia não é garantida e uma busca binária responderia errado.
 * Um `n` cujo rateio é inválido (parcela abaixo de um centavo) não cabe, e a
 * busca segue (AC 9).
 */
export function menorParcelamentoQueCabe(
  horizonte: ReadonlyArray<SaldoDoMes>,
  entrada: EntradaDoMenorParcelamento,
  maximo: number = MAX_PARCELAS,
): number | null {
  for (let n = 1; n <= maximo; n += 1) {
    const plano = gerarParcelas({
      modo: "TOTAL",
      valorEntrada: entrada.valorTotal,
      qtdParcelas: n,
      competenciaCompra: entrada.competenciaPrimeiraParcela,
      parcelaInicial: 1,
      politicaResiduo: entrada.politicaResiduo,
    });
    if (!plano.ok) {
      continue;
    }
    const simulacao = simularCompra(horizonte, plano.value);
    if (simulacao.ok && simulacao.value.cabe) {
      return n;
    }
  }
  return null;
}
