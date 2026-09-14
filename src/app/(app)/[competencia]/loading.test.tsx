import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import CarregandoMes from "./loading";

/**
 * UI-02 AC 7: enquanto os dados do mês carregam, o sistema apresenta um
 * estado de carregamento. O teste assere o que o usuário observa — papel
 * acessível e texto —, nunca a existência do arquivo: um `loading.tsx`
 * vazio também "existe" e não avisa ninguém de nada.
 */

afterEach(cleanup);

describe("estado de carregamento do mês (UI-02, AC 7)", () => {
  it("anuncia o carregamento por um papel que o leitor de tela recebe", () => {
    render(<CarregandoMes />);

    const aviso = screen.getByRole("status");
    expect(aviso.getAttribute("aria-live")).toBe("polite");
  });

  it("diz em texto que o mês está carregando", () => {
    render(<CarregandoMes />);

    expect(screen.getByRole("status").textContent).toMatch(/carregando/i);
  });
});
