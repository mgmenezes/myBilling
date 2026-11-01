import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { editarMeioDePagamento } from "@/app/actions/meios-de-pagamento";
import { ProvedorDeAvisos } from "./avisos";
import { DetalheDoMeio } from "./detalhe-do-meio";
import type { ItemDeMeio } from "./tabela-de-meios";

/**
 * Derivado de CADCOL-07 (ACs 1 a 6 e 8 a 13) e dos Done-when da T17 e da F7:
 * o meio aberto no painel, com o nome e os dias editáveis, o tipo em texto e
 * onde ele aparece.
 *
 * Os limites dos dois lados (L-029, L-041): 40 caracteres chegam ao servidor e
 * 41 não; os dias 1 e 31 chegam, e 0 e 32 não. Toda mensagem de campo é
 * procurada junto do campo, no bloco dele, e ligada a ele por
 * `aria-describedby` (L-018).
 *
 * Nomes genéricos e dias escolhidos pela borda (AD-009). Os dias 25 e 5 são os
 * do cartão de `semearCadastroBase`.
 */

const CARTAO = "11111111-1111-4111-8111-111111111111";
const CONTA = "22222222-2222-4222-8222-222222222222";
const ROTULO = "33333333-3333-4333-8333-333333333333";

const CARTAO_ROXO: ItemDeMeio = {
  id: CARTAO,
  nome: "Cartão Roxo",
  tipo: "CARTAO_CREDITO",
  diaFechamento: 25,
  diaVencimento: 5,
  fixos: 0,
  lancamentos: 1,
};
const CONTA_CORRENTE: ItemDeMeio = {
  id: CONTA,
  nome: "Conta Corrente",
  tipo: "CONTA_CORRENTE",
  diaFechamento: null,
  diaVencimento: null,
  fixos: 2,
  lancamentos: 2,
};
const ROTULO_AMBAR: ItemDeMeio = {
  id: ROTULO,
  nome: "Rótulo Âmbar",
  tipo: "ROTULO",
  diaFechamento: null,
  diaVencimento: null,
  fixos: 0,
  lancamentos: 0,
};

const NOTA_DOS_DIAS =
  "Mudar os dias não move nenhuma compra: cada uma fica no mês em que foi lançada.";

type Recusa = {
  ok: false;
  erro: { code: string; mensagem: string; campos?: Record<string, string> };
};

function salvou(alterado = true) {
  return vi.fn(async (payload: unknown) => {
    const { meioPagamentoId, nome } = payload as { meioPagamentoId: string; nome: string };
    return { ok: true as const, data: { id: meioPagamentoId, nome, alterado } };
  });
}

function recusou(erro: Recusa["erro"]) {
  return vi.fn(async (): Promise<Recusa> => ({ ok: false, erro }));
}

afterEach(cleanup);

function montar({
  meio = CARTAO_ROXO,
  editar = salvou(),
}: {
  readonly meio?: ItemDeMeio;
  readonly editar?: ReturnType<typeof vi.fn>;
} = {}) {
  render(
    <ProvedorDeAvisos>
      <div data-testid="painel">
        <DetalheDoMeio
          meio={meio}
          competencia="2026-03"
          rotuloDaCompetencia="Março de 2026"
          editar={editar as unknown as typeof editarMeioDePagamento}
        />
      </div>
    </ProvedorDeAvisos>,
  );
  return { editar, usuario: userEvent.setup() };
}

function painel(): HTMLElement {
  return screen.getByTestId("painel");
}

function titulo(): HTMLElement {
  return within(painel()).getByRole("heading", { level: 2 });
}

function formulario(nome = "Cartão Roxo"): HTMLElement {
  return within(painel()).getByRole("form", { name: `Editar ${nome}` });
}

function campo(rotulo: string, nome = "Cartão Roxo"): HTMLInputElement {
  return within(formulario(nome)).getByRole<HTMLInputElement>("textbox", { name: rotulo });
}

function salvar(nome = "Cartão Roxo"): HTMLElement {
  return within(formulario(nome)).getByRole("button", { name: "Salvar alterações" });
}

async function trocar(
  usuario: ReturnType<typeof userEvent.setup>,
  alvo: HTMLInputElement,
  texto: string,
) {
  await usuario.clear(alvo);
  if (texto !== "") {
    await usuario.click(alvo);
    await usuario.paste(texto);
  }
}

/**
 * A mensagem junto do campo: um `alert` no bloco do campo, ligado a ele por
 * `aria-describedby`, com o campo marcado `aria-invalid`.
 */
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

describe("o título e o subtítulo (CADCOL-07, AC 1)", () => {
  it("o nome é o título do painel, com o tipo e os dias do cartão logo abaixo", () => {
    montar();

    expect(titulo().textContent).toBe("Cartão Roxo");
    expect(titulo().getAttribute("tabindex")).toBe("-1");
    expect(titulo().nextElementSibling?.textContent).toBe(
      "Cartão de crédito · fecha dia 25 · vence dia 5",
    );
  });

  it('a conta tem "Conta corrente" abaixo do nome', () => {
    montar({ meio: CONTA_CORRENTE });

    expect(titulo().textContent).toBe("Conta Corrente");
    expect(titulo().nextElementSibling?.textContent).toBe("Conta corrente");
  });

  it('o rótulo tem "Rótulo" abaixo do nome', () => {
    montar({ meio: ROTULO_AMBAR });

    expect(titulo().textContent).toBe("Rótulo Âmbar");
    expect(titulo().nextElementSibling?.textContent).toBe("Rótulo");
  });
});

describe("o formulário, sem troca de tipo (CADCOL-07, ACs 2 e 4)", () => {
  it('"Editar Cartão Roxo" tem "Nome" com o nome gravado, o tipo em texto com a frase e "Salvar alterações"', () => {
    montar();

    expect(campo("Nome").value).toBe("Cartão Roxo");
    expect(within(formulario()).getByText("Cartão de crédito")).toBeTruthy();
    expect(
      within(formulario()).getByText("O tipo não muda. Para trocar, cadastre outro meio."),
    ).toBeTruthy();
    expect(salvar()).toBeTruthy();
  });

  it("nenhum controle muda o tipo", () => {
    montar();

    expect(within(painel()).queryByRole("combobox")).toBeNull();
    expect(within(painel()).queryByRole("radio")).toBeNull();
  });
});

describe("os dias e a nota (CADCOL-07, ACs 3 e 4)", () => {
  it("no cartão, os dois dias preenchidos com os gravados e a nota dos dias", () => {
    montar();

    expect(campo("Dia de fechamento").value).toBe("25");
    expect(campo("Dia de vencimento").value).toBe("5");
    expect(within(formulario()).getByText(NOTA_DOS_DIAS)).toBeTruthy();
  });

  it("na conta, nem os dias nem a nota", () => {
    montar({ meio: CONTA_CORRENTE });

    const form = formulario("Conta Corrente");
    expect(within(form).queryByRole("textbox", { name: "Dia de fechamento" })).toBeNull();
    expect(within(form).queryByRole("textbox", { name: "Dia de vencimento" })).toBeNull();
    expect(within(painel()).queryByText(NOTA_DOS_DIAS)).toBeNull();
  });
});

describe("salvar (CADCOL-07, AC 5)", () => {
  it("o nome novo vai normalizado, com os dias do cartão, avisa Meio de pagamento salvo. e fica no campo como foi gravado", async () => {
    const { editar, usuario } = montar();
    await trocar(usuario, campo("Nome"), "  Cartão   Lilás ");

    await usuario.click(salvar());

    expect((await screen.findByRole("status")).textContent).toBe("Meio de pagamento salvo.");
    expect(editar).toHaveBeenCalledTimes(1);
    expect(editar).toHaveBeenCalledWith({
      meioPagamentoId: CARTAO,
      nome: "Cartão Lilás",
      ciclo: { diaFechamento: 25, diaVencimento: 5 },
    });
    expect(campo("Nome").value).toBe("Cartão Lilás");
  });

  it("os dias novos vão em números, com o nome de sempre", async () => {
    const { editar, usuario } = montar();
    await trocar(usuario, campo("Dia de fechamento"), "10");
    await trocar(usuario, campo("Dia de vencimento"), "17");

    await usuario.click(salvar());

    expect((await screen.findByRole("status")).textContent).toBe("Meio de pagamento salvo.");
    expect(editar).toHaveBeenCalledWith({
      meioPagamentoId: CARTAO,
      nome: "Cartão Roxo",
      ciclo: { diaFechamento: 10, diaVencimento: 17 },
    });
  });

  it("na conta, o ciclo vai null", async () => {
    const { editar, usuario } = montar({ meio: CONTA_CORRENTE });
    await trocar(usuario, campo("Nome", "Conta Corrente"), "Conta Nova");

    await usuario.click(salvar("Conta Corrente"));

    expect((await screen.findByRole("status")).textContent).toBe("Meio de pagamento salvo.");
    expect(editar).toHaveBeenCalledWith({
      meioPagamentoId: CONTA,
      nome: "Conta Nova",
      ciclo: null,
    });
  });
});

/*
 * A caixa conta (L-041): a regra mora no servidor e também aqui, onde o
 * painel decide "nada mudou" antes de chamá-lo.
 */
describe("só a caixa do nome (CADCOL-07, AC 8)", () => {
  it("trocar Cartão Roxo por cartão roxo grava, com os dias gravados, e avisa Meio de pagamento salvo.", async () => {
    const { editar, usuario } = montar();
    await trocar(usuario, campo("Nome"), "cartão roxo");

    await usuario.click(salvar());

    expect((await screen.findByRole("status")).textContent).toBe("Meio de pagamento salvo.");
    expect(editar).toHaveBeenCalledTimes(1);
    expect(editar).toHaveBeenCalledWith({
      meioPagamentoId: CARTAO,
      nome: "cartão roxo",
      ciclo: { diaFechamento: 25, diaVencimento: 5 },
    });
  });
});

describe("nada mudou (CADCOL-07, AC 9)", () => {
  it("o nome e os dias iguais aos gravados, com espaço sobrando no nome, não chamam o servidor e não avisam", async () => {
    const { editar, usuario } = montar();
    await trocar(usuario, campo("Nome"), "  Cartão   Roxo ");

    await usuario.click(salvar());

    expect(editar).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).toBeNull();
    expect(within(formulario()).queryByRole("alert")).toBeNull();
  });

  it("se o servidor diz que nada mudou, não avisa", async () => {
    const { editar, usuario } = montar({ editar: salvou(false) });
    await trocar(usuario, campo("Nome"), "Cartão Lilás");

    await usuario.click(salvar());

    expect(editar).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("a regra no navegador (CADCOL-07, AC 10; L-029, L-041)", () => {
  it("o nome vazio não chega ao servidor, e a mensagem fica junto do campo", async () => {
    const { editar, usuario } = montar();
    await trocar(usuario, campo("Nome"), "");

    await usuario.click(salvar());

    expect(erroDoCampo(campo("Nome"))).toBe("Informe o nome do meio de pagamento.");
    expect(editar).not.toHaveBeenCalled();
  });

  it("o nome com 41 caracteres não chega ao servidor, e diz o limite junto do campo", async () => {
    const { editar, usuario } = montar();
    await trocar(usuario, campo("Nome"), "a".repeat(41));

    await usuario.click(salvar());

    expect(erroDoCampo(campo("Nome"))).toBe("O nome pode ter no máximo 40 caracteres.");
    expect(editar).not.toHaveBeenCalled();
  });

  it("o nome com 40 caracteres chega ao servidor", async () => {
    const { editar, usuario } = montar();
    await trocar(usuario, campo("Nome"), "a".repeat(40));

    await usuario.click(salvar());

    expect(editar).toHaveBeenCalledWith({
      meioPagamentoId: CARTAO,
      nome: "a".repeat(40),
      ciclo: { diaFechamento: 25, diaVencimento: 5 },
    });
  });

  it("o dia 0 no fechamento não chega ao servidor, e a mensagem fica junto dele", async () => {
    const { editar, usuario } = montar();
    await trocar(usuario, campo("Dia de fechamento"), "0");

    await usuario.click(salvar());

    expect(erroDoCampo(campo("Dia de fechamento"))).toBe("O dia de fechamento vai de 1 a 31.");
    expect(campo("Dia de vencimento").getAttribute("aria-invalid")).toBeNull();
    expect(editar).not.toHaveBeenCalled();
  });

  it("o dia 32 no vencimento não chega ao servidor, e a mensagem fica junto dele", async () => {
    const { editar, usuario } = montar();
    await trocar(usuario, campo("Dia de vencimento"), "32");

    await usuario.click(salvar());

    expect(erroDoCampo(campo("Dia de vencimento"))).toBe("O dia de vencimento vai de 1 a 31.");
    expect(campo("Dia de fechamento").getAttribute("aria-invalid")).toBeNull();
    expect(editar).not.toHaveBeenCalled();
  });

  it("os dias 1 e 31 chegam ao servidor", async () => {
    const { editar, usuario } = montar();
    await trocar(usuario, campo("Dia de fechamento"), "1");
    await trocar(usuario, campo("Dia de vencimento"), "31");

    await usuario.click(salvar());

    expect(editar).toHaveBeenCalledWith({
      meioPagamentoId: CARTAO,
      nome: "Cartão Roxo",
      ciclo: { diaFechamento: 1, diaVencimento: 31 },
    });
  });

  it("corrigido o campo, a mensagem dele sai no envio seguinte", async () => {
    const { editar, usuario } = montar();
    await trocar(usuario, campo("Dia de fechamento"), "0");
    await usuario.click(salvar());
    expect(erroDoCampo(campo("Dia de fechamento"))).toBe("O dia de fechamento vai de 1 a 31.");

    await trocar(usuario, campo("Dia de fechamento"), "10");
    await usuario.click(salvar());

    expect(await screen.findByRole("status")).toBeTruthy();
    expect(within(formulario()).queryByRole("alert")).toBeNull();
    expect(campo("Dia de fechamento").getAttribute("aria-invalid")).toBeNull();
    expect(editar).toHaveBeenCalledTimes(1);
  });
});

describe("a recusa do servidor (CADCOL-07, ACs 6, 10, 11 e 12)", () => {
  it("o nome de outro meio aparece junto de Nome, sem avisar (AC 6)", async () => {
    const mensagem = "Já existe outro meio de pagamento com esse nome.";
    const { usuario } = montar({
      editar: recusou({ code: "MEIO_PAGAMENTO_JA_EXISTE", mensagem, campos: { nome: mensagem } }),
    });
    await trocar(usuario, campo("Nome"), "conta corrente");

    await usuario.click(salvar());

    expect(await within(formulario()).findByRole("alert")).toBeTruthy();
    expect(erroDoCampo(campo("Nome"))).toBe(mensagem);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("o dia recusado pelo servidor aparece junto do campo do dia (AC 10)", async () => {
    const mensagem = "O dia de vencimento vai de 1 a 31.";
    const { usuario } = montar({
      editar: recusou({
        code: "VALIDACAO",
        mensagem: "Confira os campos destacados.",
        campos: { "ciclo.diaVencimento": mensagem },
      }),
    });
    await trocar(usuario, campo("Dia de vencimento"), "6");

    await usuario.click(salvar());

    expect(await within(formulario()).findByRole("alert")).toBeTruthy();
    expect(erroDoCampo(campo("Dia de vencimento"))).toBe(mensagem);
    expect(campo("Nome").getAttribute("aria-invalid")).toBeNull();
  });

  it("a recusa sem campo aparece no formulário, sem marcar campo nenhum (AC 11)", async () => {
    const mensagem =
      "Dia de fechamento e de vencimento existem só no cartão de crédito, e nele são obrigatórios.";
    const { usuario } = montar({
      editar: recusou({ code: "CICLO_NAO_CORRESPONDE_AO_TIPO", mensagem }),
    });
    await trocar(usuario, campo("Nome"), "Cartão Lilás");

    await usuario.click(salvar());

    expect((await within(formulario()).findByRole("alert")).textContent).toBe(mensagem);
    for (const rotulo of ["Nome", "Dia de fechamento", "Dia de vencimento"]) {
      expect(campo(rotulo).getAttribute("aria-invalid")).toBeNull();
    }
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("o meio que não existe mais aparece no formulário, e não num campo (AC 12)", async () => {
    const mensagem = "Esse meio de pagamento não existe mais.";
    const { usuario } = montar({
      editar: recusou({
        code: "MEIO_PAGAMENTO_NAO_ENCONTRADO",
        mensagem,
        campos: { meioPagamentoId: mensagem },
      }),
    });
    await trocar(usuario, campo("Nome"), "Cartão Lilás");

    await usuario.click(salvar());

    expect((await within(formulario()).findByRole("alert")).textContent).toBe(mensagem);
    expect(campo("Nome").getAttribute("aria-invalid")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("onde ele aparece (CADCOL-07, AC 13)", () => {
  it("mostra as contagens da linha e leva a Lançamentos do mês filtrado pelo meio", () => {
    montar();

    const secao = within(painel()).getByRole("region", { name: "Onde ele aparece" });
    expect(within(secao).getByText("Fixos em Março de 2026").nextElementSibling?.textContent).toBe(
      "0",
    );
    expect(
      within(secao).getByText("Lançamentos em Março de 2026").nextElementSibling?.textContent,
    ).toBe("1");
    expect(
      within(secao).getByRole("link", { name: "Ver em Lançamentos" }).getAttribute("href"),
    ).toBe(`/2026-03/lancamentos?meioPagamentoId=${CARTAO}`);
  });
});
