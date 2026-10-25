import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Cents } from "../shared/money";
import { conferirAba } from "./conferir-aba";
import { lerCsv } from "./csv";
import { type AbaLida, lerAba } from "./ler-aba";

type Mes = "Outubro" | "Novembro" | "Dezembro";

function abaDaFixture(mes: Mes): AbaLida {
  const texto = readFileSync(
    join(__dirname, "__fixtures__", `Planilha 2026 - ${mes}.csv`),
    "utf-8",
  );
  const grade = lerCsv(texto);
  if (!grade.ok) {
    throw new Error(`fixture ilegível: ${mes}`);
  }
  const aba = lerAba(grade.value);
  if (!aba.ok) {
    throw new Error(`fixture recusada: ${mes}`);
  }
  return aba.value;
}

function conferido(linhas: number, soma: number) {
  return { linhas, somaLida: soma, totalDaPlanilha: soma, confere: true, diferenca: 0 };
}

describe("conferirAba — outubro, com o total do Gastos do Mês curto (IMP-05)", () => {
  const conferencia = conferirAba(abaDaFixture("Outubro"));

  it("confere Fixos, Cartão de Crédito e Entradas pela soma lida (AC 1 e 2)", () => {
    expect(conferencia.blocos.FIXOS).toEqual(conferido(4, 184000));
    expect(conferencia.blocos.CARTAO).toEqual(conferido(6, 42334));
    expect(conferencia.blocos.ENTRADAS).toEqual(conferido(3, 1015000));
  });

  it("marca Gastos do Mês divergente, com a diferença em centavos (AC 3)", () => {
    expect(conferencia.blocos.GASTOS).toEqual({
      linhas: 3,
      somaLida: 12450,
      totalDaPlanilha: 11250,
      confere: false,
      diferenca: -1200,
    });
  });

  it("confere as despesas lidas contra o total de Saídas (AC 4)", () => {
    expect(conferencia.saidas).toEqual(conferido(13, 238784));
  });

  it("tem divergência", () => {
    expect(conferencia.temDivergencia).toBe(true);
  });
});

describe("conferirAba — novembro, sem divergência", () => {
  it("confere todos os blocos e Saídas", () => {
    expect(conferirAba(abaDaFixture("Novembro"))).toEqual({
      blocos: {
        FIXOS: conferido(4, 176000),
        CARTAO: conferido(6, 52335),
        GASTOS: conferido(2, 34500),
        ENTRADAS: conferido(3, 1040000),
      },
      saidas: conferido(12, 262835),
      temDivergencia: false,
    });
  });
});

describe("conferirAba — dezembro, com a parcela ilegível fora da soma", () => {
  const conferencia = conferirAba(abaDaFixture("Dezembro"));

  it("aponta no Cartão de Crédito os R$ 40,00 da Mesa (AC 3)", () => {
    expect(conferencia.blocos.CARTAO).toEqual({
      linhas: 3,
      somaLida: 39333,
      totalDaPlanilha: 43333,
      confere: false,
      diferenca: 4000,
    });
  });

  it("não confere Saídas: lido 244333 contra 248333 da planilha (AC 4)", () => {
    expect(conferencia.saidas).toEqual({
      linhas: 7,
      somaLida: 244333,
      totalDaPlanilha: 248333,
      confere: false,
      diferenca: 4000,
    });
    expect(conferencia.temDivergencia).toBe(true);
  });

  it("confere Entradas, que a planilha também soma sem o Bônus ilegível", () => {
    expect(conferencia.blocos.ENTRADAS).toEqual(conferido(2, 610000));
  });
});

describe("conferirAba — bordas", () => {
  const outubro = abaDaFixture("Outubro");

  it("total ausente não confere e não tem diferença (AC 3)", () => {
    const aba: AbaLida = { ...outubro, totais: { ...outubro.totais, FIXOS: null } };

    expect(conferirAba(aba).blocos.FIXOS).toEqual({
      linhas: 4,
      somaLida: 184000,
      totalDaPlanilha: null,
      confere: false,
      diferenca: null,
    });
  });

  it("bloco sem linhas soma zero", () => {
    const aba: AbaLida = { ...outubro, gastos: [] };

    expect(conferirAba(aba).blocos.GASTOS).toMatchObject({ linhas: 0, somaLida: 0 });
  });

  it("só Saídas divergente já é divergência (AC 7)", () => {
    const aba: AbaLida = {
      ...outubro,
      totais: { ...outubro.totais, GASTOS: 12450 as Cents, SAIDAS: 238000 as Cents },
    };
    const conferencia = conferirAba(aba);

    expect(Object.values(conferencia.blocos).every((bloco) => bloco.confere)).toBe(true);
    expect(conferencia.saidas.confere).toBe(false);
    expect(conferencia.temDivergencia).toBe(true);
  });
});
