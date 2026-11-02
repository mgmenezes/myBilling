import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { mensagemDoErro } from "./erros";

/**
 * O app se chama Jano (NOME-03). Spec: `.specs/features/renomear-jano/spec.md`.
 *
 * Varre o código-fonte do app e da landing atrás de "myBilling" nessa grafia,
 * inclusive em comentário, em todo arquivo de texto, o pacote gerado
 * `site/simulador.js` incluído. Ficam de fora, pelo nome, só os dois testes que
 * afirmam a ausência do nome e por isso precisam citá-lo. Os identificadores técnicos que continuam (banco `mybilling`, chave
 * `mybilling:tema`) são em minúscula e não casam.
 */

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PASTAS = ["src", "site"];
const EXTENSOES = /\.(ts|tsx|js|mjs|css|sql|html|svg|json|csv)$/;
/** Os testes que afirmam a ausência do nome: citá-lo é o trabalho deles. */
const FORA = new Set(["src/lib/nome-publico.test.ts", "site/estrutura.test.mjs"]);

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) {
      return nome === "imagens" ? [] : arquivos(caminho);
    }
    return EXTENSOES.test(nome) ? [caminho] : [];
  });
}

describe("o nome público é Jano (NOME-03)", () => {
  it("nenhum arquivo de texto de src/ e site/ diz myBilling, fora os dois testes que afirmam a ausência (AC 2)", () => {
    const comONomeAntigo = PASTAS.flatMap((pasta) => arquivos(join(RAIZ, pasta)))
      .map((caminho) => relative(RAIZ, caminho))
      .filter((caminho) => !FORA.has(caminho))
      .filter((caminho) => readFileSync(join(RAIZ, caminho), "utf8").includes("myBilling"));
    expect(comONomeAntigo).toEqual([]);
  });

  it("a mensagem de acesso negado diz Jano (AC 1)", () => {
    expect(mensagemDoErro("ACESSO_NEGADO")).toBe("Este e-mail não tem acesso ao Jano.");
  });
});
