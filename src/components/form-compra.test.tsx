import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { criarCompra } from "@/app/actions/compras";
import { FormCompra } from "./form-compra";

/**
 * Testes derivados do Done-when de T50 e dos ACs de PARC-01, PARC-04, PARC-06
 * e UI-02. O que está sob teste é o que o usuário vê **antes** de gravar: o
 * preview precisa ser exatamente o que a Server Action vai persistir.
 */

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const MEIOS = [{ id: "22222222-2222-4222-8222-222222222222", nome: "Cartão Roxo" }];
const CATEGORIAS = [{ id: "33333333-3333-4333-8333-333333333333", nome: "Categoria Um" }];
const USUARIOS = [{ id: "11111111-1111-4111-8111-111111111111", nome: "Pessoa A" }];

afterEach(() => {
  cleanup();
  refresh.mockReset();
});

function montar(enviar: typeof criarCompra = vi.fn(), competencia = "2026-03") {
  const utils = render(
    <FormCompra
      competencia={competencia}
      meios={MEIOS}
      categorias={CATEGORIAS}
      usuarios={USUARIOS}
      enviar={enviar}
    />,
  );
  return { ...utils, usuario: userEvent.setup() };
}

function linhasDaPrevia(): string[] {
  return within(screen.getByRole("region", { name: "Previsão das parcelas" }))
    .getAllByRole("listitem")
    .map((item) => item.textContent ?? "");
}

describe("preview ao vivo das parcelas (PARC-01, AC 1 e AC 3)", () => {
  it("R$ 1.000,00 em 3 parcelas mostra 333,34 / 333,33 / 333,33 com as competências", async () => {
    const { usuario } = montar();

    await usuario.type(screen.getByLabelText("Valor total (R$)"), "1.000,00");
    await usuario.clear(screen.getByLabelText("Quantidade de parcelas"));
    await usuario.type(screen.getByLabelText("Quantidade de parcelas"), "3");

    expect(linhasDaPrevia()).toEqual([
      "1/3 Março de 2026R$ 333,34",
      "2/3 Abril de 2026R$ 333,33",
      "3/3 Maio de 2026R$ 333,33",
      "Total da compraR$ 1.000,00",
    ]);
  });

  it("uma compra em 2026-12 em 3x atravessa a virada de ano no preview (COMP-01, AC 1)", async () => {
    const { usuario } = montar(vi.fn(), "2026-12");

    await usuario.type(screen.getByLabelText("Valor total (R$)"), "300,00");
    await usuario.clear(screen.getByLabelText("Quantidade de parcelas"));
    await usuario.type(screen.getByLabelText("Quantidade de parcelas"), "3");

    expect(linhasDaPrevia().slice(0, 3)).toEqual([
      "1/3 Dezembro de 2026R$ 100,00",
      "2/3 Janeiro de 2027R$ 100,00",
      "3/3 Fevereiro de 2027R$ 100,00",
    ]);
  });
});

describe("modo de entrada (PARC-04, AC 4)", () => {
  it("alternar para valor da parcela recalcula o total como parcela x quantidade", async () => {
    const { usuario } = montar();

    await usuario.type(screen.getByLabelText("Valor total (R$)"), "300,00");
    await usuario.clear(screen.getByLabelText("Quantidade de parcelas"));
    await usuario.type(screen.getByLabelText("Quantidade de parcelas"), "3");
    expect(linhasDaPrevia()).toContain("Total da compraR$ 300,00");

    await usuario.click(screen.getByRole("radio", { name: "Valor da parcela" }));

    expect(linhasDaPrevia()).toEqual([
      "1/3 Março de 2026R$ 300,00",
      "2/3 Abril de 2026R$ 300,00",
      "3/3 Maio de 2026R$ 300,00",
      "Total da compraR$ 900,00",
    ]);
  });
});

describe("compra já em andamento (PARC-06)", () => {
  it("parcela 8 de 10 mostra apenas as parcelas 8, 9 e 10 no preview", async () => {
    const { usuario } = montar();

    await usuario.click(screen.getByRole("radio", { name: "Valor da parcela" }));
    await usuario.type(screen.getByLabelText("Valor da parcela (R$)"), "60,00");
    await usuario.clear(screen.getByLabelText("Quantidade de parcelas"));
    await usuario.type(screen.getByLabelText("Quantidade de parcelas"), "10");
    await usuario.clear(screen.getByLabelText("Já estou na parcela"));
    await usuario.type(screen.getByLabelText("Já estou na parcela"), "8");

    expect(linhasDaPrevia()).toEqual([
      "8/10 Março de 2026R$ 60,00",
      "9/10 Abril de 2026R$ 60,00",
      "10/10 Maio de 2026R$ 60,00",
      "Total da compraR$ 600,00",
    ]);
  });
});

describe("chave de idempotência (PARC-05, AC 9)", () => {
  it("existe no formulário assim que ele abre, antes de qualquer interação", () => {
    const { container } = montar();

    const chave = container.querySelector<HTMLInputElement>('input[name="idempotencyKey"]');

    expect(chave?.value).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("é a mesma em dois envios seguidos do mesmo formulário: duplo-clique não duplica", async () => {
    const enviar = vi.fn(async (payload: unknown) => ({
      ok: true as const,
      data: {
        compraId: "c1",
        descricao: "Compra parcelada A",
        valorTotalCentavos: 30000,
        qtdParcelas: 3,
        parcelas: [{ numero: 1, valorCentavos: 30000, competencia: "2026-03" }],
        jaExistia: false,
      },
      payload,
    }));
    const { usuario, container } = montar(enviar as unknown as typeof criarCompra);
    const chaveAoAbrir = container.querySelector<HTMLInputElement>(
      'input[name="idempotencyKey"]',
    )?.value;

    await usuario.type(screen.getByLabelText("Descrição"), "Compra parcelada A");
    await usuario.type(screen.getByLabelText("Valor total (R$)"), "300,00");
    await usuario.click(screen.getByRole("button", { name: "Cadastrar compra" }));

    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(1));
    const enviado = enviar.mock.calls[0]?.[0] as { idempotencyKey?: string } | undefined;
    expect(enviado?.idempotencyKey).toBe(chaveAoAbrir);
  });
});

describe("estados de carregamento e de erro (UI-02, AC 7 e AC 8)", () => {
  it("desabilita o botão enquanto o envio está em andamento", async () => {
    let liberar = () => {};
    const enviar = vi.fn(
      () =>
        new Promise((resolve) => {
          liberar = () =>
            resolve({
              ok: true,
              data: {
                compraId: "c1",
                descricao: "Compra parcelada A",
                valorTotalCentavos: 30000,
                qtdParcelas: 1,
                parcelas: [{ numero: 1, valorCentavos: 30000, competencia: "2026-03" }],
                jaExistia: false,
              },
            });
        }),
    );
    const { usuario } = montar(enviar as unknown as typeof criarCompra);

    await usuario.type(screen.getByLabelText("Descrição"), "Compra parcelada A");
    await usuario.type(screen.getByLabelText("Valor total (R$)"), "300,00");
    await usuario.click(screen.getByRole("button", { name: "Cadastrar compra" }));

    const botao = await screen.findByRole("button", { name: "Gravando…" });
    expect(botao).toHaveProperty("disabled", true);

    liberar();
    await screen.findByRole("button", { name: "Cadastrar compra" });
  });

  it("exibe o erro devolvido pela action no campo que ele endereça", async () => {
    const enviar = vi.fn(async () => ({
      ok: false as const,
      erro: {
        code: "MEIO_PAGAMENTO_ARQUIVADO",
        mensagem: "Esse meio de pagamento está arquivado e não recebe compra nova.",
        campos: {
          meioPagamentoId: "Esse meio de pagamento está arquivado e não recebe compra nova.",
        },
      },
    }));
    const { usuario } = montar(enviar as unknown as typeof criarCompra);

    await usuario.type(screen.getByLabelText("Descrição"), "Compra parcelada A");
    await usuario.type(screen.getByLabelText("Valor total (R$)"), "300,00");
    await usuario.click(screen.getByRole("button", { name: "Cadastrar compra" }));

    expect(
      await screen.findByText("Esse meio de pagamento está arquivado e não recebe compra nova."),
    ).toBeDefined();
    expect(screen.getByLabelText("Meio de pagamento")).toHaveProperty("ariaInvalid", "true");
  });

  it("exibe o erro geral em role=alert quando ele não pertence a nenhum campo", async () => {
    const enviar = vi.fn(async () => ({
      ok: false as const,
      erro: {
        code: "ERRO_INESPERADO",
        mensagem:
          "Não foi possível concluir a operação. Tente de novo. Se continuar, informe o código a1b2c3d4.",
      },
    }));
    const { usuario } = montar(enviar as unknown as typeof criarCompra);

    await usuario.type(screen.getByLabelText("Descrição"), "Compra parcelada A");
    await usuario.type(screen.getByLabelText("Valor total (R$)"), "300,00");
    await usuario.click(screen.getByRole("button", { name: "Cadastrar compra" }));

    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toContain("informe o código a1b2c3d4");
  });

  it("não chama a action com o formulário em branco e aponta os campos", async () => {
    const enviar = vi.fn();
    const { usuario } = montar(enviar as unknown as typeof criarCompra);

    await usuario.click(screen.getByRole("button", { name: "Cadastrar compra" }));

    expect(enviar).not.toHaveBeenCalled();
    expect(screen.getByText("Descreva a compra.")).toBeDefined();
    expect(screen.getByText("O valor precisa ser maior que zero.")).toBeDefined();
  });

  it("não chama a action com valor zero e aponta o campo do valor (PARC-05, AC 7)", async () => {
    const enviar = vi.fn();
    const { usuario } = montar(enviar as unknown as typeof criarCompra);

    await usuario.type(screen.getByLabelText("Descrição"), "Compra parcelada A");
    await usuario.type(screen.getByLabelText("Valor total (R$)"), "0,00");
    await usuario.click(screen.getByRole("button", { name: "Cadastrar compra" }));

    expect(enviar).not.toHaveBeenCalled();
    expect(screen.getByText("O valor precisa ser maior que zero.")).toBeDefined();
    expect(screen.getByLabelText("Valor total (R$)")).toHaveProperty("ariaInvalid", "true");
  });
});
