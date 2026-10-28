import { describe, expect, it } from "vitest";
import type { Competencia } from "../shared/competencia";
import { dataDeVencimento } from "./data-de-vencimento";

/**
 * Derivado de EDF-02 AC 2 e do edge case do dia 31: a data de cada ocorrência
 * é o dia de vencimento do fixo naquele mês, limitado ao último dia dele.
 *
 * É a mesma regra da materialização (FIXO-01, AC 5): a edição recalcula as
 * datas pela mesma função que as criou, para as duas nunca divergirem.
 */

const c = (texto: string) => texto as Competencia;

describe("data de vencimento de uma ocorrência (EDF-02 AC 2)", () => {
  it("o dia que existe no mês vira a data, com dois dígitos", () => {
    expect(dataDeVencimento(c("2026-10"), 5)).toBe("2026-10-05");
  });

  it("dia 31 em fevereiro de ano comum cai no dia 28", () => {
    expect(dataDeVencimento(c("2027-02"), 31)).toBe("2027-02-28");
  });

  it("dia 31 em fevereiro de ano bissexto cai no dia 29", () => {
    expect(dataDeVencimento(c("2028-02"), 31)).toBe("2028-02-29");
  });

  it("dia 31 em mês de 30 dias cai no dia 30", () => {
    expect(dataDeVencimento(c("2026-11"), 31)).toBe("2026-11-30");
  });
});
