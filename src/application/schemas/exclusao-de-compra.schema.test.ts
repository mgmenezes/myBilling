import { describe, expect, it } from "vitest";
import { entradaExclusaoDeCompraSchema } from "./exclusao-de-compra.schema";

/** Derivado de EXC-05 AC 2: `{ lancamentoId }` com um uuid, sem campo a mais. */

const LANCAMENTO = "11111111-1111-4111-8111-111111111111";

describe("entrada da exclusão de compra (EXC-05 AC 2)", () => {
  it("aceita lancamentoId uuid", () => {
    const resultado = entradaExclusaoDeCompraSchema.safeParse({ lancamentoId: LANCAMENTO });

    expect(resultado.data).toEqual({ lancamentoId: LANCAMENTO });
  });

  it.each([
    ["lancamentoId ausente", {}],
    ["lancamentoId vazio", { lancamentoId: "" }],
    ["lancamentoId que não é uuid", { lancamentoId: "compra-1#2" }],
    ["campo a mais", { lancamentoId: LANCAMENTO, numeros: [2, 3, 4] }],
  ])("recusa %s", (_, payload) => {
    expect(entradaExclusaoDeCompraSchema.safeParse(payload).success).toBe(false);
  });
});
