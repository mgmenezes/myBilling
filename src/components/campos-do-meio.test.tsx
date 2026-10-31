import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CamposDoMeio, type TipoDeMeio, type ValoresDoMeio } from "./campos-do-meio";

/**
 * Derivado de CADCOL-07 (ACs 2 a 4), de CADCOL-08 (ACs 1 e 2) e do Done-when da
 * T8: os campos do meio, tirados do cadastro inline para servirem também ao
 * painel de Cadastros. Com a lista de tipos, o "Tipo" é o seletor de hoje; com
 * `null`, a edição, o tipo aparece em texto e não muda.
 *
 * `cadastro-de-meio-inline.test.tsx`, `form-lancamento-avulso.test.tsx` e
 * `passo-pendencias.test.tsx` provam, sem mudança, que a extração não mudou os
 * dois lugares que já usavam os campos.
 */

afterEach(cleanup);

const CARTAO: ValoresDoMeio = {
  nome: "Cartão Roxo",
  tipo: "CARTAO_CREDITO",
  diaFechamento: "25",
  diaVencimento: "5",
};

function montar({
  valores = CARTAO,
  tipos = null,
  rotuloDoNome = "Nome",
  diasPelaLargura,
  aoMudar = vi.fn(),
}: {
  readonly valores?: ValoresDoMeio;
  readonly tipos?: ReadonlyArray<TipoDeMeio> | null;
  readonly rotuloDoNome?: string;
  readonly diasPelaLargura?: boolean;
  readonly aoMudar?: (parcial: Partial<ValoresDoMeio>) => void;
} = {}) {
  render(
    <CamposDoMeio
      idBase="meio"
      valores={valores}
      aoMudar={aoMudar}
      rotuloDoNome={rotuloDoNome}
      tipos={tipos}
      diasPelaLargura={diasPelaLargura}
    />,
  );
  return { aoMudar };
}

/** Os campos com o estado num pai, como o cadastro inline e o painel os usam. */
function ComEstado({
  inicial,
  tipos,
}: {
  readonly inicial: ValoresDoMeio;
  readonly tipos: ReadonlyArray<TipoDeMeio> | null;
}) {
  const [valores, setValores] = useState(inicial);
  return (
    <CamposDoMeio
      idBase="meio"
      valores={valores}
      aoMudar={(parcial) => setValores((atual) => ({ ...atual, ...parcial }))}
      rotuloDoNome="Nome"
      tipos={tipos}
    />
  );
}

function diaDeFechamento(): HTMLInputElement | null {
  return screen.queryByRole<HTMLInputElement>("textbox", { name: "Dia de fechamento" });
}

function diaDeVencimento(): HTMLInputElement | null {
  return screen.queryByRole<HTMLInputElement>("textbox", { name: "Dia de vencimento" });
}

describe("o tipo com a lista de tipos: o seletor (CADCOL-08, AC 1)", () => {
  it('"Tipo" é o seletor com os tipos recebidos, na ordem do app, e marca o do valor', () => {
    montar({
      valores: { ...CARTAO, tipo: "ROTULO", diaFechamento: "", diaVencimento: "" },
      tipos: ["ROTULO", "CONTA_CORRENTE"],
    });

    const tipo = screen.getByRole<HTMLSelectElement>("combobox", { name: "Tipo" });
    expect(Array.from(tipo.options).map((opcao) => opcao.textContent)).toEqual([
      "Conta corrente",
      "Rótulo",
    ]);
    expect(tipo.value).toBe("ROTULO");
  });

  it("escolher outro tipo manda só o tipo por aoMudar", async () => {
    const { aoMudar } = montar({ tipos: ["CARTAO_CREDITO", "CONTA_CORRENTE", "ROTULO"] });

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Tipo" }), "Conta corrente");

    expect(aoMudar).toHaveBeenCalledTimes(1);
    expect(aoMudar).toHaveBeenCalledWith({ tipo: "CONTA_CORRENTE" });
  });
});

describe("o tipo sem a lista de tipos: em texto, sem controle (CADCOL-07, ACs 2 e 4)", () => {
  it("mostra o tipo em texto e a frase de que ele não muda, no bloco do Tipo", () => {
    montar({ tipos: null });

    const bloco = screen.getByText("Tipo").parentElement as HTMLElement;
    expect(within(bloco).getByText("Cartão de crédito")).toBeTruthy();
    expect(
      within(bloco).getByText("O tipo não muda. Para trocar, cadastre outro meio."),
    ).toBeTruthy();
  });

  it.each([
    ["Conta corrente", "CONTA_CORRENTE"],
    ["Rótulo", "ROTULO"],
  ] as const)("na %s, o tipo em texto é o dela", (rotulo, tipo) => {
    montar({ tipos: null, valores: { ...CARTAO, tipo, diaFechamento: "", diaVencimento: "" } });

    const bloco = screen.getByText("Tipo").parentElement as HTMLElement;
    expect(within(bloco).getByText(rotulo)).toBeTruthy();
  });

  it("não oferece seletor nem radio de tipo", () => {
    montar({ tipos: null });

    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });
});

describe("os dias só no cartão (CADCOL-07, ACs 3 e 4; CADCOL-08, AC 2)", () => {
  it("no cartão, os dois dias vêm preenchidos com os valores recebidos", () => {
    montar({ tipos: null });

    expect(diaDeFechamento()?.value).toBe("25");
    expect(diaDeVencimento()?.value).toBe("5");
  });

  it.each(["CONTA_CORRENTE", "ROTULO"] as const)("em %s, nenhum campo de dia", (tipo) => {
    montar({ tipos: null, valores: { ...CARTAO, tipo, diaFechamento: "", diaVencimento: "" } });

    expect(diaDeFechamento()).toBeNull();
    expect(diaDeVencimento()).toBeNull();
  });

  it("no seletor, trocar para Conta corrente tira os dias, e voltar a Cartão de crédito os traz", async () => {
    render(<ComEstado inicial={CARTAO} tipos={["CARTAO_CREDITO", "CONTA_CORRENTE", "ROTULO"]} />);
    const tipo = screen.getByRole("combobox", { name: "Tipo" });

    await userEvent.selectOptions(tipo, "Conta corrente");
    expect(diaDeFechamento()).toBeNull();

    await userEvent.selectOptions(tipo, "Cartão de crédito");
    expect(diaDeFechamento()).not.toBeNull();
    expect(diaDeVencimento()).not.toBeNull();
  });
});

describe("o nome (T8: o rótulo vem por prop)", () => {
  it("o campo do nome tem o rótulo recebido e o nome dos valores", () => {
    montar({ rotuloDoNome: "Nome do novo meio de pagamento" });

    expect(
      screen.getByRole<HTMLInputElement>("textbox", { name: "Nome do novo meio de pagamento" })
        .value,
    ).toBe("Cartão Roxo");
    expect(screen.queryByRole("textbox", { name: "Nome" })).toBeNull();
  });

  it("o que a pessoa digita no nome e nos dias volta pelos valores", async () => {
    render(<ComEstado inicial={CARTAO} tipos={null} />);

    const nome = screen.getByRole<HTMLInputElement>("textbox", { name: "Nome" });
    await userEvent.clear(nome);
    await userEvent.type(nome, "Cartão Lilás");
    const fechamento = diaDeFechamento() as HTMLInputElement;
    await userEvent.clear(fechamento);
    await userEvent.type(fechamento, "10");
    const vencimento = diaDeVencimento() as HTMLInputElement;
    await userEvent.clear(vencimento);
    await userEvent.type(vencimento, "17");

    expect(nome.value).toBe("Cartão Lilás");
    expect(fechamento.value).toBe("10");
    expect(vencimento.value).toBe("17");
  });

  /* A guarda do limite depende de `erros` (L-056): o painel passa `erros` e
     mostra a mensagem do limite junto do campo (`detalhe-do-meio.test.tsx`);
     o cadastro inline não passa, e o nome continua cortado em 40, como era
     antes do painel (T8: o inline sem mudança). */
  it("sem `erros`, como no cadastro inline, o nome continua cortado em 40 caracteres", async () => {
    render(<ComEstado inicial={{ ...CARTAO, nome: "" }} tipos={null} />);
    const nome = screen.getByRole<HTMLInputElement>("textbox", { name: "Nome" });

    await userEvent.click(nome);
    await userEvent.paste("a".repeat(41));

    expect(nome.value).toBe("a".repeat(40));
  });
});

/*
 * Os dois dias lado a lado seguem a largura do contêiner (`@md`, 448 px)
 * dentro dos formulários de lançamento, e a da janela (`sm`) na importação,
 * que não tem contêiner (FPC-01). A medida no navegador é de
 * `formulario-pela-coluna.spec.ts`; aqui, que a extração manteve as duas.
 */
describe("o ponto de virada dos dias (FPC-01, mantido pela extração)", () => {
  function linhaDosDias(): string[] {
    const linha = diaDeFechamento()?.parentElement?.parentElement;
    return linha?.className.split(/\s+/) ?? [];
  }

  it("com diasPelaLargura, lado a lado a partir de @md, e não de sm", () => {
    montar({ diasPelaLargura: true });

    expect(linhaDosDias()).toContain("@md:flex-row");
    expect(linhaDosDias()).not.toContain("sm:flex-row");
  });

  it("sem diasPelaLargura, lado a lado a partir de sm, e não de @md", () => {
    montar();

    expect(linhaDosDias()).toContain("sm:flex-row");
    expect(linhaDosDias()).not.toContain("@md:flex-row");
  });
});
