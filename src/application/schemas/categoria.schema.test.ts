import { describe, expect, it } from "vitest";
import { entradaCategoriaSchema, MAX_NOME_CATEGORIA } from "./categoria.schema";

/**
 * O que este schema protege é a lista de categorias de encher de gêmeas
 * invisíveis. Nome com espaço sobrando ou espaço duplo produz duas entradas
 * que a pessoa lê como a mesma coisa, e a diferença é impossível de ver na
 * tela — o nome precisa chegar normalizado ao banco, não "quase".
 */

function analisar(nome: unknown) {
  return entradaCategoriaSchema.safeParse({ nome });
}

describe("nome da categoria", () => {
  it("aceita um nome simples", () => {
    const resultado = analisar("Mercado");

    expect(resultado.success).toBe(true);
    expect(resultado.data?.nome).toBe("Mercado");
  });

  it("remove espaço nas pontas", () => {
    expect(analisar("  Mercado  ").data?.nome).toBe("Mercado");
  });

  it("colapsa espaço interno repetido", () => {
    expect(analisar("Casa  e   jardim").data?.nome).toBe("Casa e jardim");
  });

  it("trata quebra de linha e tabulação como espaço", () => {
    expect(analisar("Casa\te\njardim").data?.nome).toBe("Casa e jardim");
  });

  it("rejeita nome vazio", () => {
    const resultado = analisar("");

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toBe("Informe o nome da categoria.");
  });

  it("rejeita nome só de espaço, e não o conta como preenchido", () => {
    const resultado = analisar("     ");

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toBe("Informe o nome da categoria.");
  });

  it("aceita exatamente o limite de caracteres", () => {
    expect(analisar("a".repeat(MAX_NOME_CATEGORIA)).success).toBe(true);
  });

  it("rejeita um caractere além do limite", () => {
    const resultado = analisar("a".repeat(MAX_NOME_CATEGORIA + 1));

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toContain(String(MAX_NOME_CATEGORIA));
  });

  it("mede o limite depois de normalizar, não antes", () => {
    // 60 letras mais espaço sobrando: passa, porque o espaço sai primeiro.
    expect(analisar(`  ${"a".repeat(MAX_NOME_CATEGORIA)}  `).success).toBe(true);
  });

  it("rejeita o que não é texto", () => {
    expect(analisar(42).success).toBe(false);
    expect(analisar(null).success).toBe(false);
    expect(analisar(undefined).success).toBe(false);
  });
});
