import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { criarCategoria } from "@/app/actions/categorias";
import type { criarMeioDePagamento } from "@/app/actions/meios-de-pagamento";
import type { criarRecorrencia } from "@/app/actions/recorrencias";
import { FormRecorrencia } from "./form-recorrencia";

/**
 * Derivado de FIXO-01.
 *
 * O que estes testes protegem, além da validação, é o **texto que explica o
 * valor**. Quem digita 180 numa conta de luz precisa saber que está informando
 * uma previsão, não mentindo ao app — senão evita cadastrar por achar que vai
 * registrar um número errado todo mês.
 */

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const UUID_M = "22222222-2222-4222-8222-222222222222";
const UUID_U = "11111111-1111-4111-8111-111111111111";

const criarOk: typeof criarRecorrencia = vi.fn(async () => ({
  ok: true as const,
  data: { id: "rec-1", descricao: "Conta de luz" },
}));
const categoriaOk: typeof criarCategoria = vi.fn(async () => ({
  ok: true as const,
  data: { id: "cat-1", nome: "Moradia", jaExistia: false, reativada: false },
}));
const meioOk: typeof criarMeioDePagamento = vi.fn(async () => ({
  ok: true as const,
  data: { id: "m2", nome: "Conta Nova" },
}));

afterEach(() => {
  cleanup();
  refresh.mockReset();
});

function montar(criar: typeof criarRecorrencia = criarOk) {
  const utils = render(
    <FormRecorrencia
      competencia="2026-09"
      meios={[{ id: UUID_M, nome: "Conta Corrente" }]}
      categorias={[{ id: "33333333-3333-4333-8333-333333333333", nome: "Moradia" }]}
      usuarios={[{ id: UUID_U, nome: "Pessoa A" }]}
      criar={criar}
      criarCategoria={categoriaOk}
      criarMeioDePagamento={meioOk}
    />,
  );
  return { ...utils, usuario: userEvent.setup() };
}

describe("formulário de gasto fixo", () => {
  it("oferece despesa e receita", () => {
    montar();

    expect(screen.getByLabelText("Uma conta a pagar")).toBeTruthy();
    expect(screen.getByLabelText("Um dinheiro que entra")).toBeTruthy();
  });

  it("explica que o valor é previsão, não valor final", () => {
    montar();

    expect(screen.getByText(/É a previsão/)).toBeTruthy();
    expect(screen.getByText(/confirma o valor real na lista do mês/)).toBeTruthy();
  });

  it("começa no mês aberto e o fim vem vazio", () => {
    montar();

    expect((screen.getByLabelText("Começa em") as HTMLInputElement).value).toBe("2026-09");
    expect((screen.getByLabelText("Termina em (opcional)") as HTMLInputElement).value).toBe("");
  });

  it("descrição vazia reprova antes de sair do navegador", async () => {
    const criar = vi.fn();
    const { usuario } = montar(criar as never);

    await usuario.type(screen.getByLabelText(/De quanto costuma ser/), "180,00");
    await usuario.click(screen.getByRole("button", { name: "Cadastrar gasto fixo" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(criar).not.toHaveBeenCalled();
  });

  it("valor que não é número reprova com mensagem de valor", async () => {
    const criar = vi.fn();
    const { usuario } = montar(criar as never);

    await usuario.type(screen.getByLabelText("Descrição"), "Conta de luz");
    await usuario.type(screen.getByLabelText(/De quanto costuma ser/), "abc");
    await usuario.click(screen.getByRole("button", { name: "Cadastrar gasto fixo" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("maior que zero"),
    );
    expect(criar).not.toHaveBeenCalled();
  });

  it("dia de vencimento fora de 1 a 31 reprova", async () => {
    const criar = vi.fn();
    const { usuario } = montar(criar as never);

    await usuario.type(screen.getByLabelText("Descrição"), "Conta de luz");
    await usuario.type(screen.getByLabelText(/De quanto costuma ser/), "180,00");
    await usuario.clear(screen.getByLabelText("Dia de vencimento"));
    await usuario.type(screen.getByLabelText("Dia de vencimento"), "45");
    await usuario.click(screen.getByRole("button", { name: "Cadastrar gasto fixo" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("1 a 31"),
    );
    expect(criar).not.toHaveBeenCalled();
  });

  it("envia o payload completo e confirma", async () => {
    const criar = vi.fn(async () => ({
      ok: true as const,
      data: { id: "rec-1", descricao: "Conta de luz" },
    }));
    const { usuario } = montar(criar as never);

    await usuario.type(screen.getByLabelText("Descrição"), "Conta de luz");
    await usuario.type(screen.getByLabelText(/De quanto costuma ser/), "180,00");
    await usuario.click(screen.getByRole("button", { name: "Cadastrar gasto fixo" }));

    await waitFor(() => {
      expect(criar).toHaveBeenCalledWith(
        expect.objectContaining({
          descricao: "Conta de luz",
          natureza: "DESPESA",
          valorCentavos: 18000,
          diaVencimento: 10,
          competenciaInicio: "2026-09",
          competenciaFim: null,
        }),
      );
    });
    expect(await screen.findByRole("status")).toHaveProperty(
      "textContent",
      expect.stringContaining("passa a aparecer em todo mês"),
    );
  });

  it("depois de cadastrar, limpa a descrição para o próximo", async () => {
    const { usuario } = montar();

    await usuario.type(screen.getByLabelText("Descrição"), "Conta de luz");
    await usuario.type(screen.getByLabelText(/De quanto costuma ser/), "180,00");
    await usuario.click(screen.getByRole("button", { name: "Cadastrar gasto fixo" }));

    await waitFor(() => {
      expect((screen.getByLabelText("Descrição") as HTMLInputElement).value).toBe("");
    });
  });

  it("erro do servidor endereçado a campo aparece nele", async () => {
    const criar = vi.fn(async () => ({
      ok: false as const,
      erro: {
        code: "PERIODO_INVALIDO",
        mensagem: "O mês de fim não pode ser anterior ao de início.",
        campos: { competenciaFim: "O mês de fim não pode ser anterior ao de início." },
      },
    }));
    const { usuario } = montar(criar as never);

    await usuario.type(screen.getByLabelText("Descrição"), "Conta de luz");
    await usuario.type(screen.getByLabelText(/De quanto costuma ser/), "180,00");
    await usuario.click(screen.getByRole("button", { name: "Cadastrar gasto fixo" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("não pode ser anterior"),
    );
  });

  it("dá para cadastrar categoria sem sair do formulário", async () => {
    const { usuario } = montar();

    await usuario.click(screen.getByRole("button", { name: "+ nova" }));

    expect(screen.getByLabelText("Nome da nova categoria")).toBeTruthy();
  });

  it("dá para cadastrar meio de pagamento sem sair do formulário", async () => {
    const { usuario } = montar();

    await usuario.click(screen.getByRole("button", { name: "+ novo" }));

    expect(screen.getByLabelText("Nome do novo meio de pagamento")).toBeTruthy();
  });
});
