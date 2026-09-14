import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatarBRL, formatarData } from "./formatar";

describe("formatarBRL", () => {
  it("formata 123456 centavos como R$ 1.234,56", () => {
    expect(formatarBRL(123456)).toBe("R$ 1.234,56");
  });

  it("formata 5 centavos como R$ 0,05", () => {
    expect(formatarBRL(5)).toBe("R$ 0,05");
  });

  it("formata 0 centavos como R$ 0,00", () => {
    expect(formatarBRL(0)).toBe("R$ 0,00");
  });

  it("mantém o separador de milhar em valores grandes", () => {
    expect(formatarBRL(9999999)).toBe("R$ 99.999,99");
  });

  it("formata valor negativo preservando o sinal", () => {
    expect(formatarBRL(-123456)).toBe("-R$ 1.234,56");
  });
});

describe("formatarData", () => {
  it("formata data do banco no padrão dd/MM/yyyy", () => {
    expect(formatarData("2026-03-05")).toBe("05/03/2026");
  });

  it("formata instante ISO usando a parte de data, sem deslocar por fuso", () => {
    expect(formatarData("2026-03-31T23:30:00Z")).toBe("31/03/2026");
  });

  it("preserva a virada de ano", () => {
    expect(formatarData("2026-12-31")).toBe("31/12/2026");
    expect(formatarData("2027-01-01")).toBe("01/01/2027");
  });
});

describe("fronteira única de formatação de dinheiro (AD-001)", () => {
  const raizSrc = join(import.meta.dirname, "..");

  function arquivosDeCodigo(diretorio: string): string[] {
    return readdirSync(diretorio).flatMap((entrada) => {
      const caminho = join(diretorio, entrada);
      if (statSync(caminho).isDirectory()) {
        return arquivosDeCodigo(caminho);
      }
      return /\.(ts|tsx)$/.test(entrada) ? [caminho] : [];
    });
  }

  it("nenhum arquivo fora de src/lib/formatar.ts chama toFixed", () => {
    const infratores = arquivosDeCodigo(raizSrc).filter(
      (caminho) =>
        !caminho.endsWith(join("lib", "formatar.ts")) &&
        !caminho.endsWith(join("lib", "formatar.test.ts")) &&
        readFileSync(caminho, "utf8").includes(".toFixed("),
    );
    expect(infratores).toEqual([]);
  });
});
