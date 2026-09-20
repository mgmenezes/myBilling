import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { cancelarLancamento } from "@/app/actions/lancamentos";
import type { LancamentoDoMes } from "@/application/mes/obter-visao-mensal/handler";
import type { BlocoDoMes, Cents, Competencia, Lancamento } from "@/domain";
import { TabelaLancamentos } from "./tabela-lancamentos";

const CATEGORIAS = new Map([["cat-1", "Categoria Um"]]);

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
        competenciaCorrente={MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
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
        competenciaCorrente={MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
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
        competenciaCorrente={MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
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
        competenciaCorrente={MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
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
        competenciaCorrente={MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
        lancamentos={[item({ id: "3", origem: "AVULSO", categoriaId: null })]}
      />,
    );

    expect(screen.getByText("Sem categoria")).toBeTruthy();
  });

  it("categoria que saiu do cadastro não apaga a linha nem quebra a tabela", () => {
    render(
      <TabelaLancamentos
        competenciaCorrente={MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
        lancamentos={[item({ id: "4", origem: "AVULSO", categoriaId: "cat-sumida" })]}
      />,
    );

    expect(screen.getByText("Categoria removida")).toBeTruthy();
  });
});

describe("excluir aparece só onde é permitido (AVUL-03, AC 6)", () => {
  it("oferece o controle na linha de lançamento avulso", () => {
    render(
      <TabelaLancamentos
        competenciaCorrente={MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
        lancamentos={[item({ id: "1", origem: "AVULSO", descricao: "Almoço" })]}
      />,
    );

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
  });

  it("não oferece na linha de gasto fixo: a ocorrência renasce na materialização", () => {
    render(
      <TabelaLancamentos
        competenciaCorrente={MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
        lancamentos={[
          item({ id: "1", origem: "RECORRENCIA", recorrenciaId: "r1", descricao: "Conta fixa A" }),
        ]}
      />,
    );

    expect(screen.queryByRole("button", { name: /^Excluir/ })).toBeNull();
  });

  it("oferece na receita avulsa, que também é cancelável", () => {
    render(
      <TabelaLancamentos
        competenciaCorrente={MARCO}
        categorias={CATEGORIAS}
        alternarPagamento={alternarOk}
        confirmarValor={confirmarOk}
        excluir={excluirOk}
        lancamentos={[
          item({ id: "1", origem: "AVULSO", natureza: "RECEITA", descricao: "Pix recebido" }),
        ]}
      />,
    );

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
