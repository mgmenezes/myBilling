import { describe, expect, it } from "vitest";
import type { Competencia } from "../shared/competencia";
import type { Cents } from "../shared/money";
import {
  confirmarValorReal,
  type OcorrenciaRecorrencia,
  resolverValorEfetivo,
} from "./valor-efetivo";

const MARCO = "2026-03" as Competencia;
const ABRIL = "2026-04" as Competencia;
const MAIO = "2026-05" as Competencia;

/** Fixtures escolhidas por valor matemático, nunca por realismo (AD-009). */
const PREVISTO = 30000 as Cents;
const REAL = 34750 as Cents;

function tresMeses(): readonly OcorrenciaRecorrencia[] {
  return [
    { competencia: MARCO, valorPrevisto: PREVISTO, valorReal: null },
    { competencia: ABRIL, valorPrevisto: PREVISTO, valorReal: null },
    { competencia: MAIO, valorPrevisto: PREVISTO, valorReal: null },
  ];
}

describe("resolverValorEfetivo (REC-01, AC 1)", () => {
  it("sem valor real confirmado, o efetivo é o previsto", () => {
    expect(resolverValorEfetivo(PREVISTO, null)).toEqual({
      valorPrevisto: PREVISTO,
      valorEfetivo: PREVISTO,
      sobrescritaManualmente: false,
    });
  });

  it("com valor real confirmado, o efetivo é o real e o previsto é preservado", () => {
    expect(resolverValorEfetivo(PREVISTO, REAL)).toEqual({
      valorPrevisto: PREVISTO,
      valorEfetivo: REAL,
      sobrescritaManualmente: true,
    });
  });
});

describe("confirmarValorReal (REC-01, AC 1)", () => {
  it("confirmar uma competência não altera nenhuma outra", () => {
    const antes = tresMeses();
    const depois = confirmarValorReal(antes, ABRIL, REAL);

    expect(
      depois.map((o) => resolverValorEfetivo(o.valorPrevisto, o.valorReal).valorEfetivo),
    ).toEqual([PREVISTO, REAL, PREVISTO]);
    expect(depois[0]).toEqual({ competencia: MARCO, valorPrevisto: PREVISTO, valorReal: null });
    expect(depois[2]).toEqual({ competencia: MAIO, valorPrevisto: PREVISTO, valorReal: null });
  });

  it("preserva o valor previsto original da competência confirmada", () => {
    const depois = confirmarValorReal(tresMeses(), ABRIL, REAL);

    expect(depois[1]).toEqual({
      competencia: ABRIL,
      valorPrevisto: PREVISTO,
      valorReal: REAL,
    });
  });

  it("não muta a lista recebida", () => {
    const antes = tresMeses();
    confirmarValorReal(antes, ABRIL, REAL);

    expect(antes).toEqual(tresMeses());
  });
});

describe("sobrescrita manual (REC-01, AC 2)", () => {
  it("ocorrência sobrescrita é sinalizada e a nova materialização não altera seu valor", () => {
    const depois = confirmarValorReal(tresMeses(), ABRIL, REAL);
    const confirmada = depois[1];
    const novoPrevisto = 31000 as Cents;

    // Uma nova materialização traria outro previsto para a mesma ocorrência.
    const rematerializada = resolverValorEfetivo(novoPrevisto, confirmada?.valorReal ?? null);

    expect(rematerializada.sobrescritaManualmente).toBe(true);
    expect(rematerializada.valorEfetivo).toBe(REAL);
  });
});
