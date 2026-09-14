import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Cents, Competencia } from "@/domain";
import { type BancoDeDados, criarCliente, criarPool } from "../client";
import {
  type CadastroBase,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
  URL_BANCO_DE_TESTE,
} from "../testing/banco-de-teste";
import { RecorrenciaRepositoryDrizzle } from "./recorrencia.repository";

/**
 * Os mesmos três comportamentos asserados sobre o fake em `recorrencia.fake.test.ts`,
 * agora contra Postgres real. É o par que impede o fake de virar ficção: se um
 * dia eles divergirem, os casos de uso passarão no teste e falharão em produção.
 *
 * Mais um que só existe aqui, porque só o banco real o exerce: **criar é
 * atômico**. Recorrência sem versão é um estado que não pode existir, e a
 * transação é o que garante isso.
 *
 * O `CHECK` de valor positivo em `recorrencia_versao` nasceu deste teste: sem
 * ele, `criar` não tinha como falhar na segunda inserção, e a transação era
 * proteção infalsificável — indistinguível de proteção quebrada.
 */

const c = (t: string) => t as Competencia;

let pool: Pool;
let db: BancoDeDados;
let base: CadastroBase;
let repo: RecorrenciaRepositoryDrizzle;

beforeAll(async () => {
  pool = criarPool(URL_BANCO_DE_TESTE);
  db = criarCliente(pool);
  await recriarBancoDeTeste(pool);
}, 60_000);

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await limparDados(pool);
  base = await semearCadastroBase(pool);
  repo = new RecorrenciaRepositoryDrizzle(db);
});

function dados(competenciaInicio = "2026-03") {
  return {
    descricao: "Conta fixa A",
    natureza: "DESPESA" as const,
    categoriaId: base.categoriaId,
    usuarioId: base.usuarioId,
    meioPagamentoId: base.contaId,
    competenciaInicio: c(competenciaInicio),
    competenciaFim: null,
    diaVencimento: 10,
  };
}

describe("criar recorrência", () => {
  it("grava a recorrência e a versão inicial vigente no início", async () => {
    const criada = await repo.criar({ dados: dados(), valorInicial: 18000 as Cents });

    const todas = await repo.listarComVersoes();
    expect(todas).toHaveLength(1);
    expect(todas[0]?.recorrencia.id).toBe(criada.id);
    expect(todas[0]?.recorrencia.competenciaInicio).toBe("2026-03");
    expect(todas[0]?.versoes).toEqual([{ vigenteDesde: "2026-03", valorPrevisto: 18000 }]);
  });

  it("é atômico: falha na versão não deixa recorrência órfã", async () => {
    // Valor negativo viola o CHECK de `recorrencia_versao`; a recorrência que
    // já tinha sido inserida na mesma transação precisa voltar atrás.
    await expect(repo.criar({ dados: dados(), valorInicial: -1 as Cents })).rejects.toThrow();

    expect(await repo.listarComVersoes()).toEqual([]);
  });

  it("natureza receita é preservada", async () => {
    await repo.criar({
      dados: { ...dados(), natureza: "RECEITA", descricao: "Entrada recorrente A" },
      valorInicial: 412345 as Cents,
    });

    const [primeira] = await repo.listarComVersoes();
    expect(primeira?.recorrencia.natureza).toBe("RECEITA");
  });

  it("categoria nula é aceita: receita costuma não ter categoria", async () => {
    await repo.criar({ dados: { ...dados(), categoriaId: null }, valorInicial: 18000 as Cents });

    const [primeira] = await repo.listarComVersoes();
    expect(primeira?.recorrencia.categoriaId).toBeNull();
  });
});

describe("versões", () => {
  it("saem ordenadas por vigência, não por ordem de inserção", async () => {
    const criada = await repo.criar({ dados: dados(), valorInicial: 18000 as Cents });

    await repo.registrarVersao(criada.id, c("2026-08"), 30000 as Cents);
    await repo.registrarVersao(criada.id, c("2026-05"), 24000 as Cents);

    const [primeira] = await repo.listarComVersoes();
    expect(primeira?.versoes.map((v) => v.vigenteDesde)).toEqual(["2026-03", "2026-05", "2026-08"]);
  });

  it("vigência repetida substitui o valor em vez de duplicar (FIXO-03, AC 4)", async () => {
    const criada = await repo.criar({ dados: dados(), valorInicial: 18000 as Cents });

    await repo.registrarVersao(criada.id, c("2026-05"), 24000 as Cents);
    await repo.registrarVersao(criada.id, c("2026-05"), 26000 as Cents);

    const [primeira] = await repo.listarComVersoes();
    expect(primeira?.versoes).toHaveLength(2);
    expect(primeira?.versoes[1]).toEqual({ vigenteDesde: "2026-05", valorPrevisto: 26000 });
  });

  it("uma recorrência não enxerga a versão da outra", async () => {
    const a = await repo.criar({ dados: dados(), valorInicial: 18000 as Cents });
    const b = await repo.criar({
      dados: { ...dados(), descricao: "Conta fixa B" },
      valorInicial: 12456 as Cents,
    });

    await repo.registrarVersao(a.id, c("2026-05"), 24000 as Cents);

    const todas = await repo.listarComVersoes();
    const daB = todas.find((r) => r.recorrencia.id === b.id);
    expect(daB?.versoes).toHaveLength(1);
  });
});

describe("encerrar", () => {
  it("grava o fim e o instante sem apagar a recorrência (FIXO-06, AC 3)", async () => {
    const criada = await repo.criar({ dados: dados(), valorInicial: 18000 as Cents });

    await repo.encerrar(criada.id, c("2026-06"), "2026-09-14T12:00:00.000Z");

    const [primeira] = await repo.listarComVersoes();
    expect(primeira?.recorrencia.competenciaFim).toBe("2026-06");
    expect(primeira?.recorrencia.encerradaEm).not.toBeNull();
  });

  it("não toca em outra recorrência", async () => {
    const a = await repo.criar({ dados: dados(), valorInicial: 18000 as Cents });
    await repo.criar({
      dados: { ...dados(), descricao: "Conta fixa B" },
      valorInicial: 12456 as Cents,
    });

    await repo.encerrar(a.id, c("2026-06"), "2026-09-14T12:00:00.000Z");

    const outra = (await repo.listarComVersoes()).find((r) => r.recorrencia.id !== a.id);
    expect(outra?.recorrencia.competenciaFim).toBeNull();
    expect(outra?.recorrencia.encerradaEm).toBeNull();
  });
});
