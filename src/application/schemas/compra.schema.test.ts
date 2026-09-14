import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { entradaCompraSchema } from "./compra.schema";

/**
 * Testes derivados de PARC-05 (AC 6 e AC 7) e do Done-when de T47. O schema é
 * a barreira de formato; a regra financeira continua sendo do domínio.
 */

const VALIDA = {
  idempotencyKey: "6f1c1b3e-3a2d-4c5b-8e7f-9a0b1c2d3e4f",
  descricao: "Compra parcelada A",
  modo: "TOTAL",
  valorCentavos: 100000,
  qtdParcelas: 3,
  parcelaInicial: 1,
  competenciaInicial: "2026-03",
  politicaResiduo: "PRIMEIRAS",
  categoriaId: null,
  usuarioId: "11111111-1111-4111-8111-111111111111",
  meioPagamentoId: "22222222-2222-4222-8222-222222222222",
  dataEvento: "2026-03-04",
} as const;

function camposComErro(entrada: unknown): string[] {
  const resultado = entradaCompraSchema.safeParse(entrada);
  if (resultado.success) {
    return [];
  }
  return resultado.error.issues.map((issue) => issue.path.join("."));
}

describe("entradaCompraSchema", () => {
  it("aceita uma compra bem formada e devolve os campos tipados", () => {
    const resultado = entradaCompraSchema.safeParse(VALIDA);

    expect(resultado.success).toBe(true);
    expect(resultado.data?.valorCentavos).toBe(100000);
    expect(resultado.data?.competenciaInicial).toBe("2026-03");
    expect(resultado.data?.qtdParcelas).toBe(3);
  });

  it("rejeita quantidade de parcelas menor que 1 (PARC-05, AC 6)", () => {
    expect(camposComErro({ ...VALIDA, qtdParcelas: 0 })).toContain("qtdParcelas");
  });

  it("rejeita quantidade de parcelas maior que 120 (PARC-05, AC 6)", () => {
    expect(camposComErro({ ...VALIDA, qtdParcelas: 121 })).toContain("qtdParcelas");
    expect(entradaCompraSchema.safeParse({ ...VALIDA, qtdParcelas: 120 }).success).toBe(true);
  });

  it("rejeita quantidade de parcelas fracionária (PARC-05, AC 6)", () => {
    expect(camposComErro({ ...VALIDA, qtdParcelas: 2.5 })).toContain("qtdParcelas");
  });

  it("rejeita valor zero e valor negativo (PARC-05, AC 7)", () => {
    expect(camposComErro({ ...VALIDA, valorCentavos: 0 })).toContain("valorCentavos");
    expect(camposComErro({ ...VALIDA, valorCentavos: -1 })).toContain("valorCentavos");
  });

  it("rejeita valor monetário fracionário: dinheiro é inteiro em centavos (AD-001)", () => {
    expect(camposComErro({ ...VALIDA, valorCentavos: 19.99 })).toContain("valorCentavos");
  });

  it("rejeita competência fora do formato AAAA-MM", () => {
    expect(camposComErro({ ...VALIDA, competenciaInicial: "2026-13" })).toContain(
      "competenciaInicial",
    );
    expect(camposComErro({ ...VALIDA, competenciaInicial: "03/2026" })).toContain(
      "competenciaInicial",
    );
    expect(camposComErro({ ...VALIDA, competenciaInicial: "2026-3" })).toContain(
      "competenciaInicial",
    );
  });

  it("rejeita parcela inicial menor que 1", () => {
    expect(camposComErro({ ...VALIDA, parcelaInicial: 0 })).toContain("parcelaInicial");
  });

  it("exige a chave de idempotência (PARC-05, AC 9)", () => {
    const { idempotencyKey: _omitida, ...semChave } = VALIDA;
    expect(camposComErro(semChave)).toContain("idempotencyKey");
    expect(camposComErro({ ...VALIDA, idempotencyKey: "nao-e-uuid" })).toContain("idempotencyKey");
  });

  it("rejeita descrição vazia e aceita categoria nula", () => {
    expect(camposComErro({ ...VALIDA, descricao: "   " })).toContain("descricao");
    expect(entradaCompraSchema.safeParse({ ...VALIDA, categoriaId: null }).success).toBe(true);
  });

  it("rejeita modo e política de resíduo fora da união fechada", () => {
    expect(camposComErro({ ...VALIDA, modo: "PARCELADO" })).toContain("modo");
    expect(camposComErro({ ...VALIDA, politicaResiduo: "MEIO" })).toContain("politicaResiduo");
  });

  it("rejeita data de evento fora do formato AAAA-MM-DD", () => {
    expect(camposComErro({ ...VALIDA, dataEvento: "04/03/2026" })).toContain("dataEvento");
  });

  it("é importável pelo cliente e pelo servidor: só depende de zod e do domínio", () => {
    const fonte = readFileSync(new URL("./compra.schema.ts", import.meta.url), "utf8");
    const importados = [...fonte.matchAll(/from "([^"]+)"/g)].map((m) => m[1]);

    expect(importados).toEqual(expect.arrayContaining(["zod", "@/domain"]));
    expect(importados.every((modulo) => modulo === "zod" || modulo === "@/domain")).toBe(true);
  });
});
