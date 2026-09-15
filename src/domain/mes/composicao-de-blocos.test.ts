import { describe, expect, it } from "vitest";
import type { Cents } from "../shared/money";
import { composicaoDeBlocos } from "./composicao-de-blocos";
import { CEM_PORCENTO } from "./resumo-por-categoria";

/** Fixtures escolhidas por valor matemático, nunca por realismo (AD-009). */
const c = (valor: number): Cents => valor as Cents;

describe("composicaoDeBlocos", () => {
  it("devolve os três blocos na ordem comprometido → discricionário", () => {
    const fatias = composicaoDeBlocos({ fixos: c(100), cartao: c(100), avulsos: c(100) });

    expect(fatias.map((f) => f.bloco)).toEqual(["FIXOS", "CARTAO", "AVULSOS"]);
  });

  it("reparte o percentual proporcionalmente ao valor de cada bloco", () => {
    const fatias = composicaoDeBlocos({ fixos: c(500), cartao: c(300), avulsos: c(200) });

    expect(fatias.map((f) => f.percentual)).toEqual([5_000, 3_000, 2_000]);
  });

  it("preserva o valor de cada bloco sem tocá-lo", () => {
    const fatias = composicaoDeBlocos({ fixos: c(500), cartao: c(300), avulsos: c(200) });

    expect(fatias.map((f) => f.total)).toEqual([500, 300, 200]);
  });

  it("fecha em 100% mesmo quando a divisão não é exata", () => {
    const fatias = composicaoDeBlocos({ fixos: c(1), cartao: c(1), avulsos: c(1) });

    expect(fatias.reduce((soma, f) => soma + f.percentual, 0)).toBe(CEM_PORCENTO);
  });

  /*
   * 1/4/1 sobre 6: os três arredondam para cima e somam 10001. Sem a correção
   * o cartão sairia 6667 e a barra passaria de 100%. Esta fixture existe para
   * falhar se a correção for removida — com 1/7/1 a sobra é zero e o teste
   * passaria de qualquer jeito.
   */
  it("desconta a sobra do arredondamento no maior bloco, não no primeiro", () => {
    const fatias = composicaoDeBlocos({ fixos: c(1), cartao: c(4), avulsos: c(1) });

    expect(fatias.map((f) => f.percentual)).toEqual([1_667, 6_666, 1_667]);
    expect(fatias.reduce((soma, f) => soma + f.percentual, 0)).toBe(CEM_PORCENTO);
  });

  it("acha o maior quando ele é o último bloco", () => {
    const fatias = composicaoDeBlocos({ fixos: c(1), cartao: c(1), avulsos: c(4) });

    expect(fatias.map((f) => f.percentual)).toEqual([1_667, 1_667, 6_666]);
    expect(fatias.reduce((soma, f) => soma + f.percentual, 0)).toBe(CEM_PORCENTO);
  });

  it("acha o maior quando o do meio também supera o primeiro, mas perde para o último", () => {
    const fatias = composicaoDeBlocos({ fixos: c(2), cartao: c(3), avulsos: c(5) });

    expect(fatias.map((f) => f.total)).toEqual([2, 3, 5]);
    expect(fatias.reduce((soma, f) => soma + f.percentual, 0)).toBe(CEM_PORCENTO);
  });

  it("não inventa percentual quando o mês não teve despesa", () => {
    const fatias = composicaoDeBlocos({ fixos: c(0), cartao: c(0), avulsos: c(0) });

    expect(fatias.map((f) => f.percentual)).toEqual([0, 0, 0]);
    expect(fatias.map((f) => f.total)).toEqual([0, 0, 0]);
  });
});
