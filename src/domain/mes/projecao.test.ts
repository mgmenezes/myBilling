import { describe, expect, it } from "vitest";
import { addMeses, type Competencia } from "../shared/competencia";
import type { Cents } from "../shared/money";
import type { Lancamento } from "../tipos";
import { projetarProximosMeses } from "./projecao";

const MARCO = "2026-03" as Competencia;
const ABRIL = "2026-04" as Competencia;
const MAIO = "2026-05" as Competencia;
const JUNHO = "2026-06" as Competencia;

/** Fixtures escolhidas por valor matemático, nunca por realismo (AD-009). */
function lancamento(sobrescrever: Partial<Lancamento> = {}): Lancamento {
  return {
    id: "l-1",
    natureza: "DESPESA",
    origem: "AVULSO",
    descricao: "Lançamento",
    competencia: MARCO,
    dataEvento: "2026-03-10",
    valor: 50000 as Cents,
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

describe("projetarProximosMeses — lista por competência (MOV-06, AC 3)", () => {
  it("quebra o comprometimento por competência, sem agregar num único número", () => {
    const projecao = projetarProximosMeses(
      [
        lancamento({ id: "a", competencia: ABRIL, valor: 40000 as Cents }),
        lancamento({ id: "b", competencia: MAIO, valor: 70000 as Cents }),
      ],
      MARCO,
      2,
    );

    expect(projecao).toEqual([
      { competencia: ABRIL, comprometido: 40000 },
      { competencia: MAIO, comprometido: 70000 },
    ]);
  });

  it("devolve a janela completa, com zero nos meses sem comprometimento", () => {
    const projecao = projetarProximosMeses(
      [lancamento({ id: "a", competencia: ABRIL, valor: 40000 as Cents })],
      MARCO,
      3,
    );

    expect(projecao.map((p) => p.competencia)).toEqual([ABRIL, MAIO, JUNHO]);
    expect(projecao[2]).toEqual({ competencia: JUNHO, comprometido: 0 });
  });
});

describe("projetarProximosMeses — o que entra na projeção", () => {
  it("soma apenas despesas sem pagoEm de competências posteriores à corrente", () => {
    const projecao = projetarProximosMeses(
      [
        lancamento({ id: "futura-previsto", competencia: ABRIL, valor: 40000 as Cents }),
        lancamento({
          id: "futura-paga",
          competencia: ABRIL,
          valor: 900000 as Cents,
          pagoEm: "2026-04-02",
        }),
        lancamento({
          id: "futura-receita",
          competencia: ABRIL,
          natureza: "RECEITA",
          valor: 900000 as Cents,
        }),
        lancamento({
          id: "futura-investimento",
          competencia: ABRIL,
          natureza: "INVESTIMENTO",
          valor: 900000 as Cents,
        }),
        lancamento({
          id: "futura-cancelada",
          competencia: ABRIL,
          valor: 900000 as Cents,
          canceladoEm: "2026-03-20",
        }),
        lancamento({ id: "corrente", competencia: MARCO, valor: 900000 as Cents }),
      ],
      MARCO,
      1,
    );

    expect(projecao).toEqual([{ competencia: ABRIL, comprometido: 40000 }]);
  });

  it("compra 8/10 cadastrada em março contribui para abril e maio e para nenhum mês anterior", () => {
    const parcela = (numero: number, competencia: Competencia) =>
      lancamento({
        id: `parcela-${numero}`,
        origem: "PARCELA",
        compraId: "compra-a",
        numeroParcela: numero,
        competencia,
        valor: 50000 as Cents,
      });

    const projecao = projetarProximosMeses(
      [parcela(8, MARCO), parcela(9, ABRIL), parcela(10, MAIO)],
      MARCO,
      3,
    );

    expect(projecao).toEqual([
      { competencia: ABRIL, comprometido: 50000 },
      { competencia: MAIO, comprometido: 50000 },
      { competencia: JUNHO, comprometido: 0 },
    ]);
    expect(projecao.map((p) => p.competencia)).not.toContain(MARCO);
  });
});

describe("projetarProximosMeses — janela limitada (REC-02, AC 5)", () => {
  it("recorrência sem competência de fim é projetada só dentro da janela", () => {
    const semFim = Array.from({ length: 24 }, (_, indice) =>
      lancamento({
        id: `ocorrencia-${indice}`,
        origem: "RECORRENCIA",
        competencia: addMeses(MARCO, indice + 1),
        valor: 30000 as Cents,
      }),
    );

    const projecao = projetarProximosMeses(semFim, MARCO, 3);

    expect(projecao).toEqual([
      { competencia: ABRIL, comprometido: 30000 },
      { competencia: MAIO, comprometido: 30000 },
      { competencia: JUNHO, comprometido: 30000 },
    ]);
    expect(projecao).toHaveLength(3);
  });
});
