import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { OndeAparece } from "./onde-aparece";

/**
 * Derivado de CADCOL-04 (ACs 11 e 12), CADCOL-07 (AC 13) e do Done-when da
 * T12. O endereço com o filtro de cada item é montado por quem usa: o da
 * categoria se prova em `detalhe-da-categoria.test.tsx`, e o do meio na T17.
 */

afterEach(cleanup);

/** O número logo depois do termo, dentro da seção. */
function numero(secao: HTMLElement, termo: string): string | null | undefined {
  return within(secao).getByText(termo, { selector: "dt" }).nextElementSibling?.textContent;
}

describe("OndeAparece", () => {
  it('na categoria, a seção "Onde ela aparece" tem as duas contagens do mês e o link', () => {
    render(
      <OndeAparece
        genero="ela"
        fixos={1}
        lancamentos={2}
        rotuloDaCompetencia="Março de 2026"
        href="/2026-03/lancamentos?categoriaId=abc"
      />,
    );

    const secao = screen.getByRole("region", { name: "Onde ela aparece" });
    expect(numero(secao, "Fixos em Março de 2026")).toBe("1");
    expect(numero(secao, "Lançamentos em Março de 2026")).toBe("2");
    expect(
      within(secao).getByRole("link", { name: "Ver em Lançamentos" }).getAttribute("href"),
    ).toBe("/2026-03/lancamentos?categoriaId=abc");
  });

  it('no meio, a seção se chama "Onde ele aparece", e sem uso mostra 0', () => {
    render(
      <OndeAparece
        genero="ele"
        fixos={0}
        lancamentos={0}
        rotuloDaCompetencia="Março de 2026"
        href="/2026-03/lancamentos?meioPagamentoId=def"
      />,
    );

    const secao = screen.getByRole("region", { name: "Onde ele aparece" });
    expect(numero(secao, "Fixos em Março de 2026")).toBe("0");
    expect(numero(secao, "Lançamentos em Março de 2026")).toBe("0");
    expect(
      within(secao).getByRole("link", { name: "Ver em Lançamentos" }).getAttribute("href"),
    ).toBe("/2026-03/lancamentos?meioPagamentoId=def");
  });
});
