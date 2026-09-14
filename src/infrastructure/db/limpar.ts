import type { Pool } from "pg";

/**
 * Esvaziar o banco de desenvolvimento.
 *
 * A ordem da lista é a das dependências: filha antes de mãe. `CASCADE` até
 * perdoaria a ordem errada, mas escrevê-la certa é o que faz a lista falhar
 * de forma barulhenta se alguém criar uma tabela nova e esquecer de incluí-la
 * aqui — em vez de deixá-la em silêncio com dados de outra execução.
 *
 * Vive fora de `testing/` porque não é só dos testes: o `pnpm db:seed`
 * também limpa antes de semear, e duplicar esta lista seria a forma mais
 * direta de as duas divergirem.
 */
export const TABELAS = [
  "pagamento_fatura",
  "movimento",
  "fatura",
  "recorrencia_versao",
  "recorrencia",
  "compra_parcelada",
  "orcamento_categoria",
  "categoria",
  "meio_pagamento",
  "usuario",
] as const;

export async function limparDados(pool: Pool): Promise<void> {
  await pool.query(`TRUNCATE TABLE ${TABELAS.join(", ")} RESTART IDENTITY CASCADE`);
}
