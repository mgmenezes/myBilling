import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type BancoDeDados, criarCliente, criarPool } from "@/infrastructure/db/client";
import { CadastroRepositoryDrizzle } from "@/infrastructure/db/repositories/cadastro.repository";
import {
  limparDados,
  recriarBancoDeTeste,
  URL_BANCO_DE_TESTE,
} from "@/infrastructure/db/testing/banco-de-teste";
import { ErroDeSessao, resolverSessao, type SessaoRecebida, type UsuariosDeSessao } from "./sessao";

const ALLOWLIST = ["pessoa-a@example.com", "pessoa-b@example.com"];

let pool: Pool;
let db: BancoDeDados;
let cadastros: CadastroRepositoryDrizzle;

beforeAll(async () => {
  pool = criarPool(URL_BANCO_DE_TESTE);
  db = criarCliente(pool);
  cadastros = new CadastroRepositoryDrizzle(db);
  await recriarBancoDeTeste(pool);
}, 60_000);

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await limparDados(pool);
});

async function contarUsuarios(): Promise<number> {
  const { rows } = await pool.query<{ total: string }>("SELECT COUNT(*) AS total FROM usuario");
  return Number(rows[0]?.total ?? "-1");
}

function sessaoDe(email: string | null, nome: string | null = "Pessoa A"): SessaoRecebida {
  return { user: { email, name: nome } };
}

describe("requireSession: sessão ausente (AUTH-02, AC 3)", () => {
  it("rejeita sem sessão e não devolve usuário", async () => {
    await expect(resolverSessao(null, cadastros, ALLOWLIST)).rejects.toThrow(ErroDeSessao);
    await expect(resolverSessao(null, cadastros, ALLOWLIST)).rejects.toMatchObject({
      codigo: "NAO_AUTENTICADO",
      status: 401,
    });
  });

  it("rejeita sessão sem e-mail", async () => {
    await expect(resolverSessao(sessaoDe(null), cadastros, ALLOWLIST)).rejects.toMatchObject({
      codigo: "NAO_AUTENTICADO",
      status: 401,
    });
    await expect(resolverSessao({}, cadastros, ALLOWLIST)).rejects.toMatchObject({
      codigo: "NAO_AUTENTICADO",
      status: 401,
    });
  });

  it("não cria nenhum registro de usuário quando não há sessão", async () => {
    await expect(resolverSessao(null, cadastros, ALLOWLIST)).rejects.toThrow();
    expect(await contarUsuarios()).toBe(0);
  });
});

describe("requireSession: e-mail fora da allowlist (AUTH-01, AC 2)", () => {
  it("rejeita com status 403", async () => {
    await expect(
      resolverSessao(sessaoDe("intruso@example.com"), cadastros, ALLOWLIST),
    ).rejects.toMatchObject({ codigo: "ACESSO_NEGADO", status: 403 });
  });

  it("não cria registro de usuário — a consulta ao banco confirma zero linhas", async () => {
    await expect(
      resolverSessao(sessaoDe("intruso@example.com"), cadastros, ALLOWLIST),
    ).rejects.toThrow();

    expect(await contarUsuarios()).toBe(0);
    const { rows } = await pool.query("SELECT id FROM usuario WHERE email = $1", [
      "intruso@example.com",
    ]);
    expect(rows).toEqual([]);
  });

  it("não cria registro nem quando já existe outro usuário no banco", async () => {
    await cadastros.criarUsuario({ nome: "Pessoa A", email: "pessoa-a@example.com" });

    await expect(
      resolverSessao(sessaoDe("intruso@example.com"), cadastros, ALLOWLIST),
    ).rejects.toThrow();

    expect(await contarUsuarios()).toBe(1);
  });
});

describe("requireSession: sessão válida", () => {
  it("devolve o usuário correspondente do banco", async () => {
    const gravado = await cadastros.criarUsuario({
      nome: "Pessoa A",
      email: "pessoa-a@example.com",
    });

    const resolvido = await resolverSessao(sessaoDe("pessoa-a@example.com"), cadastros, ALLOWLIST);

    expect(resolvido).toEqual(gravado);
    expect(await contarUsuarios()).toBe(1);
  });

  it("cria o usuário no primeiro acesso de um e-mail da allowlist", async () => {
    const resolvido = await resolverSessao(sessaoDe("pessoa-b@example.com"), cadastros, ALLOWLIST);

    expect(resolvido.email).toBe("pessoa-b@example.com");
    expect(resolvido.nome).toBe("Pessoa A");
    expect(await contarUsuarios()).toBe(1);
  });

  it("resolve o mesmo usuário com caixa diferente, sem duplicar o registro", async () => {
    const gravado = await cadastros.criarUsuario({
      nome: "Pessoa A",
      email: "pessoa-a@example.com",
    });

    const resolvido = await resolverSessao(
      sessaoDe("  Pessoa-A@Example.COM "),
      cadastros,
      ALLOWLIST,
    );

    expect(resolvido.id).toBe(gravado.id);
    expect(await contarUsuarios()).toBe(1);
  });

  it("usa o e-mail como nome quando a sessão não traz nome", async () => {
    const resolvido = await resolverSessao(
      sessaoDe("pessoa-b@example.com", null),
      cadastros,
      ALLOWLIST,
    );

    expect(resolvido.nome).toBe("pessoa-b@example.com");
  });
});

describe("requireSession: provisionamento concorrente", () => {
  /** Simula a corrida: outra requisição gravou o mesmo e-mail primeiro. */
  function perdendoACorrida(): UsuariosDeSessao {
    return {
      listarUsuarios: () => cadastros.listarUsuarios(),
      criarUsuario: async (novo) => {
        await cadastros.criarUsuario(novo);
        return cadastros.criarUsuario(novo);
      },
    };
  }

  it("devolve o usuário gravado pela outra requisição, sem duplicar nem estourar", async () => {
    const resolvido = await resolverSessao(
      sessaoDe("pessoa-a@example.com"),
      perdendoACorrida(),
      ALLOWLIST,
    );

    expect(resolvido.email).toBe("pessoa-a@example.com");
    expect(await contarUsuarios()).toBe(1);
  });

  it("propaga a falha quando a gravação não foi de outra requisição", async () => {
    const sempreFalha: UsuariosDeSessao = {
      listarUsuarios: () => cadastros.listarUsuarios(),
      criarUsuario: () => Promise.reject(new Error("banco indisponível")),
    };

    await expect(
      resolverSessao(sessaoDe("pessoa-a@example.com"), sempreFalha, ALLOWLIST),
    ).rejects.toThrow("banco indisponível");
    expect(await contarUsuarios()).toBe(0);
  });
});
