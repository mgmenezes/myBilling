import { describe, expect, it } from "vitest";
import { normalizarNome, parcelaDaCelula, valorDaCelula } from "./celula";

describe("valorDaCelula — o valor da célula em centavos (IMP-01)", () => {
  it("lê R$ 1.234,56 como exatamente 123456 centavos (AC 13)", () => {
    expect(valorDaCelula("R$ 1.234,56")).toEqual({ ok: true, value: 123456 });
  });

  it("aceita o espaço não separável entre R$ e o número", () => {
    expect(valorDaCelula("R$ 1.398,00")).toEqual({ ok: true, value: 139800 });
  });

  it.each([
    ["R$10,00", 1000],
    ["R$ 1.234.567,89", 123456789],
    ["10", 1000],
  ])("lê %p como %p centavos", (texto, centavos) => {
    expect(valorDaCelula(texto)).toEqual({ ok: true, value: centavos });
  });

  it("recusa valor negativo com VALOR_INVALIDO", () => {
    expect(valorDaCelula("-R$ 10,00")).toEqual({ ok: false, error: "VALOR_INVALIDO" });
  });

  it("separa o zero do inválido: R$ 0,00 é VALOR_ZERO (AC 18)", () => {
    expect(valorDaCelula("R$ 0,00")).toEqual({ ok: false, error: "VALOR_ZERO" });
  });

  it.each([[""], ["   "]])("célula %p é VALOR_VAZIO (AC 9)", (texto) => {
    expect(valorDaCelula(texto)).toEqual({ ok: false, error: "VALOR_VAZIO" });
  });

  it("texto que não é dinheiro, como 200*, é VALOR_INVALIDO (AC 10)", () => {
    expect(valorDaCelula("200*")).toEqual({ ok: false, error: "VALOR_INVALIDO" });
  });
});

describe("parcelaDaCelula — a coluna Parcelas no formato n/t (IMP-01 AC 11)", () => {
  it.each([
    ["7/10", { numero: 7, total: 10 }],
    [" 3/3 ", { numero: 3, total: 3 }],
  ])("lê %p", (texto, parcela) => {
    expect(parcelaDaCelula(texto)).toEqual({ ok: true, value: parcela });
  });

  it.each([["12/10"], ["0/3"], ["3/121"], ["3-10"], [""]])(
    "recusa %p com PARCELA_INVALIDA",
    (texto) => {
      expect(parcelaDaCelula(texto)).toEqual({ ok: false, error: "PARCELA_INVALIDA" });
    },
  );
});

describe("normalizarNome — a chave que compara nomes entre linhas e abas", () => {
  it("tira os espaços das pontas, reduz os internos a um e passa a minúsculas", () => {
    expect(normalizarNome("  Cartão   Roxo ")).toBe("cartão roxo");
  });

  it("dá a mesma chave para nomes que diferem só em caixa", () => {
    expect(normalizarNome("MERCADO")).toBe(normalizarNome("Mercado"));
    expect(normalizarNome("MERCADO")).toBe("mercado");
  });
});
