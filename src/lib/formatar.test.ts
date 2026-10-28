import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseBRL } from "@/domain";
import { descreverMeio, formatarBRL, formatarData, formatarValorParaCampo } from "./formatar";

describe("descreverMeio (IMP-04, AC 9)", () => {
  it("cartão diz os dois dias do ciclo", () => {
    expect(descreverMeio({ tipo: "CARTAO_CREDITO", diaFechamento: 25, diaVencimento: 5 })).toBe(
      "cartão, fecha dia 25, vence dia 5",
    );
  });

  it("conta e rótulo dizem o que são", () => {
    expect(descreverMeio({ tipo: "CONTA_CORRENTE" })).toBe("conta");
    expect(descreverMeio({ tipo: "ROTULO" })).toBe("rótulo");
  });
});

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

/*
 * O campo do valor na edição de um fixo vem preenchido por esta função e é lido
 * de volta por `parseBRL`. Se as duas discordassem, salvar sem mexer no valor
 * registraria uma vigência nova (EDF-01 AC 3, EDF-03 AC 3).
 */
describe("formatarValorParaCampo", () => {
  it("formata 123456 centavos como 1.234,56, sem o símbolo da moeda", () => {
    expect(formatarValorParaCampo(123456)).toBe("1.234,56");
  });

  it("formata 5 centavos como 0,05", () => {
    expect(formatarValorParaCampo(5)).toBe("0,05");
  });

  it("devolve um texto que parseBRL lê como o mesmo número de centavos", () => {
    for (const centavos of [1, 5, 99, 100, 18000, 123456, 9999999]) {
      expect(parseBRL(formatarValorParaCampo(centavos))).toEqual({ ok: true, value: centavos });
    }
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
