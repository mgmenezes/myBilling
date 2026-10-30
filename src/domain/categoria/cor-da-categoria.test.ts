import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  CORES_DE_CATEGORIA,
  type CorDeCategoria,
  corAutomatica,
  corDaCategoria,
  ehCorDeCategoria,
} from "./cor-da-categoria";

/**
 * Testes derivados de COR-01 (ACs 1 a 3), do Edge Case "nome normalizado
 * vazio" e do Done-when de T1.
 *
 * O que se prende aqui é o contrato da cor, não o hash: a paleta fechada, a
 * automática estável para o mesmo nome escrito de jeitos diferentes, e a
 * escolhida vencendo a automática. Nomes genéricos (AD-009).
 */

describe("a paleta fechada (COR-01, AC 1)", () => {
  it("são exatamente dez cores, nesta ordem", () => {
    expect(CORES_DE_CATEGORIA).toEqual([
      "vermelho",
      "laranja",
      "ambar",
      "verde",
      "verde-agua",
      "ciano",
      "azul",
      "roxo",
      "rosa",
      "marrom",
    ]);
  });
});

describe("ehCorDeCategoria", () => {
  it.each(CORES_DE_CATEGORIA.map((cor) => [cor]))("aceita %p", (cor) => {
    expect(ehCorDeCategoria(cor)).toBe(true);
  });

  /* A grafia gravada é a do código: sem acento, minúscula, com hífen. */
  it.each([["dourado"], [""], ["Verde"], ["âmbar"], ["verde_agua"], [" verde"], ["verde-água"]])(
    "recusa %p",
    (valor) => {
      expect(ehCorDeCategoria(valor)).toBe(false);
    },
  );
});

describe("a cor automática (COR-01, AC 3)", () => {
  it("é sempre uma das dez", () => {
    fc.assert(
      fc.property(fc.string(), (nome) => {
        expect(CORES_DE_CATEGORIA).toContain(corAutomatica(nome));
      }),
    );
  });

  it("é a mesma para nomes que diferem só em caixa", () => {
    const base = corAutomatica("Categoria Um");

    expect(corAutomatica("categoria um")).toBe(base);
    expect(corAutomatica("CATEGORIA UM")).toBe(base);
    expect(corAutomatica("cAtEgOrIa uM")).toBe(base);
  });

  it("é a mesma para nomes que diferem só em acento", () => {
    const base = corAutomatica("Categoria Três");

    expect(corAutomatica("Categoria Tres")).toBe(base);
    expect(corAutomatica("CATEGORIA TRÊS")).toBe(base);
    /* O mesmo "ê" decomposto: letra e acento combinante, como chega de alguns teclados. */
    expect(corAutomatica("Categoria Três")).toBe(base);
    expect(corAutomatica("Çàtégõríâ Trës")).toBe(corAutomatica("Categoria Tres"));
  });

  it("é a mesma para nomes que diferem só em espaços", () => {
    const base = corAutomatica("Categoria Um");

    expect(corAutomatica("  Categoria Um  ")).toBe(base);
    expect(corAutomatica("Categoria    Um")).toBe(base);
    expect(corAutomatica("Categoria\tUm\n")).toBe(base);
  });

  it("caixa, acento e espaços juntos, para qualquer nome", () => {
    const COM_ACENTO: Record<string, string> = { a: "á", e: "ê", i: "í", o: "õ", u: "ü", c: "ç" };
    const palavra = fc.stringMatching(/^[a-z]{1,8}$/);

    fc.assert(
      fc.property(fc.array(palavra, { minLength: 1, maxLength: 4 }), (palavras) => {
        const simples = palavras.join(" ");
        const variante = `  ${palavras
          .map((p) => [...p].map((letra) => COM_ACENTO[letra] ?? letra).join(""))
          .join("   ")
          .toUpperCase()} `;

        expect(corAutomatica(variante)).toBe(corAutomatica(simples));
      }),
    );
  });

  it("é derivada do nome: nomes diferentes alcançam as dez cores", () => {
    const nomes = Array.from({ length: 200 }, (_, n) => `Categoria ${n + 1}`);

    expect(new Set(nomes.map(corAutomatica))).toEqual(new Set(CORES_DE_CATEGORIA));
  });

  it("dá a mesma resposta a cada chamada, sem estado escondido", () => {
    const nomes = ["Categoria Um", "Categoria Dois", "Categoria Três"];
    const primeira = nomes.map(corAutomatica);

    expect([...nomes].reverse().map(corAutomatica).reverse()).toEqual(primeira);
    expect(nomes.map(corAutomatica)).toEqual(primeira);
  });
});

describe("nome normalizado vazio (Edge Case)", () => {
  it.each([[""], ["   "], ["\t\n"]])("%p dá a primeira cor da lista", (nome) => {
    expect(corAutomatica(nome)).toBe("vermelho");
  });
});

describe("a cor efetiva (COR-01, ACs 2 e 3)", () => {
  it.each(CORES_DE_CATEGORIA.map((cor) => [cor]))(
    "a escolhida %p vence a automática",
    (cor: CorDeCategoria) => {
      expect(corDaCategoria({ nome: "Categoria Um", cor })).toBe(cor);
    },
  );

  it("sem escolha, é a automática do nome", () => {
    for (const nome of ["Categoria Um", "Categoria Dois", "Categoria Três", ""]) {
      expect(corDaCategoria({ nome, cor: null })).toBe(corAutomatica(nome));
    }
  });
});
