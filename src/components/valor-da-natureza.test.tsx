import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Cents, Natureza } from "@/domain";
import { corDaNatureza, ValorDaNatureza } from "./valor-da-natureza";

/**
 * Testes derivados de TRES-05 (AC 3): o valor com o sinal e a cor da natureza
 * "como na lista de Lançamentos". A lista e os últimos lançamentos usam esta
 * mesma peça; os testes atuais da tabela continuam provando a lista.
 */

afterEach(cleanup);

function valor(natureza: Natureza): HTMLElement {
  render(
    <span data-testid="valor" className={corDaNatureza(natureza)}>
      <ValorDaNatureza natureza={natureza} valor={12345 as Cents} />
    </span>,
  );
  return screen.getByTestId("valor");
}

describe("o valor com o sinal e a cor da natureza (TRES-05, AC 3)", () => {
  it('entrada: "+", verde e "de entrada" para o leitor de tela', () => {
    const elemento = valor("RECEITA");

    expect(elemento.textContent).toBe("+R$ 123,45 de entrada");
    expect(elemento.className).toBe("text-positivo");
  });

  it('despesa: "−", vermelho e "de despesa" para o leitor de tela', () => {
    const elemento = valor("DESPESA");

    expect(elemento.textContent).toBe("−R$ 123,45 de despesa");
    expect(elemento.className).toBe("text-negativo");
  });

  it('investimento: sem sinal, neutro e "de investimento" para o leitor de tela', () => {
    const elemento = valor("INVESTIMENTO");

    expect(elemento.textContent).toBe("R$ 123,45 de investimento");
    expect(elemento.className).toBe("text-ink");
  });

  it("o sinal é só visual e o rótulo é só para leitor de tela", () => {
    const elemento = valor("DESPESA");

    expect(elemento.querySelector('[aria-hidden="true"]')?.textContent).toBe("−");
    expect(elemento.querySelector(".sr-only")?.textContent).toBe(" de despesa");
  });
});
