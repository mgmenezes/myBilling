import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { criarMeioDePagamento } from "@/app/actions/meios-de-pagamento";
import { CadastroDeMeioInline } from "./cadastro-de-meio-inline";

/**
 * Testes derivados de IMP-04 (AC 2) e do Done-when de T20: o cadastro de meio
 * que já existia, agora reaproveitável, com o nome pré-preenchido. Os testes de
 * `form-lancamento-avulso.test.tsx` provam, sem alteração, que a extração não
 * mudou o formulário de onde ele saiu.
 */

afterEach(cleanup);

const NOME = "Nome do novo meio de pagamento";

function criarMeioOk(): typeof criarMeioDePagamento {
  return vi.fn(async (payload: unknown) => ({
    ok: true as const,
    data: {
      id: "55555555-5555-4555-8555-555555555555",
      nome: (payload as { nome: string }).nome,
      geraFatura: (payload as { tipo: string }).tipo === "CARTAO_CREDITO",
    },
  })) as unknown as typeof criarMeioDePagamento;
}

function montar(
  criar: typeof criarMeioDePagamento = criarMeioOk(),
  nomeInicial?: string,
  aoCriado = vi.fn(),
) {
  render(
    <CadastroDeMeioInline
      rotulo="Meio de pagamento"
      idDoControle="controle-meio"
      nomeInicial={nomeInicial}
      criarMeioDePagamento={criar}
      aoCriado={aoCriado}
    >
      <select id="controle-meio">
        <option value="">Escolha</option>
      </select>
    </CadastroDeMeioInline>,
  );
  return { criar, aoCriado };
}

describe("CadastroDeMeioInline — só os tipos permitidos (IMP-04, AC 10)", () => {
  it("com tiposPermitidos, o seletor de tipo oferece só eles e começa no primeiro", async () => {
    render(
      <CadastroDeMeioInline
        rotulo="Cai em"
        idDoControle="controle-conta"
        tiposPermitidos={["CONTA_CORRENTE", "ROTULO"]}
        criarMeioDePagamento={criarMeioOk()}
        aoCriado={vi.fn()}
      >
        <select id="controle-conta">
          <option value="">Escolha</option>
        </select>
      </CadastroDeMeioInline>,
    );

    await userEvent.click(screen.getByRole("button", { name: "+ novo" }));
    const tipo = screen.getByLabelText("Tipo") as HTMLSelectElement;

    expect(Array.from(tipo.options).map((opcao) => opcao.textContent)).toEqual([
      "Conta corrente",
      "Rótulo",
    ]);
    expect(tipo.value).toBe("CONTA_CORRENTE");
  });
});

describe("CadastroDeMeioInline — o que o meio criado é (IMP-04, AC 9)", () => {
  it("aoCriado recebe também a descrição do meio, com os dias do cartão", async () => {
    const { aoCriado } = montar(criarMeioOk(), "Cartão Azul");

    await userEvent.click(screen.getByRole("button", { name: "+ novo" }));
    await userEvent.type(screen.getByLabelText("Dia de fechamento"), "25");
    await userEvent.type(screen.getByLabelText("Dia de vencimento"), "5");
    await userEvent.click(screen.getByRole("button", { name: "Criar" }));

    await vi.waitFor(() => expect(aoCriado).toHaveBeenCalled());
    expect(aoCriado.mock.calls[0]?.[1]).toBe("cartão, fecha dia 25, vence dia 5");
  });
});

describe("CadastroDeMeioInline — nome pré-preenchido (IMP-04, AC 2)", () => {
  it('abre com o nome que recebeu, "Cartão Azul"', async () => {
    montar(criarMeioOk(), "Cartão Azul");

    await userEvent.click(screen.getByRole("button", { name: "+ novo" }));

    expect((screen.getByLabelText(NOME) as HTMLInputElement).value).toBe("Cartão Azul");
  });

  it("sem nome inicial, abre com o campo vazio", async () => {
    montar();

    await userEvent.click(screen.getByRole("button", { name: "+ novo" }));

    expect((screen.getByLabelText(NOME) as HTMLInputElement).value).toBe("");
  });

  /* O nome pré-preenchido é o estado do campo, e não só o que aparece: é ele
     que vai para o servidor quando a pessoa não o altera. */
  it("envia o nome pré-preenchido e os dias de ciclo do cartão", async () => {
    const { criar } = montar(criarMeioOk(), "Cartão Azul");

    await userEvent.click(screen.getByRole("button", { name: "+ novo" }));
    await userEvent.type(screen.getByLabelText("Dia de fechamento"), "25");
    await userEvent.type(screen.getByLabelText("Dia de vencimento"), "5");
    await userEvent.click(screen.getByRole("button", { name: "Criar" }));

    expect(criar).toHaveBeenCalledWith({
      nome: "Cartão Azul",
      tipo: "CARTAO_CREDITO",
      diaFechamento: 25,
      diaVencimento: 5,
    });
  });
});

describe("CadastroDeMeioInline — o meio criado volta para quem usa (T20)", () => {
  it("aoCriado recebe { id, nome, geraFatura } do meio criado e o que ele é", async () => {
    const { aoCriado } = montar(criarMeioOk(), "Débito");

    await userEvent.click(screen.getByRole("button", { name: "+ novo" }));
    await userEvent.selectOptions(screen.getByLabelText("Tipo"), "CONTA_CORRENTE");
    await userEvent.click(screen.getByRole("button", { name: "Criar" }));

    expect(aoCriado).toHaveBeenCalledWith(
      {
        id: "55555555-5555-4555-8555-555555555555",
        nome: "Débito",
        geraFatura: false,
      },
      "conta",
    );
  });

  it("não chama aoCriado quando o servidor recusa, e mostra a mensagem", async () => {
    const recusa = vi.fn(async () => ({
      ok: false as const,
      erro: { code: "VALIDACAO", mensagem: "Já existe um meio de pagamento com esse nome." },
    })) as unknown as typeof criarMeioDePagamento;
    const { aoCriado } = montar(recusa, "Débito");

    await userEvent.click(screen.getByRole("button", { name: "+ novo" }));
    await userEvent.selectOptions(screen.getByLabelText("Tipo"), "CONTA_CORRENTE");
    await userEvent.click(screen.getByRole("button", { name: "Criar" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Já existe um meio");
    expect(aoCriado).not.toHaveBeenCalled();
  });
});
