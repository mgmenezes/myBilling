import { describe, expect, it } from "vitest";
import { restoDaParcela } from "./texto-da-parcela";

/**
 * Testes derivados de DENS-01 (AC 2): o que vem depois de "2/4 · " na linha
 * da parcela. A penúltima ainda diz quanto falta; só a última diz "última".
 */
describe("o resto da parcela, curto (DENS-01, AC 2)", () => {
  it('com 2 depois desta: "faltam 2"', () => {
    expect(restoDaParcela(2)).toBe("faltam 2");
  });

  it('na penúltima: "faltam 1", e não "última"', () => {
    expect(restoDaParcela(1)).toBe("faltam 1");
  });

  it('na última: "última"', () => {
    expect(restoDaParcela(0)).toBe("última");
  });
});
