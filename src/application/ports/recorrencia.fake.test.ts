import { describe, expect, it } from "vitest";
import type { Cents, Competencia } from "@/domain";
import { criarEstadoEmMemoria, criarFakes, FakeRecorrenciaRepository } from "./fakes";

/**
 * O fake é o que permite os casos de uso da fase 2 rodarem sem banco. Ele só
 * vale se **se comportar como o Drizzle** nos pontos que o caso de uso observa
 * — e os pontos são três: as versões saem ordenadas, encerrar não apaga, e
 * registrar versão com vigência repetida substitui em vez de duplicar.
 *
 * Os mesmos três pontos são asserados contra Postgres real em T6. É o par de
 * testes que impede o fake de virar uma ficção conveniente.
 */

const c = (t: string) => t as Competencia;

function repositorio() {
  return new FakeRecorrenciaRepository(criarEstadoEmMemoria());
}

async function criarBasica(repo: FakeRecorrenciaRepository, valor = 18000) {
  return repo.criar({
    dados: {
      descricao: "Conta fixa A",
      natureza: "DESPESA",
      categoriaId: null,
      usuarioId: "u1",
      meioPagamentoId: "m1",
      competenciaInicio: c("2026-03"),
      competenciaFim: null,
      diaVencimento: 10,
    },
    valorInicial: valor as Cents,
  });
}

describe("fake de recorrência", () => {
  it("criar devolve a recorrência com a versão inicial vigente no início", async () => {
    const repo = repositorio();

    const criada = await criarBasica(repo);

    const todas = await repo.listarComVersoes();
    expect(todas).toHaveLength(1);
    expect(todas[0]?.recorrencia.id).toBe(criada.id);
    expect(todas[0]?.versoes).toEqual([{ vigenteDesde: "2026-03", valorPrevisto: 18000 }]);
  });

  it("as versões saem ordenadas por vigência, não por ordem de inserção", async () => {
    const repo = repositorio();
    const criada = await criarBasica(repo);

    await repo.registrarVersao(criada.id, c("2026-08"), 30000 as Cents);
    await repo.registrarVersao(criada.id, c("2026-05"), 24000 as Cents);

    const [primeira] = await repo.listarComVersoes();
    expect(primeira?.versoes.map((v) => v.vigenteDesde)).toEqual(["2026-03", "2026-05", "2026-08"]);
  });

  it("vigência repetida substitui o valor em vez de criar uma segunda", async () => {
    const repo = repositorio();
    const criada = await criarBasica(repo);

    await repo.registrarVersao(criada.id, c("2026-05"), 24000 as Cents);
    await repo.registrarVersao(criada.id, c("2026-05"), 26000 as Cents);

    const [primeira] = await repo.listarComVersoes();
    expect(primeira?.versoes).toHaveLength(2);
    expect(primeira?.versoes[1]).toEqual({ vigenteDesde: "2026-05", valorPrevisto: 26000 });
  });

  it("encerrar grava o fim e o instante, sem apagar a recorrência", async () => {
    const repo = repositorio();
    const criada = await criarBasica(repo);

    await repo.encerrar(criada.id, c("2026-06"), "2026-09-14T12:00:00.000Z");

    const [primeira] = await repo.listarComVersoes();
    expect(primeira?.recorrencia.competenciaFim).toBe("2026-06");
    expect(primeira?.recorrencia.encerradaEm).toBe("2026-09-14T12:00:00.000Z");
  });

  it("registrar versão em recorrência inexistente não cria nada", async () => {
    const repo = repositorio();

    await repo.registrarVersao("fantasma", c("2026-05"), 24000 as Cents);

    expect(await repo.listarComVersoes()).toEqual([]);
  });
});

/**
 * As escritas da edição do fixo, com as mesmas regras asseradas contra
 * Postgres em `recorrencia.repository.integration.test.ts` e
 * `movimento.recorrencia.integration.test.ts` (EDF-02, EDF-04).
 */
describe("fake de recorrência: edição do fixo", () => {
  it("buscarComVersoes devolve a recorrência pedida, ou null", async () => {
    const repo = repositorio();
    const a = await criarBasica(repo);
    await criarBasica(repo, 12456);
    await repo.registrarVersao(a.id, c("2026-05"), 24000 as Cents);

    expect(await repo.buscarComVersoes(a.id)).toEqual({
      recorrencia: a,
      versoes: [
        { vigenteDesde: "2026-03", valorPrevisto: 18000 },
        { vigenteDesde: "2026-05", valorPrevisto: 24000 },
      ],
    });
    expect(await repo.buscarComVersoes("fantasma")).toBeNull();
  });

  it("atualizarSerie grava os cinco campos e mais nada", async () => {
    const repo = repositorio();
    const criada = await criarBasica(repo);
    const outra = await criarBasica(repo, 12456);

    await repo.atualizarSerie(criada.id, {
      descricao: "Conta fixa B",
      diaVencimento: 31,
      meioPagamentoId: "m2",
      categoriaId: "cat-2",
      usuarioId: "u2",
    });

    expect((await repo.buscarComVersoes(criada.id))?.recorrencia).toEqual({
      ...criada,
      descricao: "Conta fixa B",
      diaVencimento: 31,
      meioPagamentoId: "m2",
      categoriaId: "cat-2",
      usuarioId: "u2",
    });
    expect((await repo.buscarComVersoes(outra.id))?.recorrencia).toEqual(outra);
  });

  it("reabrir limpa o fim e o instante do encerramento, e mais nada", async () => {
    const repo = repositorio();
    const criada = await criarBasica(repo);
    await repo.encerrar(criada.id, c("2026-06"), "2026-09-14T12:00:00.000Z");

    await repo.reabrir(criada.id);

    expect((await repo.buscarComVersoes(criada.id))?.recorrencia).toEqual(criada);
  });

  it("estenderFim move o fim e deixa o instante do encerramento como está", async () => {
    const repo = repositorio();
    const criada = await criarBasica(repo);
    await repo.encerrar(criada.id, c("2026-06"), "2026-09-14T12:00:00.000Z");

    await repo.estenderFim(criada.id, c("2027-02"));

    expect((await repo.buscarComVersoes(criada.id))?.recorrencia).toEqual({
      ...criada,
      competenciaFim: "2027-02",
      encerradaEm: "2026-09-14T12:00:00.000Z",
    });
  });

  it("as três escritas em id inexistente não criam nada", async () => {
    const repo = repositorio();
    const campos = {
      descricao: "Conta fixa B",
      diaVencimento: 31,
      meioPagamentoId: "m2",
      categoriaId: null,
      usuarioId: "u2",
    };

    await repo.atualizarSerie("fantasma", campos);
    await repo.reabrir("fantasma");
    await repo.estenderFim("fantasma", c("2027-02"));

    expect(await repo.listarComVersoes()).toEqual([]);
  });
});

describe("fake de movimento: ocorrências da série (EDF-02 AC 1 a 3)", () => {
  async function cenario() {
    const fakes = criarFakes();
    const fixo = await criarBasica(fakes.recorrencias);
    const outro = await criarBasica(fakes.recorrencias, 12456);
    const ocorrencia = (recorrenciaId: string, competencia: string) => ({
      recorrenciaId,
      natureza: "DESPESA" as const,
      descricao: "Conta fixa A",
      competencia: c(competencia),
      dataEvento: `${competencia}-10`,
      valorPrevisto: 18000 as Cents,
      categoriaId: null,
      usuarioId: "u1",
      meioPagamentoId: "m1",
    });
    await fakes.movimentos.materializarOcorrencias([
      ocorrencia(fixo.id, "2026-10"),
      ocorrencia(fixo.id, "2026-11"),
      ocorrencia(fixo.id, "2027-02"),
      ocorrencia(outro.id, "2026-10"),
    ]);
    const doFixo = () =>
      [...fakes.estado.movimentos.values()]
        .filter((m) => m.recorrenciaId === fixo.id)
        .sort((x, y) => x.competencia.localeCompare(y.competencia));
    return { fakes, fixo, outro, doFixo };
  }

  const CAMPOS = {
    descricao: "Conta fixa B",
    diaVencimento: 31,
    meioPagamentoId: "m2",
    categoriaId: "cat-2",
    usuarioId: "u2",
  };

  it("grava os cinco campos e a data recalculada em todas, e devolve quantas", async () => {
    const { fakes, fixo, doFixo } = await cenario();

    const alteradas = await fakes.movimentos.atualizarOcorrenciasDaSerie(fixo.id, CAMPOS);

    expect(alteradas).toBe(3);
    expect(
      doFixo().map((m) => [
        m.competencia,
        m.descricao,
        m.dataEvento,
        m.meioPagamentoId,
        m.categoriaId,
        m.usuarioId,
      ]),
    ).toEqual([
      ["2026-10", "Conta fixa B", "2026-10-31", "m2", "cat-2", "u2"],
      ["2026-11", "Conta fixa B", "2026-11-30", "m2", "cat-2", "u2"],
      ["2027-02", "Conta fixa B", "2027-02-28", "m2", "cat-2", "u2"],
    ]);
  });

  it("não toca no pagamento, no valor confirmado nem no previsto", async () => {
    const { fakes, fixo, doFixo } = await cenario();
    const [outubro, novembro] = doFixo();
    await fakes.movimentos.marcarPagamento(outubro?.id ?? "", "2026-10-10");
    await fakes.movimentos.confirmarValorReal(novembro?.id ?? "", 19240 as Cents);

    await fakes.movimentos.atualizarOcorrenciasDaSerie(fixo.id, CAMPOS);

    expect(doFixo().map((m) => [m.competencia, m.valor, m.valorPrevisto, m.pagoEm])).toEqual([
      ["2026-10", 18000, 18000, "2026-10-10"],
      ["2026-11", 19240, 18000, null],
      ["2027-02", 18000, 18000, null],
    ]);
  });

  it("não alcança ocorrência de outro fixo", async () => {
    const { fakes, fixo, outro } = await cenario();
    const antes = [...fakes.estado.movimentos.values()].filter((m) => m.recorrenciaId === outro.id);

    await fakes.movimentos.atualizarOcorrenciasDaSerie(fixo.id, CAMPOS);

    expect(
      [...fakes.estado.movimentos.values()].filter((m) => m.recorrenciaId === outro.id),
    ).toEqual(antes);
  });
});
