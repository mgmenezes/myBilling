import { describe, expect, it } from "vitest";
import { gerarParcelas } from "../parcelamento/gerar-parcelas";
import { MAX_PARCELAS } from "../parcelamento/ratear-parcelas";
import { addMeses, type Competencia, rangeCompetencias } from "../shared/competencia";
import type { Cents } from "../shared/money";
import type { PlanoParcelamento } from "../tipos";
import { menorParcelamentoQueCabe, type SaldoDoMes, simularCompra } from "./simular-compra";

const MARCO = "2026-03" as Competencia;
const ABRIL = "2026-04" as Competencia;
const MAIO = "2026-05" as Competencia;
const JUNHO = "2026-06" as Competencia;
const JULHO = "2026-07" as Competencia;
/** C + 12: a última competência que o app enxerga (AD-023). */
const MARCO_SEGUINTE = "2027-03" as Competencia;

/**
 * Fixtures escolhidas por valor matemático (AD-009): R$ 700,00 sobrando em
 * cada um dos 13 meses, menos maio, que já falta R$ 500,00. É o Independent
 * Test de SIM-01.
 */
function horizonteDeTreze(sobrescrever: Partial<Record<string, number>> = {}): SaldoDoMes[] {
  return rangeCompetencias(MARCO, MARCO_SEGUINTE).map((competencia) => ({
    competencia,
    saldo: (sobrescrever[competencia] ?? 70000) as Cents,
  }));
}

const HORIZONTE = horizonteDeTreze({ [MAIO]: -50000 });

function plano(valorTotal: number, qtdParcelas: number, primeira: Competencia = MARCO) {
  const resultado = gerarParcelas({
    modo: "TOTAL",
    valorEntrada: valorTotal as Cents,
    qtdParcelas,
    competenciaCompra: primeira,
    parcelaInicial: 1,
    politicaResiduo: "PRIMEIRAS",
  });
  if (!resultado.ok) {
    throw new Error(`fixture inválida: ${resultado.error.code}`);
  }
  return resultado.value;
}

function simular(valorTotal: number, qtdParcelas: number, primeira: Competencia = MARCO) {
  const resultado = simularCompra(HORIZONTE, plano(valorTotal, qtdParcelas, primeira));
  if (!resultado.ok) {
    throw new Error(`simulação inválida: ${resultado.error.code}`);
  }
  return resultado.value;
}

describe("simularCompra — uma linha por parcela dentro do horizonte (SIM-01, ACs 1, 2, 3, 10)", () => {
  it("R$ 3.000,00 em 3x: março e abril ficam no vermelho e maio já faltava", () => {
    const simulacao = simular(300000, 3);

    expect(simulacao.linhas).toEqual([
      {
        competencia: MARCO,
        parcela: 100000,
        saldoAntes: 70000,
        saldoDepois: -30000,
        jaFaltava: false,
      },
      {
        competencia: ABRIL,
        parcela: 100000,
        saldoAntes: 70000,
        saldoDepois: -30000,
        jaFaltava: false,
      },
      {
        competencia: MAIO,
        parcela: 100000,
        saldoAntes: -50000,
        saldoDepois: -150000,
        jaFaltava: true,
      },
    ]);
    expect(simulacao.cabe).toBe(false);
  });

  it("R$ 1.000,00 em 3x cabe: 366,66 / 366,67 / 366,67 depois, nenhum mês no vermelho", () => {
    const simulacao = simularCompra(horizonteDeTreze(), plano(100000, 3));

    expect(simulacao.ok && simulacao.value.linhas.map((l) => l.saldoDepois)).toEqual([
      36666, 36667, 36667,
    ]);
    expect(simulacao.ok && simulacao.value.cabe).toBe(true);
    expect(simulacao.ok && simulacao.value.linhas.every((l) => !l.jaFaltava)).toBe(true);
  });

  it("mês que já faltava não torna a compra impossível (AC 3): R$ 1.000,00 em 3x sobre maio negativo cabe", () => {
    const simulacao = simular(100000, 3);

    expect(simulacao.linhas[2]).toEqual({
      competencia: MAIO,
      parcela: 33333,
      saldoAntes: -50000,
      saldoDepois: -83333,
      jaFaltava: true,
    });
    expect(simulacao.cabe).toBe(true);
  });

  it("saldoDepois exatamente zero cabe (edge case)", () => {
    const simulacao = simular(70000, 1);

    expect(simulacao.linhas).toEqual([
      { competencia: MARCO, parcela: 70000, saldoAntes: 70000, saldoDepois: 0, jaFaltava: false },
    ]);
    expect(simulacao.cabe).toBe(true);
  });

  it("um centavo além do saldo não cabe (limiar colado, L-029)", () => {
    expect(simular(70001, 1).cabe).toBe(false);
  });

  it("a primeira parcela pode cair num mês seguinte: as linhas começam nele", () => {
    const simulacao = simular(200000, 2, JUNHO);

    expect(simulacao.linhas.map((l) => l.competencia)).toEqual([JUNHO, JULHO]);
    expect(simulacao.linhas.map((l) => l.saldoAntes)).toEqual([70000, 70000]);
  });

  it("propriedade: saldoDepois = saldoAntes − parcela em centavos inteiros, para todo n até 13 (AC 10)", () => {
    for (let n = 1; n <= 13; n += 1) {
      const simulacao = simular(99999, n);
      for (const linha of simulacao.linhas) {
        expect(linha.saldoDepois).toBe(linha.saldoAntes - linha.parcela);
        expect(Number.isInteger(linha.saldoDepois)).toBe(true);
      }
      expect(simulacao.linhas).toHaveLength(n);
    }
  });
});

describe("simularCompra — o fim do horizonte (SIM-01, ACs 4 e 5)", () => {
  it("24x a partir de março: 13 linhas, enxerga até 2027-03 e 11 parcelas ficam fora (AC 4)", () => {
    const simulacao = simular(240000, 24);

    expect(simulacao.linhas).toHaveLength(13);
    expect(simulacao.linhas.at(-1)?.competencia).toBe(MARCO_SEGUINTE);
    expect(simulacao.enxergaAte).toBe(MARCO_SEGUINTE);
    expect(simulacao.parcelasForaDoHorizonte).toBe(11);
  });

  it("propriedade: parcelas visíveis mais omitidas é o total de parcelas, e a soma das visíveis mais o resto é o total", () => {
    const n = 24;
    const compra = plano(240000, n);
    const simulacao = simular(240000, n);
    const visiveis = simulacao.linhas.reduce((soma, l) => soma + l.parcela, 0);
    const omitidas = compra.parcelas
      .slice(simulacao.linhas.length)
      .reduce((soma, p) => soma + p.valor, 0);

    expect(simulacao.linhas.length + simulacao.parcelasForaDoHorizonte).toBe(n);
    expect(visiveis + omitidas).toBe(240000);
  });

  it("compra inteira dentro do horizonte: zero parcelas fora e enxergaAte é a última competência (AC 5)", () => {
    const simulacao = simular(100000, 3);

    expect(simulacao.parcelasForaDoHorizonte).toBe(0);
    expect(simulacao.enxergaAte).toBe(MARCO_SEGUINTE);
  });

  it("primeira parcela em C + 12 com 2x: uma linha e uma parcela fora (edge case)", () => {
    const simulacao = simular(20000, 2, MARCO_SEGUINTE);

    expect(simulacao.linhas.map((l) => l.competencia)).toEqual([MARCO_SEGUINTE]);
    expect(simulacao.parcelasForaDoHorizonte).toBe(1);
  });

  it("13x a partir de março preenche o horizonte exato, sem parcela fora (limiar colado, L-029)", () => {
    const simulacao = simular(130000, 13);

    expect(simulacao.linhas).toHaveLength(13);
    expect(simulacao.parcelasForaDoHorizonte).toBe(0);
  });

  it("14x a partir de março deixa exatamente uma parcela fora (limiar colado, L-029)", () => {
    expect(simular(140000, 14).parcelasForaDoHorizonte).toBe(1);
  });
});

describe("simularCompra — entradas inválidas (SIM-01, ACs 6 e 7)", () => {
  it("horizonte vazio é HORIZONTE_INVALIDO", () => {
    const resultado = simularCompra([], plano(100000, 1));

    expect(resultado).toEqual({ ok: false, error: { code: "HORIZONTE_INVALIDO" } });
  });

  it("horizonte fora de ordem é HORIZONTE_INVALIDO", () => {
    const resultado = simularCompra(
      [
        { competencia: ABRIL, saldo: 0 as Cents },
        { competencia: MARCO, saldo: 0 as Cents },
      ],
      plano(100000, 1),
    );

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.error.code).toBe("HORIZONTE_INVALIDO");
  });

  it("horizonte com buraco é HORIZONTE_INVALIDO", () => {
    const resultado = simularCompra(
      [
        { competencia: MARCO, saldo: 0 as Cents },
        { competencia: MAIO, saldo: 0 as Cents },
      ],
      plano(100000, 1),
    );

    expect(!resultado.ok && resultado.error.code).toBe("HORIZONTE_INVALIDO");
  });

  it("parcela 1 antes do horizonte é PRIMEIRA_PARCELA_FORA_DO_HORIZONTE, mesmo com parcelas dentro", () => {
    const resultado = simularCompra(HORIZONTE, plano(300000, 3, addMeses(MARCO, -1)));

    expect(!resultado.ok && resultado.error.code).toBe("PRIMEIRA_PARCELA_FORA_DO_HORIZONTE");
  });

  it("parcela 1 depois da última competência é PRIMEIRA_PARCELA_FORA_DO_HORIZONTE", () => {
    const resultado = simularCompra(HORIZONTE, plano(100000, 1, addMeses(MARCO_SEGUINTE, 1)));

    expect(!resultado.ok && resultado.error.code).toBe("PRIMEIRA_PARCELA_FORA_DO_HORIZONTE");
  });

  it("plano sem parcela nenhuma não tem parcela 1 no horizonte", () => {
    const vazio: PlanoParcelamento = {
      valorTotal: 100000 as Cents,
      parcelas: [],
      valorAmortizadoAnterior: 0 as Cents,
    };

    const resultado = simularCompra(HORIZONTE, vazio);

    expect(!resultado.ok && resultado.error.code).toBe("PRIMEIRA_PARCELA_FORA_DO_HORIZONTE");
  });
});

describe("menorParcelamentoQueCabe (SIM-01, ACs 8 e 9)", () => {
  const ENTRADA = {
    valorTotal: 300000 as Cents,
    competenciaPrimeiraParcela: MARCO,
    politicaResiduo: "PRIMEIRAS" as const,
  };

  it("R$ 3.000,00 a partir de março cabe em 5x: em 4x março fica em −R$ 50,00 (limiar colado)", () => {
    expect(menorParcelamentoQueCabe(HORIZONTE, ENTRADA)).toBe(5);

    const emQuatro = simular(300000, 4);
    expect(emQuatro.cabe).toBe(false);
    expect(emQuatro.linhas[0]?.saldoDepois).toBe(-5000);

    const emCinco = simular(300000, 5);
    expect(emCinco.cabe).toBe(true);
    expect(emCinco.linhas.map((l) => l.saldoDepois)).toEqual([10000, 10000, -110000, 10000, 10000]);
  });

  it("devolve 1 quando a compra cabe à vista: a busca começa em 1 (edge case)", () => {
    expect(menorParcelamentoQueCabe(HORIZONTE, { ...ENTRADA, valorTotal: 50000 as Cents })).toBe(1);
  });

  it("devolve null quando nenhum parcelamento até MAX_PARCELAS cabe", () => {
    const semSobra = horizonteDeTreze(
      Object.fromEntries(rangeCompetencias(MARCO, MARCO_SEGUINTE).map((c) => [c, 0])),
    );

    expect(menorParcelamentoQueCabe(semSobra, ENTRADA)).toBeNull();
    expect(MAX_PARCELAS).toBe(120);
  });

  it("rateio inválido conta como não cabendo e a busca segue (AC 9): 2 centavos sobre saldo zero", () => {
    const semSobra = horizonteDeTreze(
      Object.fromEntries(rangeCompetencias(MARCO, MARCO_SEGUINTE).map((c) => [c, 0])),
    );

    expect(menorParcelamentoQueCabe(semSobra, { ...ENTRADA, valorTotal: 2 as Cents })).toBeNull();
  });

  it("o menor n pode ser maior que 1: 2 centavos com um centavo sobrando em março e abril cabe em 2x", () => {
    const horizonte = horizonteDeTreze({ [MARCO]: 1, [ABRIL]: 1 });

    expect(menorParcelamentoQueCabe(horizonte, { ...ENTRADA, valorTotal: 2 as Cents })).toBe(2);
  });

  it("devolve null quando o horizonte é inválido", () => {
    expect(menorParcelamentoQueCabe([], ENTRADA)).toBeNull();
  });

  it("respeita o teto informado", () => {
    expect(menorParcelamentoQueCabe(HORIZONTE, ENTRADA, 4)).toBeNull();
  });
});
