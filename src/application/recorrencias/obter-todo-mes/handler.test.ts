import { describe, expect, it } from "vitest";
import {
  criarEstadoEmMemoria,
  type EstadoEmMemoria,
  FakeMovimentoRepository,
  FakeRecorrenciaRepository,
} from "@/application/ports/fakes";
import { MESES_DE_PROJECAO } from "@/application/recorrencias/materializar/handler";
import {
  addMeses,
  type Cents,
  type Competencia,
  fixosDoMes,
  type Natureza,
  rangeCompetencias,
} from "@/domain";
import { obterTodoMes } from "./handler";

/**
 * Derivado de FIXCOL-02 (ACs 1 e 3) e FIXCOL-03 (AC 2).
 *
 * O caso de uso é a costura: materializar a janela e só depois ler. A regra das
 * linhas e dos totais é de `fixosDoMes`, testada no domínio; aqui se prova que
 * a leitura vê as ocorrências que a materialização acabou de criar.
 */

const c = (t: string) => t as Competencia;
const MARCO = c("2026-03");

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
  opcoes: { descricao: string; natureza?: Natureza; valor: number },
) {
  return deps.recorrencias.criar({
    dados: {
      descricao: opcoes.descricao,
      natureza: opcoes.natureza ?? "DESPESA",
      categoriaId: "cat-1",
      usuarioId: "u1",
      meioPagamentoId: "m1",
      competenciaInicio: c("2026-01"),
      competenciaFim: null,
      diaVencimento: 10,
    },
    valorInicial: opcoes.valor as Cents,
  });
}

function ocorrencias(estado: EstadoEmMemoria) {
  return [...estado.movimentos.values()].filter((m) => m.origem === "RECORRENCIA");
}

describe("obterTodoMes — materializa antes de ler (FIXCOL-02, AC 3)", () => {
  it("num mês nunca aberto, a linha vem com o valor da vigência e o total não é zero", async () => {
    const { deps } = montar();
    await criar(deps, { descricao: "Fixo B", valor: 5000 });
    await criar(deps, { descricao: "Entrada A", natureza: "RECEITA", valor: 100000 });

    /* Controle: lido antes de materializar, o mês não tem ocorrência, e a linha
       e os dois totais saem vazios. É o que o caso de uso precisa evitar. */
    const semMaterializar = fixosDoMes(
      await deps.recorrencias.listarComVersoes(),
      await deps.movimentos.listarPorCompetencia(MARCO),
      MARCO,
    );
    expect(semMaterializar.saidas[0]?.valorDoMes).toBeNull();
    expect(semMaterializar.totalSaidas).toBe(0);
    expect(semMaterializar.totalEntradas).toBe(0);

    const todoMes = await obterTodoMes(deps, MARCO);

    expect(todoMes.saidas[0]?.valorDoMes).toBe(5000);
    expect(todoMes.entradas[0]?.valorDoMes).toBe(100000);
    expect(todoMes.totalSaidas).toBe(5000);
    expect(todoMes.totalEntradas).toBe(100000);
  });

  it("materializa a mesma janela de Lançamentos e da Visão geral", async () => {
    const { deps, estado } = montar();
    await criar(deps, { descricao: "Fixo B", valor: 5000 });

    await obterTodoMes(deps, MARCO);

    const competencias = ocorrencias(estado)
      .map((o) => o.competencia)
      .sort();
    expect(competencias).toEqual(rangeCompetencias(MARCO, addMeses(MARCO, MESES_DE_PROJECAO)));
  });

  it("abrir o mesmo mês duas vezes não cria ocorrência nova (FIXO-02)", async () => {
    const { deps, estado } = montar();
    await criar(deps, { descricao: "Fixo B", valor: 5000 });

    const primeira = await obterTodoMes(deps, MARCO);
    const criadasNaPrimeira = ocorrencias(estado).length;
    const segunda = await obterTodoMes(deps, MARCO);

    expect(ocorrencias(estado)).toHaveLength(criadasNaPrimeira);
    expect(segunda.totalSaidas).toBe(primeira.totalSaidas);
    expect(segunda.saidas[0]?.valorDoMes).toBe(5000);
  });
});

describe("obterTodoMes — o valor confirmado (FIXCOL-02, AC 1; FIXCOL-03, AC 2)", () => {
  it("com a ocorrência confirmada, a linha e o total trazem o valor confirmado", async () => {
    const { deps, estado } = montar();
    const fixoA = await criar(deps, { descricao: "Fixo A", valor: 10000 });
    await obterTodoMes(deps, MARCO);
    const deMarco = ocorrencias(estado).find(
      (o) => o.recorrenciaId === fixoA.id && o.competencia === MARCO,
    );
    if (deMarco === undefined) {
      throw new Error("a materialização não criou a ocorrência de março");
    }
    await deps.movimentos.confirmarValorReal(deMarco.id, 10500 as Cents);

    const todoMes = await obterTodoMes(deps, MARCO);

    expect(todoMes.saidas[0]?.valorDoMes).toBe(10500);
    expect(todoMes.saidas[0]?.previstoDoMes).toBe(10000);
    expect(todoMes.saidas[0]?.confirmado).toBe(true);
    expect(todoMes.totalSaidas).toBe(10500);
  });
});
