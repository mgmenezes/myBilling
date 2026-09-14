import { z } from "zod";

const schemaEnv = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(1),
  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),
  EMAILS_PERMITIDOS: z.string().min(1),
});

export type EnvValidado = z.infer<typeof schemaEnv>;

/** Chaves obrigatórias declaradas no schema de ambiente. */
export const CHAVES_ENV = schemaEnv.keyof().options;

/**
 * Valida a fonte de variáveis de ambiente recebida como parâmetro.
 * Lança erro explícito nomeando a(s) chave(s) ausente(s) ou vazia(s),
 * em vez de deixar o processo iniciar com valor indefinido.
 */
export function carregarEnv(fonte: Record<string, string | undefined>): EnvValidado {
  const resultado = schemaEnv.safeParse(fonte);
  if (!resultado.success) {
    const chavesFaltando = [
      ...new Set(resultado.error.issues.map((issue) => String(issue.path[0]))),
    ];
    throw new Error(
      `Configuração de ambiente inválida: chave(s) ausente(s) ou vazia(s): ${chavesFaltando.join(", ")}`,
    );
  }
  return resultado.data;
}

let envValidadoCache: EnvValidado | undefined;

/**
 * Configuração de ambiente avaliada a partir de `process.env`, de forma
 * lazy: só é validada (e só pode lançar) no primeiro acesso a uma
 * propriedade, nunca na importação do módulo.
 */
export const env: EnvValidado = new Proxy({} as EnvValidado, {
  get(_target, prop: string) {
    if (!envValidadoCache) {
      envValidadoCache = carregarEnv(process.env);
    }
    return envValidadoCache[prop as keyof EnvValidado];
  },
});
