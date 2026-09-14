import { describe, expect, it } from "vitest";
import type { ResumoCategoria } from "../mes/resumo-por-categoria";
import { CEM_PORCENTO, type Porcentagem } from "../mes/resumo-por-categoria";
import type { Cents } from "../shared/money";
import { avaliarOrcamento } from "./avaliar-orcamento";

/** Fixtures escolhidas por valor matemático, nunca por realismo (AD-009). */
function categoria(
  categoriaId: string,
  gasto: number,
  percentualDistribuicao: number,
): ResumoCategoria {
  return {
    categoriaId,
    gasto: gasto as Cents,
    percentualDistribuicao: percentualDistribuicao as Porcentagem,
  };
}

describe("avaliarOrcamento — as duas porcentagens (ORC-01, AC 1)", () => {
  it("entrega consumo e distribuição como campos distintos da mesma categoria", () => {
    const avaliacao = avaliarOrcamento(
      [categoria("cat-a", 246000, 6150)],
      [{ categoriaId: "cat-a", limite: 100000 as Cents }],
      400000 as Cents,
    );

    expect(avaliacao.categorias[0]).toEqual({
      categoriaId: "cat-a",
      gasto: 246000,
      limite: 100000,
      percentualConsumo: 24600,
      percentualDistribuicao: 6150,
      estourou: true,
    });
    expect(avaliacao.categorias[0]?.percentualConsumo).not.toBe(
      avaliacao.categorias[0]?.percentualDistribuicao,
    );
  });
});

describe("avaliarOrcamento — estouro sem truncamento (ORC-01, AC 2)", () => {
  it("gasto de 246000 com limite de 100000 consome 246,00% e sinaliza estouro", () => {
    const avaliacao = avaliarOrcamento(
      [categoria("cat-a", 246000, CEM_PORCENTO)],
      [{ categoriaId: "cat-a", limite: 100000 as Cents }],
      246000 as Cents,
    );

    // 24600 na escala de Porcentagem é 246,00% — acima de 100%, não truncado.
    expect(avaliacao.categorias[0]?.percentualConsumo).toBe(24600);
    expect(avaliacao.categorias[0]?.percentualConsumo).toBeGreaterThan(CEM_PORCENTO);
    expect(avaliacao.categorias[0]?.estourou).toBe(true);
  });

  it("gasto dentro do limite não sinaliza estouro", () => {
    const avaliacao = avaliarOrcamento(
      [categoria("cat-a", 50000, CEM_PORCENTO)],
      [{ categoriaId: "cat-a", limite: 100000 as Cents }],
      50000 as Cents,
    );

    expect(avaliacao.categorias[0]?.percentualConsumo).toBe(5000);
    expect(avaliacao.categorias[0]?.estourou).toBe(false);
  });

  it("gasto exatamente igual ao limite consome 100,00% e não estoura", () => {
    const avaliacao = avaliarOrcamento(
      [categoria("cat-a", 100000, CEM_PORCENTO)],
      [{ categoriaId: "cat-a", limite: 100000 as Cents }],
      100000 as Cents,
    );

    expect(avaliacao.categorias[0]?.percentualConsumo).toBe(CEM_PORCENTO);
    expect(avaliacao.categorias[0]?.estourou).toBe(false);
  });
});

describe("avaliarOrcamento — categoria sem limite no mês (ORC-01, AC 3)", () => {
  it("devolve consumo nulo, nunca zero nem infinito", () => {
    const avaliacao = avaliarOrcamento(
      [categoria("cat-a", 246000, CEM_PORCENTO)],
      [{ categoriaId: "cat-b", limite: 100000 as Cents }],
      246000 as Cents,
    );

    expect(avaliacao.categorias[0]?.limite).toBeNull();
    expect(avaliacao.categorias[0]?.percentualConsumo).toBeNull();
    expect(avaliacao.categorias[0]?.percentualConsumo).not.toBe(0);
    expect(avaliacao.categorias[0]?.estourou).toBe(false);
  });

  it("limite zero também devolve consumo nulo, sem infinito", () => {
    const avaliacao = avaliarOrcamento(
      [categoria("cat-a", 246000, CEM_PORCENTO)],
      [{ categoriaId: "cat-a", limite: 0 as Cents }],
      246000 as Cents,
    );

    expect(avaliacao.categorias[0]?.percentualConsumo).toBeNull();
  });

  it("preserva a distribuição mesmo sem limite definido", () => {
    const avaliacao = avaliarOrcamento([categoria("cat-a", 246000, 6150)], [], 400000 as Cents);

    expect(avaliacao.categorias[0]?.percentualDistribuicao).toBe(6150);
  });
});

describe("avaliarOrcamento — indicador global do mês (ORC-02, AC 4)", () => {
  it("aplica total gasto dividido pela soma dos limites", () => {
    const avaliacao = avaliarOrcamento(
      [categoria("cat-a", 80000, 2105), categoria("cat-b", 300000, 7895)],
      [
        { categoriaId: "cat-a", limite: 100000 as Cents },
        { categoriaId: "cat-b", limite: 300000 as Cents },
      ],
      380000 as Cents,
    );

    // 380000 / 400000 = 95,00%
    expect(avaliacao.percentualGlobal).toBe(9500);
  });
});

describe("avaliarOrcamento — soma dos limites zero (ORC-02, AC 5)", () => {
  it("devolve indicador global nulo, sem NaN", () => {
    const avaliacao = avaliarOrcamento(
      [categoria("cat-a", 246000, CEM_PORCENTO)],
      [],
      246000 as Cents,
    );

    expect(avaliacao.percentualGlobal).toBeNull();
    expect(Number.isNaN(avaliacao.percentualGlobal)).toBe(false);
  });

  it("limites declarados com valor zero também zeram o denominador", () => {
    const avaliacao = avaliarOrcamento(
      [categoria("cat-a", 246000, CEM_PORCENTO)],
      [{ categoriaId: "cat-a", limite: 0 as Cents }],
      246000 as Cents,
    );

    expect(avaliacao.percentualGlobal).toBeNull();
  });
});
