import { describe, expect, it } from "vitest";
import { config, decidirAcesso, ehRotaPublica } from "./proxy";

const ROTAS_PROTEGIDAS = ["/", "/2026-03", "/2026-03/detalhe", "/api/compras"];

function matcherCasa(pathname: string): boolean {
  const [padrao] = config.matcher;
  return new RegExp(`^${padrao}$`).test(pathname);
}

describe("rotas públicas", () => {
  it("/login responde sem sessão", () => {
    expect(ehRotaPublica("/login")).toBe(true);
  });

  it("as rotas do Auth.js respondem sem sessão", () => {
    expect(ehRotaPublica("/api/auth")).toBe(true);
    expect(ehRotaPublica("/api/auth/signin")).toBe(true);
    expect(ehRotaPublica("/api/auth/callback/google")).toBe(true);
  });

  it("/api/health responde sem sessão", () => {
    expect(ehRotaPublica("/api/health")).toBe(true);
  });

  it("uma rota que só começa igual a uma pública não é pública", () => {
    expect(ehRotaPublica("/login-falso")).toBe(false);
    expect(ehRotaPublica("/api/authorize")).toBe(false);
  });

  it("as rotas do aplicativo não são públicas", () => {
    for (const rota of ROTAS_PROTEGIDAS) {
      expect(ehRotaPublica(rota)).toBe(false);
    }
  });
});

describe("decisão de acesso", () => {
  it("rota protegida sem sessão redireciona para /login (AUTH-01, AC 1)", () => {
    for (const rota of ROTAS_PROTEGIDAS) {
      expect(decidirAcesso(rota, false)).toEqual({ tipo: "redirecionar", destino: "/login" });
    }
  });

  it("rota protegida com sessão segue", () => {
    expect(decidirAcesso("/2026-03", true)).toEqual({ tipo: "seguir" });
  });

  it("/login segue sem sessão, sem laço de redirecionamento", () => {
    expect(decidirAcesso("/login", false)).toEqual({ tipo: "seguir" });
  });

  it("as rotas do Auth.js seguem sem sessão", () => {
    expect(decidirAcesso("/api/auth/callback/google", false)).toEqual({ tipo: "seguir" });
  });
});

describe("matcher", () => {
  it("alcança as rotas protegidas e as públicas", () => {
    for (const rota of [...ROTAS_PROTEGIDAS, "/login", "/api/auth/signin", "/api/health"]) {
      expect(matcherCasa(rota)).toBe(true);
    }
  });

  it("não alcança os artefatos do Next nem arquivos estáticos", () => {
    for (const caminho of ["/_next/static/chunk.js", "/_next/image", "/favicon.ico", "/next.svg"]) {
      expect(matcherCasa(caminho)).toBe(false);
    }
  });
});
