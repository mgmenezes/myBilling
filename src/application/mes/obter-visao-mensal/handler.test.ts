import { beforeEach, describe, expect, it } from "vitest";
import { criarCompraParcelada } from "@/application/compras/criar-compra-parcelada/handler";
import { criarFakes, type Fakes } from "@/application/ports/fakes";
import type { EntradaCompraValidada } from "@/application/schemas/compra.schema";
import type { Cents, Competencia, Lancamento } from "@/domain";
import { MESES_DE_PROJECAO, obterVisaoMensal } from "./handler";

/**
 * Testes derivados de MOV-03 (AC 3), MOV-04 (AC 4), MOV-05 (AC 5), MOV-06
 * (AC 3), UI-02 (AC 6) e PARC-08 (AC 7). Tudo com os fakes em memória, sem
 * banco. Os valores são escolhidos por propriedade aritmética (AD-009).
 */

const CARTAO = "22222222-2222-4222-8222-222222222222";
const CONTA = "33333333-3333-4333-8333-333333333333";
const USUARIO = "11111111-1111-4111-8111-111111111111";
const MARCO = "2026-03" as Competencia;

let fakes: Fakes;

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
    usuarioId: USUARIO,
    meioPagamentoId: CARTAO,
    compraId: null,
    numeroParcela: null,
    recorrenciaId: null,
    canceladoEm: null,
    ...campos,
  };
}

function semear(...lancamentos: Lancamento[]): void {
  for (const item of lancamentos) {
    fakes.estado.movimentos.set(item.id, item);
  }
}

beforeEach(() => {
  fakes = criarFakes();
  fakes.estado.meiosDePagamento.push(
    {
      id: CARTAO,
      nome: "Cartão Roxo",
      tipo: "CARTAO_CREDITO",
      arquivadoEm: null,
      diaFechamento: 25,
      diaVencimento: 5,
      fechamentoVaiParaFaturaSeguinte: true,
    },
    { id: CONTA, nome: "Conta Corrente", tipo: "CONTA_CORRENTE", arquivadoEm: null },
  );
});

describe("os dois eixos ficam em objetos distintos (MOV-03, AC 3)", () => {
  it("entrega competência, caixa e futuro sem nenhum campo que os some", async () => {
    semear(
      // Assumido em março e ainda não pago: conta na competência, não no caixa.
      lancamento({ id: "a", valor: 50000 as Cents }),
      // Assumido em março e já pago: conta nos dois eixos.
      lancamento({ id: "b", valor: 70000 as Cents, pagoEm: "2026-03-12" }),
    );

    const visao = await obterVisaoMensal(fakes, MARCO);

    expect(visao.competenciaView.totalGastos).toBe(120000);
    expect(visao.competenciaView.pendente).toBe(50000);
    expect(visao.caixaView.saidas).toBe(70000);
    expect(Object.keys(visao).sort()).toEqual([
      "caixaView",
      "competencia",
      "competenciaView",
      "futuro",
      "lancamentos",
    ]);
  });

  it("cada eixo expõe exatamente os seus campos, e nenhum a mais", async () => {
    semear(
      lancamento({ id: "a", valor: 50000 as Cents }),
      lancamento({ id: "b", valor: 70000 as Cents, pagoEm: "2026-03-12" }),
    );

    const visao = await obterVisaoMensal(fakes, MARCO);

    // Um campo novo que misturasse os eixos teria de aparecer em uma destas
    // duas listas, e a lista é fechada. É a forma do tipo carregando a regra.
    expect(Object.keys(visao.competenciaView).sort()).toEqual([
      "avulsos",
      "cartao",
      "entradas",
      "fixos",
      "investimentos",
      "pendente",
      "saldo",
      "totalGastos",
    ]);
    expect(Object.keys(visao.caixaView).sort()).toEqual([
      "entradasRecebidas",
      "investimentosRealizados",
      "saidas",
      "saldo",
    ]);
  });
});

describe("saldo do mês (MOV-05, AC 5 e MOV-04, AC 4)", () => {
  it("aplica Entradas − Saídas − Investimentos", async () => {
    semear(
      lancamento({ id: "receita", natureza: "RECEITA", valor: 500000 as Cents }),
      lancamento({ id: "despesa", natureza: "DESPESA", valor: 120000 as Cents }),
      lancamento({ id: "aporte", natureza: "INVESTIMENTO", valor: 80000 as Cents }),
    );

    const visao = await obterVisaoMensal(fakes, MARCO);

    expect(visao.competenciaView.entradas).toBe(500000);
    expect(visao.competenciaView.totalGastos).toBe(120000);
    expect(visao.competenciaView.investimentos).toBe(80000);
    expect(visao.competenciaView.saldo).toBe(500000 - 120000 - 80000);
  });

  it("mantém o investimento fora do Total de Gastos e fora das Saídas (MOV-04, AC 4)", async () => {
    semear(
      lancamento({
        id: "aporte",
        natureza: "INVESTIMENTO",
        valor: 80000 as Cents,
        pagoEm: "2026-03-07",
      }),
    );

    const visao = await obterVisaoMensal(fakes, MARCO);

    expect(visao.competenciaView.totalGastos).toBe(0);
    expect(visao.caixaView.saidas).toBe(0);
    expect(visao.caixaView.investimentosRealizados).toBe(80000);
  });
});

describe("segmentação pelos blocos da cascata (UI-01 AC 5, BLOCO-01)", () => {
  /*
   * Este bloco afirmava a regra antiga: cartão era `origem = 'PARCELA'`. A
   * cascata trocou o critério para o meio de pagamento, então o avulso pago no
   * cartão deixa de somar em Avulsos e passa a somar em Cartão. Os valores
   * esperados mudaram porque a regra mudou, e não porque a assertion afrouxou:
   * as fixtures agora usam dois meios distintos, e cada bloco é afirmado
   * separadamente.
   */
  it("separa fixos, cartão e avulsos pelo meio de pagamento", async () => {
    semear(
      lancamento({ id: "fixo", origem: "RECORRENCIA", valor: 30000 as Cents }),
      lancamento({
        id: "parcela",
        origem: "PARCELA",
        valor: 20000 as Cents,
        compraId: "c1",
        numeroParcela: 1,
        recorrenciaId: null,
      }),
      lancamento({
        id: "avulso",
        origem: "AVULSO",
        meioPagamentoId: CONTA,
        valor: 10000 as Cents,
      }),
    );

    const visao = await obterVisaoMensal(fakes, MARCO);

    expect(visao.competenciaView.fixos).toBe(30000);
    expect(visao.competenciaView.cartao).toBe(20000);
    expect(visao.competenciaView.avulsos).toBe(10000);
    expect(visao.competenciaView.totalGastos).toBe(60000);
  });

  it("leva o gasto avulso no cartão para o bloco do cartão — BLOCO-01, AC 3", async () => {
    semear(
      lancamento({ id: "avulso-cartao", origem: "AVULSO", valor: 10000 as Cents }),
      lancamento({
        id: "avulso-conta",
        origem: "AVULSO",
        meioPagamentoId: CONTA,
        valor: 7000 as Cents,
      }),
    );

    const visao = await obterVisaoMensal(fakes, MARCO);

    expect(visao.competenciaView.cartao).toBe(10000);
    expect(visao.competenciaView.avulsos).toBe(7000);
  });

  it("mantém o fixo pago no cartão em Fixos — BLOCO-01, AC 2", async () => {
    semear(
      lancamento({
        id: "fixo-cartao",
        origem: "RECORRENCIA",
        recorrenciaId: "r-1",
        valor: 30000 as Cents,
      }),
    );

    const visao = await obterVisaoMensal(fakes, MARCO);

    expect(visao.competenciaView.fixos).toBe(30000);
    expect(visao.competenciaView.cartao).toBe(0);
  });
});

describe("identificação da parcela (PARC-08, AC 7)", () => {
  it("devolve 8 de 10 com duas parcelas restantes", async () => {
    const entrada: EntradaCompraValidada = {
      idempotencyKey: "6f1c1b3e-3a2d-4c5b-8e7f-9a0b1c2d3e4f",
      descricao: "Compra parcelada B",
      modo: "VALOR_PARCELA",
      valorCentavos: 6000,
      qtdParcelas: 10,
      parcelaInicial: 8,
      competenciaInicial: "2026-03",
      politicaResiduo: "PRIMEIRAS",
      categoriaId: null,
      usuarioId: USUARIO,
      meioPagamentoId: CARTAO,
      dataEvento: "2026-03-04",
    };
    await criarCompraParcelada(fakes, entrada);

    const visao = await obterVisaoMensal(fakes, MARCO);

    expect(visao.lancamentos).toHaveLength(1);
    expect(visao.lancamentos[0]?.parcela).toEqual({ numero: 8, total: 10, restantes: 2 });
  });

  it("não identifica parcela em lançamento avulso", async () => {
    semear(lancamento({ id: "avulso" }));

    const visao = await obterVisaoMensal(fakes, MARCO);

    expect(visao.lancamentos[0]?.parcela).toBeNull();
  });
});

describe("comprometimento futuro (MOV-06, AC 3)", () => {
  it("quebra por competência e não agrega num número só", async () => {
    semear(
      lancamento({ id: "abr", competencia: "2026-04" as Competencia, valor: 33333 as Cents }),
      lancamento({ id: "mai", competencia: "2026-05" as Competencia, valor: 33333 as Cents }),
    );

    const visao = await obterVisaoMensal(fakes, MARCO);

    expect(visao.futuro).toEqual([
      { competencia: "2026-04", comprometido: 33333 },
      { competencia: "2026-05", comprometido: 33333 },
      { competencia: "2026-06", comprometido: 0 },
    ]);
  });
});

describe("mês sem lançamento (UI-02, AC 6)", () => {
  it("devolve estrutura válida com zeros, não erro", async () => {
    const visao = await obterVisaoMensal(fakes, MARCO);

    expect(visao.lancamentos).toEqual([]);
    expect(visao.competenciaView).toEqual({
      totalGastos: 0,
      fixos: 0,
      cartao: 0,
      avulsos: 0,
      entradas: 0,
      investimentos: 0,
      pendente: 0,
      saldo: 0,
    });
    expect(visao.caixaView).toEqual({
      saidas: 0,
      entradasRecebidas: 0,
      investimentosRealizados: 0,
      saldo: 0,
    });
    expect(visao.futuro).toHaveLength(MESES_DE_PROJECAO);
    expect(visao.futuro.every((mes) => mes.comprometido === 0)).toBe(true);
  });
});
