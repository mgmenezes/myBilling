import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Teste de fronteira arquitetural do domínio (AD-006).
 *
 * A lista de imports proibidos NÃO é redigitada aqui: este teste lê
 * `biome.json` — o mesmo arquivo que a T2 usa para fazer `pnpm lint`
 * falhar — e reconstrói a lista de proibições a partir dos overrides de
 * `noRestrictedImports` para `src/domain/**`. Isso mantém a lista num
 * único lugar: se alguém editar biome.json, este teste acompanha.
 */

const RAIZ_DOMINIO = join(__dirname, "..");
const RAIZ_PROJETO = join(__dirname, "..", "..", "..");

type PatternGroup = { readonly group: readonly string[] };

function lerPatternsDoOverride(includesAlvo: string): readonly string[] {
  const biomeJson = JSON.parse(readFileSync(join(RAIZ_PROJETO, "biome.json"), "utf-8")) as {
    overrides: ReadonlyArray<{
      includes: readonly string[];
      linter?: {
        rules?: {
          style?: {
            noRestrictedImports?: {
              options?: { patterns?: readonly PatternGroup[] };
            };
          };
        };
      };
    }>;
  };

  const override = biomeJson.overrides.find((o) => o.includes.includes(includesAlvo));
  const patterns = override?.linter?.rules?.style?.noRestrictedImports?.options?.patterns ?? [];
  return patterns.flatMap((p) => p.group);
}

/** Lista geral: aplicada a todo arquivo de src/domain. */
const PROIBICOES_GERAIS = lerPatternsDoOverride("src/domain/**");

/** Lista para *.test.ts: sem a proibição de node:*, fs, path, crypto (T6 precisa ler o próprio fonte). */
const PROIBICOES_TESTE = lerPatternsDoOverride("src/domain/**/*.test.ts");

if (PROIBICOES_GERAIS.length === 0) {
  throw new Error(
    "Não encontrei o override 'src/domain/**' em biome.json — a lista de proibições está vazia.",
  );
}

function especificadorProibido(
  especificador: string,
  padroes: readonly string[],
): string | undefined {
  return padroes.find((padrao) => {
    if (padrao.endsWith("/*")) {
      return especificador.startsWith(padrao.slice(0, -1));
    }
    return especificador === padrao;
  });
}

function listarArquivosTs(diretorio: string): string[] {
  const entradas = readdirSync(diretorio);
  const arquivos: string[] = [];
  for (const entrada of entradas) {
    const caminho = join(diretorio, entrada);
    const info = statSync(caminho);
    if (info.isDirectory()) {
      arquivos.push(...listarArquivosTs(caminho));
    } else if (entrada.endsWith(".ts") || entrada.endsWith(".tsx")) {
      arquivos.push(caminho);
    }
  }
  return arquivos;
}

/** Casa `import ... from "x"`, `export ... from "x"`, `import "x"` e `import("x")`. */
const REGEX_IMPORT_FROM = /(?:import|export)(?:[^'";()]*?)from\s*["']([^"']+)["']/g;
const REGEX_IMPORT_LATERAL = /import\s*["']([^"']+)["']\s*;/g;
const REGEX_IMPORT_DINAMICO = /import\s*\(\s*["']([^"']+)["']\s*\)/g;

function extrairEspecificadoresDeImport(fonte: string): string[] {
  const especificadores = new Set<string>();
  for (const regex of [REGEX_IMPORT_FROM, REGEX_IMPORT_LATERAL, REGEX_IMPORT_DINAMICO]) {
    for (const match of fonte.matchAll(regex)) {
      const especificador = match[1];
      if (especificador) {
        especificadores.add(especificador);
      }
    }
  }
  return [...especificadores];
}

describe("fronteira arquitetural de src/domain (AD-006)", () => {
  const arquivos = listarArquivosTs(RAIZ_DOMINIO);

  it("encontrou ao menos um arquivo .ts para verificar", () => {
    expect(arquivos.length).toBeGreaterThan(0);
  });

  it.each(arquivos.map((caminho) => [relative(RAIZ_PROJETO, caminho), caminho] as const))(
    "%s não importa nada de fora do domínio",
    (_rotulo, caminho) => {
      const ehArquivoDeTeste = caminho.endsWith(".test.ts") || caminho.endsWith(".test.tsx");
      const proibicoes = ehArquivoDeTeste ? PROIBICOES_TESTE : PROIBICOES_GERAIS;
      const fonte = readFileSync(caminho, "utf-8");
      const especificadores = extrairEspecificadoresDeImport(fonte);

      const violacoes = especificadores
        .map((especificador) => ({
          especificador,
          padrao: especificadorProibido(especificador, proibicoes),
        }))
        .filter((v): v is { especificador: string; padrao: string } => v.padrao !== undefined);

      if (violacoes.length > 0) {
        const detalhe = violacoes
          .map((v) => `"${v.especificador}" (proibido por "${v.padrao}")`)
          .join(", ");
        throw new Error(
          `${relative(RAIZ_PROJETO, caminho)} importa de fora do domínio: ${detalhe}`,
        );
      }

      expect(violacoes).toEqual([]);
    },
  );
});
