/**
 * Carrega `.env.local` para ferramentas de linha de comando.
 *
 * O Next carrega `.env.local` sozinho; `drizzle-kit` e os scripts `tsx` não.
 * Sem isto, `pnpm db:migrate` e `pnpm db:seed` falham por `DATABASE_URL`
 * indefinida mesmo com o arquivo preenchido — que foi exatamente o que
 * aconteceu na primeira execução real do projeto.
 *
 * Silencioso quando o arquivo não existe: em CI e em produção as variáveis
 * vêm do ambiente, e exigir um arquivo ali quebraria o deploy. O que **não**
 * é silencioso é a variável faltar depois disto — quem reclama é
 * `carregarEnv`, com o nome da chave ausente.
 *
 * Nunca sobrescreve variável já definida no ambiente: `DATABASE_URL=... pnpm
 * db:migrate` continua mandando no arquivo, que é o que se espera de uma
 * sobrescrita explícita.
 */
export function carregarEnvLocal(caminho = ".env.local"): boolean {
  try {
    process.loadEnvFile(caminho);
    return true;
  } catch {
    return false;
  }
}
