import { describe, expect, it } from "vitest";
import {
  criarEstadoEmMemoria,
  type EstadoEmMemoria,
  FakeMovimentoRepository,
  FakeRecorrenciaRepository,
} from "@/application/ports/fakes";
import type { Cents, Competencia } from "@/domain";
import { materializarRecorrencias } from "../materializar/handler";
import { registrarVersao } from "./handler";

/**
 * Derivado de FIXO-03.
 *
 * A pergunta que este caso de uso responde é a que atrasou a fatia duas vezes:
 * quando a conta de luz muda de valor, **o passado muda junto?** Não. E o que
 * já foi confirmado ou pago também não, mesmo estando no futuro.
 */

const c = (t: string) => t as Competencia;

async function cenario() {
  const estado: EstadoEmMemoria = criarEstadoEmMemoria();
  const deps = {
    recorrencias: new FakeRecorrenciaRepository(estado),
    movimentos: new FakeMovimentoRepository(estado),
  };
  const criada = await deps.recorrencias.criar({
    dados: {
      descricao: "Conta fixa B",
      natureza: "DESPESA",
      categoriaId: null,
      usuarioId: "u1",
      meioPagamentoId: "m1",
      competenciaInicio: c("2026-03"),
      competenciaFim: null,
      diaVencimento: 20,
    },
    valorInicial: 18000 as Cents,
  });
  await materializarRecorrencias(deps, c("2026-03"), 3);
  return { estado, deps, recorrenciaId: criada.id };
}

function valores(estado: EstadoEmMemoria): Array<[string, number]> {
  return [...estado.movimentos.values()]
    .sort((a, b) => a.competencia.localeCompare(b.competencia))
    .map((m) => [m.competencia, m.valor]);
}

describe("registrar nova vigência (FIXO-03)", () => {
  it("não altera competência anterior à vigência (AC 1)", async () => {
    const { deps, estado, recorrenciaId } = await cenario();

    await registrarVersao(deps, {
      recorrenciaId,
      vigenteDesde: c("2026-05"),
      valor: 24000 as Cents,
    });

    expect(valores(estado)).toEqual([
      ["2026-03", 18000],
      ["2026-04", 18000],
      ["2026-05", 24000],
      ["2026-06", 24000],
    ]);
  });

  it("a versão nova entra no histórico sem apagar a anterior", async () => {
    const { deps, recorrenciaId } = await cenario();

    await registrarVersao(deps, {
      recorrenciaId,
      vigenteDesde: c("2026-05"),
      valor: 24000 as Cents,
    });

    const [primeira] = await deps.recorrencias.listarComVersoes();
    expect(primeira?.versoes).toEqual([
      { vigenteDesde: "2026-03", valorPrevisto: 18000 },
      { vigenteDesde: "2026-05", valorPrevisto: 24000 },
    ]);
  });

  it("não altera ocorrência paga, mesmo dentro da vigência nova", async () => {
    const { deps, estado, recorrenciaId } = await cenario();
    const maio = [...estado.movimentos.entries()].find(([, m]) => m.competencia === "2026-05");
    await deps.movimentos.marcarPagamento(maio?.[0] ?? "", "2026-05-20");

    await registrarVersao(deps, {
      recorrenciaId,
      vigenteDesde: c("2026-05"),
      valor: 24000 as Cents,
    });

    expect(valores(estado)).toEqual([
      ["2026-03", 18000],
      ["2026-04", 18000],
      ["2026-05", 18000],
      ["2026-06", 24000],
    ]);
  });

  it("não altera ocorrência com valor já confirmado", async () => {
    const { deps, estado, recorrenciaId } = await cenario();
    const junho = [...estado.movimentos.entries()].find(([, m]) => m.competencia === "2026-06");
    await deps.movimentos.confirmarValorReal(junho?.[0] ?? "", 19240 as Cents);

    await registrarVersao(deps, {
      recorrenciaId,
      vigenteDesde: c("2026-05"),
      valor: 24000 as Cents,
    });

    expect(valores(estado)).toEqual([
      ["2026-03", 18000],
      ["2026-04", 18000],
      ["2026-05", 24000],
      ["2026-06", 19240],
    ]);
  });

  it("vigência repetida substitui o valor em vez de duplicar (AC 4)", async () => {
    const { deps, recorrenciaId } = await cenario();

    await registrarVersao(deps, {
      recorrenciaId,
      vigenteDesde: c("2026-05"),
      valor: 24000 as Cents,
    });
    await registrarVersao(deps, {
      recorrenciaId,
      vigenteDesde: c("2026-05"),
      valor: 26000 as Cents,
    });

    const [primeira] = await deps.recorrencias.listarComVersoes();
    expect(primeira?.versoes).toHaveLength(2);
    expect(primeira?.versoes[1]?.valorPrevisto).toBe(26000);
  });

  it("registrar na própria competência de início reescreve o valor original", async () => {
    const { deps, estado, recorrenciaId } = await cenario();

    await registrarVersao(deps, {
      recorrenciaId,
      vigenteDesde: c("2026-03"),
      valor: 20000 as Cents,
    });

    expect(valores(estado).every(([, v]) => v === 20000)).toBe(true);
  });

  it("recorrência inexistente é recusada em vez de falhar em silêncio", async () => {
    const { deps } = await cenario();

    const resultado = await registrarVersao(deps, {
      recorrenciaId: "fantasma",
      vigenteDesde: c("2026-05"),
      valor: 24000 as Cents,
    });

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.error.code).toBe("RECORRENCIA_NAO_ENCONTRADA");
  });

  it("valor não positivo é recusado", async () => {
    const { deps, recorrenciaId } = await cenario();

    const resultado = await registrarVersao(deps, {
      recorrenciaId,
      vigenteDesde: c("2026-05"),
      valor: 0 as Cents,
    });

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.error.code).toBe("VALOR_NAO_POSITIVO");
  });
});
