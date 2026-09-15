import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

/** Mesmo alias `@/*` do tsconfig, para que os testes resolvam como o build. */
const raizSrc = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@": raizSrc },
  },
  test: {
    alias: { "@": raizSrc },
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/domain/**/*.ts"],
      exclude: ["src/domain/**/*.test.ts"],
      thresholds: {
        branches: 100,
      },
    },
    projects: [
      {
        test: {
          name: "domain",
          environment: "node",
          // `next-auth` importa `next/server` sem extensão e o `next` não
          // declara `exports`: externalizado, o loader ESM do Node não resolve.
          // Processado pelo Vite, resolve como no build.
          server: { deps: { inline: ["next-auth", "@auth/core"] } },
          include: [
            "src/domain/**/*.test.ts",
            "src/application/**/*.test.ts",
            "src/lib/**/*.test.ts",
            "src/infrastructure/config/**/*.test.ts",
            "src/infrastructure/auth/**/*.test.ts",
            "src/proxy.test.ts",
          ],
          /*
           * `*.test.ts` também casa `*.integration.test.ts`, então dois
           * arquivos que tocam o banco entravam aqui e rodavam em paralelo —
           * este project não desliga `fileParallelism`. Os dois chamavam
           * `recriarBancoDeTeste` ao mesmo tempo e corriam no `CREATE SCHEMA
           * public`. Eles já rodam no project `integration`, que serializa os
           * arquivos de propósito (AD-010); aqui só apareciam para pular os
           * próprios testes e derrubar o schema do vizinho.
           */
          exclude: [...configDefaults.exclude, "**/*.integration.test.ts"],
        },
      },
      {
        test: {
          name: "componentes",
          environment: "jsdom",
          // `src/app/**` também entra aqui: `loading.tsx` e `error.tsx` são
          // componentes de verdade, e fora de um project nenhum teste deles
          // roda — a suíte passaria com os dois arquivos vazios.
          include: ["src/components/**/*.test.tsx", "src/app/**/*.test.tsx"],
        },
      },
      {
        test: {
          name: "integration",
          environment: "node",
          server: { deps: { inline: ["next-auth", "@auth/core"] } },
          include: ["**/*.integration.test.ts"],
          // Um único Postgres em Docker atende toda a suíte: arquivos em
          // paralelo derrubariam o schema uns dos outros (AD-010).
          fileParallelism: false,
          testTimeout: 20_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
