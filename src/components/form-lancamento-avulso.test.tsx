import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { criarCategoria } from "@/app/actions/categorias";
import type { criarLancamentoAvulso } from "@/app/actions/lancamentos";
import type { criarMeioDePagamento } from "@/app/actions/meios-de-pagamento";
import { FormLancamentoAvulso } from "./form-lancamento-avulso";

/** Testes derivados de AVUL-01 (AC 2 e 3) e AVUL-02 (AC 2, 4, 5 e 6). */

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

afterEach(cleanup);

const CONTA = "11111111-1111-4111-8111-111111111111";
const CARTAO = "22222222-2222-4222-8222-222222222222";
const PESSOA = "33333333-3333-4333-8333-333333333333";

const MEIOS = [
  { id: CONTA, nome: "Conta Corrente", geraFatura: false },
  { id: CARTAO, nome: "Cartão Roxo", geraFatura: true },
];

const categoriaOk: typeof criarCategoria = vi.fn(async () => ({
  ok: true as const,
  data: { id: "cat-1", nome: "Mercado", jaExistia: false, reativada: false },
}));

const meioOk: typeof criarMeioDePagamento = vi.fn(async () => ({
  ok: true as const,
  data: { id: "m-novo", nome: "Cartão Novo", geraFatura: true },
}));

function envioOk() {
  return vi.fn(async (payload: unknown) => ({
    ok: true as const,
    data: {
      id: "l-1",
      descricao: (payload as { descricao: string }).descricao,
      valorCentavos: (payload as { valorCentavos: number }).valorCentavos,
      competencia: "2026-03",
      natureza: (payload as { natureza: "DESPESA" | "RECEITA" }).natureza,
      pago: (payload as { jaPago: boolean }).jaPago,
    },
  })) as unknown as typeof criarLancamentoAvulso;
}

function montar(enviar: typeof criarLancamentoAvulso = envioOk()) {
  render(
    <FormLancamentoAvulso
      competencia="2026-03"
      dataPadrao={"2026-03-10"}
      meios={MEIOS}
      categorias={[{ id: "cat-0", nome: "Alimentação" }]}
      usuarios={[{ id: PESSOA, nome: "Pessoa A" }]}
      enviar={enviar}
      criarCategoria={categoriaOk}
      criarMeioDePagamento={meioOk}
    />,
  );
  return enviar;
}

function caixaDePago(): HTMLInputElement {
  return screen.getByRole("checkbox") as HTMLInputElement;
}

describe("FormLancamentoAvulso — natureza (AVUL-02, AC 2)", () => {
  it("oferece exatamente despesa e receita", () => {
    montar();

    const opcoes = screen.getAllByRole("radio").map((r) => (r as HTMLInputElement).value);
    expect(opcoes).toEqual(["DESPESA", "RECEITA"]);
  });

  it("começa em despesa, que é o gesto mais frequente", () => {
    montar();

    expect(
      (screen.getByRole("radio", { name: "Um dinheiro que sai" }) as HTMLInputElement).checked,
    ).toBe(true);
  });

  it("troca o rótulo da caixa quando vira receita: dinheiro entra, não sai", async () => {
    montar();

    expect(screen.getByLabelText("Já saiu da conta")).toBeDefined();

    await userEvent.click(screen.getByRole("radio", { name: "Um dinheiro que entra" }));

    expect(screen.getByLabelText("Já caiu na conta")).toBeDefined();
  });
});

describe("FormLancamentoAvulso — o padrão da caixa vem do meio (AVUL-02, AC 4 e 5)", () => {
  it("começa marcada, porque o primeiro meio da lista não gera fatura", () => {
    montar();

    expect(caixaDePago().checked).toBe(true);
  });

  it("desmarca sozinha ao escolher um cartão", async () => {
    montar();

    await userEvent.selectOptions(screen.getByLabelText("Meio de pagamento"), CARTAO);

    expect(caixaDePago().checked).toBe(false);
  });

  it("volta a marcar ao escolher conta corrente de novo", async () => {
    montar();
    await userEvent.selectOptions(screen.getByLabelText("Meio de pagamento"), CARTAO);

    await userEvent.selectOptions(screen.getByLabelText("Meio de pagamento"), CONTA);

    expect(caixaDePago().checked).toBe(true);
  });

  /*
   * Um formulário que desfaz o que a pessoa acabou de marcar é pior que um sem
   * padrão nenhum. Depois do primeiro toque, a escolha dela manda.
   */
  it("para de aplicar o padrão depois que a pessoa toca na caixa — AC 6", async () => {
    montar();

    await userEvent.click(caixaDePago());
    expect(caixaDePago().checked).toBe(false);

    await userEvent.selectOptions(screen.getByLabelText("Meio de pagamento"), CONTA);

    expect(caixaDePago().checked).toBe(false);
  });
});

describe("FormLancamentoAvulso — envio", () => {
  it("manda o payload com a natureza, o valor em centavos e a marca de pago", async () => {
    const enviar = montar();

    await userEvent.type(screen.getByLabelText("Descrição"), "Pix recebido");
    await userEvent.type(screen.getByLabelText("Valor (R$)"), "50,00");
    await userEvent.click(screen.getByRole("radio", { name: "Um dinheiro que entra" }));
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar lançamento" }));

    expect(enviar).toHaveBeenCalledWith(
      expect.objectContaining({
        descricao: "Pix recebido",
        natureza: "RECEITA",
        valorCentavos: 5000,
        competencia: "2026-03",
        usuarioId: PESSOA,
        meioPagamentoId: CONTA,
        jaPago: true,
      }),
    );
  });

  it("manda categoria nula quando nenhuma é escolhida", async () => {
    const enviar = montar();

    await userEvent.type(screen.getByLabelText("Descrição"), "Almoço");
    await userEvent.type(screen.getByLabelText("Valor (R$)"), "32,50");
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar lançamento" }));

    expect(enviar).toHaveBeenCalledWith(expect.objectContaining({ categoriaId: null }));
  });

  it("confirma na tela o que foi gravado", async () => {
    montar();

    await userEvent.type(screen.getByLabelText("Descrição"), "Almoço");
    await userEvent.type(screen.getByLabelText("Valor (R$)"), "32,50");
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar lançamento" }));

    const confirmacao = await screen.findByRole("status");
    expect(confirmacao.textContent).toContain("Almoço");
    expect(confirmacao.textContent).toContain("32,50");
  });

  it("limpa descrição e valor depois de gravar, mantendo meio e pessoa", async () => {
    montar();
    await userEvent.selectOptions(screen.getByLabelText("Meio de pagamento"), CARTAO);
    await userEvent.type(screen.getByLabelText("Descrição"), "Farmácia");
    await userEvent.type(screen.getByLabelText("Valor (R$)"), "18,90");

    await userEvent.click(screen.getByRole("button", { name: "Cadastrar lançamento" }));
    await screen.findByRole("status");

    expect((screen.getByLabelText("Descrição") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Valor (R$)") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Meio de pagamento") as HTMLSelectElement).value).toBe(CARTAO);
  });
});

describe("FormLancamentoAvulso — validação antes de enviar (AVUL-01, AC 2 e 3)", () => {
  it("não envia com descrição vazia e aponta o campo", async () => {
    const enviar = montar();

    await userEvent.type(screen.getByLabelText("Valor (R$)"), "32,50");
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar lançamento" }));

    expect(enviar).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Descrição").getAttribute("aria-invalid")).toBe("true");
  });

  it("não envia com valor vazio e aponta o campo", async () => {
    const enviar = montar();

    await userEvent.type(screen.getByLabelText("Descrição"), "Almoço");
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar lançamento" }));

    expect(enviar).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Valor (R$)").getAttribute("aria-invalid")).toBe("true");
  });

  it("exibe o erro por campo que o servidor devolveu", async () => {
    const recusa = vi.fn(async () => ({
      ok: false as const,
      erro: {
        code: "VALIDACAO",
        mensagem: "Confira os campos destacados.",
        campos: { descricao: "Descrição longa demais." },
      },
    })) as unknown as typeof criarLancamentoAvulso;
    montar(recusa);

    await userEvent.type(screen.getByLabelText("Descrição"), "Almoço");
    await userEvent.type(screen.getByLabelText("Valor (R$)"), "32,50");
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar lançamento" }));

    expect(await screen.findByText("Descrição longa demais.")).toBeDefined();
  });

  it("exibe o erro geral quando o servidor recusa sem apontar campo", async () => {
    const recusa = vi.fn(async () => ({
      ok: false as const,
      erro: {
        code: "MEIO_PAGAMENTO_ARQUIVADO",
        mensagem: "Esse meio de pagamento está arquivado e não recebe compra nova.",
      },
    })) as unknown as typeof criarLancamentoAvulso;
    montar(recusa);

    await userEvent.type(screen.getByLabelText("Descrição"), "Almoço");
    await userEvent.type(screen.getByLabelText("Valor (R$)"), "32,50");
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar lançamento" }));

    expect((await screen.findByRole("alert")).textContent).toContain("arquivado");
  });
});

describe("FormLancamentoAvulso — cadastro sem sair do formulário", () => {
  it("cria categoria e a deixa selecionada, sem perder o que já foi digitado", async () => {
    montar();
    await userEvent.type(screen.getByLabelText("Descrição"), "Almoço");

    await userEvent.click(screen.getByRole("button", { name: "+ nova" }));
    await userEvent.type(screen.getByLabelText("Nome da nova categoria"), "Mercado");
    await userEvent.click(screen.getByRole("button", { name: "Criar" }));

    await screen.findByRole("option", { name: "Mercado" });
    expect((screen.getByLabelText("Categoria") as HTMLSelectElement).value).toBe("cat-1");
    expect((screen.getByLabelText("Descrição") as HTMLInputElement).value).toBe("Almoço");
  });

  it("todo campo tem rótulo acessível associado", () => {
    montar();

    for (const rotulo of [
      "Descrição",
      "Valor (R$)",
      "Meio de pagamento",
      "Categoria",
      "De quem é o lançamento",
      "Data",
    ]) {
      expect(screen.getByLabelText(rotulo)).toBeDefined();
    }
  });
});

describe("FormLancamentoAvulso — a língua da receita (ENTR-03)", () => {
  async function marcarReceita() {
    await userEvent.click(screen.getByRole("radio", { name: "Um dinheiro que entra" }));
  }

  it('chama o campo de "Onde o dinheiro cai" — AC 1', async () => {
    montar();

    expect(screen.getByLabelText("Meio de pagamento")).toBeDefined();

    await marcarReceita();

    expect(screen.getByLabelText("Onde o dinheiro cai")).toBeDefined();
    expect(screen.queryByLabelText("Meio de pagamento")).toBeNull();
  });

  it("não oferece cartão de crédito como destino de receita — AC 2", async () => {
    montar();

    expect(screen.getByRole("option", { name: "Cartão Roxo" })).toBeDefined();

    await marcarReceita();

    expect(screen.queryByRole("option", { name: "Cartão Roxo" })).toBeNull();
    expect(screen.getByRole("option", { name: "Conta Corrente" })).toBeDefined();
  });

  /* Filtrar a exibição não bastaria: a seleção continuaria no cartão, e o
     formulário enviaria o que a lista não oferece mais. */
  it("tira a seleção do cartão ao marcar receita — AC 5", async () => {
    montar();
    await userEvent.selectOptions(screen.getByLabelText("Meio de pagamento"), CARTAO);

    await marcarReceita();

    expect((screen.getByLabelText("Onde o dinheiro cai") as HTMLSelectElement).value).toBe(CONTA);
  });

  it("corrige o padrão da caixa junto com a troca automática de meio", async () => {
    montar();
    await userEvent.selectOptions(screen.getByLabelText("Meio de pagamento"), CARTAO);
    expect(caixaDePago().checked).toBe(false);

    await marcarReceita();

    /* Caiu para a conta, que não gera fatura: o Pix já caiu. */
    expect(caixaDePago().checked).toBe(true);
  });

  it("envia o meio corrigido, e não o cartão que estava escolhido", async () => {
    const enviar = montar();
    await userEvent.selectOptions(screen.getByLabelText("Meio de pagamento"), CARTAO);
    await marcarReceita();
    await userEvent.type(screen.getByLabelText("Descrição"), "Pix recebido");
    await userEvent.type(screen.getByLabelText("Valor (R$)"), "50,00");

    await userEvent.click(screen.getByRole("button", { name: "Cadastrar lançamento" }));

    expect(enviar).toHaveBeenCalledWith(
      expect.objectContaining({ natureza: "RECEITA", meioPagamentoId: CONTA }),
    );
  });

  it("devolve tudo ao estado de despesa quando a pessoa volta atrás — AC 6", async () => {
    montar();
    await marcarReceita();

    await userEvent.click(screen.getByRole("radio", { name: "Um dinheiro que sai" }));

    expect(screen.getByLabelText("Meio de pagamento")).toBeDefined();
    expect(screen.getByRole("option", { name: "Cartão Roxo" })).toBeDefined();
  });
});

/*
 * A regra de qual data propor é do domínio (`dataPadraoDoLancamento`); o que o
 * formulário precisa provar é que **usa** o que recebeu. Sem isto a prop
 * poderia ser ignorada e o campo voltar ao dia 1 sem nada ficar vermelho.
 */
describe("FormLancamentoAvulso — a data proposta (CAD-04, AC 10)", () => {
  it("preenche o campo com a data que veio do servidor", () => {
    montar();

    expect((screen.getByLabelText("Data") as HTMLInputElement).value).toBe("2026-03-10");
  });

  it("envia a data proposta quando a pessoa não a altera", async () => {
    const enviar = montar();

    await userEvent.type(screen.getByLabelText("Descrição"), "Almoço");
    await userEvent.type(screen.getByLabelText("Valor (R$)"), "32,50");
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar lançamento" }));

    expect(enviar).toHaveBeenCalledWith(expect.objectContaining({ dataEvento: "2026-03-10" }));
  });

  it("continua editável: a proposta não prende ninguém", async () => {
    const enviar = montar();

    await userEvent.type(screen.getByLabelText("Descrição"), "Almoço");
    await userEvent.type(screen.getByLabelText("Valor (R$)"), "32,50");
    await userEvent.clear(screen.getByLabelText("Data"));
    await userEvent.type(screen.getByLabelText("Data"), "2026-03-25");
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar lançamento" }));

    expect(enviar).toHaveBeenCalledWith(expect.objectContaining({ dataEvento: "2026-03-25" }));
  });
});
