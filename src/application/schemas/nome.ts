import { z } from "zod";

/**
 * O nome de um cadastro — categoria, meio de pagamento e, adiante, pessoa.
 *
 * Existe em arquivo próprio porque a **normalização precisa ser a mesma** nos
 * três. Colapsar espaço interno não é preciosismo: `"Casa  e  jardim"` e
 * `"Casa e jardim"` são a mesma coisa para quem digitou, e as duas conviveriam
 * na lista sem ninguém entender por quê. O espaço duplo é invisível.
 *
 * Duas cópias desta regra divergiriam na primeira vez que alguém ajustasse uma
 * delas — e o sintoma apareceria como "categoria duplicada" muito longe daqui.
 */

function normalizar(bruto: string): string {
  return bruto.trim().replace(/\s+/g, " ");
}

/**
 * O `trim` acontece **antes** da medição de tamanho, de propósito: `"   "`
 * precisa reprovar como vazio, e não passar como três caracteres.
 */
export function criarNomeSchema(maximo: number, mensagemVazio: string) {
  return z
    .string(mensagemVazio)
    .transform(normalizar)
    .pipe(
      z
        .string()
        .min(1, mensagemVazio)
        .max(maximo, `O nome pode ter no máximo ${maximo} caracteres.`),
    );
}
