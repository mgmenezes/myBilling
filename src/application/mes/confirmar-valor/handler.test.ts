import { describe, expect, it } from "vitest";
import {
  criarEstadoEmMemoria,
  type EstadoEmMemoria,
  FakeMovimentoRepository,
} from "@/application/ports/fakes";
import type { Cents, Competencia, Lancamento } from "@/domain";
import { confirmarValor } from "./handler";

/**
 * Derivado de FIXO-04, ACs 1 e 2.
 *
 * Confirmar é escrever quanto a conta **veio**, sem apagar quanto ela estava
 * **prevista**. Os dois convivem: é a diferença entre eles que permite comparar
 * planejado com realizado, e é ela que protege a ocorrência de um reajuste
 * registrado depois.
 */

const c = (t: string) => t as Competencia;

function ocorrencia(id: string, competencia: string): Lancamento {
  return {
    id,
    natureza: "DESPESA",
    origem: "RECORRENCIA",
    descricao: "Conta fixa B",
    competencia: c(competencia),
    dataEvento: `${competencia}-20`,
    valor: 18000 as Cents,
    valorPrevisto: 18000 as Cents,
    pagoEm: null,
    categoriaId: null,
    usuarioId: "u1",
    meioPagamentoId: "m1",
    compraId: null,
    numeroParcela: null,
    recorrenciaId: "rec-1",
    canceladoEm: null,
  };
}

function montar(...itens: Lancamento[]) {
  const estado: EstadoEmMemoria = criarEstadoEmMemoria();
  for (const item of itens) {
    estado.movimentos.set(item.id, item);
  }
  return { estado, deps: { movimentos: new FakeMovimentoRepository(estado) } };
}

describe("confirmar o valor real (FIXO-04)", () => {
  it("o valor passa a valer e o previsto é preservado (AC 1)", async () => {
    const { deps, estado } = montar(ocorrencia("a", "2026-03"));

    const resultado = await confirmarValor(deps, { lancamentoId: "a", valor: 19240 as Cents });

    expect(resultado.ok).toBe(true);
    expect(estado.movimentos.get("a")?.valor).toBe(19240);
    expect(estado.movimentos.get("a")?.valorPrevisto).toBe(18000);
  });

  it("não altera nenhuma outra competência (AC 2)", async () => {
    const { deps, estado } = montar(ocorrencia("a", "2026-03"), ocorrencia("b", "2026-04"));

    await confirmarValor(deps, { lancamentoId: "a", valor: 19240 as Cents });

    expect(estado.movimentos.get("b")?.valor).toBe(18000);
  });

  it("confirmar não marca como pago: são gestos diferentes", async () => {
    const { deps, estado } = montar(ocorrencia("a", "2026-03"));

    await confirmarValor(deps, { lancamentoId: "a", valor: 19240 as Cents });

    expect(estado.movimentos.get("a")?.pagoEm).toBeNull();
  });

  it("confirmar de novo sobrescreve, e o previsto continua o original", async () => {
    const { deps, estado } = montar(ocorrencia("a", "2026-03"));

    await confirmarValor(deps, { lancamentoId: "a", valor: 19240 as Cents });
    await confirmarValor(deps, { lancamentoId: "a", valor: 17510 as Cents });

    expect(estado.movimentos.get("a")?.valor).toBe(17510);
    expect(estado.movimentos.get("a")?.valorPrevisto).toBe(18000);
  });

  it("id inexistente é recusado em vez de confirmar em silêncio", async () => {
    const { deps } = montar(ocorrencia("a", "2026-03"));

    const resultado = await confirmarValor(deps, { lancamentoId: "x", valor: 19240 as Cents });

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.error.code).toBe("LANCAMENTO_NAO_ENCONTRADO");
  });

  it("valor não positivo é recusado", async () => {
    const { deps, estado } = montar(ocorrencia("a", "2026-03"));

    const resultado = await confirmarValor(deps, { lancamentoId: "a", valor: 0 as Cents });

    expect(resultado.ok).toBe(false);
    expect(estado.movimentos.get("a")?.valor).toBe(18000);
  });

  it("só ocorrência de recorrência é confirmável", async () => {
    const parcela: Lancamento = {
      ...ocorrencia("p", "2026-03"),
      origem: "PARCELA",
      recorrenciaId: null,
      valorPrevisto: null,
      compraId: "compra-1",
      numeroParcela: 1,
    };
    const { deps, estado } = montar(parcela);

    const resultado = await confirmarValor(deps, { lancamentoId: "p", valor: 19240 as Cents });

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.error.code).toBe("LANCAMENTO_NAO_CONFIRMAVEL");
    expect(estado.movimentos.get("p")?.valor).toBe(18000);
  });
});
