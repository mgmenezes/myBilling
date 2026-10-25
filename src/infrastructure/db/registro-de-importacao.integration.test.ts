import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TABELAS } from "./limpar";
import {
  type CadastroBase,
  criarPoolDeTeste,
  limparDados,
  listarTabelas,
  recriarBancoDeTeste,
  semearCadastroBase,
} from "./testing/banco-de-teste";

/**
 * O registro da importação: `importacao` e `importacao_decisao` (design,
 * Decisão 5). As duas restrições que mais importam vivem no banco, e não só
 * na aplicação:
 *
 * - `competencia` única é a base de IMP-02 AC 7: duas gravações do mesmo mês
 *   ao mesmo tempo, e só uma pode ficar.
 * - `(tipo, nome_normalizado)` único é o que torna a decisão lembrada uma só
 *   por nome (IMP-04 AC 4); o upsert de T14 depende dele.
 *
 * Como em `restricoes.integration.test.ts`, cada recusa afirma o código do
 * Postgres **e** o nome da restrição: "deu erro" sozinho passaria também com
 * um INSERT digitado errado. `23505` = unicidade, `23514` = CHECK.
 */

interface ErroPostgres {
  readonly code: string;
  readonly constraint?: string;
}

async function capturarErro(acao: () => Promise<unknown>): Promise<ErroPostgres> {
  try {
    await acao();
  } catch (erro) {
    return erro as ErroPostgres;
  }
  throw new Error("o banco aceitou um dado que deveria ter sido rejeitado");
}

let pool: Pool;
let base: CadastroBase;

beforeAll(async () => {
  pool = criarPoolDeTeste();
  await recriarBancoDeTeste(pool);
}, 60_000);

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await limparDados(pool);
  base = await semearCadastroBase(pool);
});

function registrarImportacao(competencia: string) {
  return pool.query(
    "INSERT INTO importacao (competencia, nome_arquivo, usuario_id) VALUES ($1, $2, $3)",
    [competencia, "Planilha 2026 - Outubro.csv", base.usuarioId],
  );
}

function registrarDecisao(tipo: "MEIO" | "ENTRADA", nome: string, classe: string | null) {
  return pool.query(
    `INSERT INTO importacao_decisao (tipo, nome_normalizado, meio_pagamento_id, classe)
     VALUES ($1, $2, $3, $4)`,
    [tipo, nome, base.contaId, classe],
  );
}

async function contar(tabela: "importacao" | "importacao_decisao"): Promise<number> {
  const { rows } = await pool.query<{ total: string }>(
    `SELECT count(*)::text AS total FROM ${tabela}`,
  );
  return Number.parseInt(rows[0]?.total ?? "0", 10);
}

function tagsDoJournal(): string[] {
  const journal = JSON.parse(
    readFileSync(join(process.cwd(), "drizzle", "meta", "_journal.json"), "utf-8"),
  ) as { entries: Array<{ tag: string }> };
  return journal.entries.map((e) => e.tag);
}

describe("migration 0003 (T11)", () => {
  it("recriarBancoDeTeste aplica 0000 a 0003 num banco limpo e cria as duas tabelas", async () => {
    await recriarBancoDeTeste(pool);

    expect(tagsDoJournal()).toEqual([
      "0000_init",
      "0001_valor_previsto_positivo",
      "0002_movimento_valor_positivo",
      "0003_registro_de_importacao",
    ]);
    const { rows } = await pool.query<{ total: string }>(
      "SELECT count(*)::text AS total FROM drizzle.__drizzle_migrations",
    );
    expect(rows[0]?.total).toBe("4");
    const tabelas = await listarTabelas(pool);
    expect(tabelas).toContain("importacao");
    expect(tabelas).toContain("importacao_decisao");
  }, 60_000);
});

describe("importacao: uma por competência (T11, base de IMP-02 AC 7)", () => {
  it("recusa a segunda importação da mesma competência", async () => {
    await registrarImportacao("2026-10-01");

    const erro = await capturarErro(() => registrarImportacao("2026-10-01"));

    expect(erro.code).toBe("23505");
    expect(erro.constraint).toBe("importacao_competencia_unique");
  });

  it("recusa competência fora do dia 1 (AD-002)", async () => {
    const erro = await capturarErro(() => registrarImportacao("2026-10-15"));

    expect(erro.code).toBe("23514");
    expect(erro.constraint).toBe("importacao_competencia_dia_1");
  });
});

describe("importacao_decisao: classe só em entrada, uma por nome (T11, IMP-04)", () => {
  it("recusa entrada sem classe", async () => {
    const erro = await capturarErro(() => registrarDecisao("ENTRADA", "salário a", null));

    expect(erro.code).toBe("23514");
    expect(erro.constraint).toBe("importacao_decisao_classe_sse_entrada");
  });

  it("recusa meio com classe", async () => {
    const erro = await capturarErro(() => registrarDecisao("MEIO", "débito", "FIXA"));

    expect(erro.code).toBe("23514");
    expect(erro.constraint).toBe("importacao_decisao_classe_sse_entrada");
  });

  it("recusa a segunda decisão com o mesmo tipo e nome, e aceita o mesmo nome no outro tipo", async () => {
    await registrarDecisao("MEIO", "cartão roxo", null);

    const erro = await capturarErro(() => registrarDecisao("MEIO", "cartão roxo", null));

    expect(erro.code).toBe("23505");
    expect(erro.constraint).toBe("importacao_decisao_unica");
    await registrarDecisao("ENTRADA", "cartão roxo", "AVULSA");
    expect(await contar("importacao_decisao")).toBe(2);
  });
});

describe("limparDados (T11)", () => {
  it("lista as duas tabelas novas no começo, filhas antes das mães", () => {
    // O `CASCADE` do TRUNCATE já as esvaziaria pela FK de `usuario`; é a lista
    // escrita certa que faz uma tabela esquecida falhar alto (limpar.ts).
    expect(TABELAS.slice(0, 2)).toEqual(["importacao_decisao", "importacao"]);
  });

  it("esvazia as duas tabelas novas", async () => {
    await registrarImportacao("2026-10-01");
    await registrarDecisao("MEIO", "débito", null);
    await registrarDecisao("ENTRADA", "salário a", "FIXA");

    await limparDados(pool);

    expect(await contar("importacao")).toBe(0);
    expect(await contar("importacao_decisao")).toBe(0);
  });
});

describe("pnpm db:sql (T11)", () => {
  it("imprime o bloco com a migration nova, que aplica num banco vazio com veredito TUDO OK", async () => {
    const bloco = execFileSync(
      join(process.cwd(), "node_modules", ".bin", "tsx"),
      [join("src", "infrastructure", "db", "migrations-sql.cli.ts")],
      { encoding: "utf-8" },
    );
    expect(bloco).toContain("-- 0003_registro_de_importacao");
    expect(bloco).toMatch(/AS veredito;/);

    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS public CASCADE");
    await pool.query("CREATE SCHEMA public");
    try {
      const resultados = (await pool.query(bloco)) as unknown as Array<{
        rows: Array<Record<string, unknown>>;
      }>;
      const conferencia = resultados.at(-1)?.rows[0];

      expect(conferencia).toMatchObject({ tabelas: "12", migrations: "4", veredito: "TUDO OK" });
    } finally {
      await recriarBancoDeTeste(pool);
    }
  }, 60_000);
});
