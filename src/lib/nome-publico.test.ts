import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { mensagemDoErro } from "./erros";

/**
 * O app se chama Jano (NOME-03). Spec: `.specs/features/renomear-jano/spec.md`.
 *
 * Varre o código-fonte do app e da landing atrás de "myBilling" nessa grafia,
 * inclusive em comentário. Ficam de fora o pacote gerado `site/simulador.js`,
 * que é regenerado, e os testes que afirmam a ausência do nome, que precisam
 * citá-lo. Os identificadores técnicos que continuam (banco `mybilling`, chave
 * `mybilling:tema`) são em minúscula e não casam.
 */

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PASTAS = ["src", "site"];
const EXTENSOES = /\.(ts|tsx|css|sql|mjs|html|svg)$/;
const FORA = new Set(["site/simulador.js"]);

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
  it("nenhum código-fonte de src/ e site/ diz myBilling, fora o pacote gerado e os testes que afirmam a ausência (AC 2)", () => {
    const comONomeAntigo = PASTAS.flatMap((pasta) => arquivos(join(RAIZ, pasta)))
      .map((caminho) => relative(RAIZ, caminho))
      .filter((caminho) => !FORA.has(caminho) && !/\.test\.(ts|tsx|mjs)$/.test(caminho))
      .filter((caminho) => readFileSync(join(RAIZ, caminho), "utf8").includes("myBilling"));
    expect(comONomeAntigo).toEqual([]);
  });

  it("a mensagem de acesso negado diz Jano (AC 1)", () => {
    expect(mensagemDoErro("ACESSO_NEGADO")).toBe("Este e-mail não tem acesso ao Jano.");
  });
});
