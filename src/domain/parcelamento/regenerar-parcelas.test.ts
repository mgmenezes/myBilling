import { describe, expect, it } from "vitest";
import { type Competencia, criarCompetencia } from "../shared/competencia";
import type { Cents } from "../shared/money";
import { isOk } from "../shared/result";
import {
  type CompraExistente,
  type ParcelaPaga,
  type PlanoRegeneracao,
  regenerarParcelas,
} from "./regenerar-parcelas";

function comp(texto: string): Competencia {
  const resultado = criarCompetencia(texto);
  if (!isOk(resultado)) {
    throw new Error(`fixture inválida: ${texto}`);
  }
  return resultado.value;
}

function compra(sobrescrever: Partial<CompraExistente> = {}): CompraExistente {
  return {
    valorTotal: 120000 as Cents,
    qtdParcelas: 12,
    competenciaCompra: comp("2026-01"),
    parcelaInicial: 1,
    politicaResiduo: "PRIMEIRAS",
    valorAmortizadoAnterior: 0 as Cents,
    ...sobrescrever,
  };
}

function pagas(numeros: readonly number[], valor: number): ParcelaPaga[] {
  return numeros.map((numero) => ({ numero, valor: valor as Cents }));
}

function soma(valores: readonly number[]): number {
  return valores.reduce((acumulado, valor) => acumulado + valor, 0);
}

/** Done-when 5: não canceladas + amortizado + cancelado === total (PARC-02). */
function conserva(plano: PlanoRegeneracao): boolean {
  const naoCanceladas = soma(plano.parcelas.map((p) => p.valor));
  const cancelado = soma(plano.canceladas.map((p) => p.valor));
  return naoCanceladas + plano.valorAmortizadoAnterior + cancelado === plano.valorTotal;
}

function planoOk(
  sobrescreverCompra: Partial<CompraExistente>,
  alteracoes: Parameters<typeof regenerarParcelas>[1],
  parcelasPagas: readonly ParcelaPaga[],
): PlanoRegeneracao {
  const resultado = regenerarParcelas(compra(sobrescreverCompra), alteracoes, parcelasPagas);
  if (!isOk(resultado)) {
    throw new Error(`esperava regeneração válida: ${JSON.stringify(resultado)}`);
  }
  return resultado.value;
}

describe("regenerarParcelas — redistribuição do remanescente (MOV-06, AC 4)", () => {
  it("altera o total de uma compra 12x com 3 pagas redistribuindo só as 9 pendentes", () => {
    const plano = planoOk({}, { novoValorTotal: 180000 as Cents }, pagas([1, 2, 3], 10000));

    expect(plano.parcelas.slice(0, 3)).toEqual([
      { numero: 1, valor: 10000, competencia: "2026-01" },
      { numero: 2, valor: 10000, competencia: "2026-02" },
      { numero: 3, valor: 10000, competencia: "2026-03" },
    ]);
    expect(plano.parcelas.slice(3).map((p) => p.valor)).toEqual([
      16667, 16667, 16667, 16667, 16667, 16667, 16666, 16666, 16666,
    ]);
    expect(plano.canceladas).toEqual([]);
    expect(conserva(plano)).toBe(true);
  });

  it("conserva a soma quando há amortizado anterior, parcela paga e resíduo juntos", () => {
    const plano = planoOk(
      {
        valorTotal: 60000 as Cents,
        qtdParcelas: 10,
        parcelaInicial: 8,
        competenciaCompra: comp("2025-08"),
        valorAmortizadoAnterior: 42000 as Cents,
      },
      { novoValorTotal: 60001 as Cents },
      pagas([8], 6000),
    );

    expect(plano.parcelas).toEqual([
      { numero: 8, valor: 6000, competencia: "2026-03" },
      { numero: 9, valor: 6001, competencia: "2026-04" },
      { numero: 10, valor: 6000, competencia: "2026-05" },
    ]);
    expect(plano.valorAmortizadoAnterior).toBe(42000);
    expect(conserva(plano)).toBe(true);
  });
});

describe("regenerarParcelas — mudança na quantidade de parcelas", () => {
  it("rejeita reduzir de 10 para 6 parcelas com 8 já pagas", () => {
    const resultado = regenerarParcelas(
      compra({ valorTotal: 100000 as Cents, qtdParcelas: 10 }),
      { novaQtdParcelas: 6 },
      pagas([1, 2, 3, 4, 5, 6, 7, 8], 10000),
    );

    expect(resultado.ok).toBe(false);
    expect(resultado.ok === false && resultado.error.code).toBe("QTD_PARCELAS_INVALIDA");
  });

  it("reduzir de 10 para 9 com 8 pagas cancela a parcela 10 e mantém a conservação", () => {
    const plano = planoOk(
      { valorTotal: 100000 as Cents, qtdParcelas: 10 },
      { novaQtdParcelas: 9 },
      pagas([1, 2, 3, 4, 5, 6, 7, 8], 10000),
    );

    expect(plano.canceladas).toEqual([{ numero: 10, valor: 0, competencia: "2026-10" }]);
    expect(plano.parcelas.map((p) => p.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(plano.parcelas[8]).toEqual({ numero: 9, valor: 20000, competencia: "2026-09" });
    expect(conserva(plano)).toBe(true);
  });

  it.each([0, 121])("rejeita nova quantidade de parcelas %p com QTD_PARCELAS_INVALIDA", (n) => {
    const resultado = regenerarParcelas(compra(), { novaQtdParcelas: n }, []);

    expect(resultado.ok).toBe(false);
    expect(resultado.ok === false && resultado.error.code).toBe("QTD_PARCELAS_INVALIDA");
  });
});

describe("regenerarParcelas — rejeições de valor", () => {
  it("rejeita novo total abaixo do já pago", () => {
    const resultado = regenerarParcelas(
      compra(),
      { novoValorTotal: 20000 as Cents },
      pagas([1, 2, 3], 10000),
    );

    expect(resultado.ok).toBe(false);
    expect(resultado.ok === false && resultado.error.code).toBe("VALOR_NAO_POSITIVO");
  });

  it("rejeita remanescente menor que o número de parcelas pendentes", () => {
    const resultado = regenerarParcelas(
      compra({ valorTotal: 120000 as Cents, qtdParcelas: 12 }),
      { novoValorTotal: 30005 as Cents },
      pagas([1, 2, 3], 10000),
    );

    expect(resultado.ok).toBe(false);
    expect(resultado.ok === false && resultado.error.code).toBe("PARCELA_INFERIOR_A_UM_CENTAVO");
  });
});
