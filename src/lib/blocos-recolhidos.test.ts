import { describe, expect, it } from "vitest";
import { COOKIE_BLOCOS_RECOLHIDOS, lerBlocosRecolhidos } from "./blocos-recolhidos";

/**
 * Testes derivados de LST-02 (ACs 3 a 5) e do Edge Case do cookie com bloco
 * que não existe. A página lê o cookie com esta função antes de renderizar a
 * tabela, e o clique a usa para não regravar o que não reconhece.
 */

describe("o cookie dos blocos recolhidos (LST-02)", () => {
  it('chama-se "blocos-recolhidos" (AC 3)', () => {
    expect(COOKIE_BLOCOS_RECOLHIDOS).toBe("blocos-recolhidos");
  });

  it("sem cookie, nenhum bloco recolhido (AC 5)", () => {
    expect(lerBlocosRecolhidos(undefined)).toEqual([]);
  });

  it("cookie vazio, nenhum bloco recolhido (AC 5)", () => {
    expect(lerBlocosRecolhidos("")).toEqual([]);
  });

  it("lê a lista separada por vírgula com as chaves dos blocos (AC 4)", () => {
    expect(lerBlocosRecolhidos("FIXOS,CARTAO")).toEqual(["FIXOS", "CARTAO"]);
  });

  it("reconhece as quatro chaves", () => {
    expect(lerBlocosRecolhidos("ENTRADAS,FIXOS,CARTAO,AVULSOS")).toEqual([
      "ENTRADAS",
      "FIXOS",
      "CARTAO",
      "AVULSOS",
    ]);
  });

  it("ignora a chave de bloco que não existe (Edge Case)", () => {
    expect(lerBlocosRecolhidos("FIXOS,QUALQUER,fixos")).toEqual(["FIXOS"]);
  });
});
