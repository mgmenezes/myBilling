import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { criarCategoria } from "@/app/actions/categorias";
import { NovaCategoria } from "./nova-categoria";

/**
 * Derivado de CADCOL-05 (ACs 1 a 6) e do Done-when da T13: o formulário de
 * criação no painel. Quem avisa e abre a categoria criada é a aba (T14); o
 * formulário entrega o id e o texto do aviso, que depende do que o servidor
 * fez com o nome. Nomes genéricos (AD-009).
 */

afterEach(cleanup);

const CRIADA = "44444444-4444-4444-8444-444444444444";

function respondeu(flags: { readonly jaExistia: boolean; readonly reativada: boolean }) {
  return vi.fn(async (payload: unknown) => ({
    ok: true as const,
    data: { id: CRIADA, nome: (payload as { nome: string }).nome, ...flags },
  }));
}

function montar(
  criar: ReturnType<typeof vi.fn> = respondeu({ jaExistia: false, reativada: false }),
) {
  const aoCriada = vi.fn();
  const aoCancelar = vi.fn();
  render(
    <div data-testid="painel">
      <NovaCategoria
        criarCategoria={criar as unknown as typeof criarCategoria}
        aoCriada={aoCriada}
        aoCancelar={aoCancelar}
      />
    </div>,
  );
  return { criar, aoCriada, aoCancelar, usuario: userEvent.setup() };
}

function formulario(): HTMLElement {
  return within(screen.getByTestId("painel")).getByRole("form", { name: "Nova categoria" });
}

function campoNome(): HTMLInputElement {
  return within(formulario()).getByRole<HTMLInputElement>("textbox", { name: "Nome" });
}

function criarCategoriaBotao(): HTMLElement {
  return within(formulario()).getByRole("button", { name: "Criar categoria" });
}

describe("o formulário (CADCOL-05, AC 1)", () => {
  it('tem o título "Nova categoria", o campo "Nome" vazio, a nota da cor, "Criar categoria" e "Cancelar"', () => {
    montar();

    const titulo = within(screen.getByTestId("painel")).getByRole("heading", { level: 2 });
    expect(titulo.textContent).toBe("Nova categoria");
    expect(titulo.getAttribute("tabindex")).toBe("-1");
    expect(campoNome().value).toBe("");
    expect(
      within(formulario()).getByText(
        "Começa na cor automática, tirada do nome. Depois de criar, ela abre aqui para você trocar a cor.",
      ),
    ).toBeTruthy();
    expect(criarCategoriaBotao()).toBeTruthy();
    expect(within(formulario()).getByRole("button", { name: "Cancelar" })).toBeTruthy();
  });
});

describe("a regra do nome no navegador (CADCOL-05, AC 5)", () => {
  it("nome vazio é recusado junto do campo, sem chamar o servidor", async () => {
    const { criar, usuario } = montar();

    await usuario.click(criarCategoriaBotao());

    const alerta = await within(formulario()).findByRole("alert");
    expect(alerta.textContent).toBe("Informe o nome da categoria.");
    expect(campoNome().getAttribute("aria-invalid")).toBe("true");
    expect(campoNome().getAttribute("aria-describedby")).toBe(alerta.id);
    expect(criar).not.toHaveBeenCalled();
  });

  it("nome com 61 caracteres é recusado junto do campo, sem chamar o servidor", async () => {
    const { criar, usuario } = montar();

    await usuario.type(campoNome(), "a".repeat(61));
    await usuario.click(criarCategoriaBotao());

    expect((await within(formulario()).findByRole("alert")).textContent).toBe(
      "O nome pode ter no máximo 60 caracteres.",
    );
    expect(criar).not.toHaveBeenCalled();
  });

  it("nome com 60 caracteres chega ao servidor", async () => {
    const { criar, usuario } = montar();

    await usuario.type(campoNome(), "a".repeat(60));
    await usuario.click(criarCategoriaBotao());

    await waitFor(() => {
      expect(criar).toHaveBeenCalledWith({ nome: "a".repeat(60) });
    });
  });
});

describe("o que o servidor fez com o nome (CADCOL-05, ACs 2 a 4)", () => {
  it('a categoria criada volta com "Categoria criada." e o nome vai normalizado', async () => {
    const { criar, aoCriada, usuario } = montar(respondeu({ jaExistia: false, reativada: false }));

    await usuario.type(campoNome(), "  Categoria   Nova {Enter}");

    await waitFor(() => {
      expect(aoCriada).toHaveBeenCalledWith(CRIADA, "Categoria criada.");
    });
    expect(criar).toHaveBeenCalledTimes(1);
    expect(criar).toHaveBeenCalledWith({ nome: "Categoria Nova" });
  });

  it('o nome de uma ativa volta com "Essa categoria já existia."', async () => {
    const { aoCriada, usuario } = montar(respondeu({ jaExistia: true, reativada: false }));

    await usuario.type(campoNome(), "categoria um{Enter}");

    await waitFor(() => {
      expect(aoCriada).toHaveBeenCalledWith(CRIADA, "Essa categoria já existia.");
    });
  });

  it('o nome de uma arquivada volta com "Categoria reativada."', async () => {
    const { aoCriada, usuario } = montar(respondeu({ jaExistia: true, reativada: true }));

    await usuario.type(campoNome(), "Categoria Antiga{Enter}");

    await waitFor(() => {
      expect(aoCriada).toHaveBeenCalledWith(CRIADA, "Categoria reativada.");
    });
  });
});

describe("a recusa do servidor", () => {
  it("aparece em alert junto do campo, e nada é aberto", async () => {
    const mensagem = "Não foi possível concluir a operação. Tente de novo.";
    const criar = vi.fn(async () => ({
      ok: false as const,
      erro: { code: "ERRO_INESPERADO", mensagem },
    }));
    const { aoCriada, usuario } = montar(criar);

    await usuario.type(campoNome(), "Categoria Nova{Enter}");

    expect((await within(formulario()).findByRole("alert")).textContent).toBe(mensagem);
    expect(aoCriada).not.toHaveBeenCalled();
  });
});

describe("Cancelar (CADCOL-05, AC 6)", () => {
  it("chama aoCancelar sem chamar o servidor", async () => {
    const { criar, aoCancelar, aoCriada, usuario } = montar();

    await usuario.type(campoNome(), "Categoria Nova");
    await usuario.click(within(formulario()).getByRole("button", { name: "Cancelar" }));

    expect(aoCancelar).toHaveBeenCalledTimes(1);
    expect(criar).not.toHaveBeenCalled();
    expect(aoCriada).not.toHaveBeenCalled();
  });
});
