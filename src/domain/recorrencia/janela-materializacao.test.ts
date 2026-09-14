import { describe, expect, it } from "vitest";
import type { Competencia } from "../shared/competencia";
import { janelaMaterializacao, type PeriodoRecorrencia } from "./janela-materializacao";

/**
 * Derivado de FIXO-01 (ACs 2 a 4) e FIXO-02.
 *
 * Esta função concentra as três bordas que decidem se uma ocorrência deve
 * existir: antes do início, depois do fim, e fora da janela pedida. Espalhadas
 * pelo caso de uso, cada uma seria testada por acidente; juntas, cada uma tem
 * um teste com nome.
 *
 * Encerramento **não** é uma quarta borda: encerrar a partir de maio grava fim
 * em abril, e o off-by-one dessa tradução mora no caso de uso, com teste lá.
 */

const c = (texto: string) => texto as Competencia;

function periodo(inicio: string, fim: string | null = null): PeriodoRecorrencia {
  return { inicio: c(inicio), fim: fim === null ? null : c(fim) };
}

function janela(p: PeriodoRecorrencia, de: string, ate: string): string[] {
  return [...janelaMaterializacao(p, c(de), c(ate))];
}

describe("janela de materialização (FIXO-01, FIXO-02)", () => {
  it("cobre a janela inteira quando a recorrência abrange tudo", () => {
    expect(janela(periodo("2026-01"), "2026-03", "2026-06")).toEqual([
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
    ]);
  });

  it("não cria nada antes do início (FIXO-01, AC 3)", () => {
    expect(janela(periodo("2026-05"), "2026-03", "2026-06")).toEqual(["2026-05", "2026-06"]);
  });

  it("o mês do próprio início entra", () => {
    expect(janela(periodo("2026-03"), "2026-03", "2026-04")).toEqual(["2026-03", "2026-04"]);
  });

  it("não cria nada depois do fim (FIXO-01, AC 4)", () => {
    expect(janela(periodo("2026-01", "2026-04"), "2026-03", "2026-06")).toEqual([
      "2026-03",
      "2026-04",
    ]);
  });

  it("o mês do próprio fim entra", () => {
    expect(janela(periodo("2026-01", "2026-03"), "2026-03", "2026-06")).toEqual(["2026-03"]);
  });

  it("fim nulo não limita", () => {
    expect(janela(periodo("2026-01", null), "2027-11", "2028-01")).toEqual([
      "2027-11",
      "2027-12",
      "2028-01",
    ]);
  });

  it("recorrência encerrada a partir de maio tem fim em abril (FIXO-06, AC 1)", () => {
    // A tradução "encerrar a partir de M" -> "fim em M-1" acontece no caso de
    // uso. Aqui se prende só o efeito: abril entra, maio não.
    expect(janela(periodo("2026-01", "2026-04"), "2026-03", "2026-06")).toEqual([
      "2026-03",
      "2026-04",
    ]);
  });

  it("janela inteiramente antes do início devolve vazio", () => {
    expect(janela(periodo("2026-10"), "2026-03", "2026-06")).toEqual([]);
  });

  it("janela inteiramente depois do fim devolve vazio", () => {
    expect(janela(periodo("2026-01", "2026-02"), "2026-03", "2026-06")).toEqual([]);
  });

  it("janela invertida devolve vazio em vez de inventar meses", () => {
    expect(janela(periodo("2026-01"), "2026-06", "2026-03")).toEqual([]);
  });

  it("janela de um mês só devolve aquele mês", () => {
    expect(janela(periodo("2026-01"), "2026-04", "2026-04")).toEqual(["2026-04"]);
  });

  it("atravessa a virada de ano", () => {
    expect(janela(periodo("2026-01"), "2026-12", "2027-02")).toEqual([
      "2026-12",
      "2027-01",
      "2027-02",
    ]);
  });

  it("início e fim no mesmo mês devolvem aquele mês só", () => {
    expect(janela(periodo("2026-04", "2026-04"), "2026-01", "2026-12")).toEqual(["2026-04"]);
  });

  it("fim anterior ao início devolve vazio em vez de inverter", () => {
    expect(janela(periodo("2026-06", "2026-04"), "2026-01", "2026-12")).toEqual([]);
  });
});
