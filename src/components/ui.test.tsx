import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CORES_DE_CATEGORIA } from "@/domain";
import { CLASSES_DA_COR } from "./cor-de-categoria";
import { Chip } from "./ui";

/**
 * Testes derivados de COR-03 (AC 1) e do Done-when de T4: o `Chip` com `cor`
 * troca o cinza de elevação pela pill da cor; sem `cor`, nada muda.
 */

afterEach(cleanup);

function classesDe(texto: string): ReadonlyArray<string> {
  return screen.getByText(texto).className.split(/\s+/);
}

describe("Chip sem cor: nada muda", () => {
  it.each([
    [undefined, "text-ink"],
    ["neutro", "text-ink"],
    ["positivo", "text-positivo"],
    ["negativo", "text-negativo"],
  ] as const)("tom %s: cinza de elevação com %s", (tom, tinta) => {
    render(<Chip tom={tom}>Receita</Chip>);

    expect(classesDe("Receita")).toEqual(expect.arrayContaining(["bg-surface-strong", tinta]));
    expect(classesDe("Receita").some((classe) => classe.startsWith("bg-cat-"))).toBe(false);
  });
});

describe("Chip com cor (COR-03, AC 1)", () => {
  it.each(CORES_DE_CATEGORIA.map((cor) => [cor]))(
    "%s: fundo e texto da cor, no lugar do cinza e da tinta",
    (cor) => {
      render(<Chip cor={cor}>Categoria Um</Chip>);

      const classes = classesDe("Categoria Um");
      expect(classes).toEqual(expect.arrayContaining(CLASSES_DA_COR[cor].pill.split(" ")));
      expect(classes).not.toContain("bg-surface-strong");
      expect(classes).not.toContain("text-ink");
    },
  );

  it("a cor vence o tom: tom e cor não se combinam", () => {
    render(
      <Chip cor="verde" tom="negativo">
        Categoria Um
      </Chip>,
    );

    expect(classesDe("Categoria Um")).toEqual(
      expect.arrayContaining(["bg-cat-verde-fundo", "text-cat-verde-texto"]),
    );
    expect(classesDe("Categoria Um")).not.toContain("text-negativo");
  });

  it("o nome continua escrito dentro da pill (COR-02, AC 4)", () => {
    render(<Chip cor="roxo">Categoria Um</Chip>);

    expect(screen.getByText("Categoria Um").textContent).toBe("Categoria Um");
  });
});
