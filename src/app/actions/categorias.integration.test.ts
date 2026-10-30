import { readFileSync } from "node:fs";
import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type CadastroBase,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
  URL_BANCO_DE_TESTE,
} from "@/infrastructure/db/testing/banco-de-teste";

/**
 * As duas Server Actions da tela de Categorias contra o Postgres real
 * (AD-010). Testes derivados de COR-04 (ACs 4 a 7 e 9), do Edge Case do nome
 * igual ao atual e do Done-when de T8.
 *
 * O que está sob teste é a borda e a gravação: sessão antes de tudo, payload
 * revalidado no servidor, a cor e o nome lidos de volta do banco, a recusa do
 * nome repetido sem mudar nada, as quatro telas revalidadas e o envelope
 * uniforme. `next/cache` é o único módulo trocado por dublê: `revalidatePath`
 * exige um contexto de requisição do Next que não existe aqui.
 *
 * As cores automáticas usadas abaixo: "Categoria Um" é ciano, e "Categoria
 * Dez" é vermelho. Nomes genéricos (AD-009).
 */

process.env.DATABASE_URL = URL_BANCO_DE_TESTE;
process.env.AUTH_SECRET ??= "segredo-local-de-teste-nao-e-credencial";
process.env.AUTH_GOOGLE_ID ??= "client-id-placeholder";
process.env.AUTH_GOOGLE_SECRET ??= "client-secret-placeholder";
process.env.EMAILS_PERMITIDOS = "pessoa-a@example.com,pessoa-b@example.com";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (rota: string, tipo?: string) => revalidatePath(rota, tipo),
}));

let sessaoAtual: { user: { email: string; name: string } } | null = null;
vi.mock("@/infrastructure/auth/auth", async (original) => ({
  ...(await original<typeof import("@/infrastructure/auth/auth")>()),
  auth: async () => sessaoAtual,
}));

const { renomearCategoria, trocarCorDaCategoria } = await import("./categorias");
const { criarPool } = await import("@/infrastructure/db/client");
const { CadastroRepositoryDrizzle } = await import(
  "@/infrastructure/db/repositories/cadastro.repository"
);

const EMAIL_PERMITIDO = "pessoa-a@example.com";
const INEXISTENTE = "99999999-9999-4999-8999-999999999999";

/** As quatro telas que mostram a cor ou o nome da categoria, todas por padrão de rota. */
const ROTAS_REVALIDADAS = [
  ["/[competencia]", "page"],
  ["/[competencia]/cadastros/categorias", "page"],
  ["/[competencia]/fixos", "page"],
  ["/[competencia]/lancamentos", "page"],
];

let pool: Pool;
let base: CadastroBase;
let categoriaDois: string;
let arquivada: string;

interface LinhaDeCategoria {
  readonly id: string;
  readonly nome: string;
  readonly cor: string | null;
}

async function categorias(): Promise<ReadonlyArray<LinhaDeCategoria>> {
  const { rows } = await pool.query<LinhaDeCategoria>(
    "SELECT id, nome, cor FROM categoria ORDER BY nome",
  );
  return rows;
}

async function categoria(id: string): Promise<LinhaDeCategoria | undefined> {
  const { rows } = await pool.query<LinhaDeCategoria>(
    "SELECT id, nome, cor FROM categoria WHERE id = $1",
    [id],
  );
  return rows[0];
}

async function inserirCategoria(nome: string, arquivadaEm: string | null = null): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    "INSERT INTO categoria (nome, arquivada_em) VALUES ($1, $2) RETURNING id",
    [nome, arquivadaEm],
  );
  const linha = rows[0];
  if (!linha) {
    throw new Error("INSERT de categoria não devolveu id");
  }
  return linha.id;
}

function recusa<T>(
  resultado:
    | { ok: true; data: T }
    | { ok: false; erro: { code: string; mensagem: string; campos?: Record<string, string> } },
) {
  if (resultado.ok) {
    throw new Error("esperava recusa, veio sucesso");
  }
  return resultado.erro;
}

function primeiraInstrucao(nome: string): string {
  const fonte = readFileSync(new URL("./categorias.ts", import.meta.url), "utf8");
  const corpo = fonte.slice(fonte.indexOf(`export async function ${nome}`));
  return (
    corpo
      .slice(corpo.indexOf("{") + 1)
      .trim()
      .split("\n")[0] ?? ""
  );
}

beforeAll(async () => {
  pool = criarPool(URL_BANCO_DE_TESTE);
  await recriarBancoDeTeste(pool);
}, 60_000);

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await limparDados(pool);
  base = await semearCadastroBase(pool);
  categoriaDois = await inserirCategoria("Categoria Dois");
  arquivada = await inserirCategoria("Categoria Arquivada", "2026-01-01T00:00:00Z");
  sessaoAtual = { user: { email: EMAIL_PERMITIDO, name: "Pessoa A" } };
  revalidatePath.mockClear();
});

describe("sessão antes de tudo", () => {
  it.each(["trocarCorDaCategoria", "renomearCategoria"])(
    "`requireSession` é a primeira instrução de %s",
    (nome) => {
      expect(primeiraInstrucao(nome)).toContain("requireSession()");
    },
  );

  it("sem sessão, as duas recusam com NAO_AUTENTICADO, sem tocar no banco nem revalidar", async () => {
    sessaoAtual = null;
    const antes = await categorias();
    const busca = vi.spyOn(CadastroRepositoryDrizzle.prototype, "buscarCategoria");

    try {
      const cor = await trocarCorDaCategoria({ categoriaId: base.categoriaId, cor: "verde" });
      const nome = await renomearCategoria({
        categoriaId: base.categoriaId,
        nome: "Categoria Dez",
      });

      expect(recusa(cor).code).toBe("NAO_AUTENTICADO");
      expect(recusa(nome).code).toBe("NAO_AUTENTICADO");
      expect(busca).not.toHaveBeenCalled();
      expect(await categorias()).toEqual(antes);
      expect(revalidatePath).not.toHaveBeenCalled();
    } finally {
      busca.mockRestore();
    }
  });
});

describe("trocarCorDaCategoria (COR-04, ACs 4 e 5)", () => {
  it("grava a cor escolhida e a devolve", async () => {
    const resultado = await trocarCorDaCategoria({ categoriaId: base.categoriaId, cor: "verde" });

    expect(resultado).toEqual({
      ok: true,
      data: { id: base.categoriaId, nome: "Categoria Um", cor: "verde" },
    });
    expect(await categoria(base.categoriaId)).toEqual({
      id: base.categoriaId,
      nome: "Categoria Um",
      cor: "verde",
    });
  });

  it("muda só a categoria escolhida", async () => {
    await trocarCorDaCategoria({ categoriaId: base.categoriaId, cor: "verde" });

    expect((await categoria(categoriaDois))?.cor).toBeNull();
  });

  it("cor nula apaga a escolha e devolve a categoria à automática", async () => {
    await pool.query("UPDATE categoria SET cor = 'roxo' WHERE id = $1", [base.categoriaId]);

    const resultado = await trocarCorDaCategoria({ categoriaId: base.categoriaId, cor: null });

    expect(resultado).toEqual({
      ok: true,
      data: { id: base.categoriaId, nome: "Categoria Um", cor: null },
    });
    expect((await categoria(base.categoriaId))?.cor).toBeNull();
  });

  it("revalida as quatro telas que mostram a cor, todas por padrão de rota (COR-04, AC 9)", async () => {
    await trocarCorDaCategoria({ categoriaId: base.categoriaId, cor: "verde" });

    expect([...revalidatePath.mock.calls].sort()).toEqual(ROTAS_REVALIDADAS);
  });

  it("cor fora das dez é recusada no campo cor, sem gravar nem revalidar (COR-01, AC 4)", async () => {
    const antes = await categorias();

    const erro = recusa(
      await trocarCorDaCategoria({ categoriaId: base.categoriaId, cor: "dourado" }),
    );

    expect(erro.code).toBe("VALIDACAO");
    expect(erro.mensagem).toBe("Confira os campos destacados.");
    expect(Object.keys(erro.campos ?? {})).toEqual(["cor"]);
    expect(await categorias()).toEqual(antes);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("categoria que não existe é recusada, sem revalidar", async () => {
    const erro = recusa(await trocarCorDaCategoria({ categoriaId: INEXISTENTE, cor: "verde" }));

    expect(erro).toEqual({
      code: "CATEGORIA_NAO_ENCONTRADA",
      mensagem: "Essa categoria não existe mais.",
      campos: { categoriaId: "Essa categoria não existe mais." },
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("falha do banco vira ERRO_INESPERADO com referência, sem gravar nem revalidar (COR-04, AC 8)", async () => {
    const antes = await categorias();
    const falha = vi
      .spyOn(CadastroRepositoryDrizzle.prototype, "atualizarCategoria")
      .mockRejectedValueOnce(new Error("falha injetada no banco"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const erro = recusa(
        await trocarCorDaCategoria({ categoriaId: base.categoriaId, cor: "verde" }),
      );

      expect(erro.code).toBe("ERRO_INESPERADO");
      expect(erro.mensagem).toMatch(
        /^Não foi possível concluir a operação\. Tente de novo\. \(ref\. [0-9a-f-]{36}\)$/,
      );
      expect(erro.mensagem).not.toContain("falha injetada");
      expect(await categorias()).toEqual(antes);
      expect(revalidatePath).not.toHaveBeenCalled();
    } finally {
      falha.mockRestore();
      log.mockRestore();
    }
  });
});

describe("renomearCategoria (COR-04, AC 6)", () => {
  it("grava o nome novo e congela a cor automática que estava em uso", async () => {
    const resultado = await renomearCategoria({
      categoriaId: base.categoriaId,
      nome: "Categoria Dez",
    });

    /* "Categoria Um" é ciano; "Categoria Dez" seria vermelho. */
    expect(resultado).toEqual({
      ok: true,
      data: { id: base.categoriaId, nome: "Categoria Dez", cor: "ciano", renomeada: true },
    });
    expect(await categoria(base.categoriaId)).toEqual({
      id: base.categoriaId,
      nome: "Categoria Dez",
      cor: "ciano",
    });
  });

  it("mantém a cor escolhida", async () => {
    await pool.query("UPDATE categoria SET cor = 'roxo' WHERE id = $1", [base.categoriaId]);

    await renomearCategoria({ categoriaId: base.categoriaId, nome: "Categoria Dez" });

    expect(await categoria(base.categoriaId)).toEqual({
      id: base.categoriaId,
      nome: "Categoria Dez",
      cor: "roxo",
    });
  });

  it("grava o nome normalizado, sem espaço sobrando", async () => {
    await renomearCategoria({ categoriaId: base.categoriaId, nome: "  Categoria   Dez " });

    expect((await categoria(base.categoriaId))?.nome).toBe("Categoria Dez");
  });

  it("só a caixa mudando é um nome novo, e grava", async () => {
    const resultado = await renomearCategoria({
      categoriaId: base.categoriaId,
      nome: "categoria um",
    });

    expect(resultado.ok && resultado.data.renomeada).toBe(true);
    expect(await categoria(base.categoriaId)).toEqual({
      id: base.categoriaId,
      nome: "categoria um",
      cor: "ciano",
    });
  });

  it("revalida as quatro telas que mostram o nome (COR-04, AC 9)", async () => {
    await renomearCategoria({ categoriaId: base.categoriaId, nome: "Categoria Dez" });

    expect([...revalidatePath.mock.calls].sort()).toEqual(ROTAS_REVALIDADAS);
  });
});

describe("renomearCategoria: nome de outra categoria (COR-04, AC 7)", () => {
  it.each([
    ["de uma ativa", "Categoria Dois"],
    ["de uma ativa, em outra caixa", "categoria dois"],
    ["de uma arquivada, que ainda ocupa o nome", "Categoria Arquivada"],
  ])("o nome %s é recusado no campo nome, sem mudar nada", async (_caso, nome) => {
    const antes = await categorias();

    const erro = recusa(await renomearCategoria({ categoriaId: base.categoriaId, nome }));

    expect(erro).toEqual({
      code: "CATEGORIA_JA_EXISTE",
      mensagem: "Já existe outra categoria com esse nome.",
      campos: { nome: "Já existe outra categoria com esse nome." },
    });
    expect(await categorias()).toEqual(antes);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("a arquivada continua arquivada e com o nome dela", async () => {
    await renomearCategoria({ categoriaId: base.categoriaId, nome: "Categoria Arquivada" });

    const { rows } = await pool.query<{ arquivada: boolean }>(
      "SELECT arquivada_em IS NOT NULL AS arquivada FROM categoria WHERE id = $1",
      [arquivada],
    );
    expect(rows[0]?.arquivada).toBe(true);
  });
});

describe("renomearCategoria: nome igual ao atual (Edge Case)", () => {
  it("não grava, não congela a cor e não revalida", async () => {
    const atualizar = vi.spyOn(CadastroRepositoryDrizzle.prototype, "atualizarCategoria");

    try {
      const resultado = await renomearCategoria({
        categoriaId: base.categoriaId,
        nome: "  Categoria   Um ",
      });

      expect(resultado).toEqual({
        ok: true,
        data: { id: base.categoriaId, nome: "Categoria Um", cor: null, renomeada: false },
      });
      expect(atualizar).not.toHaveBeenCalled();
      expect(await categoria(base.categoriaId)).toEqual({
        id: base.categoriaId,
        nome: "Categoria Um",
        cor: null,
      });
      expect(revalidatePath).not.toHaveBeenCalled();
    } finally {
      atualizar.mockRestore();
    }
  });
});

describe("renomearCategoria: recusas e falhas (COR-04, AC 8)", () => {
  it("nome vazio é recusado no campo nome com a mensagem do cadastro", async () => {
    const erro = recusa(await renomearCategoria({ categoriaId: base.categoriaId, nome: "  " }));

    expect(erro.code).toBe("VALIDACAO");
    expect(erro.campos).toEqual({ nome: "Informe o nome da categoria." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("chave a mais é recusada: renomear não troca a cor", async () => {
    const antes = await categorias();

    const erro = recusa(
      await renomearCategoria({
        categoriaId: base.categoriaId,
        nome: "Categoria Dez",
        cor: "verde",
      }),
    );

    expect(erro.code).toBe("VALIDACAO");
    expect(await categorias()).toEqual(antes);
  });

  it("categoria que não existe é recusada, sem revalidar", async () => {
    const erro = recusa(
      await renomearCategoria({ categoriaId: INEXISTENTE, nome: "Categoria Dez" }),
    );

    expect(erro.code).toBe("CATEGORIA_NAO_ENCONTRADA");
    expect(erro.mensagem).toBe("Essa categoria não existe mais.");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("falha do banco vira ERRO_INESPERADO com referência, sem gravar nem revalidar", async () => {
    const antes = await categorias();
    const falha = vi
      .spyOn(CadastroRepositoryDrizzle.prototype, "atualizarCategoria")
      .mockRejectedValueOnce(new Error("falha injetada no banco"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const erro = recusa(
        await renomearCategoria({ categoriaId: base.categoriaId, nome: "Categoria Dez" }),
      );

      expect(erro.code).toBe("ERRO_INESPERADO");
      expect(erro.mensagem).toMatch(
        /^Não foi possível concluir a operação\. Tente de novo\. \(ref\. [0-9a-f-]{36}\)$/,
      );
      expect(await categorias()).toEqual(antes);
      expect(revalidatePath).not.toHaveBeenCalled();
    } finally {
      falha.mockRestore();
      log.mockRestore();
    }
  });
});
