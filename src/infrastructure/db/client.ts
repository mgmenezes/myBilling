import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/infrastructure/config/env";
import * as schema from "./schema";

/**
 * Cliente Drizzle sobre node-postgres.
 *
 * Este arquivo **não lê `process.env`**. A única fonte da string de conexão é
 * `env`, de T4, que valida no primeiro acesso e encerra o processo com erro
 * explícito se faltar chave — em vez de deixar um `undefined` silencioso
 * chegar ao driver (AUTH-02, AC 5).
 *
 * Nada aqui registra a URL em log: ela carrega a senha do banco. As mensagens
 * de erro nomeiam apenas o host.
 */

export type BancoDeDados = NodePgDatabase<typeof schema>;

const HOSTS_DE_DESENVOLVIMENTO = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "db"]);

/**
 * Fora de desenvolvimento a conexão precisa ser cifrada. A regra olha o host
 * da própria URL em vez de `NODE_ENV`: um banco remoto é remoto mesmo que
 * alguém rode o build em modo de desenvolvimento.
 */
export function exigirSslForaDeDesenvolvimento(url: string): void {
  const { hostname, searchParams } = new URL(url);
  if (HOSTS_DE_DESENVOLVIMENTO.has(hostname)) {
    return;
  }
  if (searchParams.get("sslmode") !== "require") {
    throw new Error(
      `Conexão com o host remoto "${hostname}" exige sslmode=require na DATABASE_URL.`,
    );
  }
}

/**
 * Pool enxuto, adequado a função serverless: poucas conexões, ocioso curto e
 * saída permitida quando não há nada em voo — um pool grande em ambiente que
 * cria muitas instâncias esgota o limite de conexões do Postgres.
 */
export function criarPool(url: string): Pool {
  exigirSslForaDeDesenvolvimento(url);
  return new Pool({
    connectionString: url,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  });
}

export function criarCliente(pool: Pool): BancoDeDados {
  return drizzle({ client: pool, schema });
}

let poolPadrao: Pool | undefined;
let clientePadrao: BancoDeDados | undefined;

/** Cliente da aplicação, criado uma única vez a partir da configuração validada. */
export function db(): BancoDeDados {
  if (!clientePadrao) {
    poolPadrao = criarPool(env.DATABASE_URL);
    clientePadrao = criarCliente(poolPadrao);
  }
  return clientePadrao;
}

export async function encerrarDb(): Promise<void> {
  await poolPadrao?.end();
  poolPadrao = undefined;
  clientePadrao = undefined;
}
