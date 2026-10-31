import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DetalheDoFixo } from "./detalhe-do-fixo";
import type { ItemDeFixo } from "./tabela-de-fixos";

/**
 * Derivado de FIXCOL-04 (ACs 2 a 6). Herda de `lista-de-fixos.test.tsx` o
 * encerrado sem os controles de ciclo de vida (138) e o "Editar" em todo fixo,
 * inclusive no encerrado (373 e 386), agora no painel.
 *
 * O cenário é o "Fixo A" do e2e do design, em março: vigências em janeiro,
 * fevereiro e maio, e a ocorrência confirmada em R$ 105,00 sobre R$ 100,00.
 */

afterEach(cleanup);

const FIXO_A: ItemDeFixo = {
  id: "rec-a",
  descricao: "Fixo A",
  natureza: "DESPESA",
  diaVencimento: 5,
  categoria: "Categoria Um",
  corDaCategoria: "roxo",
  meio: "Conta Corrente",
  pessoa: "Pessoa B",
  valorDoMes: "R$ 105,00",
  previstoDoMes: "R$ 100,00",
  confirmado: true,
  inicio: "Janeiro de 2026",
  comecaDepois: false,
  fim: null,
  encerrada: false,
  historico: [
    { desde: "Janeiro de 2026", valor: "R$ 90,00", valeNoMes: false },
    { desde: "Fevereiro de 2026", valor: "R$ 100,00", valeNoMes: true },
    { desde: "Maio de 2026", valor: "R$ 110,00", valeNoMes: false },
  ],
  competenciaInicio: "2026-01",
  competenciaFim: null,
  meioPagamentoId: "meio-1",
  categoriaId: "cat-1",
  usuarioId: "pessoa-b",
  valorNoMesCentavos: 10000,
};

function montar(item: ItemDeFixo = FIXO_A) {
  const acoes = { aoMudarValor: vi.fn(), aoEditar: vi.fn(), aoEncerrar: vi.fn() };
  render(
    <DetalheDoFixo
      item={item}
      rotuloDaCompetencia="Março de 2026"
      nomeDoMes="Março"
      aoMudarValor={acoes.aoMudarValor}
      aoEditar={acoes.aoEditar}
      aoEncerrar={acoes.aoEncerrar}
    />,
  );
  return { ...acoes, usuario: userEvent.setup() };
}

/** A definição do termo na lista de dados: o `dd` logo depois do `dt`. */
function definicao(termo: string): HTMLElement {
  const dt = screen.getByText(termo, { selector: "dt" });
  const dd = dt.nextElementSibling;
  if (!(dd instanceof HTMLElement) || dd.tagName !== "DD") {
    throw new Error(`"${termo}" não tem definição logo depois`);
  }
  return dd;
}

/** O bloco do valor do mês: o elemento do valor e o que vem junto dele. */
function blocoDoValor(valor: string): HTMLElement {
  const elemento = screen.getByText(valor, { selector: "p" });
  if (elemento.parentElement === null) {
    throw new Error(`o valor ${valor} está solto`);
  }
  return elemento.parentElement;
}

describe("o valor do mês aberto (FIXCOL-04, AC 2)", () => {
  it('o valor com "em Março de 2026"', () => {
    montar({ ...FIXO_A, valorDoMes: "R$ 50,00", previstoDoMes: "R$ 50,00", confirmado: false });

    const bloco = blocoDoValor("R$ 50,00");
    expect(within(bloco).getByText("em Março de 2026")).toBeTruthy();
    expect(within(bloco).queryByText(/confirmado/)).toBeNull();
  });

  it('confirmado: o valor confirmado e "confirmado · previa R$ 100,00"', () => {
    montar();

    const bloco = blocoDoValor("R$ 105,00");
    expect(within(bloco).getByText("em Março de 2026")).toBeTruthy();
    expect(within(bloco).getByText("confirmado · previa R$ 100,00")).toBeTruthy();
  });

  it('quem começa depois: "—" com "Começa em Junho de 2026"', () => {
    montar({
      ...FIXO_A,
      valorDoMes: null,
      previstoDoMes: null,
      confirmado: false,
      inicio: "Junho de 2026",
      comecaDepois: true,
    });

    const bloco = blocoDoValor("—");
    expect(within(bloco).getByText("Começa em Junho de 2026")).toBeTruthy();
    expect(within(bloco).queryByText("em Março de 2026")).toBeNull();
  });
});

describe("os dados do fixo (FIXCOL-04, AC 3)", () => {
  it("a categoria como na linha: a pill na cor dela", () => {
    montar();

    const pill = within(definicao("Categoria")).getByText("Categoria Um");
    expect(pill.className.split(/\s+/)).toEqual(
      expect.arrayContaining(["bg-cat-roxo-fundo", "text-cat-roxo-texto"]),
    );
  });

  it('na entrada, a categoria é "Receita"', () => {
    montar({ ...FIXO_A, natureza: "RECEITA", categoria: "Receita", corDaCategoria: null });

    expect(definicao("Categoria").textContent).toBe("Receita");
  });

  it('na saída, o meio vem como "Meio de pagamento"', () => {
    montar();

    expect(definicao("Meio de pagamento").textContent).toBe("Conta Corrente");
    expect(screen.queryByText("Onde o dinheiro cai")).toBeNull();
  });

  it('na entrada, o meio vem como "Onde o dinheiro cai" (AD-015)', () => {
    montar({ ...FIXO_A, natureza: "RECEITA", categoria: "Receita", corDaCategoria: null });

    expect(definicao("Onde o dinheiro cai").textContent).toBe("Conta Corrente");
    expect(screen.queryByText("Meio de pagamento")).toBeNull();
  });

  it('"De quem é" mostra a pessoa', () => {
    montar();

    expect(definicao("De quem é").textContent).toBe("Pessoa B");
  });

  it('"Começou em" quando o início é até o mês aberto', () => {
    montar();

    expect(definicao("Começou em").textContent).toBe("Janeiro de 2026");
    expect(screen.queryByText("Começa em", { selector: "dt" })).toBeNull();
  });

  it('"Começa em" quando o início é depois do mês aberto', () => {
    montar({ ...FIXO_A, valorDoMes: null, inicio: "Junho de 2026", comecaDepois: true });

    expect(definicao("Começa em").textContent).toBe("Junho de 2026");
    expect(screen.queryByText("Começou em", { selector: "dt" })).toBeNull();
  });

  it('"Termina em" diz "Sem fim" quando não há fim', () => {
    montar();

    expect(definicao("Termina em").textContent).toBe("Sem fim");
  });

  it('"Termina em" diz o mês do fim quando há fim', () => {
    montar({ ...FIXO_A, fim: "Dezembro de 2026", competenciaFim: "2026-12" });

    expect(definicao("Termina em").textContent).toBe("Dezembro de 2026");
  });
});

describe("o valor ao longo dos meses (FIXCOL-04, AC 4)", () => {
  it('as vigências da mais antiga para a mais nova, com "desde" e o valor previsto', () => {
    montar();

    const historico = screen.getByRole("region", { name: "Valor ao longo dos meses" });
    const itens = within(historico).getAllByRole("listitem");
    expect(itens).toHaveLength(3);
    expect(within(itens[0] as HTMLElement).getByText("desde Janeiro de 2026")).toBeTruthy();
    expect(within(itens[0] as HTMLElement).getByText("R$ 90,00")).toBeTruthy();
    expect(within(itens[1] as HTMLElement).getByText("desde Fevereiro de 2026")).toBeTruthy();
    expect(within(itens[1] as HTMLElement).getByText("R$ 100,00")).toBeTruthy();
    expect(within(itens[2] as HTMLElement).getByText("desde Maio de 2026")).toBeTruthy();
    expect(within(itens[2] as HTMLElement).getByText("R$ 110,00")).toBeTruthy();
  });

  it('"vale em Março" só na vigência do mês aberto', () => {
    montar();

    const itens = within(
      screen.getByRole("region", { name: "Valor ao longo dos meses" }),
    ).getAllByRole("listitem");
    expect(itens.map((item) => within(item).queryByText("vale em Março") !== null)).toEqual([
      false,
      true,
      false,
    ]);
  });
});

describe("as ações (FIXCOL-04, ACs 5 e 6)", () => {
  it('"Mudar valor" e "Editar" e, depois deles, "Encerrar" no pé, em vermelho', () => {
    montar();

    const botoes = screen.getAllByRole("button");
    expect(botoes.map((b) => b.textContent)).toEqual(["Mudar valor", "Editar", "Encerrar"]);
    const encerrar = screen.getByRole("button", { name: "Encerrar" });
    expect(encerrar.className.split(/\s+/)).toContain("text-negativo");
    /* No pé: separado das outras duas, num bloco próprio depois delas. */
    const pe = encerrar.parentElement;
    expect(pe?.contains(screen.getByRole("button", { name: "Editar" }))).toBe(false);
    expect(pe?.className.split(/\s+/)).toContain("border-t");
  });

  it.each([
    ["Mudar valor", "aoMudarValor"],
    ["Editar", "aoEditar"],
    ["Encerrar", "aoEncerrar"],
  ] as const)('"%s" chama o seu callback, e só ele', async (rotulo, callback) => {
    const acoes = montar();

    await acoes.usuario.click(screen.getByRole("button", { name: rotulo }));

    for (const nome of ["aoMudarValor", "aoEditar", "aoEncerrar"] as const) {
      expect(acoes[nome]).toHaveBeenCalledTimes(nome === callback ? 1 : 0);
    }
  });

  it('o encerrado mostra o aviso com o mês do fim e "Editar" como única ação', () => {
    montar({ ...FIXO_A, encerrada: true, fim: "Fevereiro de 2026", competenciaFim: "2026-02" });

    expect(
      screen.getByText(
        "Encerrado: vale até Fevereiro de 2026. Para reabrir, use Editar e apague o “Termina em”.",
      ),
    ).toBeTruthy();
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Editar"]);
  });

  it("o que não está encerrado não mostra o aviso", () => {
    montar();

    expect(screen.queryByText(/^Encerrado:/)).toBeNull();
  });
});
