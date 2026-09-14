import { describe, expect, it } from "vitest";
import { type Competencia, compararCompetencias, criarCompetencia } from "../shared/competencia";
import type { Cents } from "../shared/money";
import { isErr, isOk } from "../shared/result";
import type { EntradaCompra, PlanoParcelamento } from "../tipos";
import { gerarParcelas } from "./gerar-parcelas";

function comp(texto: string): Competencia {
  const resultado = criarCompetencia(texto);
  if (!isOk(resultado)) {
    throw new Error(`fixture inválida: ${texto}`);
  }
  return resultado.value;
}

function entrada(sobrescrever: Partial<EntradaCompra> = {}): EntradaCompra {
  return {
    modo: "TOTAL",
    valorEntrada: 100000 as Cents,
    qtdParcelas: 3,
    competenciaCompra: comp("2026-03"),
    parcelaInicial: 1,
    politicaResiduo: "PRIMEIRAS",
    ...sobrescrever,
  };
}

function planoOk(sobrescrever: Partial<EntradaCompra> = {}): PlanoParcelamento {
  const resultado = gerarParcelas(entrada(sobrescrever));
  if (!isOk(resultado)) {
    throw new Error(`esperava plano válido: ${JSON.stringify(resultado)}`);
  }
  return resultado.value;
}

/** Invariante dura: soma das parcelas persistidas + amortizado === total (PARC-02, AC 2). */
function conserva(plano: PlanoParcelamento): boolean {
  const somaParcelas = plano.parcelas.reduce((acumulado, p) => acumulado + p.valor, 0);
  return somaParcelas + plano.valorAmortizadoAnterior === plano.valorTotal;
}

describe("gerarParcelas — competências sequenciais", () => {
  it("R$ 1.000,00 em 3x na competência 2026-03 gera 2026-03, 2026-04 e 2026-05 (PARC-01, AC 1)", () => {
    const plano = planoOk();

    expect(plano.parcelas).toEqual([
      { numero: 1, valor: 33334, competencia: "2026-03" },
      { numero: 2, valor: 33333, competencia: "2026-04" },
      { numero: 3, valor: 33333, competencia: "2026-05" },
    ]);
    expect(plano.valorTotal).toBe(100000);
    expect(plano.valorAmortizadoAnterior).toBe(0);
    expect(conserva(plano)).toBe(true);
  });

  it("compra com competência 2026-11 em 5x termina em 2027-03 (COMP-01, AC 1)", () => {
    const plano = planoOk({ competenciaCompra: comp("2026-11"), qtdParcelas: 5 });

    expect(plano.parcelas.map((p) => p.competencia)).toEqual([
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
      "2027-03",
    ]);
    expect(conserva(plano)).toBe(true);
  });

  it("compra com competência 2026-11 em 24x termina em 2028-10, sem competência repetida (COMP-02, AC 2)", () => {
    const plano = planoOk({ competenciaCompra: comp("2026-11"), qtdParcelas: 24 });

    const competencias = plano.parcelas.map((p) => p.competencia);

    expect(competencias).toHaveLength(24);
    expect(competencias[23]).toBe("2028-10");
    expect(new Set(competencias).size).toBe(24);
    expect(conserva(plano)).toBe(true);
  });

  it("compra 1/1 gera uma parcela na competência da compra", () => {
    const plano = planoOk({ qtdParcelas: 1 });

    expect(plano.parcelas).toEqual([{ numero: 1, valor: 100000, competencia: "2026-03" }]);
    expect(conserva(plano)).toBe(true);
  });
});

describe("gerarParcelas — modo VALOR_PARCELA (PARC-04, AC 4)", () => {
  it("7790 × 10 gera total 77900 e dez parcelas idênticas, com resto zero", () => {
    const plano = planoOk({
      modo: "VALOR_PARCELA",
      valorEntrada: 7790 as Cents,
      qtdParcelas: 10,
    });

    expect(plano.valorTotal).toBe(77900);
    expect(plano.parcelas).toHaveLength(10);
    expect(plano.parcelas.map((p) => p.valor)).toEqual(Array.from({ length: 10 }, () => 7790));
    expect(new Set(plano.parcelas.map((p) => p.valor)).size).toBe(1);
    expect(conserva(plano)).toBe(true);
  });
});

describe("gerarParcelas — compra já em andamento (AD-005)", () => {
  /** 10 parcelas de R$ 60,00; a parcela 8 cai em 2026-03, logo a parcela 1 é 2025-08. */
  const compraOitoDeDez: Partial<EntradaCompra> = {
    modo: "VALOR_PARCELA",
    valorEntrada: 6000 as Cents,
    qtdParcelas: 10,
    parcelaInicial: 8,
    competenciaCompra: comp("2025-08"),
  };

  it("persiste exatamente as parcelas 8, 9 e 10 (PARC-06, AC 1)", () => {
    const plano = planoOk(compraOitoDeDez);

    expect(plano.parcelas).toEqual([
      { numero: 8, valor: 6000, competencia: "2026-03" },
      { numero: 9, valor: 6000, competencia: "2026-04" },
      { numero: 10, valor: 6000, competencia: "2026-05" },
    ]);
  });

  it("registra valorAmortizadoAnterior igual à soma das parcelas 1 a 7 (PARC-07, AC 2)", () => {
    const plano = planoOk(compraOitoDeDez);

    expect(plano.valorAmortizadoAnterior).toBe(42000);
    expect(plano.valorTotal).toBe(60000);
    expect(conserva(plano)).toBe(true);
  });

  it("gera zero parcelas em competências anteriores à da parcela inicial (PARC-07, AC 3)", () => {
    const plano = planoOk(compraOitoDeDez);

    const anteriores = plano.parcelas.filter(
      (p) => compararCompetencias(p.competencia, comp("2026-03")) < 0,
    );

    expect(anteriores).toEqual([]);
    expect(plano.parcelas.map((p) => p.numero)).toEqual([8, 9, 10]);
  });

  it("compra 10/10 gera exatamente uma parcela (PARC-08, AC 5)", () => {
    const plano = planoOk({
      modo: "VALOR_PARCELA",
      valorEntrada: 6000 as Cents,
      qtdParcelas: 10,
      parcelaInicial: 10,
      competenciaCompra: comp("2025-08"),
    });

    expect(plano.parcelas).toEqual([{ numero: 10, valor: 6000, competencia: "2026-05" }]);
    expect(plano.valorAmortizadoAnterior).toBe(54000);
    expect(conserva(plano)).toBe(true);
  });

  it("conserva a soma mesmo com resíduo e parcela inicial maior que 1 (PARC-02, AC 2)", () => {
    const plano = planoOk({ valorEntrada: 100001 as Cents, qtdParcelas: 7, parcelaInicial: 4 });

    expect(plano.parcelas.map((p) => p.valor)).toEqual([14286, 14286, 14286, 14285]);
    expect(plano.valorAmortizadoAnterior).toBe(42858);
    expect(conserva(plano)).toBe(true);
  });
});

describe("gerarParcelas — validações de entrada (PARC-05, PARC-08)", () => {
  it.each([0, 121])("rejeita qtdParcelas = %p com QTD_PARCELAS_INVALIDA (PARC-05, AC 6)", (n) => {
    const resultado = gerarParcelas(entrada({ qtdParcelas: n }));

    expect(isErr(resultado)).toBe(true);
    expect(isErr(resultado) && resultado.error.code).toBe("QTD_PARCELAS_INVALIDA");
    expect("value" in resultado).toBe(false);
  });

  it("rejeita total zero com VALOR_NAO_POSITIVO (PARC-05, AC 7)", () => {
    const resultado = gerarParcelas(entrada({ valorEntrada: 0 as Cents }));

    expect(isErr(resultado)).toBe(true);
    expect(isErr(resultado) && resultado.error.code).toBe("VALOR_NAO_POSITIVO");
    expect("value" in resultado).toBe(false);
  });

  it("rejeita n maior que o total em centavos com PARCELA_INFERIOR_A_UM_CENTAVO (PARC-05, AC 5)", () => {
    const resultado = gerarParcelas(entrada({ valorEntrada: 2 as Cents, qtdParcelas: 3 }));

    expect(isErr(resultado)).toBe(true);
    expect(isErr(resultado) && resultado.error.code).toBe("PARCELA_INFERIOR_A_UM_CENTAVO");
    expect("value" in resultado).toBe(false);
  });

  it("rejeita parcela inicial 11 com 10 parcelas, com PARCELA_INICIAL_INVALIDA (PARC-08, AC 6)", () => {
    const resultado = gerarParcelas(entrada({ qtdParcelas: 10, parcelaInicial: 11 }));

    expect(isErr(resultado)).toBe(true);
    expect(isErr(resultado) && resultado.error.code).toBe("PARCELA_INICIAL_INVALIDA");
    expect("value" in resultado).toBe(false);
  });

  it("rejeita parcela inicial 0, abaixo do intervalo válido, com PARCELA_INICIAL_INVALIDA", () => {
    const resultado = gerarParcelas(entrada({ qtdParcelas: 10, parcelaInicial: 0 }));

    expect(isErr(resultado)).toBe(true);
    expect(isErr(resultado) && resultado.error.code).toBe("PARCELA_INICIAL_INVALIDA");
    expect("value" in resultado).toBe(false);
  });
});
