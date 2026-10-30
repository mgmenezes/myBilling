import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CORES_DE_CATEGORIA } from "@/domain";
import { CLASSES_DA_COR } from "./cor-de-categoria";

/**
 * Testes derivados de COR-02 (ACs 1 a 3) e do Done-when de T3.
 *
 * Os hex **não** são copiados para cá: o teste lê `globals.css`, a mesma
 * folha que o navegador recebe, e refaz a conta de contraste da WCAG. Quem
 * mudar um tom e reprovar o contraste vê este teste falhar, sem precisar
 * lembrar de atualizar uma tabela.
 */

const RAIZ = join(__dirname, "..", "..");
const CSS = readFileSync(join(RAIZ, "src", "app", "globals.css"), "utf-8");
const FONTE_DO_MAPA = readFileSync(join(__dirname, "cor-de-categoria.ts"), "utf-8");

type Tema = "claro" | "escuro";
const TEMAS: ReadonlyArray<Tema> = ["claro", "escuro"];

/** `--nome: light-dark(#claro, #escuro);` declarado na folha, com os dois hex. */
function token(nome: string): Record<Tema, string> {
  const casamento = new RegExp(
    `${nome}:\\s*light-dark\\(\\s*(#[0-9a-f]{6})\\s*,\\s*(#[0-9a-f]{6})\\s*\\)`,
    "i",
  ).exec(CSS);
  if (casamento?.[1] === undefined || casamento[2] === undefined) {
    throw new Error(`${nome} não está declarado com light-dark(#claro, #escuro) em globals.css`);
  }
  return { claro: casamento[1], escuro: casamento[2] };
}

/** Luminância relativa da WCAG 2.x, a partir do hex sRGB. */
function luminancia(hex: string): number {
  const canal = (posicao: number): number => {
    const valor = Number.parseInt(hex.slice(posicao, posicao + 2), 16) / 255;
    return valor <= 0.04045 ? valor / 12.92 : ((valor + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
}

function contraste(a: string, b: string): number {
  const [clara, escura] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number];
  return (clara + 0.05) / (escura + 0.05);
}

describe("a conta de contraste do teste", () => {
  /* Os pares de referência da WCAG: sem eles, um erro na fórmula deixaria
     todo o resto passar. */
  it("dá 21:1 para preto sobre branco e 1:1 para a mesma cor", () => {
    expect(contraste("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contraste("#5b616e", "#5b616e")).toBe(1);
  });
});

describe("os tokens da paleta (COR-02, AC 1)", () => {
  it.each(CORES_DE_CATEGORIA.map((cor) => [cor]))(
    "%s tem fundo, texto e barra, em claro e escuro, expostos ao Tailwind",
    (cor) => {
      for (const papel of ["fundo", "texto", "barra"]) {
        const valores = token(`--cat-${cor}-${papel}`);
        expect(valores.claro).toMatch(/^#[0-9a-f]{6}$/i);
        expect(valores.escuro).toMatch(/^#[0-9a-f]{6}$/i);
        expect(CSS).toContain(`--color-cat-${cor}-${papel}: var(--cat-${cor}-${papel});`);
      }
    },
  );
});

describe("texto sobre o fundo, nos dois temas (COR-02, AC 2)", () => {
  it.each(CORES_DE_CATEGORIA.flatMap((cor) => TEMAS.map((tema) => [cor, tema] as const)))(
    "%s no tema %s passa de 4,5:1",
    (cor, tema) => {
      const fundo = token(`--cat-${cor}-fundo`)[tema];
      const texto = token(`--cat-${cor}-texto`)[tema];

      expect(contraste(texto, fundo)).toBeGreaterThanOrEqual(4.5);
    },
  );
});

describe("a barra sobre o fundo do gráfico, nos dois temas (COR-02, AC 3)", () => {
  /* O gráfico fica direto no canvas da página, sem cartão. */
  const canvas = token("--canvas");

  it("o canvas é o branco e o quase preto do sistema", () => {
    expect(canvas).toEqual({ claro: "#ffffff", escuro: "#0a0b0d" });
  });

  it.each(CORES_DE_CATEGORIA.flatMap((cor) => TEMAS.map((tema) => [cor, tema] as const)))(
    "%s no tema %s passa de 3:1",
    (cor, tema) => {
      const barra = token(`--cat-${cor}-barra`)[tema];

      expect(contraste(barra, canvas[tema])).toBeGreaterThanOrEqual(3);
    },
  );
});

describe("CLASSES_DA_COR", () => {
  it("tem uma entrada por cor da paleta, e nenhuma a mais", () => {
    expect(Object.keys(CLASSES_DA_COR)).toEqual([...CORES_DE_CATEGORIA]);
  });

  it.each(CORES_DE_CATEGORIA.map((cor) => [cor]))(
    "%s: a pill é fundo e texto da cor, a barra é a barra da cor",
    (cor) => {
      expect(CLASSES_DA_COR[cor]).toEqual({
        pill: `bg-cat-${cor}-fundo text-cat-${cor}-texto`,
        barra: `bg-cat-${cor}-barra`,
      });
    },
  );

  /* O Tailwind v4 só gera a classe que lê no fonte. Montada por template,
     ela existiria no objeto e faltaria no CSS. */
  it.each(CORES_DE_CATEGORIA.map((cor) => [cor]))(
    "as classes de %s estão escritas por extenso no fonte do mapa",
    (cor) => {
      expect(FONTE_DO_MAPA).toContain(`"bg-cat-${cor}-fundo text-cat-${cor}-texto"`);
      expect(FONTE_DO_MAPA).toContain(`"bg-cat-${cor}-barra"`);
    },
  );
});
