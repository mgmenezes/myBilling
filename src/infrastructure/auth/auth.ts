import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { env } from "@/infrastructure/config/env";

/**
 * Autenticação: Google OAuth mais allowlist de e-mails (AD-007).
 *
 * Três propriedades estruturais mandam neste arquivo:
 *
 * 1. **A allowlist é decidida por uma função pura**, `emailPermitido`, e
 *    aplicada num único lugar: o callback `signIn`. Como o callback roda para
 *    **todo** provider, nenhum provider consegue pular a allowlist — nem o de
 *    teste. A verificação não está dentro de nenhum provider de propósito.
 * 2. **Sessão em JWT, sem adapter.** O Auth.js não escreve nada no banco, então
 *    um e-mail negado não tem por onde criar registro de usuário
 *    (AUTH-01, AC 2). Quem cria usuário é `requireSession`, depois da allowlist.
 * 3. **Nenhum segredo sai para o cliente** (AUTH-02, AC 6): tudo aqui é
 *    servidor, e nenhuma variável usada tem prefixo `NEXT_PUBLIC_`.
 */

/** Id do provider de credenciais que só existe em ambiente de teste. */
export const ID_PROVEDOR_DE_TESTE = "provedor-de-teste";

/** Variável que habilita o provider de teste. Nunca definir em produção. */
export const VAR_PROVEDOR_DE_TESTE = "AUTH_PROVIDER_DE_TESTE";

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** `'A@x.com, b@x.com '` → `['a@x.com', 'b@x.com']`. Entradas vazias somem. */
export function parsearAllowlist(bruto: string): ReadonlyArray<string> {
  return bruto
    .split(",")
    .map(normalizarEmail)
    .filter((email) => email !== "");
}

/**
 * Decide o acesso. Pura e testável isoladamente (AUTH-01, AC 2).
 * Compara normalizado nos dois lados: caixa e espaço em volta não mudam a
 * identidade de um e-mail, e a lista vem digitada à mão numa variável.
 */
export function emailPermitido(
  email: string | null | undefined,
  allowlist: ReadonlyArray<string>,
): boolean {
  if (typeof email !== "string") {
    return false;
  }
  const alvo = normalizarEmail(email);
  if (alvo === "") {
    return false;
  }
  return allowlist.some((permitido) => normalizarEmail(permitido) === alvo);
}

export interface AmbienteAuth {
  /** `NODE_ENV` real do processo, lido sem passar pelo bundler. */
  readonly nodeEnv: string | undefined;
  /** `NODE_ENV` embutido no bundle em tempo de build. */
  readonly buildEnv: string | undefined;
  readonly provedorDeTeste: string | undefined;
  readonly authSecret: string;
  readonly googleId: string;
  readonly googleSecret: string;
  readonly emailsPermitidos: string;
}

function ehProducao(ambiente: AmbienteAuth): boolean {
  return ambiente.nodeEnv === "production" || ambiente.buildEnv === "production";
}

/**
 * O provider de teste exige **duas** condições simultâneas: `NODE_ENV` igual a
 * `test` e a variável explícita ligada. Uma condição só seria fácil demais de
 * satisfazer por acidente.
 *
 * Em produção com a variável presente, lança. Falha barulhenta no boot é o
 * ponto: degradar em silêncio deixaria um provider de credenciais sem senha
 * exposto na internet.
 */
export function provedorDeTesteHabilitado(ambiente: AmbienteAuth): boolean {
  const solicitado = (ambiente.provedorDeTeste ?? "").trim() !== "";
  if (!solicitado) {
    return false;
  }
  if (ehProducao(ambiente)) {
    throw new Error(
      `${VAR_PROVEDOR_DE_TESTE} está definida em ambiente de produção. O provedor de credenciais de teste nunca pode ser montado em produção: remova a variável do ambiente.`,
    );
  }
  return ambiente.nodeEnv === "test" && ambiente.provedorDeTeste === "1";
}

/**
 * Provider de credenciais de teste. Ele **autentica**, e só: devolve o e-mail
 * recebido como identidade. Não consulta nem ignora a allowlist — quem decide
 * acesso é o callback `signIn`, igual para todo provider. Dar acesso livre aqui
 * transformaria o e2e de autenticação num teste de bypass.
 */
function provedorDeTeste() {
  return Credentials({
    id: ID_PROVEDOR_DE_TESTE,
    name: "Provedor de teste",
    credentials: { email: { label: "E-mail", type: "email" } },
    authorize(credenciais) {
      const bruto = credenciais?.email;
      if (typeof bruto !== "string") {
        return null;
      }
      const email = normalizarEmail(bruto);
      if (email === "") {
        return null;
      }
      return { id: `teste:${email}`, email, name: email };
    },
  });
}

export function montarConfigAuth(ambiente: AmbienteAuth): NextAuthConfig {
  const allowlist = parsearAllowlist(ambiente.emailsPermitidos);
  const producao = ehProducao(ambiente);
  const providers: NextAuthConfig["providers"] = [
    Google({ clientId: ambiente.googleId, clientSecret: ambiente.googleSecret }),
  ];
  if (provedorDeTesteHabilitado(ambiente)) {
    providers.push(provedorDeTeste());
  }
  return {
    providers,
    secret: ambiente.authSecret,
    trustHost: true,
    session: { strategy: "jwt" },
    // `/login` também é a página de erro: e-mail fora da allowlist volta para
    // lá com `?error=AccessDenied`, e a página responde 403 (AUTH-01, AC 2).
    pages: { signIn: "/login", error: "/login" },
    cookies: {
      sessionToken: {
        name: producao ? "__Secure-authjs.session-token" : "authjs.session-token",
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          // `secure` só fora de produção é falso porque o navegador descarta
          // cookie seguro em http://localhost, e o desenvolvimento e o e2e
          // rodam em http.
          secure: producao,
        },
      },
    },
    callbacks: {
      signIn({ user }) {
        return emailPermitido(user.email, allowlist);
      },
    },
  };
}

/**
 * `NODE_ENV` real do processo.
 *
 * O bundler do Next substitui `process.env.NODE_ENV` pelo literal do modo de
 * build — e faz o mesmo com `process.env["NODE_ENV"]` e com qualquer acesso a
 * `.NODE_ENV` sobre um alias. `Reflect.get` é uma chamada de runtime, escapa da
 * substituição e devolve o valor que o processo de fato tem.
 *
 * Se um bundler futuro passar a dobrar isto também, a falha é segura: o
 * provider de teste simplesmente deixa de ser registrado e o e2e quebra alto.
 * A guarda de produção não depende desta leitura — ela usa o literal do build,
 * que é `"production"` em qualquer build de produção.
 */
function nodeEnvDoProcesso(): string | undefined {
  return Reflect.get(process.env, "NODE_ENV");
}

export function lerAmbienteAuth(): AmbienteAuth {
  return {
    nodeEnv: nodeEnvDoProcesso(),
    buildEnv: process.env.NODE_ENV,
    provedorDeTeste: process.env[VAR_PROVEDOR_DE_TESTE],
    authSecret: env.AUTH_SECRET,
    googleId: env.AUTH_GOOGLE_ID,
    googleSecret: env.AUTH_GOOGLE_SECRET,
    emailsPermitidos: env.EMAILS_PERMITIDOS,
  };
}

/**
 * A configuração é montada por requisição, e não na importação do módulo:
 * `env` só valida no primeiro acesso, e importar este arquivo num contexto sem
 * ambiente completo (um teste, o typecheck) não pode derrubar nada.
 */
export const { handlers, auth, signIn, signOut } = NextAuth(() =>
  montarConfigAuth(lerAmbienteAuth()),
);
