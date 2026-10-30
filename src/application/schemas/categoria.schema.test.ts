import { describe, expect, it } from "vitest";
import { CORES_DE_CATEGORIA } from "@/domain";
import {
  entradaCategoriaSchema,
  entradaCorDaCategoriaSchema,
  entradaRenomearCategoriaSchema,
  MAX_NOME_CATEGORIA,
} from "./categoria.schema";

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

/**
 * Testes derivados de COR-04 (ACs 4 a 6), COR-01 (AC 4) e do Done-when de T8.
 * Os dois payloads da tela de Categorias são estritos: a troca de cor só muda
 * a cor, e renomear só muda o nome. Um campo a mais que o servidor ignorasse
 * calado daria a impressão de ter mudado outra coisa.
 */

const CATEGORIA = "11111111-1111-4111-8111-111111111111";

describe("trocar a cor da categoria", () => {
  it.each(CORES_DE_CATEGORIA.map((cor) => [cor]))("aceita %s, uma das dez", (cor) => {
    const resultado = entradaCorDaCategoriaSchema.safeParse({ categoriaId: CATEGORIA, cor });

    expect(resultado.success).toBe(true);
    expect(resultado.data).toEqual({ categoriaId: CATEGORIA, cor });
  });

  it("aceita cor nula, que é a volta à automática (COR-04, AC 5)", () => {
    const resultado = entradaCorDaCategoriaSchema.safeParse({ categoriaId: CATEGORIA, cor: null });

    expect(resultado.success).toBe(true);
    expect(resultado.data).toEqual({ categoriaId: CATEGORIA, cor: null });
  });

  it("recusa cor fora das dez, inclusive com acento ou em maiúscula (COR-01, AC 4)", () => {
    for (const cor of ["dourado", "âmbar", "Verde", "#45a24d", ""]) {
      const resultado = entradaCorDaCategoriaSchema.safeParse({ categoriaId: CATEGORIA, cor });

      expect(resultado.success).toBe(false);
      expect(resultado.error?.issues[0]?.path).toEqual(["cor"]);
    }
  });

  it("recusa payload sem a cor: ausente não é o mesmo que automática", () => {
    const resultado = entradaCorDaCategoriaSchema.safeParse({ categoriaId: CATEGORIA });

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.path).toEqual(["cor"]);
  });

  it("recusa id que não é uuid", () => {
    const resultado = entradaCorDaCategoriaSchema.safeParse({ categoriaId: "1", cor: "verde" });

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.path).toEqual(["categoriaId"]);
  });

  it("recusa chave a mais", () => {
    const resultado = entradaCorDaCategoriaSchema.safeParse({
      categoriaId: CATEGORIA,
      cor: "verde",
      nome: "Categoria Dez",
    });

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.code).toBe("unrecognized_keys");
  });
});

describe("renomear a categoria", () => {
  it("aceita o nome novo, normalizado como no cadastro (COR-04, AC 6)", () => {
    const resultado = entradaRenomearCategoriaSchema.safeParse({
      categoriaId: CATEGORIA,
      nome: "  Categoria   Dez ",
    });

    expect(resultado.success).toBe(true);
    expect(resultado.data).toEqual({ categoriaId: CATEGORIA, nome: "Categoria Dez" });
  });

  it("recusa nome vazio com a mensagem do cadastro", () => {
    const resultado = entradaRenomearCategoriaSchema.safeParse({
      categoriaId: CATEGORIA,
      nome: "   ",
    });

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.path).toEqual(["nome"]);
    expect(resultado.error?.issues[0]?.message).toBe("Informe o nome da categoria.");
  });

  it("recusa nome além do limite", () => {
    const resultado = entradaRenomearCategoriaSchema.safeParse({
      categoriaId: CATEGORIA,
      nome: "a".repeat(MAX_NOME_CATEGORIA + 1),
    });

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.path).toEqual(["nome"]);
  });

  it("recusa id que não é uuid", () => {
    const resultado = entradaRenomearCategoriaSchema.safeParse({
      categoriaId: "1",
      nome: "Categoria Dez",
    });

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.path).toEqual(["categoriaId"]);
  });

  it("recusa chave a mais: renomear não troca a cor", () => {
    const resultado = entradaRenomearCategoriaSchema.safeParse({
      categoriaId: CATEGORIA,
      nome: "Categoria Dez",
      cor: "verde",
    });

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.code).toBe("unrecognized_keys");
  });
});
