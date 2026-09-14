import { describe, expect, it } from "vitest";
import type { Cents, Competencia } from "@/domain";
import { criarEstadoEmMemoria, FakeRecorrenciaRepository } from "./fakes";

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
