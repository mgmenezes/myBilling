import { describe, expect, it } from "vitest";
import { CHAVES_ENV, carregarEnv } from "./env";

const fonteValida: Record<string, string | undefined> = {
  DATABASE_URL: "postgres://usuario:senha@localhost:5432/mybilling_test",
  AUTH_SECRET: "segredo-de-teste-sem-valor-real",
  AUTH_GOOGLE_ID: "google-client-id-de-teste",
  AUTH_GOOGLE_SECRET: "google-client-secret-de-teste",
  EMAILS_PERMITIDOS: "pessoa-a@example.com,pessoa-b@example.com",
};

describe("carregarEnv", () => {
  it("valida com sucesso quando todas as chaves obrigatórias estão presentes", () => {
    const resultado = carregarEnv(fonteValida);
    expect(resultado).toEqual(fonteValida);
  });

  it("lança erro explícito nomeando a chave ausente quando DATABASE_URL falta (AUTH-02, AC 5)", () => {
    const { DATABASE_URL: _omitido, ...fonteSemDatabaseUrl } = fonteValida;
    expect(() => carregarEnv(fonteSemDatabaseUrl)).toThrowError(/DATABASE_URL/);
  });

  it("lança erro explícito nomeando a chave ausente quando AUTH_SECRET falta", () => {
    const { AUTH_SECRET: _omitido, ...fonteSemAuthSecret } = fonteValida;
    expect(() => carregarEnv(fonteSemAuthSecret)).toThrowError(/AUTH_SECRET/);
  });

  it("não inicia com valor indefinido: ambiente vazio lança e não retorna objeto parcial (AUTH-02, AC 5)", () => {
    expect(() => carregarEnv({})).toThrowError();
  });
});

describe("CHAVES_ENV", () => {
  it("nenhuma chave declarada tem prefixo NEXT_PUBLIC_ (AUTH-02, AC 6)", () => {
    for (const chave of CHAVES_ENV) {
      expect(chave.startsWith("NEXT_PUBLIC_")).toBe(false);
    }
  });
});
