import { describe, expect, it } from "vitest";
import type { Competencia } from "../shared/competencia";
import type { Cents } from "../shared/money";
import type { Lancamento } from "../tipos";
import { resumoMensal } from "./resumo-mensal";

const MARCO = "2026-03" as Competencia;
const ABRIL = "2026-04" as Competencia;

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
