import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProvedorDeAvisos, useAvisos } from "./avisos";

/**
 * Testes derivados de TRC-04 (AC 4) e do Done-when de T6.
 *
 * O toast é o único lugar onde o alcance de uma troca de categoria aparece, e
 * ele some sozinho. O que se prende aqui é o contrato do aviso: anunciado como
 * `status`, fora da tela 4 segundos depois, e um só por vez.
 *
 * Relógio falso, porque o critério é de tempo. O clique é `fireEvent`, e não
 * `userEvent`: depois de cada interação o Testing Library espera um
 * `setTimeout(0)` que só o relógio falso do Jest avança, e a espera trava
 * contra o do Vitest, como `filtros-de-lancamentos.test.tsx` já registra.
 */

const QUATRO_SEGUNDOS = 4000;

function Gatilho({ texto, rotulo }: { readonly texto: string; readonly rotulo: string }) {
  const { avisar } = useAvisos();
  return (
    <button type="button" onClick={() => avisar(texto)}>
      {rotulo}
    </button>
  );
}

function montar(): void {
  render(
    <ProvedorDeAvisos>
      <Gatilho texto="Aviso um." rotulo="Avisar um" />
      <Gatilho texto="Aviso dois." rotulo="Avisar dois" />
    </ProvedorDeAvisos>,
  );
}

function clicar(rotulo: string): void {
  fireEvent.click(screen.getByRole("button", { name: rotulo }));
}

function passar(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("o aviso é anunciado como status (TRC-04, AC 4)", () => {
  it("avisar mostra o texto numa região role=status, que não existia antes", () => {
    montar();
    expect(screen.queryByRole("status")).toBeNull();

    clicar("Avisar um");

    expect(screen.getByRole("status").textContent).toBe("Aviso um.");
  });
});

describe("o aviso sai da tela sozinho (TRC-04, AC 4)", () => {
  it("continua na tela até o fim dos 4 segundos e sai no instante em que eles acabam", () => {
    montar();
    clicar("Avisar um");

    passar(QUATRO_SEGUNDOS - 1);
    expect(screen.getByRole("status").textContent).toBe("Aviso um.");

    passar(1);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByText("Aviso um.")).toBeNull();
  });
});

describe("um aviso por vez", () => {
  it("um aviso novo substitui o anterior e reinicia os 4 segundos", () => {
    montar();
    clicar("Avisar um");
    passar(3000);

    clicar("Avisar dois");

    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status").textContent).toBe("Aviso dois.");
    expect(screen.queryByText("Aviso um.")).toBeNull();

    /* 6,999s depois do primeiro: o prazo dele já teria vencido. */
    passar(QUATRO_SEGUNDOS - 1);
    expect(screen.getByRole("status").textContent).toBe("Aviso dois.");

    passar(1);
    expect(screen.queryByRole("status")).toBeNull();
  });

  /*
   * Duas trocas seguidas de gasto do mês avisam a mesma frase. O segundo aviso
   * é novo mesmo com o texto igual, e o prazo recomeça dele.
   */
  it("o mesmo texto avisado de novo também reinicia os 4 segundos", () => {
    montar();
    clicar("Avisar um");
    passar(3000);

    clicar("Avisar um");

    passar(QUATRO_SEGUNDOS - 1);
    expect(screen.getByRole("status").textContent).toBe("Aviso um.");

    passar(1);
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("useAvisos precisa do provedor", () => {
  it("fora do provedor, lança um erro que nomeia o provedor", () => {
    /* O React registra o erro de renderização no console antes de relançá-lo;
       o registro não é o que se afirma aqui, e só polui a saída. */
    const console_ = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<Gatilho texto="Aviso um." rotulo="Avisar um" />)).toThrow(
      /ProvedorDeAvisos/,
    );

    console_.mockRestore();
  });
});
