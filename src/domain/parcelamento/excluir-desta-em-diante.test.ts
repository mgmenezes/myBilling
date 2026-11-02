import { describe, expect, it } from "vitest";
import type { Competencia } from "../shared/competencia";
import type { Cents } from "../shared/money";
import {
  type CompraVigente,
  type ParcelaVigente,
  type PlanoDeExclusao,
  planejarExclusaoDestaEmDiante,
  restantesDepois,
} from "./excluir-desta-em-diante";

const COMPETENCIAS = ["2026-12", "2027-01", "2027-02", "2027-03"] as const;

/** Compra em 4x de R$ 10,00, de dezembro a março; `pagas` lista os números já pagos. */
function quatroDeDez(pagas: ReadonlyArray<number> = []): ParcelaVigente[] {
  return COMPETENCIAS.map((competencia, indice) => ({
    numero: indice + 1,
    competencia: competencia as Competencia,
    valor: 1000 as Cents,
    paga: pagas.includes(indice + 1),
  }));
}

function compra(amortizado: number, parcelas: ParcelaVigente[]): CompraVigente {
  return { valorAmortizadoAnterior: amortizado as Cents, parcelas };
}

function plano(alvo: CompraVigente, aPartirDe: number): PlanoDeExclusao {
  const resultado = planejarExclusaoDestaEmDiante(alvo, aPartirDe);
  if (!resultado.ok) {
    throw new Error(`esperava um plano de exclusão: ${JSON.stringify(resultado.error)}`);
  }
  return resultado.value;
}

describe("planejarExclusaoDestaEmDiante — o que sai, o que fica e o total novo (EXC-03)", () => {
  it("a partir da 2 de 4x de R$ 10,00: saem 2, 3 e 4, ficam a 1 e o amortizado (EXC-03 AC 1, 2, 4)", () => {
    const resultado = plano(compra(5000, quatroDeDez()), 2);

    expect(resultado).toEqual({
      numeros: [2, 3, 4],
      primeira: "2027-01",
      ultima: "2027-03",
      total: 3000,
      pagasQueFicam: 0,
      inteira: false,
      valorTotalNovo: 5000 + 1000,
    });
  });

  it("a partir da 1, a primeira não cancelada: a compra sai inteira (Edge Cases; EXC-02 AC 5)", () => {
    const resultado = plano(compra(0, quatroDeDez()), 1);

    expect(resultado.inteira).toBe(true);
    expect(resultado.numeros).toEqual([1, 2, 3, 4]);
    expect(resultado.valorTotalNovo).toBe(0);
  });

  it("a partir da primeira vigente quando as anteriores já foram canceladas: também é inteira", () => {
    const resultado = plano(compra(0, quatroDeDez().slice(2)), 3);

    expect(resultado.inteira).toBe(true);
    expect(resultado.numeros).toEqual([3, 4]);
  });

  it("a partir da última: sai só ela, em um mês só (Edge Cases)", () => {
    const resultado = plano(compra(0, quatroDeDez()), 4);

    expect(resultado.numeros).toEqual([4]);
    expect(resultado.primeira).toBe("2027-03");
    expect(resultado.ultima).toBe("2027-03");
    expect(resultado.total).toBe(1000);
    expect(resultado.valorTotalNovo).toBe(3000);
  });

  it("com a 3 paga, a partir da 2: saem 2 e 4, a 3 fica e conta no total (EXC-03 AC 3)", () => {
    const resultado = plano(compra(5000, quatroDeDez([3])), 2);

    expect(resultado).toEqual({
      numeros: [2, 4],
      primeira: "2027-01",
      ultima: "2027-03",
      total: 2000,
      pagasQueFicam: 1,
      inteira: false,
      valorTotalNovo: 5000 + 2000,
    });
  });

  it("com a 3 e a 4 pagas, a partir da 2: sai só a 2 e ficam 2 pagas (EXC-03 AC 3; L-029)", () => {
    const resultado = plano(compra(0, quatroDeDez([3, 4])), 2);

    expect(resultado.numeros).toEqual([2]);
    expect(resultado.pagasQueFicam).toBe(2);
    expect(resultado.total).toBe(1000);
    expect(resultado.valorTotalNovo).toBe(3000);
  });

  it("a escolhida paga e a seguinte não: a escolhida fica e saem 3 e 4 (Edge Cases)", () => {
    const resultado = plano(compra(0, quatroDeDez([2])), 2);

    expect(resultado.numeros).toEqual([3, 4]);
    expect(resultado.primeira).toBe("2027-02");
    expect(resultado.ultima).toBe("2027-03");
    expect(resultado.pagasQueFicam).toBe(1);
    expect(resultado.valorTotalNovo).toBe(2000);
  });

  it("parcelas de valores diferentes: o total é a soma dos valores gravados das que saem (Edge Cases)", () => {
    const parcelas = quatroDeDez().map((parcela, indice) => ({
      ...parcela,
      valor: [1000, 1001, 1002, 1003][indice] as Cents,
    }));
    const resultado = plano(compra(0, parcelas), 2);

    expect(resultado.total).toBe(1001 + 1002 + 1003);
    expect(resultado.valorTotalNovo).toBe(1000);
  });

  it("parcelas fora de ordem: os números saem em ordem e os meses vão da menor à maior", () => {
    const resultado = plano(compra(0, quatroDeDez().reverse()), 2);

    expect(resultado.numeros).toEqual([2, 3, 4]);
    expect(resultado.primeira).toBe("2027-01");
    expect(resultado.ultima).toBe("2027-03");
  });

  it("todo o alcance pago: recusa com NADA_A_EXCLUIR e diz quantas pagas ficam (EXC-05 AC 5)", () => {
    const resultado = planejarExclusaoDestaEmDiante(compra(0, quatroDeDez([3, 4])), 3);

    expect(resultado).toEqual({ ok: false, error: { code: "NADA_A_EXCLUIR", pagasQueFicam: 2 } });
  });

  it("parcela escolhida fora das vigentes: recusa com PARCELA_INICIAL_INVALIDA", () => {
    const resultado = planejarExclusaoDestaEmDiante(compra(0, quatroDeDez().slice(0, 3)), 4);

    expect(resultado).toEqual({ ok: false, error: { code: "PARCELA_INICIAL_INVALIDA" } });
  });
});

describe("restantesDepois — o 'faltam' conta só as não canceladas de número maior (EXC-04 AC 5)", () => {
  it("4x sem cancelada: depois da 2 faltam 2", () => {
    expect(restantesDepois(quatroDeDez(), 2)).toBe(2);
  });

  it("só a 1 e a 2 vigentes: depois da 2 não falta nenhuma", () => {
    expect(restantesDepois(quatroDeDez().slice(0, 2), 2)).toBe(0);
  });
});
