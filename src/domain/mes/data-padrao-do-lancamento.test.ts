import { describe, expect, it } from "vitest";
import type { Competencia } from "../shared/competencia";
import { dataPadraoDoLancamento } from "./data-padrao-do-lancamento";

/** Testes derivados de CAD-04 (AC 10), reconciliado com a competência aberta. */

const c = (texto: string) => texto as Competencia;

describe("dataPadraoDoLancamento — hoje, quando hoje é do mês aberto", () => {
  it("propõe hoje quando a competência aberta é a de hoje", () => {
    expect(dataPadraoDoLancamento(c("2026-09"), "2026-09-19")).toBe("2026-09-19");
  });

  it("propõe hoje também no primeiro dia do mês", () => {
    expect(dataPadraoDoLancamento(c("2026-09"), "2026-09-01")).toBe("2026-09-01");
  });

  it("propõe hoje também no último dia do mês", () => {
    expect(dataPadraoDoLancamento(c("2026-09"), "2026-09-30")).toBe("2026-09-30");
  });
});

describe("dataPadraoDoLancamento — dia 1, quando hoje é de outro mês", () => {
  it("propõe o dia 1 ao abrir um mês passado", () => {
    expect(dataPadraoDoLancamento(c("2026-03"), "2026-09-19")).toBe("2026-03-01");
  });

  it("propõe o dia 1 ao abrir um mês futuro", () => {
    expect(dataPadraoDoLancamento(c("2026-12"), "2026-09-19")).toBe("2026-12-01");
  });

  it("propõe o dia 1 no mês vizinho, que é onde o erro de um dia apareceria", () => {
    expect(dataPadraoDoLancamento(c("2026-08"), "2026-09-01")).toBe("2026-08-01");
    expect(dataPadraoDoLancamento(c("2026-10"), "2026-09-30")).toBe("2026-10-01");
  });

  it("propõe o dia 1 quando só o ano difere", () => {
    expect(dataPadraoDoLancamento(c("2025-09"), "2026-09-19")).toBe("2025-09-01");
  });
});

/*
 * O hífen no prefixo não é enfeite. Sem ele, `'2026-09'` casaria com
 * `'2026-091...'`; e, mais perto do real, uma competência de dois dígitos
 * casaria com o começo de outra se o formato um dia mudasse.
 */
describe("dataPadraoDoLancamento — a comparação é do mês inteiro", () => {
  it("não confunde competências cujo texto começa igual", () => {
    expect(dataPadraoDoLancamento(c("2026-1"), "2026-12-19")).toBe("2026-1-01");
  });

  it("devolve sempre uma data em AAAA-MM-DD", () => {
    for (const [competencia, hoje] of [
      ["2026-09", "2026-09-19"],
      ["2026-03", "2026-09-19"],
    ] as const) {
      expect(dataPadraoDoLancamento(c(competencia), hoje)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
