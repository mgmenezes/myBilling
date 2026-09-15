import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  type CadastroBase,
  criarPoolDeTeste,
  limparDados,
  listarTabelas,
  recriarBancoDeTeste,
  semearCadastroBase,
} from "./testing/banco-de-teste";

/**
 * As restrições do modelo têm que viver no banco, não só no TypeScript.
 * Cada teste aqui tenta gravar um dado inválido e exige que o Postgres
 * recuse, nomeando a restrição que recusou.
 *
 * Erro do Postgres: `23505` = violação de unicidade, `23514` = violação de
 * CHECK. O teste afirma o código E o nome da restrição, porque "deu erro"
 * sozinho passaria também se o INSERT falhasse por digitação errada.
 */

interface ErroPostgres {
  readonly code: string;
  readonly constraint?: string;
}

async function capturarErro(acao: () => Promise<unknown>): Promise<ErroPostgres> {
  try {
    await acao();
  } catch (erro) {
    return erro as ErroPostgres;
  }
  throw new Error("o banco aceitou um dado que deveria ter sido rejeitado");
}

const TABELAS_ESPERADAS = [
  "categoria",
  "compra_parcelada",
  "fatura",
  "meio_pagamento",
  "movimento",
  "orcamento_categoria",
  "pagamento_fatura",
  "recorrencia",
  "recorrencia_versao",
  "usuario",
];

let pool: Pool;
let base: CadastroBase;

beforeAll(async () => {
  pool = criarPoolDeTeste();
  await recriarBancoDeTeste(pool);
}, 60_000);

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await limparDados(pool);
  base = await semearCadastroBase(pool);
});

/** Insere uma compra parcelada válida e devolve o id. */
async function inserirCompra(qtdParcelas = 3, valorTotalCentavos = 100000): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO compra_parcelada
       (descricao, modo_entrada, valor_total_centavos, qtd_parcelas, parcela_inicial,
        competencia_compra, politica_residuo, valor_amortizado_anterior_centavos,
        usuario_id, meio_pagamento_id, idempotency_key)
     VALUES ($1, 'TOTAL', $2, $3, 1, '2026-03-01', 'PRIMEIRAS', 0, $4, $5, $6)
     RETURNING id`,
    [
      "Compra de teste",
      valorTotalCentavos,
      qtdParcelas,
      base.usuarioId,
      base.cartaoId,
      `chave-${crypto.randomUUID()}`,
    ],
  );
  const linha = rows[0];
  if (!linha) {
    throw new Error("compra_parcelada não retornou id");
  }
  return linha.id;
}

async function inserirParcela(
  compraId: string | null,
  numeroParcela: number | null,
  competencia = "2026-03-01",
): Promise<void> {
  await pool.query(
    `INSERT INTO movimento
       (natureza, origem, descricao, competencia, data_evento, valor_centavos,
        usuario_id, meio_pagamento_id, compra_id, numero_parcela)
     VALUES ('DESPESA', 'PARCELA', $1, $2, '2026-03-10', 33334, $3, $4, $5, $6)`,
    ["Parcela de teste", competencia, base.usuarioId, base.cartaoId, compraId, numeroParcela],
  );
}

describe("migration inicial em Postgres real (T29)", () => {
  it("aplica do zero num banco limpo e cria as dez tabelas", async () => {
    await recriarBancoDeTeste(pool);
    const tabelas = await listarTabelas(pool);
    expect(tabelas.filter((t) => TABELAS_ESPERADAS.includes(t))).toEqual(TABELAS_ESPERADAS);
  }, 60_000);

  it("o SQL revisado não contém nenhum DROP", () => {
    const sql = readFileSync(join(process.cwd(), "drizzle", "0000_init.sql"), "utf-8");
    expect(sql).not.toMatch(/\bDROP\b/i);
  });
});

describe("movimento: restrições que impedem dado inválido (MOV-01, MOV-05)", () => {
  it("rejeita duas parcelas com o mesmo (compra_id, numero_parcela) — MOV-05, AC 6", async () => {
    const compraId = await inserirCompra();
    await inserirParcela(compraId, 1);

    const erro = await capturarErro(() => inserirParcela(compraId, 1, "2026-04-01"));

    expect(erro.code).toBe("23505");
    expect(erro.constraint).toBe("movimento_compra_parcela_uq");
  });

  it("aceita a mesma compra com números de parcela distintos", async () => {
    const compraId = await inserirCompra();
    await inserirParcela(compraId, 1, "2026-03-01");
    await inserirParcela(compraId, 2, "2026-04-01");

    const { rows } = await pool.query<{ total: string }>(
      "SELECT count(*)::text AS total FROM movimento WHERE compra_id = $1",
      [compraId],
    );
    expect(rows[0]?.total).toBe("2");
  });

  it("rejeita competência fora do dia 1 — AD-002", async () => {
    const compraId = await inserirCompra();

    const erro = await capturarErro(() => inserirParcela(compraId, 1, "2026-03-15"));

    expect(erro.code).toBe("23514");
    expect(erro.constraint).toBe("movimento_competencia_dia_1");
  });

  it("rejeita origem PARCELA sem compra_id — AD-003", async () => {
    const erro = await capturarErro(() => inserirParcela(null, 1));

    expect(erro.code).toBe("23514");
    expect(erro.constraint).toBe("movimento_parcela_sse_compra");
  });

  it("rejeita origem PARCELA sem numero_parcela — AD-003", async () => {
    const compraId = await inserirCompra();

    const erro = await capturarErro(() => inserirParcela(compraId, null));

    expect(erro.code).toBe("23514");
    expect(erro.constraint).toBe("movimento_parcela_sse_compra");
  });

  it("rejeita origem AVULSO carregando vínculo de parcela — AD-003", async () => {
    const compraId = await inserirCompra();

    const erro = await capturarErro(() =>
      pool.query(
        `INSERT INTO movimento
           (natureza, origem, descricao, competencia, data_evento, valor_centavos,
            usuario_id, meio_pagamento_id, compra_id, numero_parcela)
         VALUES ('DESPESA', 'AVULSO', 'Avulso com vínculo', '2026-03-01', '2026-03-10', 1000, $1, $2, $3, 1)`,
        [base.usuarioId, base.cartaoId, compraId],
      ),
    );

    expect(erro.code).toBe("23514");
    expect(erro.constraint).toBe("movimento_parcela_sse_compra");
  });

  it("rejeita a mesma ocorrência de recorrência na mesma competência — REC-02, AC 3", async () => {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO recorrencia
         (descricao, natureza, usuario_id, meio_pagamento_id, competencia_inicio, dia_vencimento)
       VALUES ('Recorrência de teste', 'DESPESA', $1, $2, '2026-03-01', 10) RETURNING id`,
      [base.usuarioId, base.contaId],
    );
    const recorrenciaId = rows[0]?.id;
    const inserir = () =>
      pool.query(
        `INSERT INTO movimento
           (natureza, origem, descricao, competencia, data_evento, valor_centavos,
            usuario_id, meio_pagamento_id, recorrencia_id)
         VALUES ('DESPESA', 'RECORRENCIA', 'Ocorrência', '2026-03-01', '2026-03-10', 30000, $1, $2, $3)`,
        [base.usuarioId, base.contaId, recorrenciaId],
      );
    await inserir();

    const erro = await capturarErro(inserir);

    expect(erro.code).toBe("23505");
    expect(erro.constraint).toBe("movimento_recorrencia_competencia_uq");
  });
});

describe("movimento: o razão não aceita valor não positivo (AVUL-01)", () => {
  async function inserirAvulso(valorCentavos: number): Promise<void> {
    await pool.query(
      `INSERT INTO movimento
         (natureza, origem, descricao, competencia, data_evento, valor_centavos,
          usuario_id, meio_pagamento_id)
       VALUES ('DESPESA', 'AVULSO', $1, '2026-03-01', '2026-03-10', $2, $3, $4)`,
      ["Avulso de teste", valorCentavos, base.usuarioId, base.contaId],
    );
  }

  it("rejeita valor zero", async () => {
    const erro = await capturarErro(() => inserirAvulso(0));

    expect(erro.code).toBe("23514");
    expect(erro.constraint).toBe("movimento_valor_positivo");
  });

  it("rejeita valor negativo", async () => {
    const erro = await capturarErro(() => inserirAvulso(-1));

    expect(erro.code).toBe("23514");
    expect(erro.constraint).toBe("movimento_valor_positivo");
  });

  it("aceita um centavo, que é o menor valor válido", async () => {
    await inserirAvulso(1);

    const { rows } = await pool.query<{ total: string }>(
      "SELECT count(*)::text AS total FROM movimento WHERE valor_centavos = 1",
    );
    expect(rows[0]?.total).toBe("1");
  });
});

describe("restrições dos demais agregados", () => {
  it("rejeita conta corrente marcada como geradora de fatura — CART-02, AC 5", async () => {
    const erro = await capturarErro(() =>
      pool.query(
        "INSERT INTO meio_pagamento (nome, tipo, gera_fatura, dia_fechamento, dia_vencimento) VALUES ($1, 'CONTA_CORRENTE', true, 25, 5)",
        ["Conta que finge ser cartão"],
      ),
    );

    expect(erro.code).toBe("23514");
    expect(erro.constraint).toBe("meio_pagamento_gera_fatura_sse_cartao");
  });

  it("rejeita compra com mais parcelas do que centavos — PARC-01, AC 5", async () => {
    const erro = await capturarErro(() => inserirCompra(3, 2));

    expect(erro.code).toBe("23514");
    expect(erro.constraint).toBe("compra_parcelada_parcela_min_um_centavo");
  });

  it("rejeita duas faturas do mesmo cartão na mesma competência", async () => {
    const inserir = () =>
      pool.query(
        `INSERT INTO fatura (cartao_id, competencia_fatura, ciclo_inicio, ciclo_fim, data_vencimento)
         VALUES ($1, '2026-04-01', '2026-02-26', '2026-03-25', '2026-04-05')`,
        [base.cartaoId],
      );
    await inserir();

    const erro = await capturarErro(inserir);

    expect(erro.code).toBe("23505");
    expect(erro.constraint).toBe("fatura_cartao_competencia_uq");
  });

  it("rejeita a mesma linha importada duas vezes e ignora as manuais — índice parcial", async () => {
    const importar = (hash: string) =>
      pool.query(
        `INSERT INTO movimento
           (natureza, origem, descricao, competencia, data_evento, valor_centavos,
            usuario_id, meio_pagamento_id, origem_dado, origem_hash)
         VALUES ('DESPESA', 'AVULSO', 'Importado', '2026-03-01', '2026-03-10', 5000, $1, $2, 'CSV_PLANILHA', $3)`,
        [base.usuarioId, base.contaId, hash],
      );
    await importar("hash-a");

    const erro = await capturarErro(() => importar("hash-a"));

    expect(erro.code).toBe("23505");
    expect(erro.constraint).toBe("movimento_origem_dado_hash_uq");
  });

  it("não bloqueia dois lançamentos manuais, que ficam fora do índice parcial", async () => {
    const manual = () =>
      pool.query(
        `INSERT INTO movimento
           (natureza, origem, descricao, competencia, data_evento, valor_centavos,
            usuario_id, meio_pagamento_id)
         VALUES ('DESPESA', 'AVULSO', 'Manual', '2026-03-01', '2026-03-10', 5000, $1, $2)`,
        [base.usuarioId, base.contaId],
      );
    await manual();
    await manual();

    const { rows } = await pool.query<{ total: string }>(
      "SELECT count(*)::text AS total FROM movimento WHERE origem_dado IS NULL",
    );
    expect(rows[0]?.total).toBe("2");
  });
});

/**
 * Conjunto **exato** de colunas de `pagamento_fatura` (AD-003, MOV-02 AC 2).
 * Lido de `information_schema`, e não do objeto Drizzle, porque o que vale é
 * o que a migration criou no banco. Ordenado por nome, como vem da consulta:
 * com nomes de coluna únicos, igualdade de lista ordenada é igualdade de
 * conjunto — e pega tanto coluna a menos quanto coluna a mais.
 */
const COLUNAS_PAGAMENTO_FATURA = [
  "criado_em",
  "data_pagamento",
  "fatura_id",
  "id",
  "valor_pago_centavos",
];

async function listarColunas(tabela: string): Promise<string[]> {
  const { rows } = await pool.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY column_name`,
    [tabela],
  );
  return rows.map((r) => r.column_name);
}

describe("forma de pagamento_fatura: a anti-dupla-contagem é estrutural (MOV-02, AC 2)", () => {
  it("tem exatamente as colunas do eixo caixa — nenhuma a mais, nenhuma a menos", async () => {
    const colunas = await listarColunas("pagamento_fatura");

    expect(
      colunas,
      "o conjunto de colunas de pagamento_fatura é fechado de propósito (AD-003): " +
        "acrescentar coluna aqui abre caminho para consulta de gasto ler esta tabela. " +
        "Se a mudança é mesmo desejada, mude o AD-003 antes de mudar este teste.",
    ).toEqual(COLUNAS_PAGAMENTO_FATURA);
  });

  it("não tem natureza nem categoria_id, para que somar fatura com compra não compile", async () => {
    const colunas = await listarColunas("pagamento_fatura");

    expect(
      colunas,
      "pagamento_fatura ganhou a coluna `natureza`. Toda consulta do eixo competência " +
        "filtra por natureza; com a coluna aqui, o pagamento da fatura passa a poder ser " +
        "somado junto com a compra que o originou — a dupla contagem que o AD-003 existe " +
        "para tornar impossível de escrever. Remova a coluna; não relaxe este teste.",
    ).not.toContain("natureza");
    expect(
      colunas,
      "pagamento_fatura ganhou a coluna `categoria_id`. Toda consulta do eixo competência " +
        "agrupa por categoria; com a coluna aqui, o pagamento da fatura entra na " +
        "distribuição por categoria e o gasto é contado duas vezes (AD-003). " +
        "Remova a coluna; não relaxe este teste.",
    ).not.toContain("categoria_id");
  });

  it("movimento mantém natureza e categoria_id, que são o que o eixo competência lê", async () => {
    const colunas = await listarColunas("movimento");

    expect(
      colunas,
      "movimento perdeu natureza ou categoria_id. A garantia do AD-003 é relativa: " +
        "pagamento_fatura é ilegível para o eixo competência porque é exatamente destas " +
        "duas colunas que aquelas consultas dependem. Sem elas no razão, a separação some.",
    ).toEqual(expect.arrayContaining(["natureza", "categoria_id"]));
  });
});
