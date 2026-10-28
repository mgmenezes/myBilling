import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Cents, Competencia } from "@/domain";
import { ocorrenciaProtegida } from "@/domain";
import { type BancoDeDados, criarCliente, criarPool } from "../client";
import {
  type CadastroBase,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
  URL_BANCO_DE_TESTE,
} from "../testing/banco-de-teste";
import { MovimentoRepositoryDrizzle } from "./movimento.repository";
import { RecorrenciaRepositoryDrizzle } from "./recorrencia.repository";

/**
 * As duas escritas que a materialização precisa, contra Postgres real.
 *
 * A primeira depende de um índice único para ser idempotente; a segunda depende
 * de um `WHERE` para não apagar o que a pessoa digitou. Nenhuma das duas é
 * demonstrável com fake: uma exige a restrição do banco, a outra exige que o
 * filtro seja o mesmo que o domínio define.
 */

const c = (t: string) => t as Competencia;

let pool: Pool;
let db: BancoDeDados;
let base: CadastroBase;
let repo: MovimentoRepositoryDrizzle;
let recorrenciaId: string;

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
  repo = new MovimentoRepositoryDrizzle(db);
  const criada = await new RecorrenciaRepositoryDrizzle(db).criar({
    dados: {
      descricao: "Conta fixa A",
      natureza: "DESPESA",
      categoriaId: base.categoriaId,
      usuarioId: base.usuarioId,
      meioPagamentoId: base.contaId,
      competenciaInicio: c("2026-03"),
      competenciaFim: null,
      diaVencimento: 10,
    },
    valorInicial: 18000 as Cents,
  });
  recorrenciaId = criada.id;
});

function ocorrencia(competencia: string, valorPrevisto = 18000) {
  return {
    recorrenciaId,
    natureza: "DESPESA" as const,
    descricao: "Conta fixa A",
    competencia: c(competencia),
    dataEvento: `${competencia}-10`,
    valorPrevisto: valorPrevisto as Cents,
    categoriaId: base.categoriaId,
    usuarioId: base.usuarioId,
    meioPagamentoId: base.contaId,
  };
}

async function linhas(): Promise<
  Array<{ competencia: string; valor: number; previsto: number | null; pago: string | null }>
> {
  const { rows } = await pool.query<{
    competencia: string;
    valor_centavos: string;
    valor_previsto_centavos: string | null;
    pago_em: string | null;
  }>(
    `SELECT competencia::text, valor_centavos::text, valor_previsto_centavos::text, pago_em::text
     FROM movimento WHERE recorrencia_id IS NOT NULL ORDER BY competencia`,
  );
  return rows.map((r) => ({
    competencia: r.competencia,
    valor: Number(r.valor_centavos),
    previsto: r.valor_previsto_centavos === null ? null : Number(r.valor_previsto_centavos),
    pago: r.pago_em,
  }));
}

describe("materializar ocorrências (FIXO-02, AC 1 e 2)", () => {
  it("cria uma ocorrência por competência", async () => {
    const criadas = await repo.materializarOcorrencias([
      ocorrencia("2026-03"),
      ocorrencia("2026-04"),
    ]);

    expect(criadas).toBe(2);
    expect((await linhas()).map((l) => l.competencia)).toEqual(["2026-03-01", "2026-04-01"]);
  });

  it("materializar a mesma competência de novo não duplica nem lança", async () => {
    await repo.materializarOcorrencias([ocorrencia("2026-03")]);

    const criadas = await repo.materializarOcorrencias([ocorrencia("2026-03")]);

    expect(criadas).toBe(0);
    expect(await linhas()).toHaveLength(1);
  });

  it("o mesmo lote repetido dentro de uma chamada também não duplica", async () => {
    const criadas = await repo.materializarOcorrencias([
      ocorrencia("2026-03"),
      ocorrencia("2026-03"),
    ]);

    expect(criadas).toBe(1);
    expect(await linhas()).toHaveLength(1);
  });

  it("duas materializações concorrentes não falham por conflito", async () => {
    const lote = [ocorrencia("2026-03"), ocorrencia("2026-04"), ocorrencia("2026-05")];

    await Promise.all([
      repo.materializarOcorrencias(lote),
      repo.materializarOcorrencias(lote),
      repo.materializarOcorrencias(lote),
    ]);

    expect(await linhas()).toHaveLength(3);
  });

  it("grava o previsto igual ao valor, e não pago", async () => {
    await repo.materializarOcorrencias([ocorrencia("2026-03", 18734)]);

    expect(await linhas()).toEqual([
      { competencia: "2026-03-01", valor: 18734, previsto: 18734, pago: null },
    ]);
  });

  it("lote vazio não faz nada e não lança", async () => {
    expect(await repo.materializarOcorrencias([])).toBe(0);
  });
});

describe("atualizar o previsto do que não está protegido (FIXO-03, AC 3)", () => {
  beforeEach(async () => {
    await repo.materializarOcorrencias([
      ocorrencia("2026-03"),
      ocorrencia("2026-04"),
      ocorrencia("2026-05"),
      ocorrencia("2026-06"),
    ]);
  });

  it("altera da vigência em diante e não toca no que veio antes", async () => {
    await repo.atualizarPrevistoNaoProtegido(recorrenciaId, c("2026-05"), 24000 as Cents);

    expect((await linhas()).map((l) => [l.competencia, l.valor])).toEqual([
      ["2026-03-01", 18000],
      ["2026-04-01", 18000],
      ["2026-05-01", 24000],
      ["2026-06-01", 24000],
    ]);
  });

  it("não altera ocorrência paga", async () => {
    const { rows } = await pool.query<{ id: string }>(
      "SELECT id FROM movimento WHERE competencia = '2026-05-01'",
    );
    await repo.marcarPagamento(rows[0]?.id ?? "", "2026-05-10");

    await repo.atualizarPrevistoNaoProtegido(recorrenciaId, c("2026-05"), 24000 as Cents);

    const maio = (await linhas()).find((l) => l.competencia === "2026-05-01");
    expect(maio?.valor).toBe(18000);
  });

  it("não altera ocorrência com valor já confirmado", async () => {
    await pool.query(
      "UPDATE movimento SET valor_centavos = 19240 WHERE competencia = '2026-06-01'",
    );

    await repo.atualizarPrevistoNaoProtegido(recorrenciaId, c("2026-05"), 24000 as Cents);

    const junho = (await linhas()).find((l) => l.competencia === "2026-06-01");
    expect(junho?.valor).toBe(19240);
    expect(junho?.previsto).toBe(18000);
  });

  it("não alcança ocorrência de outra recorrência", async () => {
    const outra = await new RecorrenciaRepositoryDrizzle(db).criar({
      dados: {
        descricao: "Conta fixa B",
        natureza: "DESPESA",
        categoriaId: base.categoriaId,
        usuarioId: base.usuarioId,
        meioPagamentoId: base.contaId,
        competenciaInicio: c("2026-03"),
        competenciaFim: null,
        diaVencimento: 20,
      },
      valorInicial: 12456 as Cents,
    });
    await repo.materializarOcorrencias([
      { ...ocorrencia("2026-05", 12456), recorrenciaId: outra.id },
    ]);

    await repo.atualizarPrevistoNaoProtegido(recorrenciaId, c("2026-03"), 24000 as Cents);

    const { rows } = await pool.query<{ valor_centavos: string }>(
      "SELECT valor_centavos::text FROM movimento WHERE recorrencia_id = $1",
      [outra.id],
    );
    expect(Number(rows[0]?.valor_centavos)).toBe(12456);
  });
});

/**
 * **O teste que impede o SQL e o domínio de divergirem.**
 *
 * `ocorrenciaProtegida` define o conceito; o `WHERE` do `UPDATE` o implementa.
 * Sem este teste a função pura seria domínio sem chamador, e o filtro do SQL
 * poderia ser afrouxado numa revisão sem ninguém perceber que a definição
 * mudou junto. Aqui os mesmos casos passam pelos dois caminhos e precisam
 * concordar.
 */
describe("concordância entre `ocorrenciaProtegida` e o WHERE do UPDATE", () => {
  const CASOS = [
    { nome: "não paga, valor igual ao previsto", pagoEm: null, valor: 18000 },
    { nome: "não paga, valor confirmado acima", pagoEm: null, valor: 19240 },
    { nome: "não paga, valor confirmado abaixo", pagoEm: null, valor: 17510 },
    { nome: "paga, valor igual ao previsto", pagoEm: "2026-03-10", valor: 18000 },
    { nome: "paga, valor confirmado", pagoEm: "2026-03-10", valor: 19240 },
  ];

  it.each(CASOS)("$nome: o SQL decide igual ao domínio", async (caso) => {
    await repo.materializarOcorrencias([ocorrencia("2026-03")]);
    await pool.query("UPDATE movimento SET valor_centavos = $1, pago_em = $2", [
      caso.valor,
      caso.pagoEm,
    ]);

    const protegidaPeloDominio = ocorrenciaProtegida({
      pagoEm: caso.pagoEm,
      valor: caso.valor as Cents,
      valorPrevisto: 18000 as Cents,
    });

    await repo.atualizarPrevistoNaoProtegido(recorrenciaId, c("2026-03"), 99999 as Cents);

    const depois = (await linhas())[0];
    const oSqlProtegeu = depois?.valor !== 99999;
    expect(oSqlProtegeu).toBe(protegidaPeloDominio);
  });
});

describe("confirmar o valor real (FIXO-04)", () => {
  beforeEach(async () => {
    await repo.materializarOcorrencias([ocorrencia("2026-03"), ocorrencia("2026-04")]);
  });

  async function idDe(competencia: string): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      "SELECT id FROM movimento WHERE competencia = $1::date",
      [`${competencia}-01`],
    );
    return rows[0]?.id ?? "";
  }

  it("altera o valor e preserva o previsto (FIXO-04, AC 1)", async () => {
    await repo.confirmarValorReal(await idDe("2026-03"), 19240 as Cents);

    const marco = (await linhas()).find((l) => l.competencia === "2026-03-01");
    expect(marco?.valor).toBe(19240);
    expect(marco?.previsto).toBe(18000);
  });

  it("não altera nenhuma outra competência (FIXO-04, AC 2)", async () => {
    await repo.confirmarValorReal(await idDe("2026-03"), 19240 as Cents);

    const abril = (await linhas()).find((l) => l.competencia === "2026-04-01");
    expect(abril?.valor).toBe(18000);
  });

  it("confirmar não marca como pago: são gestos diferentes", async () => {
    await repo.confirmarValorReal(await idDe("2026-03"), 19240 as Cents);

    const marco = (await linhas()).find((l) => l.competencia === "2026-03-01");
    expect(marco?.pago).toBeNull();
  });

  it("confirmar de novo sobrescreve, e o previsto continua o original", async () => {
    const id = await idDe("2026-03");
    await repo.confirmarValorReal(id, 19240 as Cents);
    await repo.confirmarValorReal(id, 17510 as Cents);

    const marco = (await linhas()).find((l) => l.competencia === "2026-03-01");
    expect(marco?.valor).toBe(17510);
    expect(marco?.previsto).toBe(18000);
  });

  it("uma vez confirmada, a ocorrência fica protegida da propagação", async () => {
    await repo.confirmarValorReal(await idDe("2026-03"), 19240 as Cents);

    await repo.atualizarPrevistoNaoProtegido(recorrenciaId, c("2026-03"), 24000 as Cents);

    const marco = (await linhas()).find((l) => l.competencia === "2026-03-01");
    expect(marco?.valor).toBe(19240);
  });
});

describe("remover ocorrências não pagas (FIXO-06, AC 2)", () => {
  beforeEach(async () => {
    await repo.materializarOcorrencias([
      ocorrencia("2026-03"),
      ocorrencia("2026-04"),
      ocorrencia("2026-05"),
      ocorrencia("2026-06"),
    ]);
  });

  it("apaga da competência em diante e preserva o que veio antes", async () => {
    await repo.removerNaoPagasDaRecorrencia(recorrenciaId, c("2026-05"));

    expect((await linhas()).map((l) => l.competencia)).toEqual(["2026-03-01", "2026-04-01"]);
  });

  it("preserva a paga, mesmo dentro da faixa removida", async () => {
    const { rows } = await pool.query<{ id: string }>(
      "SELECT id FROM movimento WHERE competencia = '2026-06-01'",
    );
    await repo.marcarPagamento(rows[0]?.id ?? "", "2026-06-10");

    await repo.removerNaoPagasDaRecorrencia(recorrenciaId, c("2026-05"));

    expect((await linhas()).map((l) => l.competencia)).toEqual([
      "2026-03-01",
      "2026-04-01",
      "2026-06-01",
    ]);
  });

  it("não toca em ocorrência de outra recorrência", async () => {
    const outra = await new RecorrenciaRepositoryDrizzle(db).criar({
      dados: {
        descricao: "Conta fixa B",
        natureza: "DESPESA",
        categoriaId: base.categoriaId,
        usuarioId: base.usuarioId,
        meioPagamentoId: base.contaId,
        competenciaInicio: c("2026-03"),
        competenciaFim: null,
        diaVencimento: 20,
      },
      valorInicial: 12456 as Cents,
    });
    await repo.materializarOcorrencias([
      { ...ocorrencia("2026-05", 12456), recorrenciaId: outra.id },
    ]);

    await repo.removerNaoPagasDaRecorrencia(recorrenciaId, c("2026-03"));

    const { rows } = await pool.query<{ total: string }>(
      "SELECT count(*)::text AS total FROM movimento WHERE recorrencia_id = $1",
      [outra.id],
    );
    expect(rows[0]?.total).toBe("1");
  });

  it("remover onde não há nada é inofensivo", async () => {
    await repo.removerNaoPagasDaRecorrencia(recorrenciaId, c("2027-01"));

    expect(await linhas()).toHaveLength(4);
  });
});

/**
 * A edição corrige o fixo inteiro (EDF-02): os cinco campos da série chegam a
 * todas as ocorrências, passadas inclusive, e a data é recalculada com o dia
 * novo. O que a escrita **não** toca é a metade do contrato: pagamento, valor
 * confirmado e o previsto continuam como estavam.
 */
describe("atualizar as ocorrências da série (EDF-02 AC 1 a 3)", () => {
  let pessoaB: string;
  let categoriaDois: string;

  beforeEach(async () => {
    pessoaB =
      (
        await pool.query<{ id: string }>(
          "INSERT INTO usuario (nome, email) VALUES ('Pessoa B', 'pessoa-b@example.com') RETURNING id",
        )
      ).rows[0]?.id ?? "";
    categoriaDois =
      (
        await pool.query<{ id: string }>(
          "INSERT INTO categoria (nome) VALUES ('Categoria Dois') RETURNING id",
        )
      ).rows[0]?.id ?? "";
    await repo.materializarOcorrencias([
      ocorrencia("2026-10"),
      ocorrencia("2026-11"),
      ocorrencia("2026-12"),
      ocorrencia("2027-02"),
    ]);
  });

  async function idDe(competencia: string): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      "SELECT id FROM movimento WHERE recorrencia_id = $1 AND competencia = $2::date",
      [recorrenciaId, `${competencia}-01`],
    );
    return rows[0]?.id ?? "";
  }

  async function ocorrenciasDe(id: string) {
    const { rows } = await pool.query(
      `SELECT competencia::text, natureza, descricao, data_evento::text, categoria_id,
              meio_pagamento_id, usuario_id, valor_centavos::text, valor_previsto_centavos::text,
              pago_em::text, cancelado_em
       FROM movimento WHERE recorrencia_id = $1 ORDER BY competencia`,
      [id],
    );
    return rows;
  }

  function campos() {
    return {
      descricao: "Conta fixa B",
      diaVencimento: 31,
      meioPagamentoId: base.cartaoId,
      categoriaId: categoriaDois,
      usuarioId: pessoaB,
    };
  }

  it("grava os cinco campos em todas as ocorrências e devolve quantas mudaram", async () => {
    const alteradas = await repo.atualizarOcorrenciasDaSerie(recorrenciaId, campos());

    expect(alteradas).toBe(4);
    const series = (await ocorrenciasDe(recorrenciaId)).map((o) => [
      o.descricao,
      o.categoria_id,
      o.meio_pagamento_id,
      o.usuario_id,
    ]);
    expect(series).toEqual(
      Array.from({ length: 4 }, () => ["Conta fixa B", categoriaDois, base.cartaoId, pessoaB]),
    );
  });

  it("recalcula a data de cada uma com o dia novo, limitado ao fim do mês", async () => {
    await repo.atualizarOcorrenciasDaSerie(recorrenciaId, campos());

    expect((await ocorrenciasDe(recorrenciaId)).map((o) => [o.competencia, o.data_evento])).toEqual(
      [
        ["2026-10-01", "2026-10-31"],
        ["2026-11-01", "2026-11-30"],
        ["2026-12-01", "2026-12-31"],
        ["2027-02-01", "2027-02-28"],
      ],
    );
  });

  it("não toca no pagamento, no valor confirmado, no previsto nem na natureza", async () => {
    await repo.marcarPagamento(await idDe("2026-10"), "2026-10-10");
    await repo.confirmarValorReal(await idDe("2026-11"), 19240 as Cents);

    await repo.atualizarOcorrenciasDaSerie(recorrenciaId, campos());

    expect(
      (await ocorrenciasDe(recorrenciaId)).map((o) => [
        o.competencia,
        o.natureza,
        o.valor_centavos,
        o.valor_previsto_centavos,
        o.pago_em,
        o.cancelado_em,
      ]),
    ).toEqual([
      ["2026-10-01", "DESPESA", "18000", "18000", "2026-10-10", null],
      ["2026-11-01", "DESPESA", "19240", "18000", null, null],
      ["2026-12-01", "DESPESA", "18000", "18000", null, null],
      ["2027-02-01", "DESPESA", "18000", "18000", null, null],
    ]);
  });

  it("não alcança ocorrência de outro fixo", async () => {
    const outra = await new RecorrenciaRepositoryDrizzle(db).criar({
      dados: {
        descricao: "Conta fixa C",
        natureza: "DESPESA",
        categoriaId: base.categoriaId,
        usuarioId: base.usuarioId,
        meioPagamentoId: base.contaId,
        competenciaInicio: c("2026-03"),
        competenciaFim: null,
        diaVencimento: 20,
      },
      valorInicial: 12456 as Cents,
    });
    await repo.materializarOcorrencias([
      {
        ...ocorrencia("2026-10", 12456),
        recorrenciaId: outra.id,
        descricao: "Conta fixa C",
        dataEvento: "2026-10-20",
      },
    ]);
    const antes = await ocorrenciasDe(outra.id);

    await repo.atualizarOcorrenciasDaSerie(recorrenciaId, campos());

    expect(await ocorrenciasDe(outra.id)).toEqual(antes);
    expect(antes[0]?.descricao).toBe("Conta fixa C");
  });

  it("fixo sem ocorrência devolve zero e não lança", async () => {
    await pool.query("DELETE FROM movimento WHERE recorrencia_id = $1", [recorrenciaId]);

    expect(await repo.atualizarOcorrenciasDaSerie(recorrenciaId, campos())).toBe(0);
  });
});
