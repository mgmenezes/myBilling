import { beforeEach, describe, expect, it, vi } from "vitest";
import { criarFakes, type Fakes } from "@/application/ports/fakes";
import {
  addMeses,
  type Cents,
  type Competencia,
  type Lancamento,
  projetarProximosMeses,
  saldoPrevistoDaCompetencia,
} from "@/domain";
import { MESES_DE_PROJECAO, obterVisaoMensal } from "../obter-visao-mensal/handler";
import { obterHorizonteDeSaldos } from "./handler";

/**
 * Testes derivados de SIM-02 (AC 4) e SIM-05 (AC 5), com os fakes em memória.
 * Valores escolhidos pela conta (AD-009).
 */

const CONTA = "33333333-3333-4333-8333-333333333333";
const USUARIO = "11111111-1111-4111-8111-111111111111";
const MARCO = "2026-03" as Competencia;
const NOVEMBRO = "2026-11" as Competencia;

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

/** Entrada de R$ 1.000,00 e despesa de R$ 300,00 em cada mês de `inicio` a `inicio + 13`. */
function semearTrezeMesesEUmAlem(inicio: Competencia): void {
  for (let n = 0; n <= 13; n += 1) {
    const competencia = addMeses(inicio, n);
    semear(
      lancamento({ id: `r-${n}`, competencia, natureza: "RECEITA", valor: 100000 as Cents }),
      lancamento({ id: `d-${n}`, competencia, valor: 30000 as Cents }),
    );
  }
}

beforeEach(() => {
  fakes = criarFakes();
  fakes.estado.meiosDePagamento.push({
    id: CONTA,
    nome: "Conta Corrente",
    tipo: "CONTA_CORRENTE",
    arquivadoEm: null,
  });
});

describe("obterHorizonteDeSaldos — de C a C + 12 (SIM-02, AC 4)", () => {
  it("devolve 13 saldos, de março a março seguinte, em ordem, com R$ 700,00 em cada um", async () => {
    semearTrezeMesesEUmAlem(MARCO);

    const horizonte = await obterHorizonteDeSaldos(fakes, MARCO);

    expect(horizonte.map((mes) => mes.competencia)).toEqual([
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
      "2027-03",
    ]);
    expect(horizonte.map((mes) => mes.saldo)).toEqual(Array<number>(13).fill(70000));
  });

  it("atravessa a virada do ano a partir de novembro", async () => {
    semearTrezeMesesEUmAlem(NOVEMBRO);

    const horizonte = await obterHorizonteDeSaldos(fakes, NOVEMBRO);

    expect(horizonte.map((mes) => mes.competencia)).toEqual([
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
      "2027-03",
      "2027-04",
      "2027-05",
      "2027-06",
      "2027-07",
      "2027-08",
      "2027-09",
      "2027-10",
      "2027-11",
    ]);
  });

  it("C + 12 entra e C + 13 fica fora: o saldo de 2027-03 é lido e o de 2027-04 não aparece", async () => {
    semear(
      lancamento({ id: "fim", competencia: "2027-03" as Competencia, valor: 12345 as Cents }),
      lancamento({ id: "alem", competencia: "2027-04" as Competencia, valor: 99999 as Cents }),
    );

    const horizonte = await obterHorizonteDeSaldos(fakes, MARCO);

    expect(horizonte).toHaveLength(13);
    expect(horizonte.at(-1)).toEqual({ competencia: "2027-03", saldo: -12345 });
    expect(horizonte.some((mes) => mes.competencia === "2027-04")).toBe(false);
  });

  it("lê o mês aberto com listarPorCompetencia e a janela com uma chamada a listarEntre(C + 1, C + 12)", async () => {
    const entre = vi.spyOn(fakes.movimentos, "listarEntre");
    const porCompetencia = vi.spyOn(fakes.movimentos, "listarPorCompetencia");

    await obterHorizonteDeSaldos(fakes, MARCO);

    expect(entre.mock.calls).toEqual([["2026-04", "2027-03"]]);
    expect(porCompetencia.mock.calls).toEqual([["2026-03"]]);
    expect(MESES_DE_PROJECAO).toBe(12);
  });

  it("lançamento cancelado não entra no saldo de nenhum mês", async () => {
    semear(
      lancamento({ id: "vivo", valor: 1000 as Cents }),
      lancamento({ id: "morto", valor: 50000 as Cents, canceladoEm: "2026-03-11T10:00:00Z" }),
      lancamento({
        id: "morto-abril",
        competencia: "2026-04" as Competencia,
        valor: 50000 as Cents,
        canceladoEm: "2026-03-11T10:00:00Z",
      }),
    );

    const horizonte = await obterHorizonteDeSaldos(fakes, MARCO);

    expect(horizonte[0]?.saldo).toBe(-1000);
    expect(horizonte[1]?.saldo).toBe(0);
  });
});

describe("obterHorizonteDeSaldos — a mesma definição de saldo da Visão geral (SIM-02, AC 4; SIM-05, AC 5)", () => {
  it("o saldo de C é o do card Saldo previsto e os seguintes são os de Próximos meses", async () => {
    semearTrezeMesesEUmAlem(MARCO);
    semear(
      lancamento({
        id: "extra-maio",
        competencia: "2026-05" as Competencia,
        valor: 120000 as Cents,
      }),
    );

    const horizonte = await obterHorizonteDeSaldos(fakes, MARCO);
    const visao = await obterVisaoMensal(fakes, MARCO);

    expect(horizonte[0]?.saldo).toBe(visao.competenciaView.saldo);
    expect(horizonte.slice(1).map((mes) => mes.saldo)).toEqual(
      visao.futuro.map((mes) => mes.saldo),
    );
    expect(horizonte[2]?.saldo).toBe(-50000);
  });

  it("concorda com projetarProximosMeses e saldoPrevistoDaCompetencia sobre a mesma lista", async () => {
    semearTrezeMesesEUmAlem(MARCO);
    const todos = [...fakes.estado.movimentos.values()];

    const horizonte = await obterHorizonteDeSaldos(fakes, MARCO);

    expect(horizonte[0]?.saldo).toBe(saldoPrevistoDaCompetencia(todos, MARCO));
    expect(horizonte.slice(1)).toEqual(
      projetarProximosMeses(todos, MARCO, 12).map(({ competencia, saldo }) => ({
        competencia,
        saldo,
      })),
    );
  });
});
