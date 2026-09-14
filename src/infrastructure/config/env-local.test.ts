import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { carregarEnvLocal } from "./env-local";

const CHAVE = "MYBILLING_ENV_LOCAL_TESTE";
const descartaveis: string[] = [];

function arquivoEnv(conteudo: string): string {
  const dir = mkdtempSync(join(tmpdir(), "mybilling-env-"));
  descartaveis.push(dir);
  const caminho = join(dir, ".env.local");
  writeFileSync(caminho, conteudo, "utf-8");
  return caminho;
}

afterEach(() => {
  delete process.env[CHAVE];
  for (const dir of descartaveis.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("carregarEnvLocal", () => {
  it("define no ambiente as chaves do arquivo", () => {
    const caminho = arquivoEnv(`${CHAVE}=veio-do-arquivo\n`);

    expect(carregarEnvLocal(caminho)).toBe(true);
    expect(process.env[CHAVE]).toBe("veio-do-arquivo");
  });

  it("não sobrescreve variável já definida no ambiente", () => {
    process.env[CHAVE] = "veio-do-ambiente";
    const caminho = arquivoEnv(`${CHAVE}=veio-do-arquivo\n`);

    carregarEnvLocal(caminho);

    expect(process.env[CHAVE]).toBe("veio-do-ambiente");
  });

  it("devolve false sem lançar quando o arquivo não existe", () => {
    const inexistente = join(tmpdir(), "mybilling-nao-existe", ".env.local");

    expect(() => carregarEnvLocal(inexistente)).not.toThrow();
    expect(carregarEnvLocal(inexistente)).toBe(false);
  });

  it("não define chave nenhuma quando o arquivo não existe", () => {
    carregarEnvLocal(join(tmpdir(), "mybilling-nao-existe", ".env.local"));

    expect(process.env[CHAVE]).toBeUndefined();
  });
});
