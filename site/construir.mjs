import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

/**
 * Gera `site/simulador.js` a partir de `site/fonte/simulador.ts` (JANO-05).
 *
 * O pacote vai versionado porque o projeto da landing na Vercel publica a
 * pasta `site/` como está, sem build (`site/README.md`). O teste
 * `site/simulador.test.mjs` reconstrói em memória com estas mesmas opções e
 * reprova se o arquivo versionado ficou para trás do código do app.
 *
 * Script clássico (IIFE), e não módulo: o Chrome bloqueia script de módulo em
 * `file://`, que é como o verificador e o README abrem a página.
 *
 * Uso: `pnpm site:construir`.
 */

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");

export const BANNER =
  "// Gerado por `pnpm site:construir` a partir de site/fonte/simulador.ts. Não edite à mão.";

export const OPCOES = {
  absWorkingDir: RAIZ,
  entryPoints: ["site/fonte/simulador.ts"],
  outfile: "site/simulador.js",
  bundle: true,
  format: "iife",
  globalName: "SimuladorDaLanding",
  platform: "browser",
  target: ["es2020"],
  tsconfig: "tsconfig.json",
  charset: "utf8",
  legalComments: "none",
  banner: { js: BANNER },
  logLevel: "silent",
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await build({ ...OPCOES, write: true });
  console.log("gravado site/simulador.js");
}
