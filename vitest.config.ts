import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

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
          include: [
            "src/domain/**/*.test.ts",
            "src/application/**/*.test.ts",
            "src/lib/**/*.test.ts",
            "src/infrastructure/config/**/*.test.ts",
          ],
        },
      },
      {
        test: {
          name: "integration",
          environment: "node",
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
