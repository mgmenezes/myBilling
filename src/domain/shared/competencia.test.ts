import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  addMeses,
  type Competencia,
  compararCompetencias,
  criarCompetencia,
  dataParaCompetencia,
  diffMeses,
  rangeCompetencias,
} from "./competencia";
import { isErr, isOk } from "./result";

/** Atalho para testes: só aceita competências que o construtor valida. */
function comp(texto: string): Competencia {
  const resultado = criarCompetencia(texto);
  if (!isOk(resultado)) {
    throw new Error(`fixture inválida: ${texto}`);
  }
  return resultado.value;
}

describe("criarCompetencia (AD-002)", () => {
  it("aceita 'YYYY-MM' válido", () => {
    expect(criarCompetencia("2026-03")).toEqual({ ok: true, value: "2026-03" });
  });

  it.each(["2026-13", "2026-00"])("rejeita %p com COMPETENCIA_INVALIDA", (texto) => {
    const resultado = criarCompetencia(texto);

    expect(isErr(resultado)).toBe(true);
    expect(isErr(resultado) && resultado.error.code).toBe("COMPETENCIA_INVALIDA");
  });

  it.each(["2026-3", "202603", "2026/03", "abc", "", "2026-03-01"])(
    "rejeita o formato malformado %p com COMPETENCIA_INVALIDA",
    (texto) => {
      const resultado = criarCompetencia(texto);

      expect(isErr(resultado)).toBe(true);
      expect(isErr(resultado) && resultado.error.code).toBe("COMPETENCIA_INVALIDA");
    },
  );
});

describe("addMeses", () => {
  it("atravessa a virada de ano para frente (COMP-01)", () => {
    expect(addMeses(comp("2026-11"), 3)).toBe("2027-02");
  });

  it("retrocede o ano com deslocamento negativo (COMP-04)", () => {
    expect(addMeses(comp("2026-01"), -1)).toBe("2025-12");
  });

  it("atravessa duas viradas de ano em 24 parcelas (COMP-02)", () => {
    expect(addMeses(comp("2026-11"), 23)).toBe("2028-10");
  });

  it("devolve a mesma competência com deslocamento zero", () => {
    expect(addMeses(comp("2026-12"), 0)).toBe("2026-12");
  });
});

describe("compararCompetencias", () => {
  it("devolve -1, 0 e 1 conforme a ordem cronológica", () => {
    expect(compararCompetencias(comp("2026-11"), comp("2027-01"))).toBe(-1);
    expect(compararCompetencias(comp("2027-01"), comp("2027-01"))).toBe(0);
    expect(compararCompetencias(comp("2027-01"), comp("2026-11"))).toBe(1);
  });
});

describe("diffMeses", () => {
  it("conta os meses de a até b, com sinal", () => {
    expect(diffMeses(comp("2026-11"), comp("2027-03"))).toBe(4);
    expect(diffMeses(comp("2027-03"), comp("2026-11"))).toBe(-4);
  });
});

describe("rangeCompetencias", () => {
  it("gera o intervalo inclusivo sem repetir competência (COMP-02)", () => {
    const intervalo = rangeCompetencias(comp("2026-11"), comp("2027-03"));

    expect(intervalo).toEqual(["2026-11", "2026-12", "2027-01", "2027-02", "2027-03"]);
    expect(new Set(intervalo).size).toBe(intervalo.length);
  });

  it("devolve vazio quando o fim é anterior ao início", () => {
    expect(rangeCompetencias(comp("2027-03"), comp("2026-11"))).toEqual([]);
  });
});

describe("pureza do módulo (AD-002)", () => {
  it("não faz nenhuma referência ao identificador Date nem à API de mês de Date", () => {
    const fonte = readFileSync(join(__dirname, "competencia.ts"), "utf-8");

    expect(fonte).not.toMatch(/(?<![A-Za-z])Date(?![A-Za-z])/);
    for (const proibido of ["setMonth", "getMonth", "setFullYear", "getFullYear", "getTime"]) {
      expect(fonte).not.toContain(proibido);
    }
  });
});

describe("dataParaCompetencia (COMP-03)", () => {
  it("mantém 31/03 23h30 UTC na competência 2026-03 no fuso de São Paulo", () => {
    expect(dataParaCompetencia("2026-03-31T23:30:00Z", "America/Sao_Paulo")).toEqual({
      ok: true,
      value: "2026-03",
    });
  });

  it("traz 01/04 02h30 UTC de volta para a competência 2026-03 no fuso de São Paulo", () => {
    expect(dataParaCompetencia("2026-04-01T02:30:00Z", "America/Sao_Paulo")).toEqual({
      ok: true,
      value: "2026-03",
    });
  });

  it("retrocede a virada de ano quando o fuso puxa o instante para dezembro", () => {
    expect(dataParaCompetencia("2026-01-01T02:30:00Z", "America/Sao_Paulo")).toEqual({
      ok: true,
      value: "2025-12",
    });
  });

  it("usa o fuso recebido, e não um fuso fixo: o mesmo instante muda de competência", () => {
    const instante = "2026-04-01T02:30:00Z";

    expect(dataParaCompetencia(instante, "America/Sao_Paulo")).toEqual({
      ok: true,
      value: "2026-03",
    });
    expect(dataParaCompetencia(instante, "UTC")).toEqual({ ok: true, value: "2026-04" });
  });

  it("exige o fuso: chamar sem tz é erro de tipo, não default silencioso", () => {
    // @ts-expect-error tz é parâmetro obrigatório de dataParaCompetencia (COMP-03).
    // Sem a marca, esta chamada compilaria e o Intl cairia no fuso da máquina.
    dataParaCompetencia("2026-03-31T23:30:00Z");
    // Se `tz` fosse opcional, `length` seria `1 | 2`, o tipo abaixo seria
    // `false` e o typecheck rejeitaria o valor `true`.
    const tzEhObrigatorio: Parameters<typeof dataParaCompetencia>["length"] extends 2
      ? true
      : false = true;

    expect(tzEhObrigatorio).toBe(true);
  });

  it.each(["2026-03-31", "2026-13-01T00:00:00Z", "abc", "2026-03-31T23:30:00-03:00"])(
    "rejeita o instante malformado %p com COMPETENCIA_INVALIDA",
    (dataISO) => {
      const resultado = dataParaCompetencia(dataISO, "America/Sao_Paulo");

      expect(isErr(resultado)).toBe(true);
      expect(isErr(resultado) && resultado.error.code).toBe("COMPETENCIA_INVALIDA");
    },
  );

  it("devolve erro em vez de lançar quando o fuso não existe (AD-006)", () => {
    const resultado = dataParaCompetencia("2026-03-31T23:30:00Z", "Nao/Existe");

    expect(isErr(resultado)).toBe(true);
    expect(isErr(resultado) && resultado.error.code).toBe("COMPETENCIA_INVALIDA");
  });
});
