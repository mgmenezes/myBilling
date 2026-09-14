import { describe, expect, it } from "vitest";
import {
  criarEstadoEmMemoria,
  type EstadoEmMemoria,
  FakeMovimentoRepository,
  FakeRecorrenciaRepository,
} from "@/application/ports/fakes";
import type { Cents, Competencia } from "@/domain";
import { materializarRecorrencias } from "../materializar/handler";
import { encerrarRecorrencia } from "./handler";

/**
 * Derivado de FIXO-06.
 *
 * **Aqui mora o off-by-one da fatia.** O banco guarda a última competência em
 * que a recorrência ainda vale; a pessoa diz a partir de qual mês ela para.
 * Encerrar a partir de maio grava fim em **abril**, e essa tradução tem teste
 * próprio porque é onde erro de mês nasce.
 */

const c = (t: string) => t as Competencia;
const AGORA = "2026-09-14T12:00:00.000Z";

async function cenario() {
  const estado: EstadoEmMemoria = criarEstadoEmMemoria();
  const deps = {
    recorrencias: new FakeRecorrenciaRepository(estado),
    movimentos: new FakeMovimentoRepository(estado),
  };
  const criada = await deps.recorrencias.criar({
    dados: {
      descricao: "Serviço fixo C",
      natureza: "DESPESA",
      categoriaId: null,
      usuarioId: "u1",
      meioPagamentoId: "m1",
      competenciaInicio: c("2026-03"),
      competenciaFim: null,
      diaVencimento: 28,
    },
    valorInicial: 9900 as Cents,
  });
  await materializarRecorrencias(deps, c("2026-03"), 3);
  return { estado, deps, recorrenciaId: criada.id };
}

function competencias(estado: EstadoEmMemoria): string[] {
  return [...estado.movimentos.values()].map((m) => m.competencia).sort();
}

describe("encerrar recorrência (FIXO-06)", () => {
  it("encerrar a partir de maio grava fim em ABRIL", async () => {
    const { deps, recorrenciaId } = await cenario();

    await encerrarRecorrencia(deps, { recorrenciaId, aPartirDe: c("2026-05"), agora: AGORA });

    const [primeira] = await deps.recorrencias.listarComVersoes();
    expect(primeira?.recorrencia.competenciaFim).toBe("2026-04");
    expect(primeira?.recorrencia.encerradaEm).toBe(AGORA);
  });

  it("remove as não pagas da competência em diante", async () => {
    const { deps, estado, recorrenciaId } = await cenario();

    await encerrarRecorrencia(deps, { recorrenciaId, aPartirDe: c("2026-05"), agora: AGORA });

    expect(competencias(estado)).toEqual(["2026-03", "2026-04"]);
  });

  it("preserva as pagas, mesmo dentro da faixa removida (AC 2)", async () => {
    const { deps, estado, recorrenciaId } = await cenario();
    const junho = [...estado.movimentos.entries()].find(([, m]) => m.competencia === "2026-06");
    await deps.movimentos.marcarPagamento(junho?.[0] ?? "", "2026-06-28");

    await encerrarRecorrencia(deps, { recorrenciaId, aPartirDe: c("2026-05"), agora: AGORA });

    expect(competencias(estado)).toEqual(["2026-03", "2026-04", "2026-06"]);
  });

  it("depois de encerrada, materializar não recria nada", async () => {
    const { deps, estado, recorrenciaId } = await cenario();

    await encerrarRecorrencia(deps, { recorrenciaId, aPartirDe: c("2026-05"), agora: AGORA });
    await materializarRecorrencias(deps, c("2026-03"), 6);

    expect(competencias(estado)).toEqual(["2026-03", "2026-04"]);
  });

  it("encerrar na própria competência de início apaga tudo que não foi pago", async () => {
    const { deps, estado, recorrenciaId } = await cenario();

    await encerrarRecorrencia(deps, { recorrenciaId, aPartirDe: c("2026-03"), agora: AGORA });

    expect(competencias(estado)).toEqual([]);
    const [primeira] = await deps.recorrencias.listarComVersoes();
    expect(primeira?.recorrencia.competenciaFim).toBe("2026-02");
  });

  it("encerrar duas vezes é inofensivo", async () => {
    const { deps, estado, recorrenciaId } = await cenario();

    await encerrarRecorrencia(deps, { recorrenciaId, aPartirDe: c("2026-05"), agora: AGORA });
    const segunda = await encerrarRecorrencia(deps, {
      recorrenciaId,
      aPartirDe: c("2026-05"),
      agora: AGORA,
    });

    expect(segunda.ok).toBe(true);
    expect(competencias(estado)).toEqual(["2026-03", "2026-04"]);
  });

  it("a recorrência continua existindo, marcada como encerrada (AC 3)", async () => {
    const { deps, recorrenciaId } = await cenario();

    await encerrarRecorrencia(deps, { recorrenciaId, aPartirDe: c("2026-05"), agora: AGORA });

    expect(await deps.recorrencias.listarComVersoes()).toHaveLength(1);
  });

  it("recorrência inexistente é recusada", async () => {
    const { deps } = await cenario();

    const resultado = await encerrarRecorrencia(deps, {
      recorrenciaId: "fantasma",
      aPartirDe: c("2026-05"),
      agora: AGORA,
    });

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.error.code).toBe("RECORRENCIA_NAO_ENCONTRADA");
  });
});
