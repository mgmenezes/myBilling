import { beforeEach, describe, expect, it } from "vitest";
import { criarFakes, type Fakes } from "@/application/ports/fakes";
import type { Cents, Competencia, Lancamento } from "@/domain";
import { cancelarLancamento } from "./handler";

/** Testes derivados de AVUL-03 (AC 1 a 4) e AVUL-04. */

const MARCO = "2026-03" as Competencia;
const ABRIL = "2026-04" as Competencia;
const AGORA = "2026-03-20T12:00:00.000Z";

let fakes: Fakes;

function semear(campos: Partial<Lancamento> & { id: string }): Lancamento {
  const lancamento: Lancamento = {
    natureza: "DESPESA",
    origem: "AVULSO",
    descricao: "Lançamento",
    competencia: MARCO,
    dataEvento: "2026-03-10",
    valor: 1000 as Cents,
    valorPrevisto: null,
    pagoEm: null,
    categoriaId: null,
    usuarioId: "pessoa-a",
    meioPagamentoId: "conta",
    compraId: null,
    numeroParcela: null,
    recorrenciaId: null,
    canceladoEm: null,
    ...campos,
  };
  fakes.estado.movimentos.set(lancamento.id, lancamento);
  return lancamento;
}

beforeEach(() => {
  fakes = criarFakes();
});

describe("cancelarLancamento — o caminho feliz (AVUL-03, AC 1 e 2)", () => {
  it("cancela o avulso e o tira da listagem do mês", async () => {
    semear({ id: "l-1" });

    const resultado = await cancelarLancamento(fakes, { lancamentoId: "l-1", agora: AGORA });

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) {
      throw new Error("esperava sucesso");
    }
    expect(resultado.value.alterou).toBe(true);
    expect(await fakes.movimentos.listarPorCompetencia(MARCO)).toHaveLength(0);
  });

  it("devolve a competência do lançamento, não a que quem chamou estava vendo", async () => {
    semear({ id: "l-1", competencia: ABRIL });

    const resultado = await cancelarLancamento(fakes, { lancamentoId: "l-1", agora: AGORA });

    if (!resultado.ok) {
      throw new Error("esperava sucesso");
    }
    expect(resultado.value.competencia).toBe(ABRIL);
  });

  it("grava o instante recebido, e não o relógio do processo", async () => {
    semear({ id: "l-1" });

    await cancelarLancamento(fakes, { lancamentoId: "l-1", agora: AGORA });

    expect((await fakes.movimentos.buscarPorId("l-1"))?.canceladoEm).toBe(AGORA);
  });
});

describe("cancelarLancamento — recusas (AVUL-03 AC 3, AVUL-04)", () => {
  it("recusa parcela de compra, e a linha fica intacta", async () => {
    semear({ id: "p-1", origem: "PARCELA", compraId: "c-1", numeroParcela: 1 });

    const resultado = await cancelarLancamento(fakes, { lancamentoId: "p-1", agora: AGORA });

    expect(resultado.ok).toBe(false);
    if (resultado.ok) {
      throw new Error("esperava recusa");
    }
    expect(resultado.error.code).toBe("LANCAMENTO_NAO_CANCELAVEL");
    expect((await fakes.movimentos.buscarPorId("p-1"))?.canceladoEm).toBeNull();
  });

  it("recusa ocorrência de recorrência, e a linha fica intacta", async () => {
    semear({ id: "r-1", origem: "RECORRENCIA", recorrenciaId: "rec-1" });

    const resultado = await cancelarLancamento(fakes, { lancamentoId: "r-1", agora: AGORA });

    if (resultado.ok) {
      throw new Error("esperava recusa");
    }
    expect(resultado.error.code).toBe("LANCAMENTO_NAO_CANCELAVEL");
    expect((await fakes.movimentos.buscarPorId("r-1"))?.canceladoEm).toBeNull();
  });

  /*
   * Distinguir "não existe" de "não é cancelável" é a razão de o caso de uso
   * consultar antes de mandar cancelar: o repositório devolve `false` para os
   * dois, e a tela precisa dizer coisas diferentes.
   */
  it("distingue lançamento inexistente de origem não cancelável", async () => {
    semear({ id: "p-1", origem: "PARCELA", compraId: "c-1", numeroParcela: 1 });

    const inexistente = await cancelarLancamento(fakes, {
      lancamentoId: "nao-existe",
      agora: AGORA,
    });
    const parcela = await cancelarLancamento(fakes, { lancamentoId: "p-1", agora: AGORA });

    if (inexistente.ok || parcela.ok) {
      throw new Error("esperava recusa nos dois");
    }
    expect(inexistente.error.code).toBe("LANCAMENTO_NAO_ENCONTRADO");
    expect(parcela.error.code).toBe("LANCAMENTO_NAO_CANCELAVEL");
  });
});

describe("cancelarLancamento — a segunda exclusão não é erro (AVUL-03, AC 4)", () => {
  it("devolve sucesso com alterou falso e preserva o primeiro instante", async () => {
    semear({ id: "l-1" });
    await cancelarLancamento(fakes, { lancamentoId: "l-1", agora: AGORA });

    const segunda = await cancelarLancamento(fakes, {
      lancamentoId: "l-1",
      agora: "2026-03-25T12:00:00.000Z",
    });

    expect(segunda.ok).toBe(true);
    if (!segunda.ok) {
      throw new Error("esperava sucesso");
    }
    expect(segunda.value.alterou).toBe(false);
    expect((await fakes.movimentos.buscarPorId("l-1"))?.canceladoEm).toBe(AGORA);
  });
});
