import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Cents } from "@/domain";
import { HorizonteFuturo } from "./horizonte-futuro";

/*
 * O jsdom não tem `matchMedia`, e o GSAP o consulta já no import. `vi.hoisted`
 * roda antes dos imports. Com movimento reduzido o componente não monta a
 * animação, que o jsdom não teria layout para medir.
 */
vi.hoisted(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (consulta: string) => ({
      matches: true,
      media: consulta,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
});

/**
 * Testes derivados de SALDO-03 (ACs 2 a 6). Cada cartão dos próximos meses
 * mostra o comprometido e quanto vai sobrar ou faltar. Os valores são
 * escolhidos pela conta, um mês para cada sinal do saldo (AD-009).
 *
 * O título da seção, a igualdade com o card do mês aberto e a largura de
 * 400 px dependem da página e do navegador: ficam em `e2e/saldo-futuro.spec.ts`.
 */

const MESES = [
  {
    competencia: "2026-04",
    rotulo: "Abril de 2026",
    comprometido: 30000 as Cents,
    saldo: 70000 as Cents,
  },
  {
    competencia: "2026-05",
    rotulo: "Maio de 2026",
    comprometido: 150000 as Cents,
    saldo: -50000 as Cents,
  },
  { competencia: "2026-06", rotulo: "Junho de 2026", comprometido: 0 as Cents, saldo: 0 as Cents },
];

afterEach(cleanup);

function cartao(rotulo: string): HTMLElement {
  const item = screen
    .getAllByRole("listitem")
    .find((li) => li.textContent?.startsWith(rotulo) ?? false);
  if (item === undefined) {
    throw new Error(`o cartão de ${rotulo} não está na régua`);
  }
  return item;
}

/** Cada `dt` com o `dd` que vem logo depois dele: o par que o leitor de tela lê junto. */
function pares(item: HTMLElement): Array<[string | null, string | null, string | null]> {
  return within(item)
    .getAllByRole("term")
    .map((termo) => [
      termo.textContent,
      termo.nextElementSibling?.tagName ?? null,
      termo.nextElementSibling?.textContent ?? null,
    ]);
}

function valorDoSaldo(item: HTMLElement): HTMLElement {
  const valores = within(item).getAllByRole("definition");
  const saldo = valores[1];
  if (saldo === undefined) {
    throw new Error("o cartão não tem o valor do saldo");
  }
  return saldo;
}

describe("cada cartão mostra o comprometido e o saldo (SALDO-03, AC 2)", () => {
  it("um cartão por mês, com o mês e os dois rótulos ligados aos seus valores", () => {
    render(<HorizonteFuturo meses={MESES} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(pares(cartao("Abril de 2026"))).toEqual([
      ["Comprometido", "DD", "R$ 300,00"],
      ["Vai sobrar", "DD", "R$ 700,00"],
    ]);
    expect(pares(cartao("Maio de 2026"))).toEqual([
      ["Comprometido", "DD", "R$ 1.500,00"],
      ["Vai faltar", "DD", "R$ 500,00"],
    ]);
  });
});

describe("o rótulo e a cor seguem o sinal do saldo (SALDO-03, ACs 3 a 5)", () => {
  it('saldo positivo: "Vai sobrar" e o valor em verde (AC 3)', () => {
    render(<HorizonteFuturo meses={MESES} />);

    const valor = valorDoSaldo(cartao("Abril de 2026"));

    expect(valor.textContent).toBe("R$ 700,00");
    expect(valor.className).toContain("text-positivo");
    expect(valor.className).not.toContain("text-negativo");
  });

  it('saldo negativo: "Vai faltar", o valor sem sinal e em vermelho (AC 4)', () => {
    render(<HorizonteFuturo meses={MESES} />);

    const item = cartao("Maio de 2026");
    const valor = valorDoSaldo(item);

    expect(pares(item)[1]?.[0]).toBe("Vai faltar");
    expect(valor.textContent).toBe("R$ 500,00");
    expect(valor.textContent).not.toMatch(/[-−]/);
    expect(valor.className).toContain("text-negativo");
    expect(valor.className).not.toContain("text-positivo");
  });

  it('saldo zero: "Vai sobrar R$ 0,00", sem cor de semântica (AC 5)', () => {
    render(<HorizonteFuturo meses={MESES} />);

    const item = cartao("Junho de 2026");
    const valor = valorDoSaldo(item);

    expect(pares(item)).toEqual([
      ["Comprometido", "DD", "R$ 0,00"],
      ["Vai sobrar", "DD", "R$ 0,00"],
    ]);
    expect(valor.className).toContain("text-ink");
    expect(valor.className).not.toContain("text-positivo");
    expect(valor.className).not.toContain("text-negativo");
  });
});

describe("a seção não repete os rótulos dos indicadores (SALDO-03, AC 6)", () => {
  it('nenhum "Saldo previsto" nem "Saldo do período" na régua', () => {
    render(<HorizonteFuturo meses={MESES} />);

    expect(screen.queryByText(/Saldo previsto|Saldo do período/)).toBeNull();
  });
});
