import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LancamentoDoMes } from "@/application/mes/obter-visao-mensal/handler";
import type { Cents, Competencia, Lancamento } from "@/domain";
import { TabelaLancamentos } from "./tabela-lancamentos";

const CATEGORIAS = new Map([["cat-1", "Categoria Um"]]);

/** Dublê da action; os testes que precisam observar a chamada passam o seu. */
const alternarOk = vi.fn(async (lancamentoId: string, pago: boolean) => ({
  ok: true as const,
  data: { lancamentoId, pagoEm: pago ? "2026-03-15" : null },
}));

const confirmarOk = vi.fn(async (_id: string, valorCentavos: number) => ({
  ok: true as const,
  data: { valorCentavos },
}));

/**
 * Testes derivados do Done-when de T52 e dos ACs UI-01 (AC 5), UI-02 (AC 6) e
 * PARC-08 (AC 7). Os valores são arbitrários e redondos (AD-009).
 */

afterEach(cleanup);

function lancamento(campos: Partial<Lancamento> & { id: string }): Lancamento {
  return {
    natureza: "DESPESA",
    origem: "AVULSO",
    descricao: "Lançamento avulso A",
    competencia: "2026-03" as Competencia,
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

function item(
  campos: Partial<Lancamento> & { id: string },
  parcela: LancamentoDoMes["parcela"] = null,
): LancamentoDoMes {
  return { lancamento: lancamento(campos), parcela };
}

describe("os três blocos de origem (UI-01, AC 5)", () => {
  it("exibe Fixos, Cartão de Crédito e Gastos do Mês separadamente", () => {
    render(
      <TabelaLancamentos
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
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

    expect(screen.getByRole("heading", { name: "Fixos" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Cartão de Crédito" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Gastos do Mês" })).toBeDefined();
  });

  it("põe cada lançamento no bloco da sua origem, e não em outro", () => {
    render(
      <TabelaLancamentos
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
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

  it("mantém os três blocos visíveis mesmo quando um deles está vazio", () => {
    render(
      <TabelaLancamentos
        lancamentos={[item({ id: "3", origem: "AVULSO" })]}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
      />,
    );

    const cartao = screen.getByRole("region", { name: "Cartão de Crédito" });
    expect(within(cartao).getByText("Nenhum lançamento neste bloco.")).toBeDefined();
  });

  it("não esconde entrada nem investimento: eles ganham o próprio bloco", () => {
    render(
      <TabelaLancamentos
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        lancamentos={[
          item({ id: "r", natureza: "RECEITA", descricao: "Entrada A", valor: 500000 as Cents }),
        ]}
      />,
    );

    const bloco = screen.getByRole("region", { name: "Entradas e investimentos" });
    expect(within(bloco).getByText("Entrada A")).toBeDefined();
  });
});

describe("identificação da parcela (PARC-08, AC 7)", () => {
  it("exibe 8/10 e quantas parcelas ainda faltam", () => {
    render(
      <TabelaLancamentos
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
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
    expect(within(cartao).getByText("(faltam 2 depois desta)")).toBeDefined();
  });

  it("na última parcela diz que é a última, em vez de faltam 0", () => {
    render(
      <TabelaLancamentos
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
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

    expect(screen.getByText("(última)")).toBeDefined();
    expect(screen.getByText(/10\/10/)).toBeDefined();
  });
});

describe("valores e situação", () => {
  it("formata o valor em reais e distingue previsto de pago", () => {
    render(
      <TabelaLancamentos
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
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
        lancamentos={[]}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
      />,
    );

    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText(/Nenhum lançamento neste mês ainda/)).toBeDefined();
  });
});

/**
 * A coluna de categoria substituiu a de parcela onde esta era sempre vazia.
 * O que se prende aqui é que a substituição é **por bloco**: a compra
 * parcelada mantém as duas, porque lá a parcela carrega informação.
 */
describe("categoria na lista", () => {
  it("o bloco de cartão mostra categoria e parcela", () => {
    render(
      <TabelaLancamentos
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
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
    expect(within(bloco).getByRole("columnheader", { name: "Parcela" })).toBeTruthy();
    expect(within(bloco).getByText("Categoria Um")).toBeTruthy();
  });

  it("o bloco de gastos do mês mostra categoria e **não** mostra parcela", () => {
    render(
      <TabelaLancamentos
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        lancamentos={[item({ id: "2", origem: "AVULSO", categoriaId: "cat-1" })]}
      />,
    );

    const bloco = screen.getByRole("region", { name: "Gastos do Mês" });
    expect(within(bloco).getByRole("columnheader", { name: "Categoria" })).toBeTruthy();
    expect(within(bloco).queryByRole("columnheader", { name: "Parcela" })).toBeNull();
    expect(within(bloco).getByText("Categoria Um")).toBeTruthy();
  });

  it("lançamento sem categoria diz isso, em vez de deixar a célula muda", () => {
    render(
      <TabelaLancamentos
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        lancamentos={[item({ id: "3", origem: "AVULSO", categoriaId: null })]}
      />,
    );

    expect(screen.getByText("Sem categoria")).toBeTruthy();
  });

  it("categoria que saiu do cadastro não apaga a linha nem quebra a tabela", () => {
    render(
      <TabelaLancamentos
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        lancamentos={[item({ id: "4", origem: "AVULSO", categoriaId: "cat-sumida" })]}
      />,
    );

    expect(screen.getByText("Categoria removida")).toBeTruthy();
  });
});
