import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { criarMeioDePagamento } from "@/app/actions/meios-de-pagamento";
import { NovoMeio } from "./novo-meio";

/**
 * Derivado de CADCOL-08 (ACs 1 a 3, 5 e 6, e o id de AC 4) e do Done-when da
 * T18: o formulário de criação no painel, com os campos, as regras, a ajuda e
 * as mensagens do cadastro de meio de hoje. Quem avisa e abre o meio criado é
 * a aba (T19); o formulário entrega o id.
 *
 * Os limites dos dois lados (L-029, L-041): 41 caracteres e os dias 0 e 32
 * não chegam ao servidor. Toda mensagem de campo é procurada junto do campo,
 * no bloco dele (L-018). Nomes genéricos (AD-009).
 */

afterEach(cleanup);

const CRIADO = "55555555-5555-4555-8555-555555555555";

const AJUDA = "Ele passa a valer para todos os meses, inclusive os que ainda não chegaram.";
const AJUDA_DO_ROTULO =
  "Rótulo não é meio de pagamento: é uma etiqueta para separar um gasto específico, sem ciclo e sem fatura.";

function criou() {
  return vi.fn(async (payload: unknown) => ({
    ok: true as const,
    data: {
      id: CRIADO,
      nome: (payload as { nome: string }).nome,
      geraFatura: (payload as { tipo: string }).tipo === "CARTAO_CREDITO",
    },
  }));
}

function montar(criar: ReturnType<typeof vi.fn> = criou()) {
  const aoCriado = vi.fn();
  const aoCancelar = vi.fn();
  render(
    <div data-testid="painel">
      <NovoMeio
        criarMeioDePagamento={criar as unknown as typeof criarMeioDePagamento}
        aoCriado={aoCriado}
        aoCancelar={aoCancelar}
      />
    </div>,
  );
  return { criar, aoCriado, aoCancelar, usuario: userEvent.setup() };
}

function formulario(): HTMLElement {
  return within(screen.getByTestId("painel")).getByRole("form", {
    name: "Novo meio de pagamento",
  });
}

function campo(rotulo: string): HTMLInputElement {
  return within(formulario()).getByRole<HTMLInputElement>("textbox", { name: rotulo });
}

function dia(rotulo: string): HTMLInputElement | null {
  return within(formulario()).queryByRole<HTMLInputElement>("textbox", { name: rotulo });
}

function tipo(): HTMLSelectElement {
  return within(formulario()).getByRole<HTMLSelectElement>("combobox", { name: "Tipo" });
}

function criarMeio(): HTMLElement {
  return within(formulario()).getByRole("button", { name: "Criar meio" });
}

async function preencher(
  usuario: ReturnType<typeof userEvent.setup>,
  valores: { readonly nome?: string; readonly fechamento?: string; readonly vencimento?: string },
) {
  for (const [rotulo, texto] of [
    ["Nome", valores.nome],
    ["Dia de fechamento", valores.fechamento],
    ["Dia de vencimento", valores.vencimento],
  ] as const) {
    if (texto !== undefined) {
      await usuario.click(campo(rotulo));
      await usuario.paste(texto);
    }
  }
}

/** A mensagem junto do campo: o `alert` no bloco dele, que o marca e o descreve. */
function erroDoCampo(alvo: HTMLInputElement): string | null {
  const bloco = alvo.parentElement;
  if (bloco === null) {
    throw new Error("o campo não tem bloco");
  }
  const alerta = within(bloco).getByRole("alert");
  expect(alvo.getAttribute("aria-invalid")).toBe("true");
  expect(alvo.getAttribute("aria-describedby")).toBe(alerta.id);
  return alerta.textContent;
}

describe("o formulário (CADCOL-08, AC 1)", () => {
  it('tem o título "Novo meio de pagamento", "Nome", "Tipo" com os três, "Criar meio" e "Cancelar"', () => {
    montar();

    const titulo = within(screen.getByTestId("painel")).getByRole("heading", { level: 2 });
    expect(titulo.textContent).toBe("Novo meio de pagamento");
    expect(titulo.getAttribute("tabindex")).toBe("-1");
    expect(campo("Nome").value).toBe("");
    expect(
      within(tipo())
        .getAllByRole("option")
        .map((opcao) => opcao.textContent),
    ).toEqual(["Cartão de crédito", "Conta corrente", "Rótulo"]);
    expect(criarMeio()).toBeTruthy();
    expect(within(formulario()).getByRole("button", { name: "Cancelar" })).toBeTruthy();
  });

  it('começa em "Cartão de crédito"', () => {
    montar();

    expect(tipo().value).toBe("CARTAO_CREDITO");
    expect(
      within(tipo()).getByRole<HTMLOptionElement>("option", { name: "Cartão de crédito" }).selected,
    ).toBe(true);
  });
});

describe("os dias só com cartão (CADCOL-08, AC 2)", () => {
  it("escolher Conta corrente tira os dois dias, e voltar a Cartão de crédito os traz", async () => {
    const { usuario } = montar();
    expect(dia("Dia de fechamento")).not.toBeNull();
    expect(dia("Dia de vencimento")).not.toBeNull();

    await usuario.selectOptions(tipo(), "Conta corrente");

    expect(dia("Dia de fechamento")).toBeNull();
    expect(dia("Dia de vencimento")).toBeNull();

    await usuario.selectOptions(tipo(), "Cartão de crédito");

    expect(dia("Dia de fechamento")).not.toBeNull();
    expect(dia("Dia de vencimento")).not.toBeNull();
  });
});

describe("a ajuda de hoje (CADCOL-08, AC 3)", () => {
  it("no cartão e na conta, a de que ele vale para todos os meses", async () => {
    const { usuario } = montar();
    expect(within(formulario()).getByText(AJUDA)).toBeTruthy();

    await usuario.selectOptions(tipo(), "Conta corrente");

    expect(within(formulario()).getByText(AJUDA)).toBeTruthy();
    expect(within(formulario()).queryByText(AJUDA_DO_ROTULO)).toBeNull();
  });

  it("no rótulo, a de que ele é uma etiqueta", async () => {
    const { usuario } = montar();

    await usuario.selectOptions(tipo(), "Rótulo");

    expect(within(formulario()).getByText(AJUDA_DO_ROTULO)).toBeTruthy();
    expect(within(formulario()).queryByText(AJUDA)).toBeNull();
  });
});

describe("as regras no navegador (CADCOL-08, AC 3; L-029, L-041)", () => {
  it("o nome vazio não chega ao servidor, e a mensagem fica junto do campo", async () => {
    const { criar, aoCriado, usuario } = montar();
    await preencher(usuario, { fechamento: "25", vencimento: "5" });

    await usuario.click(criarMeio());

    expect(erroDoCampo(campo("Nome"))).toBe("Informe o nome do meio de pagamento.");
    expect(criar).not.toHaveBeenCalled();
    expect(aoCriado).not.toHaveBeenCalled();
  });

  it("o nome com 41 caracteres não chega ao servidor, e diz o limite junto do campo", async () => {
    const { criar, usuario } = montar();
    await preencher(usuario, { nome: "a".repeat(41), fechamento: "25", vencimento: "5" });

    await usuario.click(criarMeio());

    expect(erroDoCampo(campo("Nome"))).toBe("O nome pode ter no máximo 40 caracteres.");
    expect(criar).not.toHaveBeenCalled();
  });

  it("o dia 0 no fechamento não chega ao servidor, e a mensagem fica junto dele", async () => {
    const { criar, usuario } = montar();
    await preencher(usuario, { nome: "Cartão Novo", fechamento: "0", vencimento: "10" });

    await usuario.click(criarMeio());

    expect(erroDoCampo(campo("Dia de fechamento"))).toBe("O dia de fechamento vai de 1 a 31.");
    expect(campo("Dia de vencimento").getAttribute("aria-invalid")).toBeNull();
    expect(criar).not.toHaveBeenCalled();
  });

  it("o dia 32 no vencimento não chega ao servidor, e a mensagem fica junto dele", async () => {
    const { criar, usuario } = montar();
    await preencher(usuario, { nome: "Cartão Novo", fechamento: "3", vencimento: "32" });

    await usuario.click(criarMeio());

    expect(erroDoCampo(campo("Dia de vencimento"))).toBe("O dia de vencimento vai de 1 a 31.");
    expect(campo("Dia de fechamento").getAttribute("aria-invalid")).toBeNull();
    expect(criar).not.toHaveBeenCalled();
  });

  it("os 40 caracteres e os dias 1 e 31 chegam ao servidor", async () => {
    const { criar, usuario } = montar();
    await preencher(usuario, { nome: "a".repeat(40), fechamento: "1", vencimento: "31" });

    await usuario.click(criarMeio());

    expect(criar).toHaveBeenCalledWith({
      nome: "a".repeat(40),
      tipo: "CARTAO_CREDITO",
      diaFechamento: 1,
      diaVencimento: 31,
    });
  });
});

describe("criar (CADCOL-08, AC 4)", () => {
  it("o cartão vai com os dias, e o id do criado vai para quem abriu o formulário", async () => {
    const { criar, aoCriado, usuario } = montar();
    await preencher(usuario, { nome: " Cartão  Novo ", fechamento: "3", vencimento: "10" });

    await usuario.click(criarMeio());

    expect(criar).toHaveBeenCalledTimes(1);
    expect(criar).toHaveBeenCalledWith({
      nome: "Cartão Novo",
      tipo: "CARTAO_CREDITO",
      diaFechamento: 3,
      diaVencimento: 10,
    });
    expect(aoCriado).toHaveBeenCalledTimes(1);
    expect(aoCriado).toHaveBeenCalledWith(CRIADO);
  });

  it("a conta vai sem dias", async () => {
    const { criar, aoCriado, usuario } = montar();
    await usuario.selectOptions(tipo(), "Conta corrente");
    await preencher(usuario, { nome: "Conta Nova" });

    await usuario.click(criarMeio());

    expect(criar).toHaveBeenCalledWith({ nome: "Conta Nova", tipo: "CONTA_CORRENTE" });
    expect(aoCriado).toHaveBeenCalledWith(CRIADO);
  });
});

describe("a recusa do servidor (CADCOL-08, AC 5)", () => {
  it("o nome de um meio ativo aparece junto do campo, sem abrir nada", async () => {
    const mensagem = "Já existe um meio de pagamento com esse nome.";
    const criar = vi.fn(async () => ({
      ok: false as const,
      erro: { code: "VALIDACAO", mensagem, campos: { nome: mensagem } },
    }));
    const { aoCriado, usuario } = montar(criar);
    await usuario.selectOptions(tipo(), "Conta corrente");
    await preencher(usuario, { nome: "conta corrente" });

    await usuario.click(criarMeio());

    expect(await within(formulario()).findByRole("alert")).toBeTruthy();
    expect(erroDoCampo(campo("Nome"))).toBe(mensagem);
    expect(aoCriado).not.toHaveBeenCalled();
  });

  it("a recusa sem campo aparece no formulário, sem abrir nada", async () => {
    const mensagem = "Não foi possível concluir a operação. Tente de novo. (ref. 1)";
    const criar = vi.fn(async () => ({
      ok: false as const,
      erro: { code: "ERRO_INESPERADO", mensagem },
    }));
    const { aoCriado, usuario } = montar(criar);
    await preencher(usuario, { nome: "Cartão Novo", fechamento: "3", vencimento: "10" });

    await usuario.click(criarMeio());

    expect((await within(formulario()).findByRole("alert")).textContent).toBe(mensagem);
    expect(campo("Nome").getAttribute("aria-invalid")).toBeNull();
    expect(aoCriado).not.toHaveBeenCalled();
  });
});

describe('"Cancelar" (CADCOL-08, AC 6)', () => {
  it("com o formulário válido, chama aoCancelar sem chamar o servidor", async () => {
    const { criar, aoCancelar, aoCriado, usuario } = montar();
    await preencher(usuario, { nome: "Cartão Novo", fechamento: "3", vencimento: "10" });

    await usuario.click(within(formulario()).getByRole("button", { name: "Cancelar" }));

    expect(aoCancelar).toHaveBeenCalledTimes(1);
    expect(criar).not.toHaveBeenCalled();
    expect(aoCriado).not.toHaveBeenCalled();
  });
});
