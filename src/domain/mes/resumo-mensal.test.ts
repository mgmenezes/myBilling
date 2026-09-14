import { describe, expect, it } from "vitest";
import type { Competencia } from "../shared/competencia";
import type { Cents } from "../shared/money";
import type { Lancamento } from "../tipos";
import { resumoMensal } from "./resumo-mensal";

const MARCO = "2026-03" as Competencia;
const ABRIL = "2026-04" as Competencia;
const FEVEREIRO = "2026-02" as Competencia;

/**
 * Fixtures escolhidas por valor matemático, nunca por realismo (AD-009).
 * Os três segmentos de despesa somam 500000 e o saldo fecha em 440000.
 */
function lancamento(sobrescrever: Partial<Lancamento> = {}): Lancamento {
  return {
    id: "l-1",
    natureza: "DESPESA",
    origem: "AVULSO",
    descricao: "Lançamento",
    competencia: MARCO,
    dataEvento: "2026-03-10",
    valor: 100000 as Cents,
    valorPrevisto: null,
    pagoEm: null,
    categoriaId: "cat-a",
    usuarioId: "pessoa-a",
    meioPagamentoId: "meio-a",
    compraId: null,
    numeroParcela: null,
    canceladoEm: null,
    ...sobrescrever,
  };
}

describe("resumoMensal — Total de Gastos do eixo competência (MOV-01)", () => {
  it("soma apenas despesas não canceladas da competência pedida", () => {
    const resumo = resumoMensal(
      [
        lancamento({ id: "a", valor: 250000 as Cents, origem: "RECORRENCIA" }),
        lancamento({ id: "b", valor: 150000 as Cents, origem: "PARCELA" }),
        lancamento({ id: "c", valor: 100000 as Cents, origem: "AVULSO" }),
        lancamento({ id: "d", valor: 900000 as Cents, competencia: ABRIL }),
        lancamento({ id: "e", valor: 700000 as Cents, canceladoEm: "2026-03-20" }),
      ],
      MARCO,
    );

    expect(resumo.competenciaView.totalGastos).toBe(500000);
  });

  it("mês sem nenhum lançamento produz todos os totais zerados", () => {
    const resumo = resumoMensal([], MARCO);

    expect(resumo.competenciaView).toEqual({
      totalGastos: 0,
      fixos: 0,
      cartao: 0,
      avulsos: 0,
      entradas: 0,
      investimentos: 0,
      pendente: 0,
      saldo: 0,
    });
  });
});

describe("resumoMensal — investimento fora do Total de Gastos (MOV-04, AC 4)", () => {
  it("mantém o investimento fora do Total de Gastos e dentro do próprio total", () => {
    const resumo = resumoMensal(
      [
        lancamento({ id: "a", valor: 100000 as Cents }),
        lancamento({ id: "b", natureza: "INVESTIMENTO", valor: 60000 as Cents }),
      ],
      MARCO,
    );

    expect(resumo.competenciaView.totalGastos).toBe(100000);
    expect(resumo.competenciaView.investimentos).toBe(60000);
  });

  it("investimento não entra em nenhum dos três segmentos de despesa", () => {
    const resumo = resumoMensal(
      [lancamento({ natureza: "INVESTIMENTO", origem: "AVULSO", valor: 60000 as Cents })],
      MARCO,
    );

    expect(resumo.competenciaView.avulsos).toBe(0);
    expect(resumo.competenciaView.fixos).toBe(0);
    expect(resumo.competenciaView.cartao).toBe(0);
  });
});

describe("resumoMensal — saldo do eixo competência (MOV-05, AC 5)", () => {
  it("aplica Entradas − Saídas − Investimentos", () => {
    const resumo = resumoMensal(
      [
        lancamento({ id: "a", natureza: "RECEITA", valor: 1000000 as Cents }),
        lancamento({ id: "b", valor: 250000 as Cents, origem: "RECORRENCIA" }),
        lancamento({ id: "c", valor: 150000 as Cents, origem: "PARCELA" }),
        lancamento({ id: "d", valor: 100000 as Cents, origem: "AVULSO" }),
        lancamento({ id: "e", natureza: "INVESTIMENTO", valor: 60000 as Cents }),
      ],
      MARCO,
    );

    expect(resumo.competenciaView.entradas).toBe(1000000);
    expect(resumo.competenciaView.totalGastos).toBe(500000);
    expect(resumo.competenciaView.investimentos).toBe(60000);
    expect(resumo.competenciaView.saldo).toBe(1000000 - 500000 - 60000);
  });
});

describe("resumoMensal — lançamento cancelado", () => {
  it("não entra em soma nenhuma, qualquer que seja a natureza", () => {
    const resumo = resumoMensal(
      [
        lancamento({ id: "a", valor: 700000 as Cents, canceladoEm: "2026-03-20" }),
        lancamento({
          id: "b",
          natureza: "RECEITA",
          valor: 800000 as Cents,
          canceladoEm: "2026-03-21",
        }),
        lancamento({
          id: "c",
          natureza: "INVESTIMENTO",
          valor: 900000 as Cents,
          canceladoEm: "2026-03-22",
        }),
      ],
      MARCO,
    );

    expect(resumo.competenciaView.totalGastos).toBe(0);
    expect(resumo.competenciaView.entradas).toBe(0);
    expect(resumo.competenciaView.investimentos).toBe(0);
    expect(resumo.competenciaView.saldo).toBe(0);
  });
});

describe("resumoMensal — segmentação por origem", () => {
  it("Fixos, Cartão e Avulsos somam exatamente o Total de Gastos", () => {
    const resumo = resumoMensal(
      [
        lancamento({ id: "a", valor: 250000 as Cents, origem: "RECORRENCIA" }),
        lancamento({ id: "b", valor: 150000 as Cents, origem: "PARCELA" }),
        lancamento({ id: "c", valor: 100000 as Cents, origem: "AVULSO" }),
      ],
      MARCO,
    );

    const { fixos, cartao, avulsos, totalGastos } = resumo.competenciaView;
    expect(fixos).toBe(250000);
    expect(cartao).toBe(150000);
    expect(avulsos).toBe(100000);
    expect(fixos + cartao + avulsos).toBe(totalGastos);
  });
});

describe("resumoMensal — previsto versus realizado (MOV-06, AC 1)", () => {
  it("lançamento com pagoEm é realizado no caixa; sem pagoEm fica só no previsto", () => {
    const resumo = resumoMensal(
      [
        lancamento({ id: "pago", valor: 30000 as Cents, pagoEm: "2026-03-05" }),
        lancamento({ id: "previsto", valor: 70000 as Cents, pagoEm: null }),
      ],
      MARCO,
    );

    expect(resumo.caixaView.saidas).toBe(30000);
    expect(resumo.competenciaView.pendente).toBe(70000);
    expect(resumo.competenciaView.totalGastos).toBe(100000);
  });

  it("receita e investimento realizados entram nos próprios totais de caixa", () => {
    const resumo = resumoMensal(
      [
        lancamento({
          id: "a",
          natureza: "RECEITA",
          valor: 1000000 as Cents,
          pagoEm: "2026-03-05",
        }),
        lancamento({
          id: "b",
          natureza: "INVESTIMENTO",
          valor: 60000 as Cents,
          pagoEm: "2026-03-06",
        }),
        lancamento({ id: "c", valor: 100000 as Cents, pagoEm: "2026-03-07" }),
      ],
      MARCO,
    );

    expect(resumo.caixaView.entradasRecebidas).toBe(1000000);
    expect(resumo.caixaView.investimentosRealizados).toBe(60000);
    expect(resumo.caixaView.saidas).toBe(100000);
    expect(resumo.caixaView.saldo).toBe(1000000 - 100000 - 60000);
  });
});

describe("resumoMensal — total pendente (MOV-06, AC 2)", () => {
  it("soma apenas despesas da competência sem pagoEm", () => {
    const resumo = resumoMensal(
      [
        lancamento({ id: "a", valor: 70000 as Cents, pagoEm: null }),
        lancamento({ id: "b", valor: 30000 as Cents, pagoEm: "2026-03-05" }),
        lancamento({ id: "c", natureza: "RECEITA", valor: 1000000 as Cents, pagoEm: null }),
        lancamento({ id: "d", natureza: "INVESTIMENTO", valor: 60000 as Cents, pagoEm: null }),
        lancamento({ id: "e", valor: 900000 as Cents, competencia: ABRIL, pagoEm: null }),
        lancamento({
          id: "f",
          valor: 500000 as Cents,
          pagoEm: null,
          canceladoEm: "2026-03-20",
        }),
      ],
      MARCO,
    );

    expect(resumo.competenciaView.pendente).toBe(70000);
  });
});

describe("resumoMensal — os dois eixos em objetos distintos (MOV-03, AC 3)", () => {
  it("entrega competenciaView e caixaView sem nenhum campo comum entre eles", () => {
    const resumo = resumoMensal([lancamento()], MARCO);

    expect(Object.keys(resumo).sort()).toEqual(["caixaView", "competenciaView"]);
    expect(Object.keys(resumo.competenciaView).sort()).toEqual([
      "avulsos",
      "cartao",
      "entradas",
      "fixos",
      "investimentos",
      "pendente",
      "saldo",
      "totalGastos",
    ]);
    expect(Object.keys(resumo.caixaView).sort()).toEqual([
      "entradasRecebidas",
      "investimentosRealizados",
      "saidas",
      "saldo",
    ]);
  });

  it("pagamento de fatura de competência anterior faz Total de Gastos divergir de Saídas", () => {
    // A parcela de fevereiro só sai da conta quando a fatura vence em março:
    // conta como gasto em fevereiro e como saída de caixa em março.
    const parcelaDeFevereiro = lancamento({
      id: "parcela-fev",
      origem: "PARCELA",
      competencia: FEVEREIRO,
      valor: 120000 as Cents,
      pagoEm: "2026-03-10",
    });
    const avulsoDeMarco = lancamento({
      id: "avulso-mar",
      origem: "AVULSO",
      competencia: MARCO,
      valor: 100000 as Cents,
      pagoEm: null,
    });

    const resumo = resumoMensal([parcelaDeFevereiro, avulsoDeMarco], MARCO);

    expect(resumo.competenciaView.totalGastos).toBe(100000);
    expect(resumo.caixaView.saidas).toBe(120000);
    expect(resumo.competenciaView.totalGastos).not.toBe(resumo.caixaView.saidas);
  });

  it("despesa paga em outro mês não entra nas Saídas da competência pedida", () => {
    const resumo = resumoMensal(
      [lancamento({ id: "a", valor: 100000 as Cents, pagoEm: "2026-04-02" })],
      MARCO,
    );

    expect(resumo.caixaView.saidas).toBe(0);
    expect(resumo.competenciaView.totalGastos).toBe(100000);
  });
});
