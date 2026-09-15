import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { criarCategoria } from "@/app/actions/categorias";
import type { criarCompra } from "@/app/actions/compras";
import type { criarMeioDePagamento } from "@/app/actions/meios-de-pagamento";
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

/** Devolve sempre uma categoria nova; os testes que precisam de outro
 *  comportamento passam o seu próprio dublê. */
const criarCategoriaOk: typeof criarCategoria = vi.fn(async (payload: unknown) => ({
  ok: true as const,
  data: {
    id: "44444444-4444-4444-8444-444444444444",
    nome: (payload as { nome: string }).nome,
    jaExistia: false,
    reativada: false,
  },
}));

const criarMeioOk: typeof criarMeioDePagamento = vi.fn(async (payload: unknown) => ({
  ok: true as const,
  data: {
    id: "55555555-5555-4555-8555-555555555555",
    nome: (payload as { nome: string }).nome,
    geraFatura: true,
  },
}));

function montar(
  enviar: typeof criarCompra = vi.fn(),
  competencia = "2026-03",
  criarCategoriaFake: typeof criarCategoria = criarCategoriaOk,
  criarMeioFake: typeof criarMeioDePagamento = criarMeioOk,
) {
  const utils = render(
    <FormCompra
      competencia={competencia}
      meios={MEIOS}
      categorias={CATEGORIAS}
      usuarios={USUARIOS}
      enviar={enviar}
      criarCategoria={criarCategoriaFake}
      criarMeioDePagamento={criarMeioFake}
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

/**
 * O que estes testes prendem é a promessa que justifica a feature: **criar a
 * categoria não pode custar o formulário.** Quem está no meio de um
 * lançamento percebe que falta a categoria, cria, e continua de onde estava —
 * se qualquer campo se perder no caminho, a feature trocou uma re-digitação
 * por outra.
 */
describe("criar categoria sem sair do formulário", () => {
  const CAMPO_NOVA = "Nome da nova categoria";

  it("o atalho fica visível sem precisar abrir o seletor", () => {
    montar();

    expect(screen.getByRole("button", { name: "+ nova" })).toBeTruthy();
    expect(screen.queryByLabelText(CAMPO_NOVA)).toBeNull();
  });

  it("abrir o atalho revela o campo e esconde o próprio atalho", async () => {
    const { usuario } = montar();

    await usuario.click(screen.getByRole("button", { name: "+ nova" }));

    expect(screen.getByLabelText(CAMPO_NOVA)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "+ nova" })).toBeNull();
  });

  it("a categoria criada entra na lista e já vem selecionada", async () => {
    const { usuario } = montar();

    await usuario.click(screen.getByRole("button", { name: "+ nova" }));
    await usuario.type(screen.getByLabelText(CAMPO_NOVA), "Mercado");
    await usuario.click(screen.getByRole("button", { name: "Criar" }));

    const seletor = await screen.findByLabelText("Categoria");
    await waitFor(() => {
      expect(within(seletor as HTMLSelectElement).getByText("Mercado")).toBeTruthy();
    });
    expect((seletor as HTMLSelectElement).value).toBe("44444444-4444-4444-8444-444444444444");
  });

  it("criar categoria não apaga nada do que já foi preenchido", async () => {
    const { usuario } = montar();

    await usuario.type(screen.getByLabelText("Descrição"), "Geladeira");
    await usuario.type(screen.getByLabelText("Valor total (R$)"), "1.000,00");
    await usuario.clear(screen.getByLabelText("Quantidade de parcelas"));
    await usuario.type(screen.getByLabelText("Quantidade de parcelas"), "3");

    await usuario.click(screen.getByRole("button", { name: "+ nova" }));
    await usuario.type(screen.getByLabelText(CAMPO_NOVA), "Mercado");
    await usuario.click(screen.getByRole("button", { name: "Criar" }));

    await waitFor(() => {
      expect(screen.queryByLabelText(CAMPO_NOVA)).toBeNull();
    });
    expect((screen.getByLabelText("Descrição") as HTMLInputElement).value).toBe("Geladeira");
    expect((screen.getByLabelText("Valor total (R$)") as HTMLInputElement).value).toBe("1.000,00");
    // A prévia inteira sobrevive — as três parcelas e o total, intactos.
    expect(linhasDaPrevia()).toEqual([
      "1/3 Março de 2026R$ 333,34",
      "2/3 Abril de 2026R$ 333,33",
      "3/3 Maio de 2026R$ 333,33",
      "Total da compraR$ 1.000,00",
    ]);
  });

  it("nome vazio nem chega ao servidor: reprova no schema compartilhado", async () => {
    const criar = vi.fn();
    const { usuario } = montar(vi.fn(), "2026-03", criar as never);

    await usuario.click(screen.getByRole("button", { name: "+ nova" }));
    await usuario.type(screen.getByLabelText(CAMPO_NOVA), "   ");
    await usuario.click(screen.getByRole("button", { name: "Criar" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("Informe o nome da categoria."),
    );
    expect(criar).not.toHaveBeenCalled();
  });

  it("erro do servidor aparece em alerta e o campo continua aberto para corrigir", async () => {
    const criar = vi.fn(async () => ({
      ok: false as const,
      erro: { code: "ERRO_INESPERADO", mensagem: "Não foi possível concluir a operação." },
    }));
    const { usuario } = montar(vi.fn(), "2026-03", criar as never);

    await usuario.click(screen.getByRole("button", { name: "+ nova" }));
    await usuario.type(screen.getByLabelText(CAMPO_NOVA), "Mercado");
    await usuario.click(screen.getByRole("button", { name: "Criar" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("Não foi possível concluir a operação."),
    );
    expect((screen.getByLabelText(CAMPO_NOVA) as HTMLInputElement).value).toBe("Mercado");
  });

  it("nome já existente volta selecionado em vez de virar erro", async () => {
    const criar = vi.fn(async () => ({
      ok: true as const,
      data: {
        id: CATEGORIAS[0]?.id ?? "",
        nome: "Categoria Um",
        jaExistia: true,
        reativada: false,
      },
    }));
    const { usuario } = montar(vi.fn(), "2026-03", criar as never);

    await usuario.click(screen.getByRole("button", { name: "+ nova" }));
    await usuario.type(screen.getByLabelText(CAMPO_NOVA), "categoria um");
    await usuario.click(screen.getByRole("button", { name: "Criar" }));

    await waitFor(() => {
      expect(screen.queryByRole("alert")).toBeNull();
    });
    // Uma só opção, e não duas: a lista não ganhou uma gêmea.
    const opcoes = within(screen.getByLabelText("Categoria") as HTMLSelectElement)
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(opcoes.filter((nome) => nome === "Categoria Um")).toHaveLength(1);
    expect((screen.getByLabelText("Categoria") as HTMLSelectElement).value).toBe(CATEGORIAS[0]?.id);
  });

  it("Enter no campo cria a categoria e não submete a compra", async () => {
    const enviar = vi.fn();
    const { usuario } = montar(enviar);

    await usuario.click(screen.getByRole("button", { name: "+ nova" }));
    await usuario.type(screen.getByLabelText(CAMPO_NOVA), "Mercado{Enter}");

    await waitFor(() => {
      expect(screen.queryByLabelText(CAMPO_NOVA)).toBeNull();
    });
    expect(enviar).not.toHaveBeenCalled();
  });

  it("cancelar fecha o campo sem criar nada", async () => {
    const criar = vi.fn();
    const { usuario } = montar(vi.fn(), "2026-03", criar as never);

    await usuario.click(screen.getByRole("button", { name: "+ nova" }));
    await usuario.type(screen.getByLabelText(CAMPO_NOVA), "Mercado");
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByLabelText(CAMPO_NOVA)).toBeNull();
    expect(criar).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "+ nova" })).toBeTruthy();
  });
});

/**
 * O cadastro de meio de pagamento reusa o mesmo componente do de categoria, e
 * é por isso que aqui não se repete o que já foi provado lá (abrir, fechar,
 * preservar o formulário, `Enter` que não submete). O que se prova aqui é o
 * que **só** este cadastro tem: a bicondicional entre tipo e ciclo de fatura,
 * que é regra do banco antes de ser regra de tela.
 */
describe("criar meio de pagamento sem sair do formulário", () => {
  const NOME = "Nome do novo meio de pagamento";

  async function abrir(usuario: ReturnType<typeof userEvent.setup>) {
    await usuario.click(screen.getByRole("button", { name: "+ novo" }));
  }

  it("abre já em cartão de crédito, com os dois dias de ciclo à mostra", async () => {
    const { usuario } = montar();

    await abrir(usuario);

    expect((screen.getByLabelText("Tipo") as HTMLSelectElement).value).toBe("CARTAO_CREDITO");
    expect(screen.getByLabelText("Dia de fechamento")).toBeTruthy();
    expect(screen.getByLabelText("Dia de vencimento")).toBeTruthy();
  });

  it.each([
    ["CONTA_CORRENTE", "Conta corrente"],
    ["ROTULO", "Rótulo"],
  ])("esconde os dias de ciclo em %s, que o banco proíbe de tê-los", async (valor) => {
    const { usuario } = montar();

    await abrir(usuario);
    await usuario.selectOptions(screen.getByLabelText("Tipo"), valor);

    expect(screen.queryByLabelText("Dia de fechamento")).toBeNull();
    expect(screen.queryByLabelText("Dia de vencimento")).toBeNull();
  });

  it("explica o que é rótulo, que ninguém adivinha", async () => {
    const { usuario } = montar();

    await abrir(usuario);
    await usuario.selectOptions(screen.getByLabelText("Tipo"), "ROTULO");

    expect(screen.getByText(/etiqueta para separar um gasto/)).toBeTruthy();
  });

  it("cartão sem dia de fechamento nem chega ao servidor", async () => {
    const criar = vi.fn();
    const { usuario } = montar(vi.fn(), "2026-03", criarCategoriaOk, criar as never);

    await abrir(usuario);
    await usuario.type(screen.getByLabelText(NOME), "Cartão Novo");
    await usuario.type(screen.getByLabelText("Dia de vencimento"), "20");
    await usuario.click(screen.getByRole("button", { name: "Criar" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("dia de fechamento"),
    );
    expect(criar).not.toHaveBeenCalled();
  });

  it("dia fora de 1 a 31 reprova antes de sair do navegador", async () => {
    const criar = vi.fn();
    const { usuario } = montar(vi.fn(), "2026-03", criarCategoriaOk, criar as never);

    await abrir(usuario);
    await usuario.type(screen.getByLabelText(NOME), "Cartão Novo");
    await usuario.type(screen.getByLabelText("Dia de fechamento"), "32");
    await usuario.type(screen.getByLabelText("Dia de vencimento"), "5");
    await usuario.click(screen.getByRole("button", { name: "Criar" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("1 a 31"),
    );
    expect(criar).not.toHaveBeenCalled();
  });

  it("um cartão completo é enviado com os dois dias", async () => {
    const criar = vi.fn(async () => ({
      ok: true as const,
      data: { id: "55555555-5555-4555-8555-555555555555", nome: "Cartão Novo" },
    }));
    const { usuario } = montar(vi.fn(), "2026-03", criarCategoriaOk, criar as never);

    await abrir(usuario);
    await usuario.type(screen.getByLabelText(NOME), "Cartão Novo");
    await usuario.type(screen.getByLabelText("Dia de fechamento"), "25");
    await usuario.type(screen.getByLabelText("Dia de vencimento"), "5");
    await usuario.click(screen.getByRole("button", { name: "Criar" }));

    await waitFor(() => {
      expect(criar).toHaveBeenCalledWith({
        nome: "Cartão Novo",
        tipo: "CARTAO_CREDITO",
        diaFechamento: 25,
        diaVencimento: 5,
      });
    });
  });

  it("conta corrente é enviada sem nenhum dia de ciclo", async () => {
    const criar = vi.fn(async () => ({
      ok: true as const,
      data: { id: "55555555-5555-4555-8555-555555555555", nome: "Conta Nova" },
    }));
    const { usuario } = montar(vi.fn(), "2026-03", criarCategoriaOk, criar as never);

    await abrir(usuario);
    await usuario.type(screen.getByLabelText(NOME), "Conta Nova");
    await usuario.selectOptions(screen.getByLabelText("Tipo"), "CONTA_CORRENTE");
    await usuario.click(screen.getByRole("button", { name: "Criar" }));

    await waitFor(() => {
      expect(criar).toHaveBeenCalledWith({ nome: "Conta Nova", tipo: "CONTA_CORRENTE" });
    });
  });

  it("o meio criado entra na lista e já vem selecionado", async () => {
    const { usuario } = montar();

    await abrir(usuario);
    await usuario.type(screen.getByLabelText(NOME), "Cartão Novo");
    await usuario.type(screen.getByLabelText("Dia de fechamento"), "25");
    await usuario.type(screen.getByLabelText("Dia de vencimento"), "5");
    await usuario.click(screen.getByRole("button", { name: "Criar" }));

    const seletor = screen.getByLabelText("Meio de pagamento") as HTMLSelectElement;
    await waitFor(() => {
      expect(within(seletor).getByText("Cartão Novo")).toBeTruthy();
    });
    expect(seletor.value).toBe("55555555-5555-4555-8555-555555555555");
  });

  it("criar meio não apaga nada do que já foi preenchido", async () => {
    const { usuario } = montar();

    await usuario.type(screen.getByLabelText("Descrição"), "Geladeira");
    await usuario.type(screen.getByLabelText("Valor total (R$)"), "1.000,00");

    await abrir(usuario);
    await usuario.type(screen.getByLabelText(NOME), "Conta Nova");
    await usuario.selectOptions(screen.getByLabelText("Tipo"), "CONTA_CORRENTE");
    await usuario.click(screen.getByRole("button", { name: "Criar" }));

    await waitFor(() => {
      expect(screen.queryByLabelText(NOME)).toBeNull();
    });
    expect((screen.getByLabelText("Descrição") as HTMLInputElement).value).toBe("Geladeira");
    expect((screen.getByLabelText("Valor total (R$)") as HTMLInputElement).value).toBe("1.000,00");
  });

  it("erro do servidor aparece em alerta e o bloco continua aberto", async () => {
    const criar = vi.fn(async () => ({
      ok: false as const,
      erro: { code: "VALIDACAO", mensagem: "Já existe um meio de pagamento com esse nome." },
    }));
    const { usuario } = montar(vi.fn(), "2026-03", criarCategoriaOk, criar as never);

    await abrir(usuario);
    await usuario.type(screen.getByLabelText(NOME), "Cartão Roxo");
    await usuario.type(screen.getByLabelText("Dia de fechamento"), "25");
    await usuario.type(screen.getByLabelText("Dia de vencimento"), "5");
    await usuario.click(screen.getByRole("button", { name: "Criar" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("Já existe um meio de pagamento com esse nome."),
    );
    expect((screen.getByLabelText(NOME) as HTMLInputElement).value).toBe("Cartão Roxo");
  });
});
