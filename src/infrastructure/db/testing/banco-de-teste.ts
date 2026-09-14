import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

export { limparDados } from "../limpar";

/**
 * Harness dos testes de integração. Postgres real em Docker (AD-010):
 * SQLite em memória é proibido, porque `CHECK` condicional, índice parcial
 * e tipo `date` divergem de dialeto e fariam a suíte passar exatamente onde
 * a confiança importa.
 *
 * A URL abaixo é de desenvolvimento local, igual em qualquer máquina — não
 * é credencial (AD-009). O contêiner vem de `pnpm db:up`.
 */
export const URL_BANCO_DE_TESTE =
  process.env.DATABASE_URL_TEST ?? "postgres://mybilling:mybilling@localhost:5433/mybilling_test";

export function criarPoolDeTeste(): Pool {
  return new Pool({ connectionString: URL_BANCO_DE_TESTE, max: 4 });
}

/**
 * Derruba o schema inteiro e reaplica as migrations do zero. É esta função
 * que prova, a cada execução da suíte, que `drizzle/*.sql` aplica num banco
 * limpo sem erro.
 */
export async function recriarBancoDeTeste(pool: Pool): Promise<void> {
  await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
  await pool.query("DROP SCHEMA IF EXISTS public CASCADE");
  await pool.query("CREATE SCHEMA public");
  await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
}

export async function listarTabelas(pool: Pool): Promise<string[]> {
  const { rows } = await pool.query<{ table_name: string }>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
  );
  return rows.map((r) => r.table_name);
}

export interface CadastroBase {
  readonly usuarioId: string;
  readonly cartaoId: string;
  readonly contaId: string;
  readonly categoriaId: string;
}

/**
 * Cadastros mínimos para satisfazer as chaves estrangeiras. Nomes genéricos
 * e valores escolhidos por propriedade matemática, nunca por realismo
 * (AD-009).
 */
export async function semearCadastroBase(pool: Pool): Promise<CadastroBase> {
  const usuario = await pool.query<{ id: string }>(
    "INSERT INTO usuario (nome, email) VALUES ($1, $2) RETURNING id",
    ["Pessoa A", "pessoa-a@example.com"],
  );
  const cartao = await pool.query<{ id: string }>(
    `INSERT INTO meio_pagamento (nome, tipo, gera_fatura, dia_fechamento, dia_vencimento)
     VALUES ($1, 'CARTAO_CREDITO', true, 25, 5) RETURNING id`,
    ["Cartão Roxo"],
  );
  const conta = await pool.query<{ id: string }>(
    `INSERT INTO meio_pagamento (nome, tipo, gera_fatura) VALUES ($1, 'CONTA_CORRENTE', false) RETURNING id`,
    ["Conta Corrente"],
  );
  const categoria = await pool.query<{ id: string }>(
    "INSERT INTO categoria (nome) VALUES ($1) RETURNING id",
    ["Categoria Um"],
  );
  const primeiro = (r: { rows: Array<{ id: string }> }): string => {
    const linha = r.rows[0];
    if (!linha) {
      throw new Error("INSERT ... RETURNING id não devolveu linha");
    }
    return linha.id;
  };
  return {
    usuarioId: primeiro(usuario),
    cartaoId: primeiro(cartao),
    contaId: primeiro(conta),
    categoriaId: primeiro(categoria),
  };
}
