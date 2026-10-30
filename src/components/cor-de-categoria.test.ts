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

/** Uma cor em sRGB, canais de 0 a 255. Fracionários quando é resultado de composição. */
type Rgb = readonly [number, number, number];

function deHex(hex: string): Rgb {
  const canal = (posicao: number): number => Number.parseInt(hex.slice(posicao, posicao + 2), 16);
  return [canal(1), canal(3), canal(5)];
}

/** Luminância relativa da WCAG 2.x, a partir do sRGB. */
function luminancia(cor: string | Rgb): number {
  const [r, g, b] = typeof cor === "string" ? deHex(cor) : cor;
  const canal = (valor255: number): number => {
    const valor = valor255 / 255;
    return valor <= 0.04045 ? valor / 12.92 : ((valor + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

function contraste(a: string | Rgb, b: string | Rgb): number {
  const [clara, escura] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number];
  return (clara + 0.05) / (escura + 0.05);
}

/**
 * O trilho como a tela o pinta. `--grafico-trilho` é `light-dark()` com um
 * lado opaco (`#rrggbb`) e outro que pode ser branco translúcido
 * (`rgb(r g b / a)`); o translúcido é composto sobre o canvas do mesmo tema,
 * que é o que fica embaixo dele no gráfico.
 */
function trilhoPintado(canvas: Record<Tema, string>): Record<Tema, Rgb> {
  const COR = String.raw`#[0-9a-f]{6}|rgb\(\s*\d+\s+\d+\s+\d+\s*\/\s*[\d.]+\s*\)`;
  const casamento = new RegExp(
    String.raw`--grafico-trilho:\s*light-dark\(\s*(${COR})\s*,\s*(${COR})\s*\)`,
    "i",
  ).exec(CSS);
  if (casamento?.[1] === undefined || casamento[2] === undefined) {
    throw new Error("--grafico-trilho não está declarado com light-dark() em globals.css");
  }
  const pintar = (declarada: string, fundo: string): Rgb => {
    if (declarada.startsWith("#")) {
      return deHex(declarada);
    }
    const [r = 0, g = 0, b = 0, alfa = 1] = (declarada.match(/[\d.]+/g) ?? []).map(Number);
    const [fr, fg, fb] = deHex(fundo);
    return [alfa * r + (1 - alfa) * fr, alfa * g + (1 - alfa) * fg, alfa * b + (1 - alfa) * fb];
  };
  return {
    claro: pintar(casamento[1], canvas.claro),
    escuro: pintar(casamento[2], canvas.escuro),
  };
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

/*
 * Quem fica encostado na barra é o trilho, e não o canvas: a barra é desenhada
 * dentro dele, da mesma altura. No claro o trilho é um cinza opaco; no escuro
 * é branco translúcido, e a cor que a pessoa vê é ele composto sobre o canvas.
 */
describe("a barra sobre o trilho, nos dois temas (COR-02, AC 3)", () => {
  const trilho = trilhoPintado(token("--canvas"));

  /* Sem esta prova, um erro na leitura do trilho (o canvas no lugar dele, ou
     o branco puro sem a transparência) deixaria a conta abaixo passar. */
  it("o trilho escuro é o branco translúcido composto sobre o canvas, e não o canvas", () => {
    expect(contraste(trilho.escuro, token("--canvas").escuro)).toBeGreaterThan(1.1);
    expect(contraste(trilho.escuro, "#ffffff")).toBeGreaterThan(15);
    expect(contraste(trilho.claro, "#ffffff")).toBeGreaterThan(1.1);
  });

  it.each(CORES_DE_CATEGORIA.flatMap((cor) => TEMAS.map((tema) => [cor, tema] as const)))(
    "%s no tema %s passa de 3:1",
    (cor, tema) => {
      const barra = token(`--cat-${cor}-barra`)[tema];

      expect(contraste(barra, trilho[tema])).toBeGreaterThanOrEqual(3);
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
