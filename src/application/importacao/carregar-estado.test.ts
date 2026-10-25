import { describe, expect, it } from "vitest";
import type { RecorrenciaComVersoes } from "@/application/ports/repositories";
import type { Cents } from "@/domain";
import { carregarEstadoParaImportacao } from "./carregar-estado";
import { AZUL, CONTA, c, criarCenario, PESSOA_A, ROXO, semearOutubroAMao } from "./testing/cenario";

/**
 * O estado que o plano de uma aba M precisa (design, `EstadoParaImportacao`):
 * as recorrências que valem em M − 1, com o valor que têm em M (IMP-07 AC 1 a
 * 5), as compras com parcela em M (AC 7 e 11) e todas as categorias, inclusive
 * arquivadas (IMP-03 AC 9).
 */

async function depoisDeOutubro() {
  const fakes = criarCenario();
  await semearOutubroAMao(fakes);
  return fakes;
}

describe("carregarEstadoParaImportacao (T17)", () => {
  it("vista de novembro, traz as despesas e as receitas que valem em outubro", async () => {
    const fakes = await depoisDeOutubro();

    const estado = await carregarEstadoParaImportacao(fakes, c("2026-11"));

    expect(estado.competencia).toBe("2026-11");
    expect(estado.despesasFixasVigentes).toEqual([
      { id: "rec-1", descricao: "Aluguel", meioPagamentoId: CONTA, valorEmM: 150000 },
      { id: "rec-2", descricao: "Internet", meioPagamentoId: ROXO, valorEmM: 10000 },
      { id: "rec-3", descricao: "Academia", meioPagamentoId: CONTA, valorEmM: 12000 },
      { id: "rec-4", descricao: "Academia", meioPagamentoId: ROXO, valorEmM: 12000 },
    ]);
    expect(estado.receitasFixasVigentes).toEqual([
      { id: "rec-5", descricao: "Salário A", meioPagamentoId: CONTA, valorEmM: 600000 },
      { id: "rec-6", descricao: "Salário B", meioPagamentoId: CONTA, valorEmM: 400000 },
    ]);
  });

  it("vista de novembro, traz as compras com parcela em novembro, e o Curso fica fora", async () => {
    const fakes = await depoisDeOutubro();

    const estado = await carregarEstadoParaImportacao(fakes, c("2026-11"));

    expect(estado.comprasEmCurso).toEqual([
      {
        compraId: "compra-1",
        descricao: "Sofá",
        meioPagamentoId: ROXO,
        qtdParcelas: 10,
        numeroEmM: 8,
        valorEmM: 21000,
      },
      {
        compraId: "compra-2",
        descricao: "Fone",
        meioPagamentoId: ROXO,
        qtdParcelas: 3,
        numeroEmM: 2,
        valorEmM: 3334,
      },
      {
        compraId: "compra-4",
        descricao: "Óculos",
        meioPagamentoId: CONTA,
        qtdParcelas: 5,
        numeroEmM: 3,
        valorEmM: 8000,
      },
      {
        compraId: "compra-5",
        descricao: "Livro",
        meioPagamentoId: ROXO,
        qtdParcelas: 2,
        numeroEmM: 2,
        valorEmM: 2000,
      },
      {
        compraId: "compra-6",
        descricao: "Livro",
        meioPagamentoId: ROXO,
        qtdParcelas: 2,
        numeroEmM: 2,
        valorEmM: 3000,
      },
    ]);
  });

  it("o valor da recorrência é o que vale em M, não o de M − 1 (IMP-07 AC 3 e 4)", async () => {
    const fakes = await depoisDeOutubro();
    await fakes.recorrencias.registrarVersao("rec-2", c("2026-11"), 11000 as Cents);

    const estado = await carregarEstadoParaImportacao(fakes, c("2026-11"));

    expect(estado.despesasFixasVigentes.find((r) => r.id === "rec-2")?.valorEmM).toBe(11000);
  });

  it("a que terminou antes de M − 1 e a que só começa em M não valem em M − 1", async () => {
    const fakes = await depoisDeOutubro();
    await fakes.recorrencias.encerrar("rec-4", c("2026-10"), "2026-11-01T12:00:00.000Z");
    await fakes.recorrencias.criar({
      dados: {
        descricao: "Streaming",
        natureza: "DESPESA",
        categoriaId: null,
        usuarioId: PESSOA_A,
        meioPagamentoId: AZUL,
        competenciaInicio: c("2026-11"),
        competenciaFim: null,
        diaVencimento: 1,
      },
      valorInicial: 3000 as Cents,
    });

    const deNovembro = await carregarEstadoParaImportacao(fakes, c("2026-11"));
    const deDezembro = await carregarEstadoParaImportacao(fakes, c("2026-12"));

    // Em novembro, a Academia no Cartão Roxo ainda vale em outubro, o último mês
    // dela; o Streaming só começa em novembro, que é M.
    expect(deNovembro.despesasFixasVigentes.map((r) => r.id)).toEqual([
      "rec-1",
      "rec-2",
      "rec-3",
      "rec-4",
    ]);
    expect(deDezembro.despesasFixasVigentes.map((r) => r.id)).toEqual([
      "rec-1",
      "rec-2",
      "rec-3",
      "rec-7",
    ]);
  });

  it("entrega as vigentes em ordem de início e, no empate, de id, e não na ordem do repositório (IMP-07 AC 12)", async () => {
    const fakes = criarCenario();
    const academia = (id: string, inicio: string, valor: number): RecorrenciaComVersoes => ({
      recorrencia: {
        id,
        descricao: "Academia",
        natureza: "DESPESA",
        categoriaId: null,
        usuarioId: PESSOA_A,
        meioPagamentoId: CONTA,
        competenciaInicio: c(inicio),
        competenciaFim: null,
        diaVencimento: 1,
        encerradaEm: null,
      },
      versoes: [{ vigenteDesde: c(inicio), valorPrevisto: valor as Cents }],
    });
    // O repositório as devolve nesta ordem, que não é a de início nem a de id.
    for (const homonima of [
      academia("rec-a", "2026-11", 14000),
      academia("rec-c", "2026-10", 13000),
      academia("rec-b", "2026-10", 12000),
    ]) {
      fakes.estado.recorrencias.set(homonima.recorrencia.id, homonima);
    }

    const estado = await carregarEstadoParaImportacao(fakes, c("2026-12"));

    expect(estado.despesasFixasVigentes.map((r) => r.id)).toEqual(["rec-b", "rec-c", "rec-a"]);
  });

  it("traz todas as categorias, inclusive as arquivadas (IMP-03 AC 9)", async () => {
    const fakes = await depoisDeOutubro();
    fakes.estado.categorias.push({
      id: "categoria-arquivada",
      nome: "Moradia",
      arquivadaEm: "2026-09-01T12:00:00.000Z",
    });

    const estado = await carregarEstadoParaImportacao(fakes, c("2026-11"));

    expect(estado.categorias).toEqual([
      { id: "categoria-um", nome: "Categoria Um", arquivadaEm: null },
      { id: "categoria-arquivada", nome: "Moradia", arquivadaEm: "2026-09-01T12:00:00.000Z" },
    ]);
  });
});
