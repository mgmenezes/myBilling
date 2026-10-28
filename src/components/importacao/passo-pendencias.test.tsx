import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { criarMeioDePagamento } from "@/app/actions/meios-de-pagamento";
import type { OpcaoDeMeio } from "../form-lancamento-avulso";
import { PassoPendencias } from "./passo-pendencias";
import { ID, previaDe } from "./previas-de-teste";

/**
 * Testes derivados de IMP-04 (AC 1 a 3 e 8 a 12) e do Done-when de T22, sobre
 * as pendências que a prévia de outubro traz antes do passo 2: três "Tipo" e
 * três entradas (fixture sintética, AD-009).
 */

afterEach(cleanup);

const MEIOS = [
  { id: ID.conta, nome: "Conta Corrente", geraFatura: false },
  { id: ID.roxo, nome: "Cartão Roxo", geraFatura: true },
  { id: ID.verde, nome: "Cartão Verde", geraFatura: true },
];

/* Os mesmos meios, com o que a página diz de cada um (AC 9). */
const MEIOS_DESCRITOS = [
  { id: ID.conta, nome: "Conta Corrente", geraFatura: false, detalhe: "conta" },
  {
    id: ID.roxo,
    nome: "Cartão Roxo",
    geraFatura: true,
    detalhe: "cartão, fecha dia 25, vence dia 5",
  },
  {
    id: ID.verde,
    nome: "Cartão Verde",
    geraFatura: true,
    detalhe: "cartão, fecha dia 10, vence dia 20",
  },
];

const POUPANCA = "66666666-6666-4666-8666-666666666666";

const PENDENCIAS_DE_OUTUBRO = previaDe("Outubro", { comDecisoes: false }).pendencias;

const NOVO_MEIO = "55555555-5555-4555-8555-555555555555";

function criarMeioOk(): typeof criarMeioDePagamento {
  return vi.fn(async (payload: unknown) => ({
    ok: true as const,
    data: {
      id: NOVO_MEIO,
      nome: (payload as { nome: string }).nome,
      geraFatura: (payload as { tipo: string }).tipo === "CARTAO_CREDITO",
    },
  })) as unknown as typeof criarMeioDePagamento;
}

function montar(
  criar: typeof criarMeioDePagamento = criarMeioOk(),
  meios: ReadonlyArray<OpcaoDeMeio> = MEIOS,
) {
  const aoConcluir = vi.fn();
  render(
    <PassoPendencias
      pendencias={PENDENCIAS_DE_OUTUBRO}
      meios={meios}
      criarMeioDePagamento={criar}
      aoConcluir={aoConcluir}
    />,
  );
  return aoConcluir;
}

/** O bloco do seletor de um "Tipo": o rótulo, o atalho e o cadastro aberto. */
function blocoDoTipo(rotulo: string): HTMLElement {
  const bloco = screen.getByLabelText(rotulo).parentElement;
  if (!bloco) {
    throw new Error(`seletor "${rotulo}" fora de um bloco`);
  }
  return bloco;
}

function entrada(nome: string): HTMLElement {
  return screen.getByRole("group", { name: nome });
}

function opcoes(seletor: HTMLElement): Array<string | null> {
  return within(seletor)
    .getAllByRole("option")
    .map((o) => o.textContent);
}

function caiEm(nome: string): HTMLSelectElement {
  return within(entrada(nome)).getByLabelText("Cai em") as HTMLSelectElement;
}

function classeMarcada(nome: string): string | undefined {
  return (within(entrada(nome)).getAllByRole("radio") as HTMLInputElement[]).find((r) => r.checked)
    ?.value;
}

const PARA_TODAS = "Conta para todas as entradas";

function continuar(): HTMLButtonElement {
  return screen.getByRole("button", { name: "Continuar" }) as HTMLButtonElement;
}

async function decidirTudo(): Promise<void> {
  await userEvent.selectOptions(screen.getByLabelText("Débito (4 linhas)"), ID.conta);
  await userEvent.selectOptions(screen.getByLabelText("Cartão Roxo (8 linhas)"), ID.roxo);
  await userEvent.selectOptions(screen.getByLabelText("Cartão Verde (1 linha)"), ID.verde);
  for (const [nome, classe] of [
    ["Salário A", /^Fixa/],
    ["Salário B", /^Fixa/],
    ["Reembolso", /^Avulsa/],
  ] as const) {
    await userEvent.click(within(entrada(nome)).getByRole("radio", { name: classe }));
    await userEvent.selectOptions(within(entrada(nome)).getByLabelText("Cai em"), ID.conta);
  }
}

describe("PassoPendencias — um seletor por Tipo (IMP-04, AC 1)", () => {
  it('mostra cada "Tipo" com a quantidade de linhas que o usam', () => {
    montar();

    expect(screen.getByLabelText("Débito (4 linhas)").tagName).toBe("SELECT");
    expect(screen.getByLabelText("Cartão Roxo (8 linhas)").tagName).toBe("SELECT");
    expect(screen.getByLabelText("Cartão Verde (1 linha)").tagName).toBe("SELECT");
  });

  it("o seletor começa sem escolha e oferece os meios do app", () => {
    montar();
    const seletor = screen.getByLabelText("Débito (4 linhas)") as HTMLSelectElement;

    expect(seletor.value).toBe("");
    expect(
      within(seletor)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["Escolha o meio", "Conta Corrente", "Cartão Roxo", "Cartão Verde"]);
  });
});

describe("PassoPendencias — cadastrar o meio que falta (IMP-04, AC 2)", () => {
  it('"+ cadastrar" abre o cadastro com o nome do "Tipo" preenchido', async () => {
    montar();

    await userEvent.click(
      within(blocoDoTipo("Débito (4 linhas)")).getByRole("button", { name: "+ cadastrar" }),
    );

    expect(
      (screen.getByLabelText("Nome do novo meio de pagamento") as HTMLInputElement).value,
    ).toBe("Débito");
  });

  it("o meio criado fica selecionado para aquele Tipo", async () => {
    const criar = criarMeioOk();
    montar(criar);

    await userEvent.click(
      within(blocoDoTipo("Débito (4 linhas)")).getByRole("button", { name: "+ cadastrar" }),
    );
    await userEvent.selectOptions(screen.getByLabelText("Tipo"), "CONTA_CORRENTE");
    await userEvent.click(screen.getByRole("button", { name: "Criar" }));

    expect(criar).toHaveBeenCalledWith({ nome: "Débito", tipo: "CONTA_CORRENTE" });
    await screen.findAllByRole("option", { name: "Débito · conta" });
    expect((screen.getByLabelText("Débito (4 linhas)") as HTMLSelectElement).value).toBe(NOVO_MEIO);
  });
});

describe("PassoPendencias — cada entrada (IMP-04, AC 3)", () => {
  it('pede "fixa" ou "avulsa" para cada entrada', () => {
    montar();

    for (const nome of ["Salário A", "Salário B", "Reembolso"]) {
      const radios = within(entrada(nome)).getAllByRole("radio") as HTMLInputElement[];
      expect(radios.map((r) => r.value)).toEqual(["FIXA", "AVULSA"]);
      expect(radios.some((r) => r.checked)).toBe(false);
    }
  });

  it('"cai em" lista só os meios sem fatura: Cartão Roxo não aparece', () => {
    montar();

    const opcoes = within(within(entrada("Salário A")).getByLabelText("Cai em"))
      .getAllByRole("option")
      .map((o) => o.textContent);

    expect(opcoes).toEqual(["Escolha a conta", "Conta Corrente"]);
  });
});

describe("PassoPendencias — o que cada meio é (IMP-04, AC 9)", () => {
  it("cada opção diz o tipo do meio e, no cartão, os dias do ciclo", () => {
    montar(criarMeioOk(), MEIOS_DESCRITOS);

    expect(opcoes(screen.getByLabelText("Débito (4 linhas)"))).toEqual([
      "Escolha o meio",
      "Conta Corrente · conta",
      "Cartão Roxo · cartão, fecha dia 25, vence dia 5",
      "Cartão Verde · cartão, fecha dia 10, vence dia 20",
    ]);
    expect(opcoes(caiEm("Salário A"))).toEqual(["Escolha a conta", "Conta Corrente · conta"]);
  });
});

describe("PassoPendencias — uma conta nova sem passar por um Tipo (IMP-04, AC 10)", () => {
  it('"+ nova conta" fica nas Entradas e só oferece tipos sem fatura', async () => {
    montar();

    await userEvent.click(screen.getByRole("button", { name: "+ nova conta" }));

    expect(opcoes(screen.getByLabelText("Tipo"))).toEqual(["Conta corrente", "Rótulo"]);
  });

  it('a conta criada aparece em todo "Cai em", fica escolhida para todas, e nenhum Tipo muda', async () => {
    const criar = criarMeioOk();
    montar(criar);

    await userEvent.click(screen.getByRole("button", { name: "+ nova conta" }));
    await userEvent.type(screen.getByLabelText("Nome do novo meio de pagamento"), "Conta Nova");
    await userEvent.click(screen.getByRole("button", { name: "Criar" }));

    expect(criar).toHaveBeenCalledWith({ nome: "Conta Nova", tipo: "CONTA_CORRENTE" });
    await screen.findAllByRole("option", { name: "Conta Nova · conta" });
    for (const nome of ["Salário A", "Salário B", "Reembolso"]) {
      expect(opcoes(caiEm(nome))).toEqual([
        "Escolha a conta",
        "Conta Corrente",
        "Conta Nova · conta",
      ]);
      expect(caiEm(nome).value).toBe("");
    }
    expect((screen.getByLabelText(PARA_TODAS) as HTMLSelectElement).value).toBe(NOVO_MEIO);
    for (const tipo of ["Débito (4 linhas)", "Cartão Roxo (8 linhas)", "Cartão Verde (1 linha)"]) {
      expect((screen.getByLabelText(tipo) as HTMLSelectElement).value).toBe("");
    }
  });
});

describe("PassoPendencias — a mesma conta para todas as entradas (IMP-04, AC 11)", () => {
  const DUAS_CONTAS = [...MEIOS, { id: POUPANCA, nome: "Conta Poupança", geraFatura: false }];

  function aplicar(): HTMLButtonElement {
    return screen.getByRole("button", { name: "Aplicar a todas" }) as HTMLButtonElement;
  }

  it('"Aplicar a todas" fica desabilitado até haver uma conta escolhida', async () => {
    montar();
    expect(aplicar().disabled).toBe(true);

    await userEvent.selectOptions(screen.getByLabelText(PARA_TODAS), ID.conta);

    expect(aplicar().disabled).toBe(false);
  });

  it("preenche o Cai em de todas, inclusive a que já tinha outra conta, e não mexe na classe", async () => {
    montar(criarMeioOk(), DUAS_CONTAS);
    await userEvent.click(within(entrada("Salário A")).getByRole("radio", { name: /^Fixa/ }));
    await userEvent.click(within(entrada("Reembolso")).getByRole("radio", { name: /^Avulsa/ }));
    await userEvent.selectOptions(caiEm("Reembolso"), POUPANCA);

    await userEvent.selectOptions(screen.getByLabelText(PARA_TODAS), ID.conta);
    await userEvent.click(aplicar());

    expect(["Salário A", "Salário B", "Reembolso"].map((nome) => caiEm(nome).value)).toEqual([
      ID.conta,
      ID.conta,
      ID.conta,
    ]);
    expect(["Salário A", "Salário B", "Reembolso"].map(classeMarcada)).toEqual([
      "FIXA",
      undefined,
      "AVULSA",
    ]);
  });

  it("depois de aplicar, cada entrada ainda escolhe a sua, e é o que segue para a gravação", async () => {
    const aoConcluir = montar(criarMeioOk(), DUAS_CONTAS);
    await decidirTudo();

    await userEvent.selectOptions(screen.getByLabelText(PARA_TODAS), POUPANCA);
    await userEvent.click(aplicar());
    await userEvent.selectOptions(caiEm("Reembolso"), ID.conta);
    await userEvent.click(continuar());

    expect(aoConcluir.mock.calls[0]?.[0].entradas).toEqual({
      "salário a": { classe: "FIXA", contaId: POUPANCA },
      "salário b": { classe: "FIXA", contaId: POUPANCA },
      reembolso: { classe: "AVULSA", contaId: ID.conta },
    });
  });
});

describe("PassoPendencias — nenhuma conta ainda (IMP-04, AC 12)", () => {
  const SO_CARTOES = MEIOS.filter((meio) => meio.geraFatura);
  const DICA = "Nenhuma conta cadastrada ainda. Crie uma em “+ nova conta”.";

  it("sem meio sem fatura, diz onde criar a conta", () => {
    montar(criarMeioOk(), SO_CARTOES);

    expect(screen.getByText(DICA)).toBeDefined();
  });

  it("a dica some quando a conta é criada", async () => {
    montar(criarMeioOk(), SO_CARTOES);

    await userEvent.click(screen.getByRole("button", { name: "+ nova conta" }));
    await userEvent.type(screen.getByLabelText("Nome do novo meio de pagamento"), "Conta Nova");
    await userEvent.click(screen.getByRole("button", { name: "Criar" }));

    await screen.findAllByRole("option", { name: "Conta Nova · conta" });
    expect(screen.queryByText(DICA)).toBeNull();
  });

  it("com conta cadastrada, não há dica", () => {
    montar();

    expect(screen.queryByText(DICA)).toBeNull();
  });
});

describe("PassoPendencias — o que falta para continuar (IMP-04, AC 8)", () => {
  function itensDoAviso(): Array<string | null> {
    return within(screen.getByRole("status"))
      .getAllByRole("listitem")
      .map((item) => item.textContent);
  }

  it("de início, lista pelo nome cada Tipo sem meio e cada entrada sem classe e sem conta", () => {
    montar();

    expect(within(screen.getByRole("status")).getByText("Para continuar, falta:")).toBeDefined();
    expect(itensDoAviso()).toEqual([
      "escolher o meio de Débito, Cartão Roxo e Cartão Verde",
      "dizer se é fixa ou avulsa: Salário A, Salário B e Reembolso",
      "escolher onde cai: Salário A, Salário B e Reembolso",
    ]);
  });

  it("conforme se decide, sobra só o que falta", async () => {
    montar();
    await decidirTudo();

    await userEvent.selectOptions(screen.getByLabelText("Cartão Verde (1 linha)"), "");
    await userEvent.selectOptions(within(entrada("Reembolso")).getByLabelText("Cai em"), "");

    expect(itensDoAviso()).toEqual([
      "escolher o meio de Cartão Verde",
      "escolher onde cai: Reembolso",
    ]);
  });

  it("o botão aponta para o aviso enquanto falta algo, e o aviso some quando nada falta", async () => {
    montar();
    const idDoAviso = continuar().getAttribute("aria-describedby");
    expect(idDoAviso).not.toBeNull();
    expect(document.getElementById(idDoAviso ?? "")).toBe(screen.getByRole("status"));

    await decidirTudo();

    expect(screen.queryByRole("status")).toBeNull();
    expect(continuar().hasAttribute("aria-describedby")).toBe(false);
    expect(continuar().disabled).toBe(false);
  });
});

describe("PassoPendencias — continuar (T22)", () => {
  it("fica desabilitado enquanto houver escolha em aberto", async () => {
    montar();
    expect(continuar().disabled).toBe(true);

    await decidirTudo();
    expect(continuar().disabled).toBe(false);

    await userEvent.selectOptions(screen.getByLabelText("Cartão Verde (1 linha)"), "");
    expect(continuar().disabled).toBe(true);
  });

  it("entrada com a classe e sem a conta mantém o botão desabilitado", async () => {
    montar();
    await decidirTudo();

    await userEvent.selectOptions(within(entrada("Reembolso")).getByLabelText("Cai em"), "");

    expect(continuar().disabled).toBe(true);
  });

  it("entrega as chaves normalizadas com os ids escolhidos", async () => {
    const aoConcluir = montar();
    await decidirTudo();

    await userEvent.click(continuar());

    expect(aoConcluir).toHaveBeenCalledWith({
      meios: { débito: ID.conta, "cartão roxo": ID.roxo, "cartão verde": ID.verde },
      entradas: {
        "salário a": { classe: "FIXA", contaId: ID.conta },
        "salário b": { classe: "FIXA", contaId: ID.conta },
        reembolso: { classe: "AVULSA", contaId: ID.conta },
      },
    });
  });
});
