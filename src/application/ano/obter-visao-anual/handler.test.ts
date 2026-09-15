import { beforeEach, describe, expect, it } from "vitest";
import { criarFakes, type Fakes } from "@/application/ports/fakes";
import type { Cents, Competencia, Lancamento } from "@/domain";
import { obterVisaoAnual } from "./handler";

/**
 * Testes derivados de HOME-03 (ACs 2, 3). Fakes em memória, sem banco. Valores
 * escolhidos por propriedade aritmética, nunca por realismo (AD-009).
 */

const CARTAO = "22222222-2222-4222-8222-222222222222";
const CONTA = "33333333-3333-4333-8333-333333333333";
const USUARIO = "11111111-1111-4111-8111-111111111111";

let fakes: Fakes;

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
    usuarioId: USUARIO,
    meioPagamentoId: CONTA,
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

describe("obterVisaoAnual", () => {
  it("varre as doze competências do ano", async () => {
    const visao = await obterVisaoAnual(fakes, 2026);

    expect(visao.competencias).toHaveLength(12);
    expect(visao.competencias[0]).toBe("2026-01");
    expect(visao.competencias[11]).toBe("2026-12");
  });

  it("acumula despesas de meses diferentes no mesmo total", async () => {
    semear(
      lancamento({ id: "a", competencia: "2026-01" as Competencia, valor: 700 as Cents }),
      lancamento({ id: "b", competencia: "2026-12" as Competencia, valor: 300 as Cents }),
    );

    const visao = await obterVisaoAnual(fakes, 2026);

    expect(visao.totalGastos).toBe(1000);
    expect(visao.totais.avulsos).toBe(1000);
  });

  it("separa os blocos pela mesma cascata da lista: fixo no cartão continua fixo", async () => {
    semear(
      lancamento({
        id: "fixo-no-cartao",
        origem: "RECORRENCIA",
        meioPagamentoId: CARTAO,
        competencia: "2026-02" as Competencia,
        valor: 500 as Cents,
      }),
      lancamento({
        id: "parcela",
        origem: "PARCELA",
        meioPagamentoId: CARTAO,
        competencia: "2026-05" as Competencia,
        valor: 200 as Cents,
      }),
      lancamento({ id: "avulso", competencia: "2026-09" as Competencia, valor: 100 as Cents }),
    );

    const visao = await obterVisaoAnual(fakes, 2026);

    expect(visao.totais).toEqual({ fixos: 500, cartao: 200, avulsos: 100 });
  });

  it("ignora o que cai fora do ano pedido", async () => {
    semear(
      lancamento({ id: "dentro", competencia: "2026-06" as Competencia, valor: 400 as Cents }),
      lancamento({ id: "antes", competencia: "2025-12" as Competencia, valor: 9000 as Cents }),
      lancamento({ id: "depois", competencia: "2027-01" as Competencia, valor: 9000 as Cents }),
    );

    const visao = await obterVisaoAnual(fakes, 2026);

    expect(visao.totalGastos).toBe(400);
  });

  it("não soma lançamento cancelado, receita nem investimento", async () => {
    semear(
      lancamento({ id: "vale", competencia: "2026-04" as Competencia, valor: 600 as Cents }),
      lancamento({
        id: "cancelado",
        competencia: "2026-04" as Competencia,
        valor: 5000 as Cents,
        canceladoEm: "2026-04-20T00:00:00.000Z",
      }),
      lancamento({
        id: "receita",
        natureza: "RECEITA",
        competencia: "2026-04" as Competencia,
        valor: 5000 as Cents,
      }),
      lancamento({
        id: "investimento",
        natureza: "INVESTIMENTO",
        competencia: "2026-04" as Competencia,
        valor: 5000 as Cents,
      }),
    );

    const visao = await obterVisaoAnual(fakes, 2026);

    expect(visao.totalGastos).toBe(600);
  });

  it("recusa um ano que não cabe numa competência, em vez de somar lixo", async () => {
    await expect(obterVisaoAnual(fakes, 99_999)).rejects.toThrow(/fora da faixa/);
  });

  it("os três blocos somam exatamente o total de gastos do ano", async () => {
    semear(
      lancamento({
        id: "f",
        origem: "RECORRENCIA",
        competencia: "2026-03" as Competencia,
        valor: 111 as Cents,
      }),
      lancamento({
        id: "c",
        meioPagamentoId: CARTAO,
        competencia: "2026-07" as Competencia,
        valor: 222 as Cents,
      }),
      lancamento({ id: "a", competencia: "2026-11" as Competencia, valor: 333 as Cents }),
    );

    const visao = await obterVisaoAnual(fakes, 2026);
    const { fixos, cartao, avulsos } = visao.totais;

    expect(fixos + cartao + avulsos).toBe(visao.totalGastos);
  });
});
