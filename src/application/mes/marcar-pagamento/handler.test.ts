import { describe, expect, it } from "vitest";
import {
  criarEstadoEmMemoria,
  type EstadoEmMemoria,
  FakeMovimentoRepository,
} from "@/application/ports/fakes";
import type { Cents, Competencia, Lancamento } from "@/domain";
import { marcarPagamento } from "./handler";

/**
 * O que este caso de uso acrescenta ao repositório é a verificação de
 * existência. `marcarPagamento` do repositório é silencioso para id
 * inexistente — nos dois repositórios, o real e o fake. Sem a busca antes, a
 * interface confirmaria um pagamento que não aconteceu, e é exatamente isso
 * que os testes abaixo prendem.
 */

const COMPETENCIA = "2026-03" as Competencia;

function lancamento(id: string, pagoEm: string | null): Lancamento {
  return {
    id,
    natureza: "DESPESA",
    origem: "AVULSO",
    descricao: `Lançamento ${id}`,
    competencia: COMPETENCIA,
    dataEvento: "2026-03-10",
    valor: 10000 as Cents,
    valorPrevisto: null,
    pagoEm,
    categoriaId: null,
    usuarioId: "u1",
    meioPagamentoId: "m1",
    compraId: null,
    numeroParcela: null,
    canceladoEm: null,
  };
}

function montar(...itens: Lancamento[]): {
  deps: { movimentos: FakeMovimentoRepository };
  estado: EstadoEmMemoria;
} {
  const estado = criarEstadoEmMemoria();
  for (const item of itens) {
    estado.movimentos.set(item.id, item);
  }
  return { deps: { movimentos: new FakeMovimentoRepository(estado) }, estado };
}

describe("marcar pagamento (MOV-06, AC 1)", () => {
  it("grava a data e devolve o lançamento já realizado", async () => {
    const { deps } = montar(lancamento("a", null));

    const resultado = await marcarPagamento(deps, { lancamentoId: "a", pagoEm: "2026-03-15" });

    expect(resultado.ok).toBe(true);
    expect(resultado.ok && resultado.value.pagoEm).toBe("2026-03-15");
  });

  it("desfazer devolve o lançamento a previsto", async () => {
    const { deps } = montar(lancamento("a", "2026-03-15"));

    const resultado = await marcarPagamento(deps, { lancamentoId: "a", pagoEm: null });

    expect(resultado.ok).toBe(true);
    expect(resultado.ok && resultado.value.pagoEm).toBeNull();
  });

  it("id inexistente falha em vez de confirmar em silêncio", async () => {
    const { deps } = montar(lancamento("a", null));

    const resultado = await marcarPagamento(deps, {
      lancamentoId: "fantasma",
      pagoEm: "2026-03-15",
    });

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.error.code).toBe("LANCAMENTO_NAO_ENCONTRADO");
  });

  it("não altera nenhum outro lançamento", async () => {
    const { deps, estado } = montar(lancamento("a", null), lancamento("b", null));

    await marcarPagamento(deps, { lancamentoId: "a", pagoEm: "2026-03-15" });

    expect(estado.movimentos.get("b")?.pagoEm).toBeNull();
  });

  it("não toca no valor ao marcar: previsto e realizado convivem", async () => {
    const { deps } = montar(lancamento("a", null));

    const resultado = await marcarPagamento(deps, { lancamentoId: "a", pagoEm: "2026-03-15" });

    expect(resultado.ok && resultado.value.valor).toBe(10000);
    expect(resultado.ok && resultado.value.descricao).toBe("Lançamento a");
  });

  it("marcar duas vezes a mesma data é inofensivo", async () => {
    const { deps } = montar(lancamento("a", null));

    await marcarPagamento(deps, { lancamentoId: "a", pagoEm: "2026-03-15" });
    const segunda = await marcarPagamento(deps, { lancamentoId: "a", pagoEm: "2026-03-15" });

    expect(segunda.ok && segunda.value.pagoEm).toBe("2026-03-15");
  });
});
