import { describe, expect, it } from "vitest";
import { resumoMensal } from "../mes/resumo-mensal";
import type { Competencia } from "../shared/competencia";
import type { Cents } from "../shared/money";
import type { Lancamento, Natureza, Recorrencia } from "../tipos";
import { type FixoDoMes, fixosDoMes, type RecorrenciaComVigencias } from "./fixos-do-mes";

/**
 * Derivado de FIXCOL-01 (ACs 2 e 3), FIXCOL-02 (ACs 1, 2, 4 e 5) e FIXCOL-03
 * (ACs 2 a 5).
 *
 * Fixtures escolhidas por valor matemático (AD-009). Os valores do cenário de
 * concordância são os do e2e do design: em março, as saídas somam 18500
 * (10500 + 5000 + 3000) e as entradas, 100000.
 */

const c = (texto: string) => texto as Competencia;
const MARCO = c("2026-03");
const ABRIL = c("2026-04");
const CARTAO = "meio-cartao";
const CONTA = "meio-conta";

function fixo(
  id: string,
  sobrescrever: Partial<Recorrencia> = {},
  versoes: RecorrenciaComVigencias["versoes"] = [
    { vigenteDesde: c("2026-01"), valorPrevisto: 10000 as Cents },
  ],
): RecorrenciaComVigencias {
  return {
    recorrencia: {
      id,
      descricao: `Fixo ${id}`,
      natureza: "DESPESA",
      categoriaId: "cat-1",
      usuarioId: "pessoa-a",
      meioPagamentoId: CONTA,
      competenciaInicio: c("2026-01"),
      competenciaFim: null,
      diaVencimento: 10,
      encerradaEm: null,
      ...sobrescrever,
    },
    versoes,
  };
}

/** A ocorrência de um fixo no mês, como a materialização grava: valor igual ao previsto. */
function ocorrencia(
  recorrenciaId: string,
  valor: number,
  sobrescrever: Partial<Lancamento> = {},
): Lancamento {
  return {
    id: `mov-${recorrenciaId}-${sobrescrever.competencia ?? MARCO}`,
    natureza: "DESPESA",
    origem: "RECORRENCIA",
    descricao: `Fixo ${recorrenciaId}`,
    competencia: MARCO,
    dataEvento: "2026-03-10",
    valor: valor as Cents,
    valorPrevisto: valor as Cents,
    pagoEm: null,
    categoriaId: "cat-1",
    usuarioId: "pessoa-a",
    meioPagamentoId: CONTA,
    compraId: null,
    numeroParcela: null,
    recorrenciaId,
    canceladoEm: null,
    ...sobrescrever,
  };
}

function avulso(id: string, natureza: Natureza, valor: number): Lancamento {
  return {
    ...ocorrencia("x", valor),
    id,
    natureza,
    origem: "AVULSO",
    valorPrevisto: null,
    recorrenciaId: null,
  };
}

const ids = (fixos: readonly FixoDoMes[]) => fixos.map((f) => f.recorrencia.id);
const somaDasLinhas = (fixos: readonly FixoDoMes[]) =>
  fixos.reduce((soma, f) => soma + (f.valorDoMes ?? 0), 0);

describe("fixosDoMes — a seção pela natureza (FIXCOL-01, AC 2)", () => {
  it("despesa vai para as saídas; receita e investimento, para as entradas", () => {
    const resultado = fixosDoMes(
      [
        fixo("a", { natureza: "DESPESA", diaVencimento: 1 }),
        fixo("b", { natureza: "RECEITA", diaVencimento: 2 }),
        fixo("c", { natureza: "INVESTIMENTO", diaVencimento: 3 }),
      ],
      [],
      MARCO,
    );

    expect(ids(resultado.saidas)).toEqual(["a"]);
    expect(ids(resultado.entradas)).toEqual(["b", "c"]);
  });
});

describe("fixosDoMes — a ordem das linhas (FIXCOL-01, AC 3)", () => {
  it("o dia vem antes do alfabeto: dia 1 'Fixo D' antes de dia 5 'Fixo A'", () => {
    const resultado = fixosDoMes(
      [
        fixo("a", { descricao: "Fixo A", diaVencimento: 5 }),
        fixo("d", { descricao: "Fixo D", diaVencimento: 1 }),
      ],
      [],
      MARCO,
    );

    expect(resultado.saidas.map((f) => f.recorrencia.descricao)).toEqual(["Fixo D", "Fixo A"]);
  });

  it("no mesmo dia, a descrição em ordem alfabética pt-BR, com o acento junto da letra", () => {
    /* Por ponto de código "Item V" viria antes de "Item Ú" (0x56 < 0xDA). Em
       pt-BR o "Ú" é um "U", e vem antes do "V". */
    const resultado = fixosDoMes(
      [
        fixo("1", { descricao: "Item V", diaVencimento: 10 }),
        fixo("2", { descricao: "Item Ú", diaVencimento: 10 }),
        fixo("3", { descricao: "Item B", diaVencimento: 10 }),
      ],
      [],
      MARCO,
    );

    expect(resultado.saidas.map((f) => f.recorrencia.descricao)).toEqual([
      "Item B",
      "Item Ú",
      "Item V",
    ]);
  });

  it("no mesmo dia e com a mesma descrição, o id decide, e a ordem de entrada não", () => {
    const entrada = [
      fixo("rec-2", { descricao: "Fixo igual" }),
      fixo("rec-1", { descricao: "Fixo igual" }),
    ];

    expect(ids(fixosDoMes(entrada, [], MARCO).saidas)).toEqual(["rec-1", "rec-2"]);
    expect(ids(fixosDoMes([...entrada].reverse(), [], MARCO).saidas)).toEqual(["rec-1", "rec-2"]);
  });
});

describe("fixosDoMes — o valor do mês aberto (FIXCOL-02, ACs 1 e 2)", () => {
  it("a linha traz o valor da ocorrência, e não o da vigência", () => {
    const resultado = fixosDoMes(
      [fixo("a", {}, [{ vigenteDesde: c("2026-01"), valorPrevisto: 99900 as Cents }])],
      [ocorrencia("a", 5000)],
      MARCO,
    );

    expect(resultado.saidas[0]?.valorDoMes).toBe(5000);
    expect(resultado.saidas[0]?.previstoDoMes).toBe(5000);
    expect(resultado.saidas[0]?.confirmado).toBe(false);
  });

  it("confirmado diferente do previsto: o valor confirmado, o previsto ao lado e a marca", () => {
    const resultado = fixosDoMes(
      [fixo("a")],
      [ocorrencia("a", 10500, { valorPrevisto: 10000 as Cents })],
      MARCO,
    );

    expect(resultado.saidas[0]?.valorDoMes).toBe(10500);
    expect(resultado.saidas[0]?.previstoDoMes).toBe(10000);
    expect(resultado.saidas[0]?.confirmado).toBe(true);
  });

  it("ocorrência sem previsto gravado não se diz confirmada, pelo critério de Lançamentos", () => {
    const resultado = fixosDoMes(
      [fixo("a")],
      [ocorrencia("a", 4000, { valorPrevisto: null })],
      MARCO,
    );

    expect(resultado.saidas[0]?.valorDoMes).toBe(4000);
    expect(resultado.saidas[0]?.confirmado).toBe(false);
  });

  it("sem ocorrência no mês, valor e previsto são nulos, e a linha não está confirmada", () => {
    const resultado = fixosDoMes([fixo("d", { competenciaInicio: c("2026-06") })], [], MARCO);

    expect(resultado.saidas[0]?.valorDoMes).toBeNull();
    expect(resultado.saidas[0]?.previstoDoMes).toBeNull();
    expect(resultado.saidas[0]?.confirmado).toBe(false);
  });

  it("a linha leva o fixo e as vigências inteiras, para o painel e o histórico", () => {
    const versoes = [
      { vigenteDesde: c("2026-01"), valorPrevisto: 9000 as Cents },
      { vigenteDesde: c("2026-02"), valorPrevisto: 10000 as Cents },
      { vigenteDesde: c("2026-05"), valorPrevisto: 11000 as Cents },
    ];
    const entrada = fixo("a", {}, versoes);

    const resultado = fixosDoMes([entrada], [ocorrencia("a", 10000)], MARCO);

    expect(resultado.saidas[0]?.recorrencia).toBe(entrada.recorrencia);
    expect(resultado.saidas[0]?.versoes).toEqual(versoes);
  });
});

describe("fixosDoMes — quem aparece no mês (FIXCOL-02, ACs 4 e 5)", () => {
  const encerradoEmFevereiro = {
    competenciaFim: c("2026-02"),
    encerradaEm: "2026-02-20T12:00:00.000Z",
  };

  it("o encerrado antes do mês aparece quando o mês tem uma ocorrência paga dele", () => {
    const resultado = fixosDoMes(
      [fixo("c", encerradoEmFevereiro)],
      [ocorrencia("c", 3000, { pagoEm: "2026-03-10" })],
      MARCO,
    );

    expect(ids(resultado.saidas)).toEqual(["c"]);
    expect(resultado.saidas[0]?.valorDoMes).toBe(3000);
    expect(resultado.totalSaidas).toBe(3000);
  });

  it("o encerrado antes do mês some quando o mês não tem ocorrência dele (FIXO-07, AC 1)", () => {
    const resultado = fixosDoMes([fixo("c", encerradoEmFevereiro)], [], MARCO);

    expect(resultado.saidas).toEqual([]);
    expect(resultado.entradas).toEqual([]);
  });

  it("o que começa depois do mês aparece, sem ocorrência (FIXO-07, AC 3)", () => {
    const resultado = fixosDoMes([fixo("d", { competenciaInicio: c("2026-06") })], [], MARCO);

    expect(ids(resultado.saidas)).toEqual(["d"]);
    expect(resultado.saidas[0]?.valorDoMes).toBeNull();
  });
});

describe("fixosDoMes — o que não é ocorrência do mês fica fora de linha e total", () => {
  it("ocorrência cancelada não dá valor à linha nem entra no total", () => {
    const resultado = fixosDoMes(
      [fixo("b")],
      [ocorrencia("b", 7000, { canceladoEm: "2026-03-05T12:00:00.000Z" })],
      MARCO,
    );

    expect(resultado.saidas[0]?.valorDoMes).toBeNull();
    expect(resultado.totalSaidas).toBe(0);
  });

  it("ocorrência cancelada não traz de volta um fixo encerrado antes do mês", () => {
    const resultado = fixosDoMes(
      [fixo("c", { competenciaFim: c("2026-02") })],
      [ocorrencia("c", 3000, { canceladoEm: "2026-03-05T12:00:00.000Z" })],
      MARCO,
    );

    expect(resultado.saidas).toEqual([]);
    expect(resultado.totalSaidas).toBe(0);
  });

  it("ocorrência de outra competência não dá valor à linha nem entra no total", () => {
    const resultado = fixosDoMes(
      [fixo("b"), fixo("e", { natureza: "RECEITA" })],
      [
        ocorrencia("b", 7000, { competencia: ABRIL }),
        ocorrencia("e", 8000, { competencia: ABRIL, natureza: "RECEITA" }),
      ],
      MARCO,
    );

    expect(resultado.saidas[0]?.valorDoMes).toBeNull();
    expect(resultado.entradas[0]?.valorDoMes).toBeNull();
    expect(resultado.totalSaidas).toBe(0);
    expect(resultado.totalEntradas).toBe(0);
  });

  it("lançamento de origem não recorrente não entra em nenhum dos dois totais", () => {
    const resultado = fixosDoMes(
      [fixo("b"), fixo("e", { natureza: "RECEITA" })],
      [
        ocorrencia("b", 5000),
        ocorrencia("e", 100000, { natureza: "RECEITA" }),
        avulso("avulso-1", "DESPESA", 2000),
        avulso("avulso-2", "RECEITA", 4000),
        { ...avulso("parcela-1", "DESPESA", 6000), origem: "PARCELA", compraId: "compra-1" },
      ],
      MARCO,
    );

    expect(resultado.totalSaidas).toBe(5000);
    expect(resultado.totalEntradas).toBe(100000);
    expect(ids(resultado.saidas)).toEqual(["b"]);
    expect(ids(resultado.entradas)).toEqual(["e"]);
  });
});

/**
 * **Teste de concordância** (L-014). O total de saídas é o título do bloco
 * "Fixos" de Lançamentos, que sai de `resumoMensal`. O cenário é o do e2e do
 * design, com ruído em volta: avulso, parcela no cartão, ocorrência cancelada
 * e de outro mês, e o fixo B pago no cartão, que continua sendo fixo.
 */
describe("fixosDoMes — os totais saem das ocorrências (FIXCOL-03, ACs 2 a 5)", () => {
  /* Vigência de valor alto, para o total provar que não lê vigência (AD-003). */
  const fixoD = fixo(
    "d",
    { descricao: "Fixo D", diaVencimento: 1, competenciaInicio: c("2026-06") },
    [{ vigenteDesde: c("2026-06"), valorPrevisto: 999900 as Cents }],
  );
  const recorrencias = [
    fixo("a", { descricao: "Fixo A", diaVencimento: 5 }, [
      { vigenteDesde: c("2026-01"), valorPrevisto: 9000 as Cents },
      { vigenteDesde: c("2026-02"), valorPrevisto: 10000 as Cents },
      { vigenteDesde: c("2026-05"), valorPrevisto: 11000 as Cents },
    ]),
    fixo("b", { descricao: "Fixo B", diaVencimento: 10, meioPagamentoId: CARTAO }, [
      { vigenteDesde: c("2026-01"), valorPrevisto: 5000 as Cents },
    ]),
    fixo(
      "c",
      {
        descricao: "Fixo C",
        diaVencimento: 10,
        competenciaFim: c("2026-02"),
        encerradaEm: "2026-02-20T12:00:00.000Z",
      },
      [{ vigenteDesde: c("2026-01"), valorPrevisto: 3000 as Cents }],
    ),
    fixoD,
    fixo("e", { descricao: "Entrada A", natureza: "RECEITA", diaVencimento: 5 }, [
      { vigenteDesde: c("2026-01"), valorPrevisto: 100000 as Cents },
    ]),
    fixo("f", { descricao: "Entrada B", natureza: "INVESTIMENTO", diaVencimento: 20 }, [
      { vigenteDesde: c("2026-01"), valorPrevisto: 2500 as Cents },
    ]),
  ];
  const lancamentos = [
    ocorrencia("a", 10500, { valorPrevisto: 10000 as Cents }),
    ocorrencia("b", 5000, { meioPagamentoId: CARTAO }),
    ocorrencia("c", 3000, { pagoEm: "2026-03-10" }),
    ocorrencia("e", 100000, { natureza: "RECEITA" }),
    ocorrencia("f", 2500, { natureza: "INVESTIMENTO" }),
    ocorrencia("a", 11000, { competencia: ABRIL }),
    ocorrencia("x", 7000, { id: "mov-cancelada", canceladoEm: "2026-03-05T12:00:00.000Z" }),
    avulso("avulso-1", "DESPESA", 2000),
    {
      ...avulso("parcela-1", "DESPESA", 6000),
      origem: "PARCELA" as const,
      meioPagamentoId: CARTAO,
    },
  ];
  const resultado = fixosDoMes(recorrencias, lancamentos, MARCO);

  it("as saídas somam as ocorrências de despesa: 10500 + 5000 + 3000", () => {
    expect(resultado.totalSaidas).toBe(18500);
  });

  it("o total de saídas é o do bloco 'Fixos' de resumoMensal, para a mesma entrada", () => {
    const fixosDeLancamentos = resumoMensal(lancamentos, MARCO, new Set([CARTAO])).competenciaView
      .fixos;

    expect(resultado.totalSaidas).toBe(fixosDeLancamentos);
  });

  it("as entradas somam as ocorrências dos fixos que não são despesa: 100000 + 2500", () => {
    expect(resultado.totalEntradas).toBe(102500);
  });

  it("o total de cada seção é a soma das linhas dela", () => {
    expect(somaDasLinhas(resultado.saidas)).toBe(resultado.totalSaidas);
    expect(somaDasLinhas(resultado.entradas)).toBe(resultado.totalEntradas);
  });

  it("o fixo que começa depois aparece e soma zero, mesmo com vigência de 999900", () => {
    const sozinho = fixosDoMes([fixoD], [], MARCO);

    expect(ids(sozinho.saidas)).toEqual(["d"]);
    expect(sozinho.saidas[0]?.valorDoMes).toBeNull();
    expect(sozinho.totalSaidas).toBe(0);
  });

  it("as saídas na ordem D, A, B, C: o dia primeiro, e B e C empatados pelo alfabeto", () => {
    expect(resultado.saidas.map((f) => f.recorrencia.descricao)).toEqual([
      "Fixo D",
      "Fixo A",
      "Fixo B",
      "Fixo C",
    ]);
  });

  it("sem fixo nenhum, as duas seções vazias e os dois totais zerados", () => {
    expect(fixosDoMes([], [], MARCO)).toEqual({
      entradas: [],
      saidas: [],
      totalEntradas: 0,
      totalSaidas: 0,
    });
  });
});
