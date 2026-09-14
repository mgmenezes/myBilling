import { forbidden, redirect } from "next/navigation";
import type { Usuario } from "@/application/ports/repositories";
import { ErroDeSessao, requireSession } from "@/infrastructure/auth/sessao";

/**
 * Traduz o erro de sessão em resposta de navegação. Fica na camada de app, e
 * não em `src/infrastructure/auth`, porque `redirect` e `forbidden` são do
 * Next: a infraestrutura de autenticação continua sem saber que existe UI.
 */
export async function sessaoDaUI(): Promise<Usuario> {
  return requireSession().catch((erro: unknown) => {
    if (erro instanceof ErroDeSessao && erro.codigo === "ACESSO_NEGADO") {
      forbidden();
    }
    if (erro instanceof ErroDeSessao) {
      redirect("/login");
    }
    throw erro;
  });
}
