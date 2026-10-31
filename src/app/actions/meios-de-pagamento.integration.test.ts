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
 * As Server Actions de meio de pagamento contra o Postgres real (AD-010).
 * Testes derivados de CADCOL-07 (ACs 5, 6, 9 a 12 e 14) e CADCOL-08 (ACs 4 e
 * 5).
 *
 * O que está sob teste é a borda e a gravação: sessão antes de tudo, payload
 * revalidado no servidor, o nome e os dias lidos de volta do banco, cada recusa
 * com a mensagem e o campo, sem gravar nada, e o layout raiz revalidado só
 * quando algo mudou. `next/cache` é o único módulo trocado por dublê:
 * `revalidatePath` exige um contexto de requisição do Next que não existe aqui.
 *
 * O semeado traz "Cartão Roxo" (fecha 25, vence 5) e "Conta Corrente". Nomes
 * genéricos (AD-009).
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

const { criarMeioDePagamento, editarMeioDePagamento } = await import("./meios-de-pagamento");
const { criarPool } = await import("@/infrastructure/db/client");
const { CadastroRepositoryDrizzle } = await import(
  "@/infrastructure/db/repositories/cadastro.repository"
);

const EMAIL_PERMITIDO = "pessoa-a@example.com";
const INEXISTENTE = "99999999-9999-4999-8999-999999999999";

/** O layout raiz: alcança o diálogo de importação, no layout de `(app)`, e toda tela de mês. */
const LAYOUT_RAIZ = [["/", "layout"]];

let pool: Pool;
let base: CadastroBase;
let arquivado: string;

interface LinhaDoMeio {
  readonly id: string;
  readonly nome: string;
  readonly tipo: string;
  readonly dia_fechamento: number | null;
  readonly dia_vencimento: number | null;
  readonly arquivado: boolean;
}

async function meios(): Promise<ReadonlyArray<LinhaDoMeio>> {
  const { rows } = await pool.query<LinhaDoMeio>(
    `SELECT id, nome, tipo::text AS tipo, dia_fechamento, dia_vencimento,
            arquivado_em IS NOT NULL AS arquivado
       FROM meio_pagamento ORDER BY nome, id`,
  );
  return rows;
}

async function meio(id: string): Promise<LinhaDoMeio | undefined> {
  return (await meios()).find((linha) => linha.id === id);
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
  const fonte = readFileSync(new URL("./meios-de-pagamento.ts", import.meta.url), "utf8");
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
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO meio_pagamento (nome, tipo, gera_fatura, arquivado_em)
     VALUES ('Cartão Antigo', 'CONTA_CORRENTE', false, '2026-01-01T00:00:00Z') RETURNING id`,
  );
  arquivado = rows[0]?.id ?? "";
  sessaoAtual = { user: { email: EMAIL_PERMITIDO, name: "Pessoa A" } };
  revalidatePath.mockClear();
});

describe("sessão antes de tudo", () => {
  it.each(["editarMeioDePagamento", "criarMeioDePagamento"])(
    "`requireSession` é a primeira instrução de %s",
    (nome) => {
      expect(primeiraInstrucao(nome)).toContain("requireSession()");
    },
  );

  it("sem sessão, as duas recusam com NAO_AUTENTICADO, sem tocar no banco nem revalidar", async () => {
    sessaoAtual = null;
    const antes = await meios();
    const busca = vi.spyOn(CadastroRepositoryDrizzle.prototype, "buscarMeioDePagamento");
    const buscaPorNome = vi.spyOn(
      CadastroRepositoryDrizzle.prototype,
      "buscarMeioDePagamentoAtivoPorNome",
    );

    try {
      const edicao = await editarMeioDePagamento({
        meioPagamentoId: base.cartaoId,
        nome: "Cartão Lilás",
        ciclo: { diaFechamento: 25, diaVencimento: 5 },
      });
      const criacao = await criarMeioDePagamento({ nome: "Conta Nova", tipo: "CONTA_CORRENTE" });

      expect(recusa(edicao).code).toBe("NAO_AUTENTICADO");
      expect(recusa(criacao).code).toBe("NAO_AUTENTICADO");
      expect(busca).not.toHaveBeenCalled();
      expect(buscaPorNome).not.toHaveBeenCalled();
      expect(await meios()).toEqual(antes);
      expect(revalidatePath).not.toHaveBeenCalled();
    } finally {
      busca.mockRestore();
      buscaPorNome.mockRestore();
    }
  });
});

describe("editarMeioDePagamento: grava (CADCOL-07, ACs 5 e 14)", () => {
  it("grava o nome e os dias novos, lidos de volta do banco", async () => {
    const resultado = await editarMeioDePagamento({
      meioPagamentoId: base.cartaoId,
      nome: "  Cartão   Lilás ",
      ciclo: { diaFechamento: 10, diaVencimento: 17 },
    });

    expect(resultado).toEqual({
      ok: true,
      data: { id: base.cartaoId, nome: "Cartão Lilás", alterado: true },
    });
    expect(await meio(base.cartaoId)).toEqual({
      id: base.cartaoId,
      nome: "Cartão Lilás",
      tipo: "CARTAO_CREDITO",
      dia_fechamento: 10,
      dia_vencimento: 17,
      arquivado: false,
    });
  });

  it("grava o nome novo da conta, sem dias", async () => {
    await editarMeioDePagamento({ meioPagamentoId: base.contaId, nome: "Conta Azul", ciclo: null });

    expect(await meio(base.contaId)).toMatchObject({
      nome: "Conta Azul",
      dia_fechamento: null,
      dia_vencimento: null,
    });
  });

  it("revalida o layout raiz uma vez", async () => {
    await editarMeioDePagamento({
      meioPagamentoId: base.cartaoId,
      nome: "Cartão Roxo",
      ciclo: { diaFechamento: 10, diaVencimento: 17 },
    });

    expect(revalidatePath.mock.calls).toEqual(LAYOUT_RAIZ);
  });

  it("o nome de um meio arquivado grava (AC 7)", async () => {
    const resultado = await editarMeioDePagamento({
      meioPagamentoId: base.contaId,
      nome: "Cartão Antigo",
      ciclo: null,
    });

    expect(resultado.ok && resultado.data.alterado).toBe(true);
    expect((await meio(base.contaId))?.nome).toBe("Cartão Antigo");
  });

  it("o próprio nome mudando só a caixa grava (AC 8)", async () => {
    await editarMeioDePagamento({
      meioPagamentoId: base.cartaoId,
      nome: "cartão roxo",
      ciclo: { diaFechamento: 25, diaVencimento: 5 },
    });

    expect((await meio(base.cartaoId))?.nome).toBe("cartão roxo");
  });
});

describe("editarMeioDePagamento: nada mudou (CADCOL-07, AC 9)", () => {
  it("nome com espaço sobrando e os mesmos dias não gravam nem revalidam", async () => {
    const antes = await meios();
    const gravacao = vi.spyOn(CadastroRepositoryDrizzle.prototype, "atualizarMeioDePagamento");

    try {
      const resultado = await editarMeioDePagamento({
        meioPagamentoId: base.cartaoId,
        nome: "  Cartão   Roxo ",
        ciclo: { diaFechamento: 25, diaVencimento: 5 },
      });

      expect(resultado).toEqual({
        ok: true,
        data: { id: base.cartaoId, nome: "Cartão Roxo", alterado: false },
      });
      expect(gravacao).not.toHaveBeenCalled();
      expect(await meios()).toEqual(antes);
      expect(revalidatePath).not.toHaveBeenCalled();
    } finally {
      gravacao.mockRestore();
    }
  });
});

describe("editarMeioDePagamento: recusas, sem gravar nem revalidar (CADCOL-07, ACs 6, 10, 11 e 12)", () => {
  it.each([
    ["de outro meio ativo", "Conta Corrente"],
    ["de outro meio ativo, em outra caixa", "conta corrente"],
  ])("o nome %s é recusado no campo nome", async (_caso, nome) => {
    const antes = await meios();

    const erro = recusa(
      await editarMeioDePagamento({
        meioPagamentoId: base.cartaoId,
        nome,
        ciclo: { diaFechamento: 25, diaVencimento: 5 },
      }),
    );

    expect(erro).toEqual({
      code: "MEIO_PAGAMENTO_JA_EXISTE",
      mensagem: "Já existe outro meio de pagamento com esse nome.",
      campos: { nome: "Já existe outro meio de pagamento com esse nome." },
    });
    expect(await meios()).toEqual(antes);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    ["que não existe", () => INEXISTENTE],
    ["arquivado", () => arquivado],
  ])("o meio %s é recusado como inexistente", async (_caso, id) => {
    const antes = await meios();

    const erro = recusa(
      await editarMeioDePagamento({ meioPagamentoId: id(), nome: "Conta Nova", ciclo: null }),
    );

    expect(erro.code).toBe("MEIO_PAGAMENTO_NAO_ENCONTRADO");
    expect(erro.mensagem).toBe("Esse meio de pagamento não existe mais.");
    expect(await meios()).toEqual(antes);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    ["dias para a conta", () => base.contaId, { diaFechamento: 10, diaVencimento: 17 }],
    ["o cartão sem os dias", () => base.cartaoId, null],
  ])("%s é recusado com a mensagem do ciclo", async (_caso, id, ciclo) => {
    const antes = await meios();

    const erro = recusa(
      await editarMeioDePagamento({ meioPagamentoId: id(), nome: "Meio Novo", ciclo }),
    );

    expect(erro).toEqual({
      code: "CICLO_NAO_CORRESPONDE_AO_TIPO",
      mensagem:
        "Dia de fechamento e de vencimento existem só no cartão de crédito, e nele são obrigatórios.",
    });
    expect(await meios()).toEqual(antes);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    ["nome vazio", { nome: "  " }, { nome: "Informe o nome do meio de pagamento." }],
    [
      "nome com 41 caracteres",
      { nome: "a".repeat(41) },
      { nome: "O nome pode ter no máximo 40 caracteres." },
    ],
    [
      "fechamento 0",
      { ciclo: { diaFechamento: 0, diaVencimento: 5 } },
      { "ciclo.diaFechamento": "O dia de fechamento vai de 1 a 31." },
    ],
    [
      "vencimento 32",
      { ciclo: { diaFechamento: 25, diaVencimento: 32 } },
      { "ciclo.diaVencimento": "O dia de vencimento vai de 1 a 31." },
    ],
  ])("%s é VALIDACAO com o campo e a mensagem da criação", async (_caso, troca, campos) => {
    const antes = await meios();

    const erro = recusa(
      await editarMeioDePagamento({
        meioPagamentoId: base.cartaoId,
        nome: "Cartão Roxo",
        ciclo: { diaFechamento: 25, diaVencimento: 5 },
        ...troca,
      }),
    );

    expect(erro.code).toBe("VALIDACAO");
    expect(erro.campos).toEqual(campos);
    expect(await meios()).toEqual(antes);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("chave a mais é recusada: a edição não troca o tipo", async () => {
    const antes = await meios();

    const erro = recusa(
      await editarMeioDePagamento({
        meioPagamentoId: base.cartaoId,
        nome: "Cartão Roxo",
        ciclo: { diaFechamento: 25, diaVencimento: 5 },
        tipo: "CONTA_CORRENTE",
      }),
    );

    expect(erro.code).toBe("VALIDACAO");
    expect(await meios()).toEqual(antes);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("editarMeioDePagamento: falha do banco (UI-02, AC 8)", () => {
  it("vira ERRO_INESPERADO com referência, sem gravar nem revalidar", async () => {
    const antes = await meios();
    const falha = vi
      .spyOn(CadastroRepositoryDrizzle.prototype, "atualizarMeioDePagamento")
      .mockRejectedValueOnce(new Error("falha injetada no banco"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const erro = recusa(
        await editarMeioDePagamento({
          meioPagamentoId: base.cartaoId,
          nome: "Cartão Lilás",
          ciclo: { diaFechamento: 25, diaVencimento: 5 },
        }),
      );

      expect(erro.code).toBe("ERRO_INESPERADO");
      expect(erro.mensagem).toMatch(
        /^Não foi possível concluir a operação\. Tente de novo\. \(ref\. [0-9a-f-]{36}\)$/,
      );
      expect(erro.mensagem).not.toContain("falha injetada");
      expect(await meios()).toEqual(antes);
      expect(revalidatePath).not.toHaveBeenCalled();
    } finally {
      falha.mockRestore();
      log.mockRestore();
    }
  });
});

describe("criarMeioDePagamento (CADCOL-08, ACs 4 e 5)", () => {
  it("cria o meio e revalida o layout raiz uma vez", async () => {
    const resultado = await criarMeioDePagamento({
      nome: "Cartão Novo",
      tipo: "CARTAO_CREDITO",
      diaFechamento: 3,
      diaVencimento: 10,
    });

    if (!resultado.ok) {
      throw new Error(`esperava sucesso, veio ${resultado.erro.code}`);
    }
    expect(await meio(resultado.data.id)).toEqual({
      id: resultado.data.id,
      nome: "Cartão Novo",
      tipo: "CARTAO_CREDITO",
      dia_fechamento: 3,
      dia_vencimento: 10,
      arquivado: false,
    });
    expect(revalidatePath.mock.calls).toEqual(LAYOUT_RAIZ);
  });

  it.each(["Conta Corrente", "conta corrente"])(
    "o nome %p de um meio ativo é recusado no campo nome, sem criar nem revalidar",
    async (nome) => {
      const antes = await meios();

      const erro = recusa(await criarMeioDePagamento({ nome, tipo: "CONTA_CORRENTE" }));

      expect(erro).toEqual({
        code: "VALIDACAO",
        mensagem: "Já existe um meio de pagamento com esse nome.",
        campos: { nome: "Já existe um meio de pagamento com esse nome." },
      });
      expect(await meios()).toEqual(antes);
      expect(revalidatePath).not.toHaveBeenCalled();
    },
  );

  it("o nome de um meio arquivado cria outro meio", async () => {
    const resultado = await criarMeioDePagamento({ nome: "Cartão Antigo", tipo: "CONTA_CORRENTE" });

    expect(resultado.ok).toBe(true);
    const homonimos = (await meios()).filter((linha) => linha.nome === "Cartão Antigo");
    expect(homonimos.map((linha) => linha.arquivado)).toEqual(
      expect.arrayContaining([true, false]),
    );
    expect(homonimos).toHaveLength(2);
    expect(revalidatePath.mock.calls).toEqual(LAYOUT_RAIZ);
  });
});
