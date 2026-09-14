import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Cents } from "../shared/money";
import { isErr, isOk } from "../shared/result";
import { MAX_PARCELAS, ratearParcelas } from "./ratear-parcelas";

/** Fixtures matemáticas do spec, nunca valores reais (AD-009). */
function centavos(valor: number): Cents {
  return valor as Cents;
}

function rateioOk(total: number, n: number, politica: "PRIMEIRAS" | "ULTIMAS" = "PRIMEIRAS") {
  const resultado = ratearParcelas(centavos(total), n, politica);
  if (!isOk(resultado)) {
    throw new Error(`esperava rateio válido para ${total} em ${n}x`);
  }
  return resultado.value;
}

function soma(parcelas: readonly number[]): number {
  return parcelas.reduce((acumulado, parcela) => acumulado + parcela, 0);
}

describe("ratearParcelas — casos de exemplo do spec", () => {
  it("R$ 1.000,00 em 3x resulta em [33334, 33333, 33333] (PARC-01, AC 1)", () => {
    expect(rateioOk(100000, 3)).toEqual([33334, 33333, 33333]);
  });

  it("R$ 0,05 em 3x resulta em [2, 2, 1], somando exatamente 5", () => {
    expect(rateioOk(5, 3)).toEqual([2, 2, 1]);
    expect(soma(rateioOk(5, 3))).toBe(5);
  });

  it("R$ 1.000,01 em 7x resulta em seis de 14286 e uma de 14285", () => {
    const parcelas = rateioOk(100001, 7);

    expect(parcelas).toEqual([14286, 14286, 14286, 14286, 14286, 14286, 14285]);
    expect(parcelas.filter((p) => p === 14286)).toHaveLength(6);
    expect(soma(parcelas)).toBe(100001);
  });

  it("R$ 0,02 em 3x é rejeitado com PARCELA_INFERIOR_A_UM_CENTAVO (PARC-05, AC 5)", () => {
    const resultado = ratearParcelas(centavos(2), 3, "PRIMEIRAS");

    expect(isErr(resultado)).toBe(true);
    expect(isErr(resultado) && resultado.error.code).toBe("PARCELA_INFERIOR_A_UM_CENTAVO");
  });

  it("R$ 0,03 em 3x resulta em [1, 1, 1]", () => {
    expect(rateioOk(3, 3)).toEqual([1, 1, 1]);
  });

  it("R$ 99.999,99 em 120x preserva a soma exata, sem estouro de inteiro", () => {
    const parcelas = rateioOk(9999999, 120);

    expect(parcelas).toHaveLength(120);
    expect(soma(parcelas)).toBe(9999999);
  });

  it("aloca o resíduo nas últimas parcelas com a política ULTIMAS", () => {
    expect(rateioOk(100000, 3, "ULTIMAS")).toEqual([33333, 33333, 33334]);
    expect(rateioOk(100001, 7, "ULTIMAS")).toEqual([
      14285, 14286, 14286, 14286, 14286, 14286, 14286,
    ]);
  });
});

describe("ratearParcelas — rejeições", () => {
  it.each([0, 121, 1.5, -1])("rejeita n = %p com QTD_PARCELAS_INVALIDA", (n) => {
    const resultado = ratearParcelas(centavos(100000), n, "PRIMEIRAS");

    expect(isErr(resultado)).toBe(true);
    expect(isErr(resultado) && resultado.error.code).toBe("QTD_PARCELAS_INVALIDA");
  });

  it.each([0, -1, 10.5])("rejeita total = %p com VALOR_NAO_POSITIVO", (total) => {
    const resultado = ratearParcelas(centavos(total), 3, "PRIMEIRAS");

    expect(isErr(resultado)).toBe(true);
    expect(isErr(resultado) && resultado.error.code).toBe("VALOR_NAO_POSITIVO");
  });
});

/**
 * Propriedades — a única assertion que prova a ausência do bug de centavo
 * para todo o espaço de entrada, e não para os exemplos escolhidos a dedo.
 */
describe("ratearParcelas — propriedades (PARC-02)", () => {
  const NUM_RUNS = 2000;
  const totalArb = fc.integer({ min: 1, max: 10_000_000 });
  const nArb = fc.integer({ min: 1, max: MAX_PARCELAS });

  it("a soma das parcelas é exatamente o total, para todo total e todo n válidos", () => {
    fc.assert(
      fc.property(totalArb, nArb, (total, n) => {
        fc.pre(n <= total);
        const parcelas = rateioOk(total, n);

        expect(soma(parcelas)).toBe(total);
        expect(parcelas).toHaveLength(n);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("nenhuma parcela é menor que 1 centavo", () => {
    fc.assert(
      fc.property(totalArb, nArb, (total, n) => {
        fc.pre(n <= total);

        for (const parcela of rateioOk(total, n)) {
          expect(parcela).toBeGreaterThanOrEqual(1);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("a diferença entre a maior e a menor parcela nunca passa de 1 centavo", () => {
    fc.assert(
      fc.property(totalArb, nArb, (total, n) => {
        fc.pre(n <= total);
        const parcelas = rateioOk(total, n);

        expect(Math.max(...parcelas) - Math.min(...parcelas)).toBeLessThanOrEqual(1);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("com a política PRIMEIRAS, parcela[i] nunca é menor que parcela[j] para i < j (AD-004)", () => {
    fc.assert(
      fc.property(totalArb, nArb, (total, n) => {
        fc.pre(n <= total);
        const parcelas = rateioOk(total, n, "PRIMEIRAS");

        for (let i = 1; i < parcelas.length; i += 1) {
          expect(parcelas[i - 1]).toBeGreaterThanOrEqual(Number(parcelas[i]));
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
