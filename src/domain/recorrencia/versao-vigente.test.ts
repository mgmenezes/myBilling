import { describe, expect, it } from "vitest";
import type { Competencia } from "../shared/competencia";
import type { Cents } from "../shared/money";
import { type VersaoRecorrencia, versaoVigente } from "./versao-vigente";

/**
 * Derivado de FIXO-03, AC 2: para cada competência vale a versão de **maior
 * vigência que não seja posterior a ela**.
 *
 * É esta função que decide se mudar o valor da conta de luz reescreve o
 * passado ou não. Ela erra silenciosamente: um `>` no lugar de `>=` faria o
 * mês da própria vigência continuar com o valor antigo, e ninguém notaria até
 * conferir a fatura.
 */

function versao(vigenteDesde: string, valorPrevisto: number): VersaoRecorrencia {
  return { vigenteDesde: vigenteDesde as Competencia, valorPrevisto: valorPrevisto as Cents };
}

const c = (texto: string) => texto as Competencia;

describe("versão vigente para uma competência (FIXO-03, AC 2)", () => {
  it("com uma versão só, ela vale da vigência em diante", () => {
    const versoes = [versao("2026-03", 18000)];

    expect(versaoVigente(versoes, c("2026-03"))?.valorPrevisto).toBe(18000);
    expect(versaoVigente(versoes, c("2026-09"))?.valorPrevisto).toBe(18000);
  });

  it("o mês da própria vigência já recebe a versão nova", () => {
    const versoes = [versao("2026-03", 18000), versao("2026-05", 24000)];

    expect(versaoVigente(versoes, c("2026-05"))?.valorPrevisto).toBe(24000);
  });

  it("o mês anterior à segunda vigência mantém a primeira", () => {
    const versoes = [versao("2026-03", 18000), versao("2026-05", 24000)];

    expect(versaoVigente(versoes, c("2026-04"))?.valorPrevisto).toBe(18000);
  });

  it("competência anterior a toda vigência não tem versão", () => {
    expect(versaoVigente([versao("2026-03", 18000)], c("2026-02"))).toBeNull();
  });

  it("lista vazia não tem versão", () => {
    expect(versaoVigente([], c("2026-03"))).toBeNull();
  });

  it("a ordem de entrada não altera o resultado", () => {
    const crescente = [
      versao("2026-03", 18000),
      versao("2026-05", 24000),
      versao("2026-08", 30000),
    ];
    const embaralhada = [
      versao("2026-08", 30000),
      versao("2026-03", 18000),
      versao("2026-05", 24000),
    ];

    for (const competencia of ["2026-03", "2026-04", "2026-05", "2026-07", "2026-08", "2026-12"]) {
      expect(versaoVigente(embaralhada, c(competencia))).toEqual(
        versaoVigente(crescente, c(competencia)),
      );
    }
  });

  it("com três versões, cada faixa recebe a sua", () => {
    const versoes = [versao("2026-03", 18000), versao("2026-05", 24000), versao("2026-08", 30000)];

    expect(versaoVigente(versoes, c("2026-03"))?.valorPrevisto).toBe(18000);
    expect(versaoVigente(versoes, c("2026-06"))?.valorPrevisto).toBe(24000);
    expect(versaoVigente(versoes, c("2027-01"))?.valorPrevisto).toBe(30000);
  });

  it("atravessa a virada de ano", () => {
    const versoes = [versao("2026-11", 18000), versao("2027-01", 24000)];

    expect(versaoVigente(versoes, c("2026-12"))?.valorPrevisto).toBe(18000);
    expect(versaoVigente(versoes, c("2027-01"))?.valorPrevisto).toBe(24000);
  });
});
