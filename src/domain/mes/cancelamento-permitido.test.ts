import { describe, expect, it } from "vitest";
import type { Competencia } from "../shared/competencia";
import type { Cents } from "../shared/money";
import type { Lancamento } from "../tipos";
import { cancelamentoPermitido } from "./cancelamento-permitido";

const MARCO = "2026-03" as Competencia;

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
    recorrenciaId: null,
    canceladoEm: null,
    ...sobrescrever,
  };
}

describe("cancelamentoPermitido — só o avulso é cancelável (AVUL-03, AC 3)", () => {
  it("permite cancelar um lançamento avulso", () => {
    const resultado = cancelamentoPermitido(lancamento({ origem: "AVULSO" }));

    expect(resultado.ok).toBe(true);
  });

  it("recusa parcela de compra, porque removê-la quebraria a soma da compra", () => {
    const resultado = cancelamentoPermitido(
      lancamento({ origem: "PARCELA", compraId: "c-1", numeroParcela: 3 }),
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) {
      throw new Error("esperava recusa");
    }
    expect(resultado.error.code).toBe("LANCAMENTO_NAO_CANCELAVEL");
  });

  it("recusa ocorrência de recorrência, porque ela renasceria na materialização seguinte", () => {
    const resultado = cancelamentoPermitido(
      lancamento({ origem: "RECORRENCIA", recorrenciaId: "r-1" }),
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) {
      throw new Error("esperava recusa");
    }
    expect(resultado.error.code).toBe("LANCAMENTO_NAO_CANCELAVEL");
  });

  it("permite cancelar avulso já pago: pagar não torna o lançamento permanente", () => {
    const resultado = cancelamentoPermitido(lancamento({ origem: "AVULSO", pagoEm: "2026-03-11" }));

    expect(resultado.ok).toBe(true);
  });

  it("carrega a origem recusada nos detalhes, para o chamador saber o que barrou", () => {
    const resultado = cancelamentoPermitido(
      lancamento({ origem: "PARCELA", compraId: "c-1", numeroParcela: 3 }),
    );

    if (resultado.ok) {
      throw new Error("esperava recusa");
    }
    expect(resultado.error.detalhes).toEqual({ origem: "PARCELA" });
  });
});
