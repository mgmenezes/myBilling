import { NextResponse } from "next/server";
import { auth } from "@/infrastructure/auth/auth";

/**
 * Primeira camada de proteção. A segunda é `requireSession()`, chamada na
 * primeira instrução de toda Server Action e de todo Route Handler protegido
 * (AUTH-01, AC 3). As duas existem porque middleware sozinho já falhou
 * publicamente em frameworks deste tipo: um matcher mal escrito ou um caminho
 * normalizado de forma inesperada desliga a única barreira sem avisar.
 *
 * A regra aqui é de acesso, não de identidade: quem decide se o e-mail entra é
 * a allowlist no callback `signIn` (T38).
 */

/** Tudo que responde sem sessão. Qualquer outra rota exige autenticação. */
export const ROTAS_PUBLICAS = ["/login", "/api/health"] as const;

/** Prefixo do próprio Auth.js: sem ele, não há como chegar ao login. */
const PREFIXO_AUTH = "/api/auth";

export function ehRotaPublica(pathname: string): boolean {
  if (pathname === PREFIXO_AUTH || pathname.startsWith(`${PREFIXO_AUTH}/`)) {
    return true;
  }
  return ROTAS_PUBLICAS.some((rota) => pathname === rota);
}

export type DecisaoDeAcesso =
  | { readonly tipo: "seguir" }
  | { readonly tipo: "redirecionar"; readonly destino: string };

/**
 * Decisão pura, para ser exercitável sem subir servidor. Rota pública segue;
 * rota protegida sem sessão volta para `/login` (AUTH-01, AC 1).
 */
export function decidirAcesso(pathname: string, autenticado: boolean): DecisaoDeAcesso {
  if (ehRotaPublica(pathname)) {
    return { tipo: "seguir" };
  }
  return autenticado ? { tipo: "seguir" } : { tipo: "redirecionar", destino: "/login" };
}

export default auth((requisicao) => {
  const decisao = decidirAcesso(requisicao.nextUrl.pathname, requisicao.auth !== null);
  if (decisao.tipo === "seguir") {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL(decisao.destino, requisicao.nextUrl.origin));
});

export const config = {
  // Roda em tudo menos os artefatos do próprio Next e arquivos estáticos.
  // `/api/auth` fica **dentro** do matcher de propósito: é o middleware que
  // declara a rota pública, e não a ausência dele.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
