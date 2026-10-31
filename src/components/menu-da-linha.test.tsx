import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { cancelarLancamento } from "@/app/actions/lancamentos";
import { MenuDaLinha } from "./menu-da-linha";

/**
 * Testes derivados de DENS-02 (ACs 1, 3, 4 e 5). O que o menu acrescenta ao
 * excluir de dois toques de sempre: abrir, manter aberto enquanto se confirma,
 * e fechar devolvendo o foco. Os dois toques em si são provados em
 * `botao-excluir.test.tsx`; aqui, que eles continuam funcionando dentro do menu.
 */

afterEach(cleanup);

function excluirOk() {
  return vi.fn(async () => ({
    ok: true as const,
    data: { id: "l-1", competencia: "2026-03", alterou: true },
  })) as unknown as typeof cancelarLancamento;
}

function montar(excluir: typeof cancelarLancamento = excluirOk()) {
  render(
    <div>
      <MenuDaLinha lancamentoId="l-1" descricao="Almoço" excluir={excluir} />
      <button type="button">fora</button>
    </div>,
  );
  return excluir;
}

function gatilho(): HTMLElement {
  return screen.getByRole("button", { name: "Mais ações para Almoço" });
}

describe("o menu da linha (DENS-02)", () => {
  it('começa fechado, com o nome "Mais ações para <descrição>" e sem "Excluir" à vista (AC 1)', () => {
    montar();

    expect(gatilho().getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("button", { name: /^Excluir/ })).toBeNull();
  });

  it('acionar o "⋯" abre o menu com "Excluir" (AC 3)', async () => {
    montar();

    await userEvent.click(gatilho());

    expect(gatilho().getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: "Excluir, Almoço" })).toBeDefined();
  });

  it("excluir pede a confirmação em dois toques, com o menu aberto, e só então exclui (AC 4)", async () => {
    const excluir = montar();
    await userEvent.click(gatilho());

    await userEvent.click(screen.getByRole("button", { name: "Excluir, Almoço" }));
    expect(excluir).not.toHaveBeenCalled();
    const confirmar = screen.getByRole("button", { name: /^Confirmar\?/ });

    await userEvent.click(confirmar);
    expect(excluir).toHaveBeenCalledWith("l-1");
  });

  it('Escape fecha o menu e devolve o foco ao "⋯" (AC 5)', async () => {
    montar();
    await userEvent.click(gatilho());
    await userEvent.click(screen.getByRole("button", { name: "Excluir, Almoço" }));

    await userEvent.keyboard("{Escape}");

    expect(gatilho().getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("button", { name: /^(Excluir|Confirmar)/ })).toBeNull();
    expect(document.activeElement).toBe(gatilho());
  });

  it("clicar fora fecha o menu (AC 5)", async () => {
    montar();
    await userEvent.click(gatilho());

    await userEvent.click(screen.getByRole("button", { name: "fora" }));

    expect(gatilho().getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("button", { name: /^Excluir/ })).toBeNull();
  });

  /*
   * No Safari, clicar num botão não lhe dá foco: o menu abre sem foco dentro,
   * nenhum `focusout` acontece, e só o `pointerdown` fora o fecha (L-046).
   */
  it("clicar fora fecha o menu também quando ele abriu sem foco dentro (AC 5)", () => {
    montar();
    fireEvent.click(gatilho());
    expect(gatilho().getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(document.body);

    fireEvent.pointerDown(document.body);

    expect(gatilho().getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("button", { name: /^Excluir/ })).toBeNull();
  });

  it('acionar o "⋯" de novo fecha o menu', async () => {
    montar();
    await userEvent.click(gatilho());

    await userEvent.click(gatilho());

    expect(gatilho().getAttribute("aria-expanded")).toBe("false");
  });
});
