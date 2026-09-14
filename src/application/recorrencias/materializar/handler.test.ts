import { describe, expect, it } from "vitest";
import {
  criarEstadoEmMemoria,
  type EstadoEmMemoria,
  FakeMovimentoRepository,
  FakeRecorrenciaRepository,
} from "@/application/ports/fakes";
import type { Cents, Competencia, Natureza } from "@/domain";
import { materializarRecorrencias } from "./handler";

/**
 * Derivado de FIXO-01 (ACs 2 a 6), FIXO-02 (AC 1) e FIXO-05 (AC 2).
 *
 * O caso de uso **não decide nada por conta própria**: quais competências vêm
 * de `janelaMaterializacao`, qual valor vem de `versaoVigente`, e qual dia vem
 * de `diaEfetivo`. O que se testa aqui é a costura — que ele pergunte às três
 * e grave o que elas responderem, sem reinventar nenhuma regra pelo caminho.
 */

const c = (t: string) => t as Competencia;

function montar() {
  const estado: EstadoEmMemoria = criarEstadoEmMemoria();
  return {
    estado,
    deps: {
      recorrencias: new FakeRecorrenciaRepository(estado),
      movimentos: new FakeMovimentoRepository(estado),
    },
  };
}

async function criar(
  deps: ReturnType<typeof montar>["deps"],
  opcoes: {
    descricao?: string;
    natureza?: Natureza;
    inicio?: string;
    fim?: string | null;
    diaVencimento?: number;
    valor?: number;
  } = {},
) {
  return deps.recorrencias.criar({
    dados: {
      descricao: opcoes.descricao ?? "Conta fixa A",
      natureza: opcoes.natureza ?? "DESPESA",
      categoriaId: "cat-1",
      usuarioId: "u1",
      meioPagamentoId: "m1",
      competenciaInicio: c(opcoes.inicio ?? "2026-03"),
      competenciaFim: opcoes.fim === undefined ? null : opcoes.fim === null ? null : c(opcoes.fim),
      diaVencimento: opcoes.diaVencimento ?? 10,
    },
    valorInicial: (opcoes.valor ?? 18000) as Cents,
  });
}

function ocorrencias(estado: EstadoEmMemoria) {
  return [...estado.movimentos.values()]
    .filter((m) => m.origem === "RECORRENCIA")
    .sort((a, b) => a.competencia.localeCompare(b.competencia));
}

describe("materializar a janela (FIXO-01, FIXO-02, FIXO-05)", () => {
  it("cobre a competência visível e os meses da projeção (FIXO-05, AC 2)", async () => {
    const { deps, estado } = montar();
    await criar(deps);

    await materializarRecorrencias(deps, c("2026-04"), 3);

    expect(ocorrencias(estado).map((o) => o.competencia)).toEqual([
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
    ]);
  });

  it("não cria nada antes do início (FIXO-01, AC 3)", async () => {
    const { deps, estado } = montar();
    await criar(deps, { inicio: "2026-06" });

    await materializarRecorrencias(deps, c("2026-04"), 3);

    expect(ocorrencias(estado).map((o) => o.competencia)).toEqual(["2026-06", "2026-07"]);
  });

  it("não cria nada depois do fim (FIXO-01, AC 4)", async () => {
    const { deps, estado } = montar();
    await criar(deps, { fim: "2026-05" });

    await materializarRecorrencias(deps, c("2026-04"), 3);

    expect(ocorrencias(estado).map((o) => o.competencia)).toEqual(["2026-04", "2026-05"]);
  });

  it("usa o dia de vencimento como data de evento (FIXO-01, AC 5)", async () => {
    const { deps, estado } = montar();
    await criar(deps, { diaVencimento: 20 });

    await materializarRecorrencias(deps, c("2026-04"), 1);

    expect(ocorrencias(estado).map((o) => o.dataEvento)).toEqual(["2026-04-20", "2026-05-20"]);
  });

  it("reduz o dia ao último do mês quando ele não existe (FIXO-01, AC 5)", async () => {
    const { deps, estado } = montar();
    await criar(deps, { inicio: "2026-01", diaVencimento: 31 });

    await materializarRecorrencias(deps, c("2026-01"), 2);

    // Fevereiro de 2026 não é bissexto: dia 31 vira 28.
    expect(ocorrencias(estado).map((o) => o.dataEvento)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
    ]);
  });

  it("receita gera lançamento de receita (FIXO-01, AC 6)", async () => {
    const { deps, estado } = montar();
    await criar(deps, { natureza: "RECEITA", descricao: "Entrada recorrente A" });

    await materializarRecorrencias(deps, c("2026-04"), 0);

    expect(ocorrencias(estado)[0]?.natureza).toBe("RECEITA");
  });

  it("usa a versão vigente de cada competência, não a mais recente", async () => {
    const { deps, estado } = montar();
    const criada = await criar(deps, { valor: 18000 });
    await deps.recorrencias.registrarVersao(criada.id, c("2026-06"), 24000 as Cents);

    await materializarRecorrencias(deps, c("2026-04"), 3);

    expect(ocorrencias(estado).map((o) => [o.competencia, o.valor])).toEqual([
      ["2026-04", 18000],
      ["2026-05", 18000],
      ["2026-06", 24000],
      ["2026-07", 24000],
    ]);
  });

  it("rodar duas vezes não muda nada (FIXO-02, AC 1)", async () => {
    const { deps, estado } = montar();
    await criar(deps);

    await materializarRecorrencias(deps, c("2026-04"), 3);
    const criadasNaSegunda = await materializarRecorrencias(deps, c("2026-04"), 3);

    expect(criadasNaSegunda).toBe(0);
    expect(ocorrencias(estado)).toHaveLength(4);
  });

  it("materializa várias recorrências no mesmo passe", async () => {
    const { deps, estado } = montar();
    await criar(deps, { descricao: "Conta fixa A" });
    await criar(deps, { descricao: "Conta fixa B", valor: 12456 });

    await materializarRecorrencias(deps, c("2026-04"), 0);

    expect(
      ocorrencias(estado)
        .map((o) => o.descricao)
        .sort(),
    ).toEqual(["Conta fixa A", "Conta fixa B"]);
  });

  it("sem recorrência nenhuma, não grava nada e não falha", async () => {
    const { deps, estado } = montar();

    expect(await materializarRecorrencias(deps, c("2026-04"), 3)).toBe(0);
    expect(ocorrencias(estado)).toEqual([]);
  });

  it("recorrência encerrada antes da janela não materializa", async () => {
    const { deps, estado } = montar();
    const criada = await criar(deps);
    // Encerrar a partir de abril grava fim em março.
    await deps.recorrencias.encerrar(criada.id, c("2026-03"), "2026-09-14T12:00:00.000Z");

    await materializarRecorrencias(deps, c("2026-04"), 3);

    expect(ocorrencias(estado)).toEqual([]);
  });
});
