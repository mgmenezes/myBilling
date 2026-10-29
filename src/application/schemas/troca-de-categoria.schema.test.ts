import { describe, expect, it } from "vitest";
import { entradaTrocaDeCategoriaSchema } from "./troca-de-categoria.schema";

/** Derivado de TRC-05 AC 5: `lancamentoId` uuid, `categoriaId` uuid ou nulo, e nada mais. */

const LANCAMENTO = "11111111-1111-4111-8111-111111111111";
const CATEGORIA = "22222222-2222-4222-8222-222222222222";

describe("entrada da troca de categoria (TRC-05 AC 5)", () => {
  it("aceita lancamentoId uuid com categoriaId uuid", () => {
    const resultado = entradaTrocaDeCategoriaSchema.safeParse({
      lancamentoId: LANCAMENTO,
      categoriaId: CATEGORIA,
    });

    expect(resultado.data).toEqual({ lancamentoId: LANCAMENTO, categoriaId: CATEGORIA });
  });

  it("aceita categoriaId nulo, que é escolher Sem categoria", () => {
    const resultado = entradaTrocaDeCategoriaSchema.safeParse({
      lancamentoId: LANCAMENTO,
      categoriaId: null,
    });

    expect(resultado.data).toEqual({ lancamentoId: LANCAMENTO, categoriaId: null });
  });

  it.each([
    ["lancamentoId ausente", { categoriaId: CATEGORIA }],
    ["lancamentoId que não é uuid", { lancamentoId: "mov-1", categoriaId: CATEGORIA }],
    ["categoriaId ausente", { lancamentoId: LANCAMENTO }],
    ["categoriaId que não é uuid", { lancamentoId: LANCAMENTO, categoriaId: "cat-1" }],
    ["categoriaId vazio", { lancamentoId: LANCAMENTO, categoriaId: "" }],
    ["campo a mais", { lancamentoId: LANCAMENTO, categoriaId: CATEGORIA, competencia: "2026-02" }],
  ])("recusa %s", (_, payload) => {
    expect(entradaTrocaDeCategoriaSchema.safeParse(payload).success).toBe(false);
  });

  it("recusa payload que não é objeto", () => {
    expect(entradaTrocaDeCategoriaSchema.safeParse(LANCAMENTO).success).toBe(false);
  });
});
