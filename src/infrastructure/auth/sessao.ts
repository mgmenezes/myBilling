import type { Usuario } from "@/application/ports/repositories";
import { env } from "@/infrastructure/config/env";
import { db } from "@/infrastructure/db/client";
import { CadastroRepositoryDrizzle } from "@/infrastructure/db/repositories/cadastro.repository";
import { auth, emailPermitido, normalizarEmail, parsearAllowlist } from "./auth";

/**
 * Segunda camada de defesa, independente do middleware (AUTH-01, AC 3).
 *
 * `requireSession()` é chamada na **primeira instrução** de toda Server Action
 * e de todo Route Handler protegido, mesmo havendo middleware. As duas camadas
 * não são redundância decorativa: um matcher mal escrito desliga o middleware
 * sem quebrar nada visível, e é exatamente assim que frameworks deste tipo já
 * vazaram rota protegida em produção.
 *
 * A ordem dentro de `resolverSessao` é a propriedade que importa: a allowlist
 * é verificada **antes** de qualquer escrita. E-mail negado sai da função sem
 * ter tocado a tabela `usuario` (AUTH-01, AC 2).
 */

export type CodigoErroSessao = "NAO_AUTENTICADO" | "ACESSO_NEGADO";

export class ErroDeSessao extends Error {
  constructor(
    readonly codigo: CodigoErroSessao,
    readonly status: 401 | 403,
  ) {
    super(codigo);
    this.name = "ErroDeSessao";
  }
}

/** O mínimo que a resolução de sessão precisa do cadastro de usuários. */
export interface UsuariosDeSessao {
  listarUsuarios(): Promise<ReadonlyArray<Usuario>>;
  criarUsuario(novo: { nome: string; email: string }): Promise<Usuario>;
}

/** A forma da sessão do Auth.js que interessa aqui, e só ela. */
export interface SessaoRecebida {
  readonly user?: { readonly email?: string | null; readonly name?: string | null } | null;
}

export async function resolverSessao(
  sessao: SessaoRecebida | null,
  usuarios: UsuariosDeSessao,
  allowlist: ReadonlyArray<string>,
): Promise<Usuario> {
  const email = sessao?.user?.email;
  if (typeof email !== "string" || email.trim() === "") {
    throw new ErroDeSessao("NAO_AUTENTICADO", 401);
  }
  if (!emailPermitido(email, allowlist)) {
    throw new ErroDeSessao("ACESSO_NEGADO", 403);
  }

  const normalizado = normalizarEmail(email);
  const existente = await buscarPorEmail(usuarios, normalizado);
  if (existente) {
    return existente;
  }

  const nome = sessao?.user?.name?.trim();
  try {
    return await usuarios.criarUsuario({
      nome: nome === undefined || nome === "" ? normalizado : nome,
      email: normalizado,
    });
  } catch (erro) {
    // O primeiro acesso de um e-mail pode ser provisionado por duas
    // requisições ao mesmo tempo: o Next renderiza layout e página em
    // paralelo, e as duas resolvem a sessão. A restrição de unicidade de
    // e-mail decide quem grava; quem perde relê em vez de estourar.
    const gravadoPorOutro = await buscarPorEmail(usuarios, normalizado);
    if (gravadoPorOutro) {
      return gravadoPorOutro;
    }
    throw erro;
  }
}

async function buscarPorEmail(
  usuarios: UsuariosDeSessao,
  emailNormalizado: string,
): Promise<Usuario | undefined> {
  return (await usuarios.listarUsuarios()).find(
    (usuario) => normalizarEmail(usuario.email) === emailNormalizado,
  );
}

export async function requireSession(): Promise<Usuario> {
  return resolverSessao(
    await auth(),
    new CadastroRepositoryDrizzle(db()),
    parsearAllowlist(env.EMAILS_PERMITIDOS),
  );
}
