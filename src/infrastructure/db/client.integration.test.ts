import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarCliente, criarPool, db, encerrarDb, exigirSslForaDeDesenvolvimento } from "./client";
import { URL_BANCO_DE_TESTE } from "./testing/banco-de-teste";

/** Valores de preenchimento para as chaves que `env` exige e que este teste
 * não usa. Não são credenciais: nada aqui autentica em lugar nenhum. */
const PREENCHIMENTO = {
  AUTH_SECRET: "valor-de-teste",
  AUTH_GOOGLE_ID: "valor-de-teste",
  AUTH_GOOGLE_SECRET: "valor-de-teste",
  EMAILS_PERMITIDOS: "pessoa-a@example.com",
};

let pool: Pool;

beforeAll(() => {
  process.env.DATABASE_URL = URL_BANCO_DE_TESTE;
  for (const [chave, valor] of Object.entries(PREENCHIMENTO)) {
    process.env[chave] = valor;
  }
  pool = criarPool(URL_BANCO_DE_TESTE);
});

afterAll(async () => {
  await pool.end();
  await encerrarDb();
});

describe("cliente de conexão (T30, DADO-02)", () => {
  it("abre conexão e executa SELECT 1", async () => {
    const cliente = criarCliente(pool);

    const resultado = await cliente.execute(sql`select 1 as um`);

    expect(resultado.rows[0]).toEqual({ um: 1 });
  });

  it("o cliente da aplicação lê a DATABASE_URL da configuração validada e consulta", async () => {
    const resultado = await db().execute(sql`select 1 as um`);

    expect(resultado.rows[0]).toEqual({ um: 1 });
  });

  it("não lê process.env: a única fonte da conexão é env de T4", () => {
    const fonte = readFileSync(join(process.cwd(), "src/infrastructure/db/client.ts"), "utf-8");
    const codigo = fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

    expect(codigo).not.toMatch(/process\.env/);
    expect(codigo).toMatch(/env\.DATABASE_URL/);
  });
});

describe("sslmode exigido fora de desenvolvimento (AUTH-02)", () => {
  it("aceita host local sem sslmode", () => {
    expect(() =>
      exigirSslForaDeDesenvolvimento("postgres://u:s@localhost:5433/mybilling_test"),
    ).not.toThrow();
  });

  it("aceita host remoto com sslmode=require", () => {
    expect(() =>
      exigirSslForaDeDesenvolvimento("postgres://u:s@db.example.com/mybilling?sslmode=require"),
    ).not.toThrow();
  });

  it("rejeita host remoto sem sslmode=require", () => {
    expect(() => exigirSslForaDeDesenvolvimento("postgres://u:s@db.example.com/mybilling")).toThrow(
      /sslmode=require/,
    );
  });

  it("a mensagem de erro nomeia o host e não vaza a senha", () => {
    let mensagem = "";
    try {
      exigirSslForaDeDesenvolvimento("postgres://pessoa-a:senha-secreta@db.example.com/mybilling");
    } catch (erro) {
      mensagem = (erro as Error).message;
    }

    expect(mensagem).toContain("db.example.com");
    expect(mensagem).not.toContain("senha-secreta");
    expect(mensagem).not.toContain("pessoa-a");
  });
});
