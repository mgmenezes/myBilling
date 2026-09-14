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
 * A Server Action contra o Postgres real (AD-010). O que está sob teste é a
 * borda: sessão, revalidação do payload no servidor e o envelope uniforme.
 *
 * `next/cache` é o único módulo trocado por dublê — `revalidatePath` exige um
 * contexto de requisição do Next que não existe aqui, e o que interessa
 * verificar são as rotas que ela recebe.
 */

process.env.DATABASE_URL = URL_BANCO_DE_TESTE;
process.env.AUTH_SECRET ??= "segredo-local-de-teste-nao-e-credencial";
process.env.AUTH_GOOGLE_ID ??= "client-id-placeholder";
process.env.AUTH_GOOGLE_SECRET ??= "client-secret-placeholder";
process.env.EMAILS_PERMITIDOS = "pessoa-a@example.com,pessoa-b@example.com";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (rota: string) => revalidatePath(rota) }));

/** Sessão do Auth.js: `null` = ninguém logado. O resto de `auth.ts` é o real. */
let sessaoAtual: { user: { email: string; name: string } } | null = null;
vi.mock("@/infrastructure/auth/auth", async (original) => ({
  ...(await original<typeof import("@/infrastructure/auth/auth")>()),
  auth: async () => sessaoAtual,
}));

const { criarCompra } = await import("./compras");
const { criarPool } = await import("@/infrastructure/db/client");

const EMAIL_PERMITIDO = "pessoa-a@example.com";
const EMAIL_NEGADO = "intruso@example.com";

let pool: Pool;
let base: CadastroBase;

function entrada(mudancas: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    idempotencyKey: crypto.randomUUID(),
    descricao: "Compra parcelada A",
    modo: "TOTAL",
    valorCentavos: 100000,
    qtdParcelas: 3,
    parcelaInicial: 1,
    competenciaInicial: "2026-03",
    politicaResiduo: "PRIMEIRAS",
    categoriaId: base.categoriaId,
    usuarioId: base.usuarioId,
    meioPagamentoId: base.cartaoId,
    dataEvento: "2026-03-04",
    ...mudancas,
  };
}

async function contarMovimentos(): Promise<number> {
  const { rows } = await pool.query<{ total: string }>("SELECT COUNT(*) AS total FROM movimento");
  return Number(rows[0]?.total ?? "-1");
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
  sessaoAtual = { user: { email: EMAIL_PERMITIDO, name: "Pessoa A" } };
  revalidatePath.mockClear();
});

describe("criarCompra: sessão (AUTH-02, AC 3)", () => {
  it("`requireSession` é a primeira instrução da action", () => {
    const fonte = readFileSync(new URL("./compras.ts", import.meta.url), "utf8");
    const corpo = fonte.slice(fonte.indexOf("export async function criarCompra"));
    const primeiraInstrucao =
      corpo
        .slice(corpo.indexOf("{") + 1)
        .trim()
        .split("\n")[0] ?? "";

    expect(primeiraInstrucao).toContain("requireSession()");
  });

  it("sem sessão devolve NAO_AUTENTICADO no envelope, sem lançar e sem gravar", async () => {
    sessaoAtual = null;

    const resultado = await criarCompra(entrada());

    expect(resultado.ok).toBe(false);
    if (resultado.ok) {
      return;
    }
    expect(resultado.erro.code).toBe("NAO_AUTENTICADO");
    expect(await contarMovimentos()).toBe(0);
  });

  it("e-mail fora da allowlist devolve ACESSO_NEGADO e não grava nada", async () => {
    sessaoAtual = { user: { email: EMAIL_NEGADO, name: "Intruso" } };

    const resultado = await criarCompra(entrada());

    expect(resultado.ok).toBe(false);
    if (resultado.ok) {
      return;
    }
    expect(resultado.erro.code).toBe("ACESSO_NEGADO");
    expect(await contarMovimentos()).toBe(0);
  });
});

describe("criarCompra: revalidação do payload no servidor (AUTH-02, AC 4)", () => {
  it("rejeita quantidade de parcelas fora da faixa mesmo vindo pronta do cliente", async () => {
    const resultado = await criarCompra(entrada({ qtdParcelas: 121 }));

    expect(resultado.ok).toBe(false);
    if (resultado.ok) {
      return;
    }
    expect(resultado.erro.code).toBe("VALIDACAO");
    expect(resultado.erro.campos?.qtdParcelas).toBe("A compra pode ter no máximo 120 parcelas.");
    expect(await contarMovimentos()).toBe(0);
  });

  it("rejeita payload sem os campos obrigatórios, endereçando cada campo", async () => {
    const resultado = await criarCompra({ descricao: "" });

    expect(resultado.ok).toBe(false);
    if (resultado.ok) {
      return;
    }
    expect(resultado.erro.code).toBe("VALIDACAO");
    expect(Object.keys(resultado.erro.campos ?? {})).toEqual(
      expect.arrayContaining(["descricao", "valorCentavos", "qtdParcelas", "meioPagamentoId"]),
    );
  });

  it("rejeita valor não inteiro: dinheiro é centavo inteiro (AD-001)", async () => {
    const resultado = await criarCompra(entrada({ valorCentavos: 1000.5 }));

    expect(resultado.ok).toBe(false);
    if (resultado.ok) {
      return;
    }
    expect(resultado.erro.campos?.valorCentavos).toBe("O valor precisa ser maior que zero.");
  });
});

describe("criarCompra: erro de domínio vira envelope, nunca exceção", () => {
  it("cartão arquivado devolve MEIO_PAGAMENTO_ARQUIVADO com mensagem em pt-BR", async () => {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO meio_pagamento (nome, tipo, gera_fatura, dia_fechamento, dia_vencimento, arquivado_em)
       VALUES ('Cartão Encerrado', 'CARTAO_CREDITO', true, 15, 25, now()) RETURNING id`,
    );
    const arquivado = rows[0]?.id ?? "";

    const resultado = await criarCompra(entrada({ meioPagamentoId: arquivado }));

    expect(resultado.ok).toBe(false);
    if (resultado.ok) {
      return;
    }
    expect(resultado.erro.code).toBe("MEIO_PAGAMENTO_ARQUIVADO");
    expect(resultado.erro.mensagem).toBe(
      "Esse meio de pagamento está arquivado e não recebe compra nova.",
    );
    expect(resultado.erro.campos?.meioPagamentoId).toBe(resultado.erro.mensagem);
    expect(await contarMovimentos()).toBe(0);
  });

  it("mais parcelas que centavos devolve PARCELA_INFERIOR_A_UM_CENTAVO sem gravar", async () => {
    const resultado = await criarCompra(entrada({ valorCentavos: 2, qtdParcelas: 3 }));

    expect(resultado.ok).toBe(false);
    if (resultado.ok) {
      return;
    }
    expect(resultado.erro.code).toBe("PARCELA_INFERIOR_A_UM_CENTAVO");
    expect(await contarMovimentos()).toBe(0);
  });
});

describe("criarCompra: erro inesperado (UI-02, AC 8)", () => {
  it("devolve ERRO_INESPERADO com identificador de correlação e sem stack trace", async () => {
    const silencio = vi.spyOn(console, "error").mockImplementation(() => {});

    // Categoria que não existe: a chave estrangeira estoura no insert, que é
    // uma falha que a aplicação não previu.
    const resultado = await criarCompra(
      entrada({ categoriaId: "99999999-9999-4999-8999-999999999999" }),
    );

    silencio.mockRestore();

    expect(resultado.ok).toBe(false);
    if (resultado.ok) {
      return;
    }
    expect(resultado.erro.code).toBe("ERRO_INESPERADO");
    expect(resultado.erro.mensagem).toMatch(/informe o código [0-9a-f]{8}\.$/);
    expect(resultado.erro.mensagem).not.toMatch(/at |\.ts:|node_modules|insert|violates/i);
    expect(await contarMovimentos()).toBe(0);
  });
});

describe("criarCompra: sucesso", () => {
  it("grava as 3 parcelas de R$ 1.000,00 em 3x e devolve o envelope de sucesso (PARC-01, AC 1)", async () => {
    const resultado = await criarCompra(entrada());

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) {
      return;
    }
    expect(resultado.data.parcelas).toEqual([
      { numero: 1, valorCentavos: 33334, competencia: "2026-03" },
      { numero: 2, valorCentavos: 33333, competencia: "2026-04" },
      { numero: 3, valorCentavos: 33333, competencia: "2026-05" },
    ]);
    expect(resultado.data.valorTotalCentavos).toBe(100000);
    expect(await contarMovimentos()).toBe(3);
  });

  it("revalida a competência da compra e a de cada parcela", async () => {
    await criarCompra(entrada());

    expect(revalidatePath.mock.calls.map(([rota]) => rota).sort()).toEqual([
      "/2026-03",
      "/2026-04",
      "/2026-05",
    ]);
  });

  it("a mesma chave de idempotência não duplica as parcelas (PARC-05, AC 9)", async () => {
    const payload = entrada();

    const primeira = await criarCompra(payload);
    const segunda = await criarCompra(payload);

    expect(primeira.ok).toBe(true);
    expect(segunda.ok).toBe(true);
    if (!primeira.ok || !segunda.ok) {
      return;
    }
    expect(segunda.data.compraId).toBe(primeira.data.compraId);
    expect(segunda.data.jaExistia).toBe(true);
    expect(await contarMovimentos()).toBe(3);
  });
});
