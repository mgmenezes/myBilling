import { cleanup, render as renderizar, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { cancelarLancamento, trocarCategoria } from "@/app/actions/lancamentos";
import type { LancamentoDoMes } from "@/application/mes/obter-visao-mensal/handler";
import type { BlocoDoMes, Cents, Competencia, Lancamento } from "@/domain";
import { type ChaveDeBloco, lerBlocosRecolhidos } from "@/lib/blocos-recolhidos";
import { ProvedorDeAvisos } from "./avisos";
import { TabelaLancamentos } from "./tabela-lancamentos";

/** Os nomes, inclusive o de uma arquivada; as opções do seletor são só as ativas. */
const CATEGORIAS = new Map([
  ["cat-1", "Categoria Um"],
  ["cat-arquivada", "Categoria Arquivada"],
]);
const OPCOES = [{ id: "cat-1", nome: "Categoria Um", cor: "verde" }] as const;

/**
 * O seletor de categoria da linha avisa pelo toast, e o provedor do toast mora
 * no layout. Aqui ele embrulha cada render, como o layout embrulha a página.
 */
function render(ui: ReactElement) {
  return renderizar(ui, { wrapper: ProvedorDeAvisos });
}

/** O que o seletor de categoria da linha mostra selecionado. */
function categoriaSelecionada(escopo: HTMLElement, descricao: string): string | null | undefined {
  return within(escopo).getByRole<HTMLSelectElement>("combobox", {
    name: `Categoria de ${descricao}`,
  }).selectedOptions[0]?.textContent;
}

/**
 * A parcela na célula da descrição, **na mesma linha** dela (DENS-01, AC 2,
 * que substitui a segunda linha de LST-05, AC 1). Procurada dentro da célula
 * da descrição, e depois dela: achar o texto em qualquer lugar da linha da
 * tabela não provaria que ele está ao lado da descrição (lição L-018). A
 * altura da linha, que é o que "mesma linha" quer dizer na tela, é medida no
 * e2e; aqui se prova que o trecho não é um bloco próprio.
 */
function parcelaDaLinha(escopo: HTMLElement, descricao: string): HTMLElement {
  const celula = within(escopo).getByText(descricao).closest("td");
  if (celula === null) {
    throw new Error(`"${descricao}" não está numa célula`);
  }
  expect(celula.firstChild?.textContent).toBe(descricao);
  const trecho = celula.lastElementChild;
  if (!(trecho instanceof HTMLElement) || trecho === celula.firstChild) {
    throw new Error(`a célula de "${descricao}" não tem a parcela`);
  }
  /* Em linha, menor e apagado: nada de bloco próprio. */
  const classes = trecho.className.split(" ");
  expect(classes).toEqual(expect.arrayContaining(["text-[13px]", "text-ink-muted"]));
  expect(classes).not.toContain("block");
  return trecho;
}

/** O mês aberto nestes testes. Igual à competência corrente, salvo onde o
 *  caso diz o contrário: aí o não pago é vencido. */
const MARCO = "2026-03" as Competencia;

/** Dublê da action; os testes que precisam observar a chamada passam o seu. */
const alternarOk = vi.fn(async (lancamentoId: string, pago: boolean) => ({
  ok: true as const,
  data: { lancamentoId, pagoEm: pago ? "2026-03-15" : null },
}));

const confirmarOk = vi.fn(async (_id: string, valorCentavos: number) => ({
  ok: true as const,
  data: { valorCentavos },
}));

const trocarOk = vi.fn(async () => ({
  ok: true as const,
  data: { lancamentoId: "1", alcance: "LANCAMENTO" as const, categoriaId: null },
})) as unknown as typeof trocarCategoria;

/**
 * Testes derivados do Done-when de T52 e dos ACs UI-01 (AC 5), UI-02 (AC 6) e
 * PARC-08 (AC 7). Os valores são arbitrários e redondos (AD-009).
 */

afterEach(cleanup);

const excluirOk = vi.fn(async () => ({
  ok: true as const,
  data: { id: "l-1", competencia: "2026-03", alterou: true },
})) as unknown as typeof cancelarLancamento;

function lancamento(campos: Partial<Lancamento> & { id: string }): Lancamento {
  return {
    natureza: "DESPESA",
    origem: "AVULSO",
    descricao: "Lançamento avulso A",
    competencia: MARCO,
    dataEvento: "2026-03-10",
    valor: 1000 as Cents,
    valorPrevisto: null,
    pagoEm: null,
    categoriaId: null,
    usuarioId: "u1",
    meioPagamentoId: "m1",
    compraId: null,
    numeroParcela: null,
    recorrenciaId: null,
    canceladoEm: null,
    ...campos,
  };
}

/**
 * O bloco é decidido por `obterVisaoMensal`, não pela tabela. Aqui ele é
 * derivado da origem para reproduzir o comportamento que estes testes já
 * afirmavam; o parâmetro permite escrever os casos em que meio e origem
 * discordam, que é o que a cascata trouxe.
 */
function blocoPadrao(origem: Lancamento["origem"]): BlocoDoMes {
  if (origem === "RECORRENCIA") {
    return "FIXOS";
  }
  return origem === "PARCELA" ? "CARTAO" : "AVULSOS";
}

function item(
  campos: Partial<Lancamento> & { id: string },
  parcela: LancamentoDoMes["parcela"] = null,
  bloco?: BlocoDoMes,
): LancamentoDoMes {
  const l = lancamento(campos);
  return { lancamento: l, parcela, bloco: bloco ?? blocoPadrao(l.origem) };
}

describe("os quatro blocos do mês (UI-01 AC 5, ENTR-02)", () => {
  it("exibe Entradas, Fixos, Cartão de Crédito e Gastos do Mês separadamente", () => {
    render(
      <TabelaLancamentos
        competenciaCorrente={MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
        opcoesDeCategoria={OPCOES}
        trocarCategoria={trocarOk}
        lancamentos={[
          item({ id: "1", origem: "RECORRENCIA", descricao: "Conta fixa A" }),
          item(
            {
              id: "2",
              origem: "PARCELA",
              descricao: "Compra parcelada A",
              compraId: "c1",
              numeroParcela: 1,
              recorrenciaId: null,
            },
            { numero: 1, total: 3, restantes: 2 },
          ),
          item({ id: "3", origem: "AVULSO", descricao: "Lançamento avulso A" }),
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Entradas" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Fixos" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Cartão de Crédito" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Gastos do Mês" })).toBeDefined();
  });

  it("põe Entradas antes de todos os blocos de despesa — ENTR-02, AC 3", () => {
    render(
      <TabelaLancamentos
        competenciaCorrente={MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
        opcoesDeCategoria={OPCOES}
        trocarCategoria={trocarOk}
        lancamentos={[item({ id: "1", origem: "AVULSO", descricao: "Lançamento avulso A" })]}
      />,
    );

    const titulos = screen.getAllByRole("heading").map((h) => h.textContent);
    expect(titulos).toEqual(["Entradas", "Fixos", "Cartão de Crédito", "Gastos do Mês"]);
  });

  it("põe cada lançamento no bloco que a visão do mês carimbou, e não em outro", () => {
    render(
      <TabelaLancamentos
        competenciaCorrente={MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
        opcoesDeCategoria={OPCOES}
        trocarCategoria={trocarOk}
        lancamentos={[
          item({ id: "1", origem: "RECORRENCIA", descricao: "Conta fixa A" }),
          item({ id: "3", origem: "AVULSO", descricao: "Lançamento avulso A" }),
        ]}
      />,
    );

    const fixos = screen.getByRole("region", { name: "Fixos" });
    const avulsos = screen.getByRole("region", { name: "Gastos do Mês" });
    expect(within(fixos).getByText("Conta fixa A")).toBeDefined();
    expect(within(avulsos).getByText("Lançamento avulso A")).toBeDefined();
    expect(within(fixos).queryByText("Lançamento avulso A")).toBeNull();
  });

  it("mantém os blocos de despesa visíveis mesmo quando um deles está vazio", () => {
    render(
      <TabelaLancamentos
        competenciaCorrente={MARCO}
        lancamentos={[item({ id: "3", origem: "AVULSO" })]}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
        opcoesDeCategoria={OPCOES}
        trocarCategoria={trocarOk}
      />,
    );

    const cartao = screen.getByRole("region", { name: "Cartão de Crédito" });
    expect(within(cartao).getByText("Nenhum lançamento neste bloco.")).toBeDefined();
  });

  it("põe a receita no bloco Entradas, e não em bloco de despesa nenhum", () => {
    render(
      <TabelaLancamentos
        competenciaCorrente={MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
        opcoesDeCategoria={OPCOES}
        trocarCategoria={trocarOk}
        lancamentos={[
          item({ id: "r", natureza: "RECEITA", descricao: "Entrada A", valor: 500000 as Cents }),
        ]}
      />,
    );

    const entradas = screen.getByRole("region", { name: "Entradas" });
    expect(within(entradas).getByText("Entrada A")).toBeDefined();
    for (const nome of ["Fixos", "Cartão de Crédito", "Gastos do Mês"]) {
      expect(
        within(screen.getByRole("region", { name: nome })).queryByText("Entrada A"),
      ).toBeNull();
    }
  });

  /*
   * O bloco de entradas aparecia só quando tinha conteúdo, enquanto os três de
   * despesa apareciam vazios. Num mês sem receita, o dinheiro que entra era o
   * único que sumia da tela — e com ele o convite para cadastrar.
   */
  it("mantém Entradas visível num mês sem nenhuma receita — ENTR-02, AC 2 e 4", () => {
    render(
      <TabelaLancamentos
        competenciaCorrente={MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
        opcoesDeCategoria={OPCOES}
        trocarCategoria={trocarOk}
        lancamentos={[item({ id: "1", origem: "AVULSO", descricao: "Lançamento avulso A" })]}
      />,
    );

    const entradas = screen.getByRole("region", { name: "Entradas" });
    expect(within(entradas).getByText("Nenhum lançamento neste bloco.")).toBeDefined();
    expect(within(entradas).queryByRole("table")).toBeNull();
  });

  it("classifica pelo bloco recebido, e não pela origem: avulso no cartão vai para Cartão", () => {
    render(
      <TabelaLancamentos
        competenciaCorrente={MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
        opcoesDeCategoria={OPCOES}
        trocarCategoria={trocarOk}
        lancamentos={[
          item({ id: "1", origem: "AVULSO", descricao: "Farmácia no cartão" }, null, "CARTAO"),
          item(
            {
              id: "2",
              origem: "PARCELA",
              descricao: "Parcela no carnê",
              compraId: "c1",
              numeroParcela: 1,
            },
            null,
            "AVULSOS",
          ),
        ]}
      />,
    );

    const cartao = screen.getByRole("region", { name: "Cartão de Crédito" });
    const gastos = screen.getByRole("region", { name: "Gastos do Mês" });
    expect(within(cartao).getByText("Farmácia no cartão")).toBeDefined();
    expect(within(gastos).getByText("Parcela no carnê")).toBeDefined();
  });
});

describe("identificação da parcela (PARC-08, AC 7)", () => {
  it("exibe 8/10 e quantas parcelas ainda faltam", () => {
    render(
      <TabelaLancamentos
        competenciaCorrente={MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
        opcoesDeCategoria={OPCOES}
        trocarCategoria={trocarOk}
        lancamentos={[
          item(
            {
              id: "1",
              origem: "PARCELA",
              descricao: "Compra parcelada B",
              compraId: "c1",
              numeroParcela: 8,
              recorrenciaId: null,
            },
            { numero: 8, total: 10, restantes: 2 },
          ),
        ]}
      />,
    );

    const cartao = screen.getByRole("region", { name: "Cartão de Crédito" });
    expect(within(cartao).getByText(/8\/10/)).toBeDefined();
    expect(parcelaDaLinha(cartao, "Compra parcelada B").textContent).toBe("8/10 · faltam 2");
  });

  it("na última parcela diz que é a última, em vez de faltam 0", () => {
    render(
      <TabelaLancamentos
        competenciaCorrente={MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
        opcoesDeCategoria={OPCOES}
        trocarCategoria={trocarOk}
        lancamentos={[
          item(
            {
              id: "1",
              origem: "PARCELA",
              descricao: "Compra parcelada B",
              compraId: "c1",
              numeroParcela: 10,
              recorrenciaId: null,
            },
            { numero: 10, total: 10, restantes: 0 },
          ),
        ]}
      />,
    );

    expect(
      parcelaDaLinha(
        screen.getByRole("region", { name: "Cartão de Crédito" }),
        "Compra parcelada B",
      ).textContent,
    ).toBe("10/10 · última");
  });
});

/**
 * Testes derivados de LST-05 (AC 2) e de DENS-01 (AC 2), que substitui o AC 1
 * de LST-05. A coluna Parcela apertava "(faltam 3 depois desta)" até quebrar
 * palavra por palavra; a parcela foi para baixo da descrição e, na lista
 * densa, para a mesma linha dela, curta.
 */
describe("parcela na linha da descrição (LST-05, DENS-01)", () => {
  function montar(itens: ReadonlyArray<LancamentoDoMes>) {
    return render(
      <TabelaLancamentos
        competenciaCorrente={MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
        opcoesDeCategoria={OPCOES}
        trocarCategoria={trocarOk}
        lancamentos={itens}
      />,
    );
  }

  function parcelaDaCompraB(numero: number, restantes: number): LancamentoDoMes {
    return item(
      {
        id: `p${numero}`,
        origem: "PARCELA",
        descricao: "Compra B",
        compraId: "c1",
        numeroParcela: numero,
      },
      { numero, total: 4, restantes },
    );
  }

  it("ao lado de Compra B, na mesma célula, 2/4 · faltam 2, com o número tabular (DENS-01, AC 2)", () => {
    montar([parcelaDaCompraB(2, 2)]);

    const cartao = screen.getByRole("region", { name: "Cartão de Crédito" });
    const trecho = parcelaDaLinha(cartao, "Compra B");
    expect(trecho.textContent).toBe("2/4 · faltam 2");
    expect(within(trecho).getByText("2/4").className).toContain("tabular");
  });

  it("na última, 4/4 · última (DENS-01, AC 2)", () => {
    montar([parcelaDaCompraB(4, 0)]);

    const cartao = screen.getByRole("region", { name: "Cartão de Crédito" });
    expect(parcelaDaLinha(cartao, "Compra B").textContent).toBe("4/4 · última");
  });

  it("na penúltima, ainda 3/4 · faltam 1, e não última (DENS-01, AC 2)", () => {
    montar([parcelaDaCompraB(3, 1)]);

    const cartao = screen.getByRole("region", { name: "Cartão de Crédito" });
    expect(parcelaDaLinha(cartao, "Compra B").textContent).toBe("3/4 · faltam 1");
  });

  it("nenhum bloco tem a coluna Parcela, nem o do Cartão (AC 2)", () => {
    montar([
      item({ id: "e", natureza: "RECEITA", descricao: "Entrada A" }),
      item({ id: "f", origem: "RECORRENCIA", descricao: "Conta fixa A" }),
      parcelaDaCompraB(2, 2),
      item({ id: "a", origem: "AVULSO", descricao: "Lançamento avulso A" }),
    ]);

    expect(screen.getAllByRole("table")).toHaveLength(4);
    expect(screen.getAllByRole("columnheader", { name: "Descrição" })).toHaveLength(4);
    expect(screen.queryByRole("columnheader", { name: "Parcela" })).toBeNull();
  });
});

describe("valores e situação", () => {
  it("formata o valor em reais e distingue previsto de pago", () => {
    render(
      <TabelaLancamentos
        competenciaCorrente={MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
        opcoesDeCategoria={OPCOES}
        trocarCategoria={trocarOk}
        lancamentos={[
          item({ id: "1", origem: "AVULSO", descricao: "Previsto A", valor: 33334 as Cents }),
          item({
            id: "2",
            origem: "AVULSO",
            descricao: "Pago A",
            valor: 33333 as Cents,
            pagoEm: "2026-03-12",
          }),
        ]}
      />,
    );

    expect(screen.getByText("R$ 333,34")).toBeDefined();
    expect(screen.getByText("R$ 333,33")).toBeDefined();
    expect(screen.getByText("Previsto")).toBeDefined();
    expect(screen.getByText("Pago")).toBeDefined();
  });
});

describe("estado vazio (UI-02, AC 6)", () => {
  it("explica o que fazer em vez de mostrar tabela em branco", () => {
    render(
      <TabelaLancamentos
        competenciaCorrente={MARCO}
        lancamentos={[]}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
        opcoesDeCategoria={OPCOES}
        trocarCategoria={trocarOk}
      />,
    );

    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText(/Nenhum lançamento neste mês ainda/)).toBeDefined();
  });
});

/**
 * A coluna de categoria substituiu a de parcela onde esta era sempre vazia.
 * No Cartão a parcela continua informando, na célula da descrição, logo depois
 * dela (DENS-01, AC 2), e a coluna Parcela não existe em bloco nenhum (LST-05,
 * AC 2, que substitui o BLOCO-01 AC 7).
 */
describe("categoria na lista", () => {
  it("o bloco de cartão mostra categoria e a parcela na célula da descrição, sem coluna Parcela (LST-05, ACs 1 e 2; DENS-01, AC 2)", () => {
    render(
      <TabelaLancamentos
        competenciaCorrente={MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
        opcoesDeCategoria={OPCOES}
        trocarCategoria={trocarOk}
        lancamentos={[
          item(
            { id: "1", origem: "PARCELA", categoriaId: "cat-1" },
            { numero: 1, total: 3, restantes: 2 },
          ),
        ]}
      />,
    );

    const bloco = screen.getByRole("region", { name: "Cartão de Crédito" });
    expect(within(bloco).getByRole("columnheader", { name: "Categoria" })).toBeTruthy();
    expect(within(bloco).queryByRole("columnheader", { name: "Parcela" })).toBeNull();
    expect(parcelaDaLinha(bloco, "Lançamento avulso A").textContent).toBe("1/3 · faltam 2");
    expect(categoriaSelecionada(bloco, "Lançamento avulso A")).toBe("Categoria Um");
  });

  it("o bloco de gastos do mês mostra categoria e **não** mostra parcela", () => {
    render(
      <TabelaLancamentos
        competenciaCorrente={MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
        opcoesDeCategoria={OPCOES}
        trocarCategoria={trocarOk}
        lancamentos={[item({ id: "2", origem: "AVULSO", categoriaId: "cat-1" })]}
      />,
    );

    const bloco = screen.getByRole("region", { name: "Gastos do Mês" });
    expect(within(bloco).getByRole("columnheader", { name: "Categoria" })).toBeTruthy();
    expect(within(bloco).queryByRole("columnheader", { name: "Parcela" })).toBeNull();
    expect(categoriaSelecionada(bloco, "Lançamento avulso A")).toBe("Categoria Um");
  });

  it("lançamento sem categoria diz isso, em vez de deixar a célula muda", () => {
    render(
      <TabelaLancamentos
        competenciaCorrente={MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
        opcoesDeCategoria={OPCOES}
        trocarCategoria={trocarOk}
        lancamentos={[item({ id: "3", origem: "AVULSO", categoriaId: null })]}
      />,
    );

    expect(categoriaSelecionada(document.body, "Lançamento avulso A")).toBe("Sem categoria");
  });

  it("categoria que saiu do cadastro não apaga a linha nem quebra a tabela", () => {
    render(
      <TabelaLancamentos
        competenciaCorrente={MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
        opcoesDeCategoria={OPCOES}
        trocarCategoria={trocarOk}
        lancamentos={[item({ id: "4", origem: "AVULSO", categoriaId: "cat-sumida" })]}
      />,
    );

    expect(categoriaSelecionada(document.body, "Lançamento avulso A")).toBe("Categoria removida");
  });
});

/**
 * Testes derivados de TRC-01 (ACs 1 e 2), TRC-02 (ACs 1 e 3) e do Done-when de
 * T8. A entrada é sempre receita e não troca de categoria; tudo o que não é
 * entrada, investimento inclusive, troca na linha.
 */
describe("Receita na entrada e seletor no gasto (TRC-01, TRC-02)", () => {
  function montar(itens: ReadonlyArray<LancamentoDoMes>) {
    return render(
      <TabelaLancamentos
        competenciaCorrente={MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
        opcoesDeCategoria={OPCOES}
        trocarCategoria={trocarOk}
        lancamentos={itens}
      />,
    );
  }

  it("entrada sem categoria e entrada com categoria dizem Receita, sem seletor (TRC-01, ACs 1 e 2)", () => {
    montar([
      item({ id: "e1", natureza: "RECEITA", descricao: "Entrada A", categoriaId: null }),
      item({
        id: "e2",
        natureza: "RECEITA",
        origem: "RECORRENCIA",
        recorrenciaId: "r1",
        valorPrevisto: 500000 as Cents,
        valor: 500000 as Cents,
        descricao: "Entrada B",
        categoriaId: "cat-1",
      }),
    ]);

    const entradas = screen.getByRole("region", { name: "Entradas" });
    /* "Na coluna Categoria": a célula sob aquele cabeçalho, e não a linha. */
    const colunaCategoria = within(entradas)
      .getAllByRole("columnheader")
      .indexOf(within(entradas).getByRole("columnheader", { name: "Categoria" }));
    for (const descricao of ["Entrada A", "Entrada B"]) {
      const linha = within(entradas).getByRole("row", { name: new RegExp(descricao) });
      const celulas = within(linha).getAllByRole("cell");
      expect(celulas[colunaCategoria]?.textContent).toBe("Receita");
      expect(within(linha).queryByRole("combobox")).toBeNull();
    }
    expect(within(entradas).queryByText("Categoria Um")).toBeNull();
    expect(within(entradas).queryByText("Sem categoria")).toBeNull();
  });

  it("despesa tem o seletor com a categoria gravada selecionada e as ativas como opções (TRC-02, AC 1)", () => {
    montar([
      item({ id: "d1", origem: "RECORRENCIA", descricao: "Conta fixa A", categoriaId: "cat-1" }),
    ]);

    const seletor = screen.getByRole<HTMLSelectElement>("combobox", {
      name: "Categoria de Conta fixa A",
    });
    expect(categoriaSelecionada(document.body, "Conta fixa A")).toBe("Categoria Um");
    expect([...seletor.options].map((opcao) => opcao.textContent)).toEqual([
      "Sem categoria",
      "Categoria Um",
    ]);
    expect(screen.queryByText("Receita")).toBeNull();
  });

  /* A cor vem das opções que a página monta: a tabela as entrega ao seletor
     da linha, e não as perde no caminho (COR-03, AC 2). */
  it("o seletor da linha tem a cor da categoria gravada, vinda das opções (COR-03, AC 2)", () => {
    montar([item({ id: "d1", descricao: "Conta fixa A", categoriaId: "cat-1" })]);

    const seletor = screen.getByRole<HTMLSelectElement>("combobox", {
      name: "Categoria de Conta fixa A",
    });
    expect(seletor.className.split(/\s+/)).toEqual(
      expect.arrayContaining(["bg-cat-verde-fundo", "text-cat-verde-texto"]),
    );
  });

  it("investimento também tem o seletor, como despesa (TRC-02, AC 1)", () => {
    montar([
      item({ id: "i1", natureza: "INVESTIMENTO", descricao: "Investimento A", categoriaId: null }),
    ]);

    expect(categoriaSelecionada(document.body, "Investimento A")).toBe("Sem categoria");
    expect(screen.queryByText("Receita")).toBeNull();
  });

  it("gasto com categoria arquivada mostra o nome dela selecionado, como opção a mais (TRC-02, AC 3)", () => {
    montar([item({ id: "d2", descricao: "Gasto A", categoriaId: "cat-arquivada" })]);

    const seletor = screen.getByRole<HTMLSelectElement>("combobox", {
      name: "Categoria de Gasto A",
    });
    expect(categoriaSelecionada(document.body, "Gasto A")).toBe("Categoria Arquivada");
    expect([...seletor.options].map((opcao) => opcao.textContent)).toEqual([
      "Sem categoria",
      "Categoria Um",
      "Categoria Arquivada",
    ]);
  });
});

/*
 * Com a lista densa, "Excluir" mora no menu "⋯" da linha (DENS-02): a linha
 * do avulso tem o "⋯", e o "Excluir" só aparece com o menu aberto.
 */
describe("excluir aparece só onde é permitido (AVUL-03, AC 6; DENS-02)", () => {
  it('oferece o controle na linha de lançamento avulso, dentro do menu "⋯" (DENS-02, ACs 1, 3 e 6)', async () => {
    render(
      <TabelaLancamentos
        competenciaCorrente={MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
        opcoesDeCategoria={OPCOES}
        trocarCategoria={trocarOk}
        lancamentos={[item({ id: "1", origem: "AVULSO", descricao: "Almoço" })]}
      />,
    );

    expect(screen.queryByRole("button", { name: /^Excluir/ })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Mais ações para Almoço" }));
    expect(screen.getByRole("button", { name: "Excluir, Almoço" })).toBeDefined();
  });

  it("não oferece na linha de parcela: removê-la quebraria a soma da compra", () => {
    render(
      <TabelaLancamentos
        competenciaCorrente={MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
        opcoesDeCategoria={OPCOES}
        trocarCategoria={trocarOk}
        lancamentos={[
          item(
            {
              id: "1",
              origem: "PARCELA",
              descricao: "Compra parcelada A",
              compraId: "c1",
              numeroParcela: 1,
            },
            { numero: 1, total: 3, restantes: 2 },
          ),
        ]}
      />,
    );

    expect(screen.queryByRole("button", { name: /^Excluir/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Mais ações/ })).toBeNull();
  });

  it("não oferece na linha de gasto fixo: a ocorrência renasce na materialização", () => {
    render(
      <TabelaLancamentos
        competenciaCorrente={MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
        opcoesDeCategoria={OPCOES}
        trocarCategoria={trocarOk}
        lancamentos={[
          item({ id: "1", origem: "RECORRENCIA", recorrenciaId: "r1", descricao: "Conta fixa A" }),
        ]}
      />,
    );

    expect(screen.queryByRole("button", { name: /^Excluir/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Mais ações/ })).toBeNull();
  });

  it("oferece na receita avulsa, que também é cancelável", async () => {
    render(
      <TabelaLancamentos
        competenciaCorrente={MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
        opcoesDeCategoria={OPCOES}
        trocarCategoria={trocarOk}
        lancamentos={[
          item({ id: "1", origem: "AVULSO", natureza: "RECEITA", descricao: "Pix recebido" }),
        ]}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Mais ações para Pix recebido" }));
    expect(screen.getByRole("button", { name: "Excluir, Pix recebido" })).toBeDefined();
  });
});

/**
 * Testes derivados de VENC-01 (AC 6). O terceiro estado existia na regra e não
 * existia na tela: `situacaoDe` sabia devolver vencido, e nada na lista dizia.
 *
 * A competência corrente é **parâmetro**, e é o que estes casos variam: a
 * mesma linha é pendente ou vencida conforme o mês de hoje, e não conforme o
 * mês aberto.
 */
describe("a situação vencida aparece na linha (VENC-01, AC 6)", () => {
  const SETEMBRO = "2026-09" as Competencia;
  const ABRIL = "2026-04" as Competencia;

  function montar(corrente: Competencia, campos: Partial<Lancamento> & { id: string }) {
    return render(
      <TabelaLancamentos
        competenciaCorrente={corrente}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
        opcoesDeCategoria={OPCOES}
        trocarCategoria={trocarOk}
        lancamentos={[item(campos)]}
      />,
    );
  }

  it("distingue o não pago de mês anterior pela palavra, e não só pela cor", () => {
    montar(SETEMBRO, { id: "1", descricao: "Atrasada A" });

    const linha = screen.getByRole("row", { name: /Atrasada A/ });
    expect(within(linha).getByText("Vencido")).toBeDefined();
  });

  it("no mês corrente o mesmo não pago segue previsto, e não vencido", () => {
    montar(MARCO, { id: "1", descricao: "Atrasada A" });

    const linha = screen.getByRole("row", { name: /Atrasada A/ });
    expect(within(linha).queryByText("Vencido")).toBeNull();
    expect(within(linha).getByText("Previsto")).toBeDefined();
  });

  it("competência futura não é vencida", () => {
    montar(MARCO, { id: "1", descricao: "Futura A", competencia: ABRIL });

    expect(screen.queryByText("Vencido")).toBeNull();
  });

  it("pago de mês anterior continua pago, e nunca vencido", () => {
    montar(SETEMBRO, { id: "1", descricao: "Quitada A", pagoEm: "2026-03-12" });

    const linha = screen.getByRole("row", { name: /Quitada A/ });
    expect(within(linha).queryByText("Vencido")).toBeNull();
    expect(within(linha).getByText("Pago")).toBeDefined();
  });

  /* O selo não vira um toggle de três posições: ele continua ligando e
     desligando o pagamento, e o vencido entra ao lado. */
  it("o selo continua sendo o botão que alterna o pagamento", () => {
    montar(SETEMBRO, { id: "1", descricao: "Atrasada A" });

    const selo = screen.getByRole("button", { name: "Previsto, Atrasada A" });
    expect(selo.getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryByRole("button", { name: /^Vencido/ })).toBeNull();
  });
});

describe("os dois controles da linha continuam separados (TOQUE-01)", () => {
  /*
   * Com o alvo a 44 × 44 os dois controles ficam encostados se nada os
   * separar, e no celular a pessoa precisa **ver** onde um acaba. O tamanho é
   * medido no e2e; o que se trava aqui é o espaçamento entre eles.
   */
  /* Com a lista densa, o controle ao lado do selo é o "⋯" do menu (DENS-02). */
  it('o selo e o "⋯" ficam no mesmo contêiner, com espaçamento entre si', () => {
    render(
      <TabelaLancamentos
        competenciaCorrente={MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
        opcoesDeCategoria={OPCOES}
        trocarCategoria={trocarOk}
        lancamentos={[item({ id: "1", origem: "AVULSO", descricao: "Almoço" })]}
      />,
    );

    const selo = screen.getByRole("button", { name: /Previsto/ });
    const menu = screen.getByRole("button", { name: "Mais ações para Almoço" });
    const contêiner = selo.parentElement;

    expect(contêiner).not.toBeNull();
    expect(contêiner?.contains(menu)).toBe(true);
    expect(contêiner?.className).toContain("gap-2");
  });
});

describe("o vazio do mês oferece a saída (VAZIO-01, ACs 1 e 4)", () => {
  /* O gatilho do cadastro vive no topo da página, montado uma vez só
     (AD-014). Aqui ele entra como dublê, com o mesmo contrato ARIA que o
     `DialogoDeCadastro` declara, para provar que o controle do estado vazio
     abre o cadastro que já existe em vez de montar um segundo. */
  function montarVazio(aoAbrirCadastro: () => void) {
    render(
      <>
        <button type="button" aria-haspopup="dialog" onClick={aoAbrirCadastro}>
          + Novo lançamento
        </button>
        <TabelaLancamentos
          competenciaCorrente={MARCO}
          lancamentos={[]}
          categorias={CATEGORIAS}
          alternarPagamento={alternarOk}
          confirmarValor={confirmarOk}
          excluir={excluirOk}
          opcoesDeCategoria={OPCOES}
          trocarCategoria={trocarOk}
        />
      </>,
    );
  }

  it("oferece o controle que abre o cadastro", async () => {
    const abrirCadastro = vi.fn();
    montarVazio(abrirCadastro);

    await userEvent.click(
      screen.getByRole("button", { name: "+ Cadastrar o primeiro lançamento" }),
    );

    expect(abrirCadastro).toHaveBeenCalledTimes(1);
  });

  it("não manda procurar o cadastro em posição que ele não ocupa", () => {
    montarVazio(vi.fn());

    const aviso = screen.getByText(/Nenhum lançamento neste mês ainda/);

    expect(aviso.textContent).not.toContain("abaixo");
  });
});

/**
 * Testes derivados de LST-02 (ACs 1 a 5) e dos dois Edge Cases do bloco: o
 * filtro que esvazia um bloco e o cookie com bloco que não existe.
 *
 * Os totais são escolhidos pela aritmética, e não copiados do exemplo da
 * spec (AD-009): 25 fixos de R$ 100,00 e um de R$ 100,26 somam R$ 2.600,26.
 */
describe("blocos que recolhem, com resumo e cookie (LST-02)", () => {
  const ABRIL = "2026-04" as Competencia;
  const PAGO_EM = "2026-03-05";

  /** 26 fixos, 6 pagos: "26 · R$ 2.600,26 · 20 a pagar". */
  const VINTE_E_SEIS_FIXOS = Array.from({ length: 26 }, (_, posicao) =>
    item({
      id: `f-${posicao + 1}`,
      origem: "RECORRENCIA",
      descricao: `Conta fixa ${posicao + 1}`,
      valor: (posicao === 25 ? 10026 : 10000) as Cents,
      pagoEm: posicao < 6 ? PAGO_EM : null,
    }),
  );

  const MES = [
    item({
      id: "r",
      natureza: "RECEITA",
      descricao: "Entrada A",
      valor: 500000 as Cents,
      pagoEm: PAGO_EM,
    }),
    item({ id: "f", origem: "RECORRENCIA", descricao: "Conta fixa A", valor: 12345 as Cents }),
    item(
      { id: "c1", origem: "PARCELA", descricao: "Compra A", valor: 25000 as Cents, compraId: "c" },
      { numero: 1, total: 2, restantes: 1 },
    ),
    item(
      {
        id: "c2",
        origem: "PARCELA",
        descricao: "Compra B",
        valor: 25001 as Cents,
        compraId: "d",
        pagoEm: PAGO_EM,
      },
      { numero: 2, total: 2, restantes: 0 },
    ),
    item({ id: "a", origem: "AVULSO", descricao: "Gasto A", valor: 99 as Cents }),
  ];

  function tabela(
    lancamentos: ReadonlyArray<LancamentoDoMes>,
    opcoes: { recolhidos?: ReadonlyArray<ChaveDeBloco>; corrente?: Competencia } = {},
  ) {
    return (
      <TabelaLancamentos
        competenciaCorrente={opcoes.corrente ?? MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
        opcoesDeCategoria={OPCOES}
        trocarCategoria={trocarOk}
        recolhidos={opcoes.recolhidos}
        lancamentos={lancamentos}
      />
    );
  }

  const bloco = (nome: string) => screen.getByRole("region", { name: nome });
  const botaoDo = (nome: string) => within(bloco(nome)).getByRole("button", { name: nome });

  /** O valor do cookie como o navegador o guarda, sem os atributos. */
  function cookieDosBlocos(): string | undefined {
    return document.cookie
      .split("; ")
      .find((par) => par.startsWith("blocos-recolhidos="))
      ?.slice("blocos-recolhidos=".length);
  }

  beforeEach(() => {
    // biome-ignore lint/suspicious/noDocumentCookie: o jsdom guarda o cookie entre os testes do arquivo; apagá-lo é o que isola cada caso.
    document.cookie = "blocos-recolhidos=; path=/; max-age=0";
  });

  describe("o resumo no cabeçalho (AC 1)", () => {
    it('Fixos diz "26 · R$ 2.600,26 · 20 a pagar" a partir das linhas recebidas', () => {
      render(tabela(VINTE_E_SEIS_FIXOS));

      expect(within(bloco("Fixos")).getByText("26 · R$ 2.600,26 · 20 a pagar")).toBeDefined();
    });

    it("cada um dos quatro blocos traz o próprio resumo", () => {
      render(tabela(MES));

      expect(within(bloco("Entradas")).getByText("1 · R$ 5.000,00 · 0 a pagar")).toBeDefined();
      expect(within(bloco("Fixos")).getByText("1 · R$ 123,45 · 1 a pagar")).toBeDefined();
      expect(
        within(bloco("Cartão de Crédito")).getByText("2 · R$ 500,01 · 1 a pagar"),
      ).toBeDefined();
      expect(within(bloco("Gastos do Mês")).getByText("1 · R$ 0,99 · 1 a pagar")).toBeDefined();
    });

    /* Vencido é não pago lido pelo calendário: continua a pagar. */
    it("o vencido conta como a pagar", () => {
      render(tabela(MES, { corrente: ABRIL }));

      expect(within(bloco("Fixos")).getByText("1 · R$ 123,45 · 1 a pagar")).toBeDefined();
      expect(
        within(bloco("Cartão de Crédito")).getByText("2 · R$ 500,01 · 1 a pagar"),
      ).toBeDefined();
    });

    it("bloco que o filtro esvaziou mostra 0 e a frase de bloco vazio (Edge Case)", () => {
      render(tabela([item({ id: "a", origem: "AVULSO", descricao: "Gasto A" })]));

      const cartao = bloco("Cartão de Crédito");
      expect(within(cartao).getByText("0 · R$ 0,00 · 0 a pagar")).toBeDefined();
      expect(within(cartao).getByText("Nenhum lançamento neste bloco.")).toBeDefined();
    });
  });

  describe("recolher e expandir pelo cabeçalho (AC 2)", () => {
    it("o botão do cabeçalho expõe aria-expanded e aria-controls apontando para as linhas", () => {
      render(tabela(MES));

      const botao = botaoDo("Fixos");
      const controlado = document.getElementById(botao.getAttribute("aria-controls") ?? "");
      expect(botao.getAttribute("aria-expanded")).toBe("true");
      expect(controlado?.contains(within(bloco("Fixos")).getByRole("table"))).toBe(true);
    });

    it("acionado, as linhas do bloco somem; acionado de novo, voltam", async () => {
      render(tabela(MES));
      const botao = botaoDo("Fixos");

      await userEvent.click(botao);

      expect(botao.getAttribute("aria-expanded")).toBe("false");
      expect(within(bloco("Fixos")).queryByRole("row")).toBeNull();
      expect(within(bloco("Fixos")).getByText("1 · R$ 123,45 · 1 a pagar")).toBeDefined();
      expect(within(bloco("Cartão de Crédito")).getAllByRole("row")).toHaveLength(3);

      await userEvent.click(botao);

      expect(botao.getAttribute("aria-expanded")).toBe("true");
      expect(within(bloco("Fixos")).getByText("Conta fixa A")).toBeDefined();
      expect(within(bloco("Fixos")).getAllByRole("row")).toHaveLength(2);
    });
  });

  describe("o estado vai para o cookie blocos-recolhidos (AC 3)", () => {
    it("cada clique grava as chaves dos blocos recolhidos naquele momento", async () => {
      render(tabela(MES));

      await userEvent.click(botaoDo("Fixos"));
      expect(cookieDosBlocos()).toBe("FIXOS");

      await userEvent.click(botaoDo("Cartão de Crédito"));
      expect(cookieDosBlocos()).toBe("FIXOS,CARTAO");

      await userEvent.click(botaoDo("Fixos"));
      expect(cookieDosBlocos()).toBe("CARTAO");
    });

    it("Entradas e Gastos do Mês gravam as próprias chaves", async () => {
      render(tabela(MES));

      await userEvent.click(botaoDo("Entradas"));
      await userEvent.click(botaoDo("Gastos do Mês"));

      expect(cookieDosBlocos()).toBe("ENTRADAS,AVULSOS");
    });

    it("o cookie vale para o app inteiro e dura um ano", async () => {
      const escrita = vi.spyOn(Document.prototype, "cookie", "set");
      render(tabela(MES));

      await userEvent.click(botaoDo("Fixos"));

      const gravado = String(escrita.mock.lastCall?.[0]);
      escrita.mockRestore();
      expect(gravado).toMatch(/^blocos-recolhidos=FIXOS;/);
      expect(gravado).toMatch(/; path=\/(;|$)/);
      expect(gravado).toMatch(/; max-age=31536000(;|$)/);
    });
  });

  describe("o estado inicial vem do servidor (ACs 4 e 5)", () => {
    it('recebendo recolhidos={["FIXOS"]}, Fixos vem fechado já no HTML do servidor', () => {
      const html = renderToStaticMarkup(
        <ProvedorDeAvisos>{tabela(MES, { recolhidos: ["FIXOS"] })}</ProvedorDeAvisos>,
      );
      const pagina = new DOMParser().parseFromString(html, "text/html");

      const fixos = pagina.querySelector("#bloco-fixos button");
      const cartao = pagina.querySelector("#bloco-cartao button");
      expect(fixos?.getAttribute("aria-expanded")).toBe("false");
      expect(
        pagina.getElementById(fixos?.getAttribute("aria-controls") ?? "")?.hasAttribute("hidden"),
      ).toBe(true);
      expect(cartao?.getAttribute("aria-expanded")).toBe("true");
      expect(
        pagina.getElementById(cartao?.getAttribute("aria-controls") ?? "")?.hasAttribute("hidden"),
      ).toBe(false);
    });

    it('recebendo recolhidos={["FIXOS"]}, Fixos está fechado desde o primeiro render', () => {
      render(tabela(MES, { recolhidos: ["FIXOS"] }));

      expect(botaoDo("Fixos").getAttribute("aria-expanded")).toBe("false");
      expect(within(bloco("Fixos")).queryByRole("row")).toBeNull();
      expect(within(bloco("Gastos do Mês")).getAllByRole("row")).toHaveLength(2);
    });

    it("sem cookie, os quatro blocos abrem", () => {
      render(tabela(MES));

      for (const nome of ["Entradas", "Fixos", "Cartão de Crédito", "Gastos do Mês"]) {
        expect(botaoDo(nome).getAttribute("aria-expanded")).toBe("true");
      }
    });

    it("chave desconhecida no cookie é ignorada, e o resto vale (Edge Case)", () => {
      render(tabela(MES, { recolhidos: lerBlocosRecolhidos("FIXOS,QUALQUER") }));

      expect(botaoDo("Fixos").getAttribute("aria-expanded")).toBe("false");
      for (const nome of ["Entradas", "Cartão de Crédito", "Gastos do Mês"]) {
        expect(botaoDo(nome).getAttribute("aria-expanded")).toBe("true");
      }
    });
  });
});
