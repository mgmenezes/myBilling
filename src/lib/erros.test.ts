import { describe, expect, it } from "vitest";
import { mensagemDoErro } from "./erros";

describe("mensagemDoErro — o ciclo do meio de pagamento (CADCOL-07, AC 11)", () => {
  it("CICLO_NAO_CORRESPONDE_AO_TIPO diz que os dias existem só no cartão", () => {
    expect(mensagemDoErro("CICLO_NAO_CORRESPONDE_AO_TIPO")).toBe(
      "Dia de fechamento e de vencimento existem só no cartão de crédito, e nele são obrigatórios.",
    );
  });
});
