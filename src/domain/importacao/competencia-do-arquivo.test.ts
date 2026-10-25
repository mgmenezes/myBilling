import { describe, expect, it } from "vitest";
import { competenciaDoNomeDoArquivo } from "./competencia-do-arquivo";

describe("competenciaDoNomeDoArquivo — mês e ano pré-selecionados (IMP-02)", () => {
  it("lê o mês do nome da aba e o ano do título da planilha (AC 1)", () => {
    expect(competenciaDoNomeDoArquivo("Planilha 2026 - Outubro.csv")).toEqual({
      mes: 10,
      ano: 2026,
    });
  });

  it("ignora o sufixo (1) que o navegador acrescenta a um download repetido", () => {
    expect(competenciaDoNomeDoArquivo("Planilha 2026 - Outubro (1).csv")).toEqual({
      mes: 10,
      ano: 2026,
    });
  });

  it.each([["X 2026 - MARÇO.csv"], ["X 2026 - marco.csv"]])(
    "compara %p sem caixa e sem acento",
    (nome) => {
      expect(competenciaDoNomeDoArquivo(nome)).toEqual({ mes: 3, ano: 2026 });
    },
  );

  it("fica com o último número de quatro dígitos do título", () => {
    expect(competenciaDoNomeDoArquivo("Planilha 2025 2026 - Janeiro.csv")).toEqual({
      mes: 1,
      ano: 2026,
    });
  });

  it("deixa o ano sem seleção quando o título não tem ano (AC 2)", () => {
    expect(competenciaDoNomeDoArquivo("outubro.csv")).toEqual({ mes: 10, ano: null });
  });

  it("deixa o mês sem seleção quando a aba não tem nome de mês (AC 2)", () => {
    expect(competenciaDoNomeDoArquivo("Planilha 2026 - Resumo.csv")).toEqual({
      mes: null,
      ano: 2026,
    });
  });

  it("não aceita ano fora de 2000 a 2099 (AC 1 e 2)", () => {
    expect(competenciaDoNomeDoArquivo("Planilha 1999 - Outubro.csv")).toEqual({
      mes: 10,
      ano: null,
    });
  });
});
