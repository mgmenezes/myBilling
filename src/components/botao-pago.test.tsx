import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { alternarPagamento } from "@/app/actions/pagamentos";
import { BotaoPago } from "./botao-pago";

/**
 * O selo é o botão, e é essa decisão que os testes abaixo protegem.
 *
 * Um selo que também é botão só funciona se **disser** que é botão: papel de
 * botão de verdade, estado de alternância anunciado, e um nome que distinga
 * esta linha das outras treze da tabela. Sem qualquer um dos três, a escolha
 * de economizar um elemento por linha vira um clique descoberto por acidente.
 */

const acaoOk: typeof alternarPagamento = vi.fn(async (lancamentoId: string, pago: boolean) => ({
  ok: true as const,
  data: { lancamentoId, pagoEm: pago ? "2026-03-15" : null },
}));

afterEach(cleanup);

function montar(pago: boolean, acao: typeof alternarPagamento = acaoOk) {
  const utils = render(
    <BotaoPago lancamentoId="lanc-1" descricao="Conta de luz" pago={pago} alternar={acao} />,
  );
  return { ...utils, usuario: userEvent.setup() };
}

describe("o selo de situação como botão", () => {
  it("é um botão de verdade, e não um texto clicável", () => {
    montar(false);

    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("anuncia a alternância em vez de só trocar o rótulo", () => {
    montar(false);
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("false");

    cleanup();
    montar(true);
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("true");
  });

  it("o nome acessível carrega a descrição, para distinguir a linha", () => {
    montar(false);

    expect(screen.getByRole("button", { name: /Conta de luz/ })).toBeTruthy();
  });

  it("mostra Previsto quando não está pago e Pago quando está", () => {
    montar(false);
    expect(screen.getByRole("button").textContent).toContain("Previsto");

    cleanup();
    montar(true);
    expect(screen.getByRole("button").textContent).toContain("Pago");
  });
});

describe("alternar", () => {
  it("marcar como pago chama a action pedindo `true`", async () => {
    const acao = vi.fn(async () => ({
      ok: true as const,
      data: { lancamentoId: "lanc-1", pagoEm: "2026-03-15" },
    }));
    const { usuario } = montar(false, acao as never);

    await usuario.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(acao).toHaveBeenCalledWith("lanc-1", true);
    });
  });

  it("desfazer chama a action pedindo `false`", async () => {
    const acao = vi.fn(async () => ({
      ok: true as const,
      data: { lancamentoId: "lanc-1", pagoEm: null },
    }));
    const { usuario } = montar(true, acao as never);

    await usuario.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(acao).toHaveBeenCalledWith("lanc-1", false);
    });
  });

  it("o selo troca antes da resposta do servidor", async () => {
    /*
     * A action desta vez demora. Sem estado otimista o selo ficaria em
     * "Previsto" durante a espera, e a pessoa clicaria de novo achando que
     * não pegou — que é justamente o defeito que o `useOptimistic` evita.
     */
    let liberar: () => void = () => {};
    const acao = vi.fn(
      () =>
        new Promise((resolve) => {
          liberar = () => resolve({ ok: true, data: { lancamentoId: "lanc-1", pagoEm: "x" } });
        }),
    );
    const { usuario } = montar(false, acao as never);

    await usuario.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByRole("button").textContent).toContain("Pago");
    });
    liberar();
  });

  it("fica desabilitado enquanto grava, para não disparar duas vezes", async () => {
    let liberar: () => void = () => {};
    const acao = vi.fn(
      () =>
        new Promise((resolve) => {
          liberar = () => resolve({ ok: true, data: { lancamentoId: "lanc-1", pagoEm: "x" } });
        }),
    );
    const { usuario } = montar(false, acao as never);

    await usuario.click(screen.getByRole("button"));

    await waitFor(() => {
      expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
    });
    liberar();
  });
});
