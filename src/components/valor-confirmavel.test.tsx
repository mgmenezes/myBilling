import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { confirmarValorDaOcorrencia } from "@/app/actions/pagamentos";
import { ValorConfirmavel } from "./valor-confirmavel";

/**
 * Derivado de FIXO-04, AC 3.
 *
 * Duas coisas precisam sobreviver a qualquer refatoração aqui: a **previsão
 * continua visível** depois de confirmado — é a diferença entre os dois que dá
 * sentido ao mês — e a confirmação é anunciada por **texto**, não por cor. A
 * cor do valor já significa despesa ou receita nesta tabela, e empilhar dois
 * significados no mesmo canal deixaria os dois ilegíveis.
 */

const confirmarOk: typeof confirmarValorDaOcorrencia = vi.fn(async (_id, valorCentavos) => ({
  ok: true as const,
  data: { valorCentavos },
}));

afterEach(cleanup);

function montar(opcoes: { confirmado?: boolean; acao?: typeof confirmarValorDaOcorrencia } = {}) {
  const utils = render(
    <ValorConfirmavel
      lancamentoId="lanc-1"
      descricao="Conta de luz"
      sinal="−"
      valorFormatado={opcoes.confirmado === true ? "R$ 192,40" : "R$ 180,00"}
      previstoFormatado="R$ 180,00"
      confirmado={opcoes.confirmado === true}
      confirmar={opcoes.acao ?? confirmarOk}
    />,
  );
  return { ...utils, usuario: userEvent.setup() };
}

describe("valor de uma ocorrência de gasto fixo", () => {
  it("não confirmado diz que é previsto, em texto", () => {
    montar();

    expect(screen.getByText("previsto")).toBeTruthy();
  });

  it("confirmado diz que é confirmado e mantém a previsão visível", () => {
    montar({ confirmado: true });

    const apoio = screen.getByText(/confirmado/);
    expect(apoio.textContent).toContain("confirmado");
    expect(apoio.textContent).toContain("R$ 180,00");
  });

  it("o valor é um botão, com nome que distingue a linha", () => {
    montar();

    expect(screen.getByRole("button", { name: /Conta de luz/ })).toBeTruthy();
  });

  it("o sinal acompanha o valor, para a linha não depender só de cor", () => {
    montar();

    expect(screen.getByRole("button", { name: /Conta de luz/ }).textContent).toContain("−");
  });

  it("clicar abre o campo, já com a previsão como marcador", async () => {
    const { usuario } = montar();

    await usuario.click(screen.getByRole("button", { name: /Conta de luz/ }));

    const campo = screen.getByLabelText(/Valor real de Conta de luz/) as HTMLInputElement;
    expect(campo.placeholder).toBe("R$ 180,00");
  });

  it("confirmar envia os centavos e fecha o campo", async () => {
    const acao = vi.fn(async () => ({ ok: true as const, data: { valorCentavos: 19240 } }));
    const { usuario } = montar({ acao: acao as never });

    await usuario.click(screen.getByRole("button", { name: /Conta de luz/ }));
    await usuario.type(screen.getByLabelText(/Valor real/), "192,40");
    await usuario.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => {
      expect(acao).toHaveBeenCalledWith("lanc-1", 19240);
    });
  });

  it("Enter confirma, sem submeter formulário nenhum", async () => {
    const acao = vi.fn(async () => ({ ok: true as const, data: { valorCentavos: 19240 } }));
    const { usuario } = montar({ acao: acao as never });

    await usuario.click(screen.getByRole("button", { name: /Conta de luz/ }));
    await usuario.type(screen.getByLabelText(/Valor real/), "192,40{Enter}");

    await waitFor(() => {
      expect(acao).toHaveBeenCalledWith("lanc-1", 19240);
    });
  });

  it("texto que não é valor reprova antes de sair do navegador", async () => {
    const acao = vi.fn();
    const { usuario } = montar({ acao: acao as never });

    await usuario.click(screen.getByRole("button", { name: /Conta de luz/ }));
    await usuario.type(screen.getByLabelText(/Valor real/), "abc");
    await usuario.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(acao).not.toHaveBeenCalled();
  });

  it("erro do servidor aparece e o campo continua aberto", async () => {
    const acao = vi.fn(async () => ({
      ok: false as const,
      erro: {
        code: "LANCAMENTO_NAO_CONFIRMAVEL",
        mensagem: "Só gasto fixo tem valor a confirmar.",
      },
    }));
    const { usuario } = montar({ acao: acao as never });

    await usuario.click(screen.getByRole("button", { name: /Conta de luz/ }));
    await usuario.type(screen.getByLabelText(/Valor real/), "192,40");
    await usuario.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("Só gasto fixo"),
    );
    expect(screen.getByLabelText(/Valor real/)).toBeTruthy();
  });

  it("cancelar fecha sem gravar", async () => {
    const acao = vi.fn();
    const { usuario } = montar({ acao: acao as never });

    await usuario.click(screen.getByRole("button", { name: /Conta de luz/ }));
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByLabelText(/Valor real/)).toBeNull();
    expect(acao).not.toHaveBeenCalled();
  });
});
