import { describe, expect, it } from "vitest";
import type { Natureza } from "../tipos";
import { alcanceDaTroca } from "./alcance-da-troca";

/**
 * Derivado de TRC-03 AC 1, 3 e 4 (até onde a troca vai) e TRC-05 AC 4 (entrada
 * não tem categoria). A regra só olha natureza e os dois vínculos.
 */

function lancamento(
  natureza: Natureza,
  vinculos: { recorrenciaId?: string | null; compraId?: string | null } = {},
) {
  return {
    natureza,
    recorrenciaId: vinculos.recorrenciaId ?? null,
    compraId: vinculos.compraId ?? null,
  };
}

describe("alcanceDaTroca: gastos (TRC-03 AC 1, 3 e 4)", () => {
  it.each(["DESPESA", "INVESTIMENTO"] as const)(
    "%s ocorrência de fixo troca o fixo inteiro: FIXO",
    (natureza) => {
      expect(alcanceDaTroca(lancamento(natureza, { recorrenciaId: "rec-1" }))).toEqual({
        ok: true,
        value: "FIXO",
      });
    },
  );

  it.each(["DESPESA", "INVESTIMENTO"] as const)(
    "%s parcela de compra troca a compra inteira: COMPRA",
    (natureza) => {
      expect(alcanceDaTroca(lancamento(natureza, { compraId: "compra-1" }))).toEqual({
        ok: true,
        value: "COMPRA",
      });
    },
  );

  it.each(["DESPESA", "INVESTIMENTO"] as const)(
    "%s sem fixo nem compra troca só ele: LANCAMENTO",
    (natureza) => {
      expect(alcanceDaTroca(lancamento(natureza))).toEqual({ ok: true, value: "LANCAMENTO" });
    },
  );

  it("com os dois vínculos, o fixo vence: FIXO", () => {
    expect(
      alcanceDaTroca(lancamento("DESPESA", { recorrenciaId: "rec-1", compraId: "compra-1" })),
    ).toEqual({ ok: true, value: "FIXO" });
  });
});

describe("alcanceDaTroca: entrada não tem categoria (TRC-05 AC 4)", () => {
  it.each([
    ["sem vínculo", lancamento("RECEITA")],
    ["ocorrência de fixo", lancamento("RECEITA", { recorrenciaId: "rec-1" })],
  ])("receita %s é recusada com CATEGORIA_EM_RECEITA", (_, entrada) => {
    expect(alcanceDaTroca(entrada)).toEqual({
      ok: false,
      error: { code: "CATEGORIA_EM_RECEITA" },
    });
  });
});
