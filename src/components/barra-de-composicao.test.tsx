import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Cents } from "@/domain";
import { composicaoDeBlocos } from "@/domain";
import { BarraDeComposicao } from "./barra-de-composicao";

/**
 * Testes derivados de HOME-03 (ACs 5, 6).
 *
 * O que eles protegem é a regra que a identidade do app impõe ao gráfico:
 * **identidade nunca mora só na cor**. Os três segmentos são três passos de uma
 * neutra, indistinguíveis para quem não separa luminosidade — então nome, valor
 * e percentual precisam estar no texto, não no `title` nem no hover.
 */

const c = (valor: number): Cents => valor as Cents;

afterEach(cleanup);

function montar(fixos: number, cartao: number, avulsos: number) {
  return render(
    <BarraDeComposicao
      titulo="Saídas de Setembro"
      fatias={composicaoDeBlocos({ fixos: c(fixos), cartao: c(cartao), avulsos: c(avulsos) })}
    />,
  );
}

describe("a barra de composição", () => {
  it("nomeia os três blocos em português, não pelo código do domínio", () => {
    montar(500, 300, 200);

    expect(screen.getByText("Fixos")).toBeTruthy();
    expect(screen.getByText("Cartão")).toBeTruthy();
    expect(screen.getByText("Avulsos")).toBeTruthy();
    expect(screen.queryByText("FIXOS")).toBeNull();
  });

  it("imprime valor e percentual de cada fatia como texto", () => {
    montar(500, 300, 200);

    expect(screen.getByText("R$ 5,00")).toBeTruthy();
    expect(screen.getByText("50,00%")).toBeTruthy();
    expect(screen.getByText("30,00%")).toBeTruthy();
    expect(screen.getByText("20,00%")).toBeTruthy();
  });

  it("dá à barra uma largura proporcional ao percentual da fatia", () => {
    const { container } = montar(500, 300, 200);
    const segmentos = container.querySelectorAll<HTMLElement>("[data-bloco]");

    expect(segmentos).toHaveLength(3);
    expect(segmentos[0]?.style.width).toBe("50%");
    expect(segmentos[1]?.style.width).toBe("30%");
  });

  it("omite o segmento de um bloco zerado em vez de desenhar uma fresta", () => {
    const { container } = montar(500, 0, 500);

    expect(container.querySelectorAll("[data-bloco]")).toHaveLength(2);
    expect(screen.queryByText("Cartão")).toBeNull();
  });

  it("troca a barra por um estado vazio quando o mês não teve despesa", () => {
    const { container } = montar(0, 0, 0);

    expect(container.querySelectorAll("[data-bloco]")).toHaveLength(0);
    expect(screen.getByText(/nenhuma despesa/i)).toBeTruthy();
  });

  it("anuncia o gráfico por um rótulo que diz de que período ele fala", () => {
    montar(500, 300, 200);

    expect(screen.getByRole("list", { name: "Saídas de Setembro" })).toBeTruthy();
  });
});
