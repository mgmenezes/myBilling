import { describe, expect, it } from "vitest";
import type { Competencia } from "../shared/competencia";
import type { Cents } from "../shared/money";
import type { Lancamento } from "../tipos";
import { CEM_PORCENTO, resumoPorCategoria, resumoPorPessoa } from "./resumo-por-categoria";

const MARCO = "2026-03" as Competencia;
const ABRIL = "2026-04" as Competencia;

/** Fixtures escolhidas por valor matemático, nunca por realismo (AD-009). */
function lancamento(sobrescrever: Partial<Lancamento> = {}): Lancamento {
  return {
    id: "l-1",
    natureza: "DESPESA",
    origem: "AVULSO",
    descricao: "Lançamento",
    competencia: MARCO,
    dataEvento: "2026-03-10",
    valor: 100000 as Cents,
    valorPrevisto: null,
    pagoEm: null,
    categoriaId: "cat-a",
    usuarioId: "pessoa-a",
    meioPagamentoId: "meio-a",
    compraId: null,
    numeroParcela: null,
    canceladoEm: null,
    ...sobrescrever,
  };
}

describe("resumoPorCategoria — distribuição sobre o Total de Gastos (MOV-01, AC 7)", () => {
  it("usa o Total de Gastos como denominador e soma 100,00%", () => {
    const categorias = resumoPorCategoria(
      [
        lancamento({ id: "a", categoriaId: "cat-a", valor: 250000 as Cents }),
        lancamento({ id: "b", categoriaId: "cat-b", valor: 750000 as Cents }),
      ],
      MARCO,
      1000000 as Cents,
    );

    expect(categorias).toEqual([
      { categoriaId: "cat-a", gasto: 250000, percentualDistribuicao: 2500 },
      { categoriaId: "cat-b", gasto: 750000, percentualDistribuicao: 7500 },
    ]);
    expect(categorias.reduce((soma, c) => soma + c.percentualDistribuicao, 0)).toBe(CEM_PORCENTO);
  });

  it("arredonda para o centésimo de ponto percentual mais próximo", () => {
    const categorias = resumoPorCategoria(
      [
        lancamento({ id: "a", categoriaId: "cat-a", valor: 50000 as Cents }),
        lancamento({ id: "b", categoriaId: "cat-b", valor: 40000 as Cents }),
      ],
      MARCO,
      90000 as Cents,
    );

    // 50000/90000 = 55,5555…% arredonda para cima; 40000/90000 = 44,4444…% para baixo.
    expect(categorias[0]?.percentualDistribuicao).toBe(5556);
    expect(categorias[1]?.percentualDistribuicao).toBe(4444);
    expect(categorias.reduce((soma, c) => soma + c.percentualDistribuicao, 0)).toBe(CEM_PORCENTO);
  });

  it("atribui a sobra de arredondamento à categoria de maior gasto", () => {
    const categorias = resumoPorCategoria(
      [
        lancamento({ id: "a", categoriaId: "cat-a", valor: 20000 as Cents }),
        lancamento({ id: "b", categoriaId: "cat-b", valor: 40000 as Cents }),
        lancamento({ id: "c", categoriaId: "cat-c", valor: 30000 as Cents }),
      ],
      MARCO,
      90000 as Cents,
    );

    // 22,22 + 44,44 + 33,33 = 99,99%: o centésimo que falta vai para cat-b.
    expect(categorias[0]?.percentualDistribuicao).toBe(2222);
    expect(categorias[1]?.percentualDistribuicao).toBe(4445);
    expect(categorias[2]?.percentualDistribuicao).toBe(3333);
    expect(categorias.reduce((soma, c) => soma + c.percentualDistribuicao, 0)).toBe(CEM_PORCENTO);
  });

  it("agrupa despesa sem categoria, de modo que a soma continue 100,00%", () => {
    const categorias = resumoPorCategoria(
      [
        lancamento({ id: "a", categoriaId: "cat-a", valor: 250000 as Cents }),
        lancamento({ id: "b", categoriaId: null, valor: 750000 as Cents }),
      ],
      MARCO,
      1000000 as Cents,
    );

    expect(categorias[1]).toEqual({
      categoriaId: null,
      gasto: 750000,
      percentualDistribuicao: 7500,
    });
    expect(categorias.reduce((soma, c) => soma + c.percentualDistribuicao, 0)).toBe(CEM_PORCENTO);
  });

  it("soma os lançamentos da mesma categoria num único item", () => {
    const categorias = resumoPorCategoria(
      [
        lancamento({ id: "a", categoriaId: "cat-a", valor: 250000 as Cents }),
        lancamento({ id: "b", categoriaId: "cat-a", valor: 750000 as Cents }),
      ],
      MARCO,
      1000000 as Cents,
    );

    expect(categorias).toEqual([
      { categoriaId: "cat-a", gasto: 1000000, percentualDistribuicao: CEM_PORCENTO },
    ]);
  });

  it("ignora cancelado, receita, investimento e outra competência", () => {
    const categorias = resumoPorCategoria(
      [
        lancamento({ id: "a", categoriaId: "cat-a", valor: 100000 as Cents }),
        lancamento({
          id: "b",
          categoriaId: "cat-b",
          valor: 900000 as Cents,
          canceladoEm: "2026-03-20",
        }),
        lancamento({
          id: "c",
          categoriaId: "cat-c",
          natureza: "RECEITA",
          valor: 900000 as Cents,
        }),
        lancamento({
          id: "d",
          categoriaId: "cat-d",
          natureza: "INVESTIMENTO",
          valor: 900000 as Cents,
        }),
        lancamento({
          id: "e",
          categoriaId: "cat-e",
          competencia: ABRIL,
          valor: 900000 as Cents,
        }),
      ],
      MARCO,
      100000 as Cents,
    );

    expect(categorias).toEqual([
      { categoriaId: "cat-a", gasto: 100000, percentualDistribuicao: CEM_PORCENTO },
    ]);
  });
});

describe("resumoPorCategoria — Total de Gastos zero (MOV-01, AC 8)", () => {
  it("devolve 0% para todas as categorias, sem divisão por zero", () => {
    const categorias = resumoPorCategoria(
      [
        lancamento({ id: "a", categoriaId: "cat-a", valor: 0 as Cents }),
        lancamento({ id: "b", categoriaId: "cat-b", valor: 0 as Cents }),
      ],
      MARCO,
      0 as Cents,
    );

    expect(categorias).toEqual([
      { categoriaId: "cat-a", gasto: 0, percentualDistribuicao: 0 },
      { categoriaId: "cat-b", gasto: 0, percentualDistribuicao: 0 },
    ]);
    expect(categorias.every((c) => Number.isFinite(c.percentualDistribuicao))).toBe(true);
  });

  it("mês sem nenhuma despesa devolve lista vazia", () => {
    expect(resumoPorCategoria([], MARCO, 0 as Cents)).toEqual([]);
  });
});

describe("resumoPorPessoa", () => {
  it("soma exatamente o Total de Gastos", () => {
    const pessoas = resumoPorPessoa(
      [
        lancamento({ id: "a", usuarioId: "pessoa-a", valor: 250000 as Cents }),
        lancamento({ id: "b", usuarioId: "pessoa-b", valor: 750000 as Cents }),
        lancamento({ id: "c", usuarioId: "pessoa-a", valor: 100000 as Cents }),
        lancamento({
          id: "d",
          usuarioId: "pessoa-b",
          valor: 900000 as Cents,
          canceladoEm: "2026-03-20",
        }),
      ],
      MARCO,
    );

    expect(pessoas).toEqual([
      { usuarioId: "pessoa-a", gasto: 350000 },
      { usuarioId: "pessoa-b", gasto: 750000 },
    ]);
    expect(pessoas.reduce((soma, p) => soma + p.gasto, 0)).toBe(1100000);
  });
});
