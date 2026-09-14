import { criarCliente, criarPool } from "./client";
import { semear } from "./seed";

/**
 * Entrada de linha de comando do seed (`pnpm db:seed [semente]`).
 *
 * Lê `DATABASE_URL` e nada mais, em vez de passar pela configuração completa
 * da aplicação: popular um banco não precisa de segredo de OAuth nem de
 * allowlist, e exigi-los travaria a ferramenta por um motivo inexistente.
 */
async function principal(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    throw new Error("DATABASE_URL é obrigatória para semear o banco.");
  }
  const pool = criarPool(url);
  try {
    const argumento = process.argv[2];
    const resultado = await semear(
      criarCliente(pool),
      argumento === undefined ? undefined : Number(argumento),
    );
    process.stdout.write(`${JSON.stringify(resultado, null, 2)}\n`);
  } finally {
    await pool.end();
  }
}

principal().catch((erro: unknown) => {
  process.stderr.write(`${erro instanceof Error ? erro.message : String(erro)}\n`);
  process.exitCode = 1;
});
