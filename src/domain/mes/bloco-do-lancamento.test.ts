import { describe, expect, it } from "vitest";
import type { Competencia } from "../shared/competencia";
import type { Cents } from "../shared/money";
import type { Lancamento } from "../tipos";
import { blocoDoLancamento } from "./bloco-do-lancamento";

const MARCO = "2026-03" as Competencia;

/** Ids escolhidos para serem legíveis no diff, nunca por realismo (AD-009). */
const CARTAO = "meio-cartao";
const CONTA = "meio-conta";
const CARTAO_ARQUIVADO = "meio-cartao-velho";

const CARTOES: ReadonlySet<string> = new Set([CARTAO, CARTAO_ARQUIVADO]);

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
    meioPagamentoId: CONTA,
    compraId: null,
    numeroParcela: null,
    recorrenciaId: null,
    canceladoEm: null,
    ...sobrescrever,
  };
}

describe("blocoDoLancamento — precedência da recorrência (BLOCO-01, AC 2)", () => {
  it("classifica recorrência como FIXOS mesmo quando o meio é cartão", () => {
    const bloco = blocoDoLancamento(
      lancamento({ origem: "RECORRENCIA", recorrenciaId: "r-1", meioPagamentoId: CARTAO }),
      CARTOES,
    );

    expect(bloco).toBe("FIXOS");
  });

  it("classifica recorrência como FIXOS quando o meio não é cartão", () => {
    const bloco = blocoDoLancamento(
      lancamento({ origem: "RECORRENCIA", recorrenciaId: "r-1", meioPagamentoId: CONTA }),
      CARTOES,
    );

    expect(bloco).toBe("FIXOS");
  });
});

describe("blocoDoLancamento — o cartão é o meio, não a origem (BLOCO-01, AC 3)", () => {
  it("classifica despesa avulsa no cartão como CARTAO", () => {
    const bloco = blocoDoLancamento(
      lancamento({ origem: "AVULSO", meioPagamentoId: CARTAO }),
      CARTOES,
    );

    expect(bloco).toBe("CARTAO");
  });

  it("classifica parcela no cartão como CARTAO", () => {
    const bloco = blocoDoLancamento(
      lancamento({ origem: "PARCELA", compraId: "c-1", numeroParcela: 1, meioPagamentoId: CARTAO }),
      CARTOES,
    );

    expect(bloco).toBe("CARTAO");
  });

  it("classifica como CARTAO um lançamento em cartão arquivado, para não reclassificar o passado", () => {
    const bloco = blocoDoLancamento(
      lancamento({ origem: "AVULSO", meioPagamentoId: CARTAO_ARQUIVADO }),
      CARTOES,
    );

    expect(bloco).toBe("CARTAO");
  });
});

describe("blocoDoLancamento — o resto cai em AVULSOS (BLOCO-01, AC 4)", () => {
  it("classifica parcela em meio sem fatura como AVULSOS", () => {
    const bloco = blocoDoLancamento(
      lancamento({ origem: "PARCELA", compraId: "c-1", numeroParcela: 1, meioPagamentoId: CONTA }),
      CARTOES,
    );

    expect(bloco).toBe("AVULSOS");
  });

  it("classifica despesa avulsa em conta corrente como AVULSOS", () => {
    const bloco = blocoDoLancamento(
      lancamento({ origem: "AVULSO", meioPagamentoId: CONTA }),
      CARTOES,
    );

    expect(bloco).toBe("AVULSOS");
  });

  it("nunca devolve CARTAO quando o conjunto de cartões está vazio", () => {
    const vazio: ReadonlySet<string> = new Set();

    expect(blocoDoLancamento(lancamento({ meioPagamentoId: CARTAO }), vazio)).toBe("AVULSOS");
    expect(
      blocoDoLancamento(
        lancamento({
          origem: "PARCELA",
          compraId: "c-1",
          numeroParcela: 1,
          meioPagamentoId: CARTAO,
        }),
        vazio,
      ),
    ).toBe("AVULSOS");
  });

  it("mantém a recorrência em FIXOS mesmo com o conjunto de cartões vazio", () => {
    const vazio: ReadonlySet<string> = new Set();

    expect(
      blocoDoLancamento(
        lancamento({ origem: "RECORRENCIA", recorrenciaId: "r-1", meioPagamentoId: CARTAO }),
        vazio,
      ),
    ).toBe("FIXOS");
  });
});
