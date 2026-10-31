import { describe, expect, it } from "vitest";
import type { Competencia } from "../shared/competencia";
import type { Cents } from "../shared/money";
import type { Lancamento, Recorrencia } from "../tipos";
import { SEM_USO, usoNoMes } from "./uso-no-mes";

/** Testes derivados de CADCOL-03 (ACs 1, 2, 3 e 6). O mês aberto é março. */

const c = (texto: string) => texto as Competencia;
const MARCO = c("2026-03");

/** Ids escolhidos para serem legíveis no diff, nunca por realismo (AD-009). */
const CATEGORIA_UM = "cat-um";
const CATEGORIA_DOIS = "cat-dois";
const CONTA = "meio-conta";
const CARTAO = "meio-cartao";

function fixo(sobrescrever: Partial<Recorrencia> = {}): Recorrencia {
  return {
    id: "r-1",
    descricao: "Fixo",
    natureza: "DESPESA",
    categoriaId: CATEGORIA_UM,
    usuarioId: "pessoa-a",
    meioPagamentoId: CONTA,
    competenciaInicio: c("2026-01"),
    competenciaFim: null,
    diaVencimento: 10,
    encerradaEm: null,
    ...sobrescrever,
  };
}

function lancamento(sobrescrever: Partial<Lancamento> = {}): Lancamento {
  return {
    id: "l-1",
    natureza: "DESPESA",
    origem: "AVULSO",
    descricao: "Lançamento",
    competencia: MARCO,
    dataEvento: "2026-03-10",
    valor: 10000 as Cents,
    valorPrevisto: null,
    pagoEm: null,
    categoriaId: CATEGORIA_UM,
    usuarioId: "pessoa-a",
    meioPagamentoId: CONTA,
    compraId: null,
    numeroParcela: null,
    recorrenciaId: null,
    canceladoEm: null,
    ...sobrescrever,
  };
}

function fixosDaCategoria(recorrencias: readonly Recorrencia[]): number | undefined {
  return usoNoMes(recorrencias, [], MARCO).porCategoria.get(CATEGORIA_UM)?.fixos;
}

describe("usoNoMes — fixos cujo período contém o mês aberto (CADCOL-03, AC 1)", () => {
  it("conta o fixo que começou antes e não tem fim", () => {
    expect(
      fixosDaCategoria([fixo({ competenciaInicio: c("2026-01"), competenciaFim: null })]),
    ).toBe(1);
  });

  it("conta o fixo que começa no mês aberto", () => {
    expect(fixosDaCategoria([fixo({ competenciaInicio: MARCO })])).toBe(1);
  });

  it("conta o fixo que termina no mês aberto", () => {
    expect(fixosDaCategoria([fixo({ competenciaFim: MARCO })])).toBe(1);
  });

  it("conta cada fixo do mês, de qualquer natureza", () => {
    const uso = usoNoMes(
      [
        fixo({ id: "r-1", natureza: "DESPESA" }),
        fixo({ id: "r-2", natureza: "INVESTIMENTO" }),
        fixo({ id: "r-3", natureza: "RECEITA" }),
      ],
      [],
      MARCO,
    );

    expect(uso.porCategoria.get(CATEGORIA_UM)?.fixos).toBe(3);
    expect(uso.porMeio.get(CONTA)?.fixos).toBe(3);
  });
});

describe("usoNoMes — fixos fora do mês aberto (CADCOL-03, AC 2)", () => {
  it("não conta o fixo que começa no mês seguinte ao aberto", () => {
    const uso = usoNoMes([fixo({ competenciaInicio: c("2026-04") })], [], MARCO);

    expect(uso.porCategoria.has(CATEGORIA_UM)).toBe(false);
    expect(uso.porMeio.has(CONTA)).toBe(false);
  });

  it("não conta o fixo que terminou no mês anterior ao aberto", () => {
    const uso = usoNoMes([fixo({ competenciaFim: c("2026-02") })], [], MARCO);

    expect(uso.porCategoria.has(CATEGORIA_UM)).toBe(false);
    expect(uso.porMeio.has(CONTA)).toBe(false);
  });

  it("começo no mês aberto conta e no seguinte não: as duas bordas do início", () => {
    expect(fixosDaCategoria([fixo({ competenciaInicio: c("2026-03") })])).toBe(1);
    expect(fixosDaCategoria([fixo({ competenciaInicio: c("2026-04") })])).toBeUndefined();
  });

  it("fim no mês aberto conta e no anterior não: as duas bordas do fim", () => {
    expect(fixosDaCategoria([fixo({ competenciaFim: c("2026-03") })])).toBe(1);
    expect(fixosDaCategoria([fixo({ competenciaFim: c("2026-02") })])).toBeUndefined();
  });
});

describe("usoNoMes — lançamentos da competência aberta (CADCOL-03, AC 3)", () => {
  it("conta o lançamento de cada natureza", () => {
    const uso = usoNoMes(
      [],
      [
        lancamento({ id: "l-1", natureza: "DESPESA" }),
        lancamento({ id: "l-2", natureza: "INVESTIMENTO" }),
        lancamento({ id: "l-3", natureza: "RECEITA" }),
      ],
      MARCO,
    );

    expect(uso.porCategoria.get(CATEGORIA_UM)?.lancamentos).toBe(3);
    expect(uso.porMeio.get(CONTA)?.lancamentos).toBe(3);
  });

  it("conta o lançamento de cada origem: avulso, parcela e ocorrência de fixo", () => {
    const uso = usoNoMes(
      [],
      [
        lancamento({ id: "l-1", origem: "AVULSO" }),
        lancamento({ id: "l-2", origem: "PARCELA", compraId: "compra-1", numeroParcela: 2 }),
        lancamento({ id: "l-3", origem: "RECORRENCIA", recorrenciaId: "r-fora-da-lista" }),
      ],
      MARCO,
    );

    expect(uso.porCategoria.get(CATEGORIA_UM)?.lancamentos).toBe(3);
    expect(uso.porMeio.get(CONTA)?.lancamentos).toBe(3);
  });

  it("deixa fora o lançamento cancelado", () => {
    const uso = usoNoMes(
      [],
      [lancamento({ id: "l-1" }), lancamento({ id: "l-2", canceladoEm: "2026-03-12T10:00:00Z" })],
      MARCO,
    );

    expect(uso.porCategoria.get(CATEGORIA_UM)?.lancamentos).toBe(1);
    expect(uso.porMeio.get(CONTA)?.lancamentos).toBe(1);
  });

  it("deixa fora o lançamento do mês seguinte e o do anterior", () => {
    const uso = usoNoMes(
      [],
      [
        lancamento({ id: "l-1" }),
        lancamento({ id: "l-2", competencia: c("2026-04") }),
        lancamento({ id: "l-3", competencia: c("2026-02") }),
      ],
      MARCO,
    );

    expect(uso.porCategoria.get(CATEGORIA_UM)?.lancamentos).toBe(1);
    expect(uso.porMeio.get(CONTA)?.lancamentos).toBe(1);
  });

  it("conta linhas, e não valores", () => {
    const uso = usoNoMes([], [lancamento({ valor: 123456 as Cents })], MARCO);

    expect(uso.porCategoria.get(CATEGORIA_UM)?.lancamentos).toBe(1);
  });
});

describe("usoNoMes — o fixo do mês e a ocorrência dele (CADCOL-03, ACs 1 e 3)", () => {
  const uso = usoNoMes(
    [fixo({ id: "r-a" })],
    [lancamento({ id: "l-a", origem: "RECORRENCIA", recorrenciaId: "r-a" })],
    MARCO,
  );

  it("o fixo conta em fixos", () => {
    expect(uso.porCategoria.get(CATEGORIA_UM)?.fixos).toBe(1);
    expect(uso.porMeio.get(CONTA)?.fixos).toBe(1);
  });

  it("a ocorrência dele conta em lançamentos", () => {
    expect(uso.porCategoria.get(CATEGORIA_UM)?.lancamentos).toBe(1);
    expect(uso.porMeio.get(CONTA)?.lancamentos).toBe(1);
  });

  it("um fixo sem ocorrência na lista não conta em lançamentos", () => {
    const soFixo = usoNoMes([fixo({ id: "r-a" })], [], MARCO);

    expect(soFixo.porCategoria.get(CATEGORIA_UM)).toEqual({ fixos: 1, lancamentos: 0 });
  });
});

describe("usoNoMes — sem categoria, só o meio (CADCOL-03, AC 6)", () => {
  it("o fixo sem categoria conta só para o meio", () => {
    const uso = usoNoMes([fixo({ categoriaId: null })], [], MARCO);

    expect(uso.porMeio.get(CONTA)).toEqual({ fixos: 1, lancamentos: 0 });
    expect(uso.porCategoria.size).toBe(0);
  });

  it("o lançamento sem categoria conta só para o meio", () => {
    const uso = usoNoMes([], [lancamento({ categoriaId: null })], MARCO);

    expect(uso.porMeio.get(CONTA)).toEqual({ fixos: 0, lancamentos: 1 });
    expect(uso.porCategoria.size).toBe(0);
  });

  it("a receita fixa conta para o meio dela", () => {
    const uso = usoNoMes(
      [fixo({ id: "r-receita", natureza: "RECEITA", categoriaId: null, meioPagamentoId: CARTAO })],
      [
        lancamento({
          id: "l-receita",
          natureza: "RECEITA",
          origem: "RECORRENCIA",
          recorrenciaId: "r-receita",
          categoriaId: null,
          meioPagamentoId: CARTAO,
        }),
      ],
      MARCO,
    );

    expect(uso.porMeio.get(CARTAO)).toEqual({ fixos: 1, lancamentos: 1 });
    expect(uso.porMeio.has(CONTA)).toBe(false);
    expect(uso.porCategoria.size).toBe(0);
  });
});

describe("usoNoMes — cada cadastro com a sua contagem", () => {
  it("a categoria e o meio do mesmo item contam em mapas separados", () => {
    const uso = usoNoMes(
      [
        fixo({ id: "r-1", categoriaId: CATEGORIA_UM, meioPagamentoId: CONTA }),
        fixo({ id: "r-2", categoriaId: CATEGORIA_DOIS, meioPagamentoId: CONTA }),
      ],
      [
        lancamento({ id: "l-1", categoriaId: CATEGORIA_UM, meioPagamentoId: CARTAO }),
        lancamento({ id: "l-2", categoriaId: CATEGORIA_UM, meioPagamentoId: CONTA }),
        lancamento({ id: "l-3", categoriaId: CATEGORIA_DOIS, meioPagamentoId: CARTAO }),
      ],
      MARCO,
    );

    expect(uso.porCategoria.get(CATEGORIA_UM)).toEqual({ fixos: 1, lancamentos: 2 });
    expect(uso.porCategoria.get(CATEGORIA_DOIS)).toEqual({ fixos: 1, lancamentos: 1 });
    expect(uso.porMeio.get(CONTA)).toEqual({ fixos: 2, lancamentos: 1 });
    expect(uso.porMeio.get(CARTAO)).toEqual({ fixos: 0, lancamentos: 2 });
  });
});

describe("usoNoMes — sem uso", () => {
  it("SEM_USO é zero fixos e zero lançamentos", () => {
    expect(SEM_USO).toEqual({ fixos: 0, lancamentos: 0 });
  });

  it("categoria e meio só com fixo fora do mês e lançamento cancelado ficam fora dos mapas", () => {
    const uso = usoNoMes(
      [
        fixo({
          categoriaId: CATEGORIA_DOIS,
          meioPagamentoId: CARTAO,
          competenciaFim: c("2026-02"),
        }),
      ],
      [
        lancamento({
          categoriaId: CATEGORIA_DOIS,
          meioPagamentoId: CARTAO,
          canceladoEm: "2026-03-12T10:00:00Z",
        }),
      ],
      MARCO,
    );

    expect(uso.porCategoria.has(CATEGORIA_DOIS)).toBe(false);
    expect(uso.porMeio.has(CARTAO)).toBe(false);
  });

  it("nada no mês devolve os dois mapas vazios", () => {
    const uso = usoNoMes([], [], MARCO);

    expect(uso.porCategoria.size).toBe(0);
    expect(uso.porMeio.size).toBe(0);
  });
});
