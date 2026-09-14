import { addMeses, type Competencia, criarCompetencia, dataParaCompetencia } from "@/domain";
import { carregarEnvLocal } from "../config/env-local";
import { criarCliente, criarPool } from "./client";
import { limparDados } from "./limpar";
import { MESES_DE_AVULSOS, semear } from "./seed";

// `tsx` não carrega `.env.local`; só o Next faz isso.
carregarEnvLocal();

/**
 * Entrada de linha de comando do seed.
 *
 * ```
 * pnpm db:seed [--semente=<n>] [--base=YYYY-MM] [--manter]
 * ```
 *
 * Lê `DATABASE_URL` e nada mais, em vez de passar pela configuração completa
 * da aplicação: popular um banco não precisa de segredo de OAuth nem de
 * allowlist, e exigi-los travaria a ferramenta por um motivo inexistente.
 *
 * **É aqui que o relógio entra.** `semear` recebe a competência-base pronta;
 * quem a calcula é esta CLI, que é o único lugar da cadeia autorizado a saber
 * que dia é hoje (AD-002, AD-006). O fuso é explícito, nunca o da máquina.
 *
 * **Limpa antes de semear, por padrão.** Rodar o seed duas vezes batia na
 * chave única de e-mail e exigia derrubar o banco inteiro. Semear é uma
 * operação de ambiente de desenvolvimento: idempotente é o comportamento
 * esperado, e `--manter` fica para quem quiser somar ao que já existe.
 */
const FUSO = "America/Sao_Paulo";

/**
 * Onde o seed começa, relativo ao mês corrente.
 *
 * Dois meses atrás, e não o mês corrente: assim o app abre com passado para
 * comparar e não só com o presente. Com `MESES_DE_AVULSOS` meses a partir daí,
 * a cobertura vai de dois meses atrás até três à frente — exatamente o alcance
 * da régua de comprometimento futuro.
 */
const MESES_DE_PASSADO = 2;

function argumento(nome: string): string | undefined {
  const prefixo = `--${nome}=`;
  return process.argv
    .slice(2)
    .find((a) => a.startsWith(prefixo))
    ?.slice(prefixo.length);
}

function competenciaCorrente(): Competencia {
  const corrente = dataParaCompetencia(new Date().toISOString(), FUSO);
  if (!corrente.ok) {
    throw new Error("não foi possível resolver a competência corrente");
  }
  return corrente.value;
}

function baseInformada(corrente: Competencia): string {
  const explicita = argumento("base");
  if (explicita === undefined) {
    return addMeses(corrente, -MESES_DE_PASSADO);
  }
  const validada = criarCompetencia(explicita);
  if (!validada.ok) {
    throw new Error(`--base precisa ser 'YYYY-MM'; recebi '${explicita}'.`);
  }
  return validada.value;
}

async function principal(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    throw new Error("DATABASE_URL é obrigatória para semear o banco.");
  }

  const bruto = argumento("semente");
  const semente = bruto === undefined ? undefined : Number(bruto);
  if (semente !== undefined && !Number.isFinite(semente)) {
    throw new Error(`--semente precisa ser um número; recebi '${bruto}'.`);
  }
  const corrente = competenciaCorrente();
  const base = baseInformada(corrente);

  const pool = criarPool(url);
  try {
    if (!process.argv.includes("--manter")) {
      await limparDados(pool);
    }
    const resultado = await semear(criarCliente(pool), semente, base, corrente);
    process.stdout.write(
      `${JSON.stringify({ ...resultado, mesesCobertos: MESES_DE_AVULSOS }, null, 2)}\n`,
    );
  } finally {
    await pool.end();
  }
}

principal().catch((erro: unknown) => {
  process.stderr.write(`${erro instanceof Error ? erro.message : String(erro)}\n`);
  process.exitCode = 1;
});
