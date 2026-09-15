import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { entradaLancamentoAvulsoSchema } from "./lancamento-avulso.schema";

/** Testes derivados de AVUL-01 (AC 2 a 5), AVUL-02 (AC 2) e dos edge cases. */

const VALIDO = {
  descricao: "Almoço",
  natureza: "DESPESA" as const,
  valorCentavos: 3250,
  competencia: "2026-03",
  dataEvento: "2026-03-10",
  categoriaId: "11111111-1111-4111-8111-111111111111",
  usuarioId: "22222222-2222-4222-8222-222222222222",
  meioPagamentoId: "33333333-3333-4333-8333-333333333333",
  jaPago: false,
};

/** O campo do primeiro problema encontrado, para asserir onde o erro cai. */
function campoComErro(payload: unknown): string | undefined {
  const resultado = entradaLancamentoAvulsoSchema.safeParse(payload);
  if (resultado.success) {
    return undefined;
  }
  return resultado.error.issues[0]?.path.join(".");
}

describe("entradaLancamentoAvulsoSchema — aceita o payload completo", () => {
  it("valida o caso mínimo, com categoria nula", () => {
    const resultado = entradaLancamentoAvulsoSchema.safeParse({
      ...VALIDO,
      categoriaId: null,
    });

    expect(resultado.success).toBe(true);
  });

  it("apara espaço em volta da descrição", () => {
    const resultado = entradaLancamentoAvulsoSchema.safeParse({
      ...VALIDO,
      descricao: "  Almoço  ",
    });

    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.descricao).toBe("Almoço");
    }
  });
});

describe("entradaLancamentoAvulsoSchema — descrição (AVUL-01, AC 2)", () => {
  it("recusa descrição vazia", () => {
    expect(campoComErro({ ...VALIDO, descricao: "" })).toBe("descricao");
  });

  it("recusa descrição com só espaço, que apara para vazio", () => {
    expect(campoComErro({ ...VALIDO, descricao: "   " })).toBe("descricao");
  });

  it("aceita 120 caracteres e recusa 121", () => {
    expect(
      entradaLancamentoAvulsoSchema.safeParse({ ...VALIDO, descricao: "a".repeat(120) }).success,
    ).toBe(true);
    expect(campoComErro({ ...VALIDO, descricao: "a".repeat(121) })).toBe("descricao");
  });
});

describe("entradaLancamentoAvulsoSchema — valor (AVUL-01, AC 3)", () => {
  it("recusa zero", () => {
    expect(campoComErro({ ...VALIDO, valorCentavos: 0 })).toBe("valorCentavos");
  });

  it("recusa negativo", () => {
    expect(campoComErro({ ...VALIDO, valorCentavos: -1 })).toBe("valorCentavos");
  });

  it("recusa fração de centavo", () => {
    expect(campoComErro({ ...VALIDO, valorCentavos: 32.5 })).toBe("valorCentavos");
  });

  it("aceita um centavo, que é o menor valor válido", () => {
    expect(entradaLancamentoAvulsoSchema.safeParse({ ...VALIDO, valorCentavos: 1 }).success).toBe(
      true,
    );
  });

  it("recusa valor acima do inteiro seguro, que chegaria ao bigint com precisão perdida", () => {
    expect(campoComErro({ ...VALIDO, valorCentavos: Number.MAX_SAFE_INTEGER + 2 })).toBe(
      "valorCentavos",
    );
  });
});

describe("entradaLancamentoAvulsoSchema — competência e data (AVUL-01, AC 4 e 5)", () => {
  it("recusa competência com dia", () => {
    expect(campoComErro({ ...VALIDO, competencia: "2026-03-01" })).toBe("competencia");
  });

  it("recusa competência com mês inexistente", () => {
    expect(campoComErro({ ...VALIDO, competencia: "2026-13" })).toBe("competencia");
  });

  it("recusa data sem dia", () => {
    expect(campoComErro({ ...VALIDO, dataEvento: "2026-03" })).toBe("dataEvento");
  });

  it("recusa data em formato brasileiro", () => {
    expect(campoComErro({ ...VALIDO, dataEvento: "10/03/2026" })).toBe("dataEvento");
  });
});

describe("entradaLancamentoAvulsoSchema — natureza (AVUL-02, AC 2)", () => {
  it("aceita despesa e receita", () => {
    expect(
      entradaLancamentoAvulsoSchema.safeParse({ ...VALIDO, natureza: "DESPESA" }).success,
    ).toBe(true);
    expect(
      entradaLancamentoAvulsoSchema.safeParse({ ...VALIDO, natureza: "RECEITA" }).success,
    ).toBe(true);
  });

  it("recusa investimento, que nenhum formulário do app oferece", () => {
    expect(campoComErro({ ...VALIDO, natureza: "INVESTIMENTO" })).toBe("natureza");
  });
});

describe("entradaLancamentoAvulsoSchema — referências e marca de pago", () => {
  it("recusa meio de pagamento que não é uuid", () => {
    expect(campoComErro({ ...VALIDO, meioPagamentoId: "cartao-roxo" })).toBe("meioPagamentoId");
  });

  it("recusa pessoa ausente", () => {
    const { usuarioId: _, ...semPessoa } = VALIDO;
    expect(campoComErro(semPessoa)).toBe("usuarioId");
  });

  it("recusa categoria que não é uuid nem nula", () => {
    expect(campoComErro({ ...VALIDO, categoriaId: "mercado" })).toBe("categoriaId");
  });

  it("exige jaPago explícito: ausente é erro, não falso por omissão", () => {
    const { jaPago: _, ...semMarca } = VALIDO;
    expect(campoComErro(semMarca)).toBe("jaPago");
  });
});

describe("fronteira do schema (AUTH-02, AC 4)", () => {
  it("é importável pelo cliente e pelo servidor: só depende de zod e do domínio", () => {
    const fonte = readFileSync(new URL("./lancamento-avulso.schema.ts", import.meta.url), "utf8");
    const importados = [...fonte.matchAll(/from "([^"]+)"/g)].map((m) => m[1]);

    expect(importados).toEqual(expect.arrayContaining(["zod", "@/domain"]));
    expect(importados.every((modulo) => modulo === "zod" || modulo === "@/domain")).toBe(true);
  });
});
