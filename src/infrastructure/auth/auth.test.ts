import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { NextAuthConfig } from "next-auth";
import { describe, expect, it } from "vitest";
import {
  type AmbienteAuth,
  emailPermitido,
  ID_PROVEDOR_DE_TESTE,
  montarConfigAuth,
  parsearAllowlist,
  provedorDeTesteHabilitado,
  VAR_PROVEDOR_DE_TESTE,
} from "./auth";

const ALLOWLIST = ["pessoa-a@example.com", "pessoa-b@example.com"];

function ambiente(sobrescritas: Partial<AmbienteAuth> = {}): AmbienteAuth {
  return {
    nodeEnv: "test",
    buildEnv: "test",
    provedorDeTeste: undefined,
    authSecret: "segredo-de-teste",
    googleId: "google-id-de-teste",
    googleSecret: "google-secret-de-teste",
    emailsPermitidos: ALLOWLIST.join(","),
    ...sobrescritas,
  };
}

/**
 * O Auth.js resolve o provider como `options ?? defaults` em `parseProviders`
 * (`@auth/core/lib/utils/providers.js`): a fábrica devolve os padrões e guarda
 * o que foi passado em `options`. Estes dois auxiliares aplicam a mesma regra,
 * para lerem o provider exatamente como o runtime vai lê-lo.
 */
interface ProviderInspecionavel {
  readonly id?: string;
  readonly authorize?: (credenciais: Record<string, unknown>) => unknown;
  readonly options?: {
    readonly id?: string;
    readonly authorize?: (credenciais: Record<string, unknown>) => unknown;
  };
}

function inspecionar(config: NextAuthConfig): ProviderInspecionavel[] {
  return config.providers.map((provider) =>
    typeof provider === "function" ? {} : (provider as ProviderInspecionavel),
  );
}

function idsDosProviders(config: NextAuthConfig): string[] {
  return inspecionar(config).map((provider) => provider.options?.id ?? provider.id ?? "");
}

function autorizarProvedorDeTeste(config: NextAuthConfig) {
  const provider = inspecionar(config).find(
    (p) => (p.options?.id ?? p.id) === ID_PROVEDOR_DE_TESTE,
  );
  const authorize = provider?.options?.authorize ?? provider?.authorize;
  if (!authorize) {
    throw new Error("provedor de teste não está registrado nesta configuração");
  }
  return authorize;
}

function chamarSignIn(config: NextAuthConfig, email: string | null) {
  const signIn = config.callbacks?.signIn;
  if (!signIn) {
    throw new Error("callback signIn ausente na configuração");
  }
  return signIn({ user: { id: "u1", email, name: "Pessoa" } });
}

describe("emailPermitido", () => {
  it("aceita e-mail que está na allowlist", () => {
    expect(emailPermitido("pessoa-a@example.com", ALLOWLIST)).toBe(true);
  });

  it("rejeita e-mail que não está na allowlist", () => {
    expect(emailPermitido("intruso@example.com", ALLOWLIST)).toBe(false);
  });

  it("compara normalizando caixa e espaços do e-mail recebido", () => {
    expect(emailPermitido("  Pessoa-A@Example.COM  ", ALLOWLIST)).toBe(true);
  });

  it("compara normalizando caixa e espaços das entradas da allowlist", () => {
    expect(emailPermitido("pessoa-b@example.com", [" PESSOA-B@EXAMPLE.COM "])).toBe(true);
  });

  it("rejeita e-mail ausente", () => {
    expect(emailPermitido(null, ALLOWLIST)).toBe(false);
    expect(emailPermitido(undefined, ALLOWLIST)).toBe(false);
  });

  it("rejeita string vazia mesmo quando a allowlist tem entrada vazia", () => {
    expect(emailPermitido("   ", ["", "pessoa-a@example.com"])).toBe(false);
  });

  it("rejeita qualquer e-mail quando a allowlist está vazia", () => {
    expect(emailPermitido("pessoa-a@example.com", [])).toBe(false);
  });
});

describe("parsearAllowlist", () => {
  it("quebra por vírgula, normaliza e descarta entradas vazias", () => {
    expect(parsearAllowlist(" Pessoa-A@Example.com , ,pessoa-b@example.com,")).toEqual([
      "pessoa-a@example.com",
      "pessoa-b@example.com",
    ]);
  });
});

describe("callback de sign-in", () => {
  it("nega acesso a e-mail fora da allowlist (AUTH-01, AC 2)", () => {
    expect(chamarSignIn(montarConfigAuth(ambiente()), "intruso@example.com")).toBe(false);
  });

  it("permite acesso a e-mail da allowlist", () => {
    expect(chamarSignIn(montarConfigAuth(ambiente()), "pessoa-a@example.com")).toBe(true);
  });

  it("nega quando o provider não devolve e-mail", () => {
    expect(chamarSignIn(montarConfigAuth(ambiente()), null)).toBe(false);
  });
});

describe("provider de teste", () => {
  it("é registrado quando NODE_ENV é test E a variável está ligada", () => {
    const config = montarConfigAuth(ambiente({ nodeEnv: "test", provedorDeTeste: "1" }));
    expect(idsDosProviders(config)).toContain(ID_PROVEDOR_DE_TESTE);
  });

  it("não é registrado com NODE_ENV test e a variável ausente", () => {
    const config = montarConfigAuth(ambiente({ nodeEnv: "test", provedorDeTeste: undefined }));
    expect(idsDosProviders(config)).not.toContain(ID_PROVEDOR_DE_TESTE);
  });

  it("não é registrado com a variável ligada fora de NODE_ENV test", () => {
    const config = montarConfigAuth(
      ambiente({ nodeEnv: "development", buildEnv: "development", provedorDeTeste: "1" }),
    );
    expect(idsDosProviders(config)).not.toContain(ID_PROVEDOR_DE_TESTE);
  });

  it("não pula a allowlist: o callback de sign-in nega e-mail fora da lista", () => {
    const config = montarConfigAuth(ambiente({ nodeEnv: "test", provedorDeTeste: "1" }));
    expect(idsDosProviders(config)).toContain(ID_PROVEDOR_DE_TESTE);
    expect(chamarSignIn(config, "intruso@example.com")).toBe(false);
  });

  it("autentica devolvendo o e-mail recebido, sem conceder acesso por si", () => {
    const config = montarConfigAuth(ambiente({ nodeEnv: "test", provedorDeTeste: "1" }));
    const autorizado = autorizarProvedorDeTeste(config)({ email: "  Intruso@Example.com " });
    expect(autorizado).toEqual({
      id: "teste:intruso@example.com",
      email: "intruso@example.com",
      name: "intruso@example.com",
    });
    expect(chamarSignIn(config, "intruso@example.com")).toBe(false);
  });

  it("recusa credencial sem e-mail", () => {
    const config = montarConfigAuth(ambiente({ nodeEnv: "test", provedorDeTeste: "1" }));
    const autorizar = autorizarProvedorDeTeste(config);
    expect(autorizar({ email: "   " })).toBeNull();
    expect(autorizar({})).toBeNull();
  });
});

describe("guarda de produção do provider de teste", () => {
  it("lança quando NODE_ENV é production e a variável está ligada", () => {
    expect(() =>
      montarConfigAuth(
        ambiente({ nodeEnv: "production", buildEnv: "production", provedorDeTeste: "1" }),
      ),
    ).toThrow(/nunca pode ser montado em produção/);
  });

  it("lança quando só o NODE_ENV real é production", () => {
    expect(() =>
      provedorDeTesteHabilitado(
        ambiente({ nodeEnv: "production", buildEnv: "test", provedorDeTeste: "1" }),
      ),
    ).toThrow(/nunca pode ser montado em produção/);
  });

  it("lança quando só o NODE_ENV do build é production", () => {
    expect(() =>
      provedorDeTesteHabilitado(
        ambiente({ nodeEnv: "test", buildEnv: "production", provedorDeTeste: "1" }),
      ),
    ).toThrow(/nunca pode ser montado em produção/);
  });

  it("a lista de providers em produção não contém o provider de teste", () => {
    const config = montarConfigAuth(
      ambiente({ nodeEnv: "production", buildEnv: "production", provedorDeTeste: undefined }),
    );
    expect(idsDosProviders(config)).not.toContain(ID_PROVEDOR_DE_TESTE);
    expect(idsDosProviders(config)).toEqual(["google"]);
  });
});

describe("cookie de sessão", () => {
  it("é httpOnly e sameSite lax", () => {
    const opcoes = montarConfigAuth(ambiente()).cookies?.sessionToken?.options;
    expect(opcoes?.httpOnly).toBe(true);
    expect(opcoes?.sameSite).toBe("lax");
  });

  it("é secure em produção", () => {
    const config = montarConfigAuth(ambiente({ nodeEnv: "production", buildEnv: "production" }));
    expect(config.cookies?.sessionToken?.options?.secure).toBe(true);
    expect(config.cookies?.sessionToken?.name).toBe("__Secure-authjs.session-token");
  });
});

describe("segredos fora do bundle do navegador (AUTH-02, AC 6)", () => {
  const raiz = join(import.meta.dirname, "..", "..", "..");
  /** Casa o uso de uma variável pública de verdade, não a menção ao prefixo. */
  const USO_DE_VARIAVEL_PUBLICA = /NEXT_PUBLIC_[A-Z0-9]/;

  function arquivosDeCodigo(diretorio: string): string[] {
    return readdirSync(diretorio).flatMap((entrada) => {
      const caminho = join(diretorio, entrada);
      if (statSync(caminho).isDirectory()) {
        return arquivosDeCodigo(caminho);
      }
      return /\.(ts|tsx)$/.test(entrada) ? [caminho] : [];
    });
  }

  it("nenhum arquivo de src usa uma variável de ambiente pública", () => {
    const infratores = arquivosDeCodigo(join(raiz, "src")).filter((caminho) =>
      USO_DE_VARIAVEL_PUBLICA.test(readFileSync(caminho, "utf8")),
    );
    expect(infratores).toEqual([]);
  });

  it("a variável do provider de teste está documentada no .env.example", () => {
    const exemplo = readFileSync(join(raiz, ".env.example"), "utf8");
    expect(exemplo).toContain(VAR_PROVEDOR_DE_TESTE);
    expect(exemplo).toMatch(/NUNCA defina esta variável em produção/);
  });
});
