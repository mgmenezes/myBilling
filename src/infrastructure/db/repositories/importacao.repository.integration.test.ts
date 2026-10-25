import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { ImportacaoRegistrada } from "@/application/ports/repositories";
import type { Cents, Competencia, DecisoesDaImportacao } from "@/domain";
import { type BancoDeDados, criarCliente, criarPool } from "../client";
import {
  type CadastroBase,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
  URL_BANCO_DE_TESTE,
} from "../testing/banco-de-teste";
import { ImportacaoRepositoryDrizzle } from "./importacao.repository";
import { MovimentoRepositoryDrizzle } from "./movimento.repository";
import { RecorrenciaRepositoryDrizzle } from "./recorrencia.repository";

/**
 * O registro da importação contra Postgres real (T14): de onde sai a última
 * competência importada (IMP-02 AC 4), a guarda da primeira importação
 * (IMP-02 AC 6) e as decisões lembradas por upsert (IMP-04 AC 4).
 */

const c = (texto: string) => texto as Competencia;

let pool: Pool;
let db: BancoDeDados;
let base: CadastroBase;
let contaDois: string;
let repo: ImportacaoRepositoryDrizzle;

beforeAll(async () => {
  pool = criarPool(URL_BANCO_DE_TESTE);
  db = criarCliente(pool);
  await recriarBancoDeTeste(pool);
}, 60_000);

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await limparDados(pool);
  base = await semearCadastroBase(pool);
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO meio_pagamento (nome, tipo, gera_fatura) VALUES ($1, 'CONTA_CORRENTE', false) RETURNING id`,
    ["Conta Dois"],
  );
  contaDois = rows[0]?.id ?? "";
  repo = new ImportacaoRepositoryDrizzle(db);
});

function registro(competencia: string, nomeArquivo: string): ImportacaoRegistrada {
  return { competencia: c(competencia), nomeArquivo, usuarioId: base.usuarioId };
}

function semDecisoes(): DecisoesDaImportacao {
  return { meios: new Map(), entradas: new Map() };
}

describe("ultimaCompetenciaImportada (T14, IMP-02 AC 4)", () => {
  it("é null sem registro", async () => {
    expect(await repo.ultimaCompetenciaImportada()).toBeNull();
  });

  it("é 2026-11 depois de registrar outubro e novembro", async () => {
    await repo.registrar(registro("2026-10", "Planilha 2026 - Outubro.csv"), semDecisoes());
    await repo.registrar(registro("2026-11", "Planilha 2026 - Novembro.csv"), semDecisoes());

    expect(await repo.ultimaCompetenciaImportada()).toBe("2026-11");
  });
});

describe("haLancamentoCompraOuRecorrencia (T14, IMP-02 AC 6)", () => {
  it("é false no banco limpo, só com os cadastros", async () => {
    expect(await repo.haLancamentoCompraOuRecorrencia()).toBe(false);
  });

  it("é true com um avulso, mesmo cancelado", async () => {
    const movimentos = new MovimentoRepositoryDrizzle(db);
    const avulso = await movimentos.criarAvulso({
      natureza: "DESPESA",
      descricao: "Avulso cancelado",
      competencia: c("2026-09"),
      dataEvento: "2026-09-10",
      valor: 5000 as Cents,
      pagoEm: null,
      categoriaId: null,
      usuarioId: base.usuarioId,
      meioPagamentoId: base.contaId,
    });
    await movimentos.cancelar(avulso.id, "2026-09-11T12:00:00.000Z");

    expect(await repo.haLancamentoCompraOuRecorrencia()).toBe(true);
  });

  it("é true com uma compra parcelada sem nenhum movimento", async () => {
    await pool.query(
      `INSERT INTO compra_parcelada
         (descricao, modo_entrada, valor_total_centavos, qtd_parcelas, parcela_inicial,
          competencia_compra, politica_residuo, valor_amortizado_anterior_centavos,
          usuario_id, meio_pagamento_id, idempotency_key)
       VALUES ('Compra de teste', 'TOTAL', 100000, 3, 1, '2026-09-01', 'PRIMEIRAS', 0, $1, $2, $3)`,
      [base.usuarioId, base.cartaoId, "chave-sem-movimento"],
    );

    expect(await repo.haLancamentoCompraOuRecorrencia()).toBe(true);
  });

  it("é true com uma recorrência sem nenhum movimento", async () => {
    await new RecorrenciaRepositoryDrizzle(db).criar({
      dados: {
        descricao: "Conta fixa A",
        natureza: "DESPESA",
        categoriaId: null,
        usuarioId: base.usuarioId,
        meioPagamentoId: base.contaId,
        competenciaInicio: c("2026-09"),
        competenciaFim: null,
        diaVencimento: 1,
      },
      valorInicial: 18000 as Cents,
    });

    expect(await repo.haLancamentoCompraOuRecorrencia()).toBe(true);
  });
});

describe("registrar e decisoesLembradas (T14, IMP-04 AC 4)", () => {
  it("grava a importação e substitui a decisão repetida em vez de duplicá-la", async () => {
    await repo.registrar(registro("2026-10", "Planilha 2026 - Outubro.csv"), {
      meios: new Map([
        ["débito", base.contaId],
        ["cartão roxo", base.cartaoId],
      ]),
      entradas: new Map([["salário a", { classe: "FIXA", contaId: base.contaId }]]),
    });

    await repo.registrar(registro("2026-11", "Planilha 2026 - Novembro.csv"), {
      meios: new Map([["cartão roxo", contaDois]]),
      entradas: new Map([["salário a", { classe: "AVULSA", contaId: contaDois }]]),
    });

    const { rows: importacoes } = await pool.query<{
      competencia: string;
      nome_arquivo: string;
      usuario_id: string;
    }>("SELECT competencia::text, nome_arquivo, usuario_id FROM importacao ORDER BY competencia");
    expect(importacoes).toEqual([
      {
        competencia: "2026-10-01",
        nome_arquivo: "Planilha 2026 - Outubro.csv",
        usuario_id: base.usuarioId,
      },
      {
        competencia: "2026-11-01",
        nome_arquivo: "Planilha 2026 - Novembro.csv",
        usuario_id: base.usuarioId,
      },
    ]);
    const lembradas = await repo.decisoesLembradas();
    expect(Object.fromEntries(lembradas.meios)).toEqual({
      débito: base.contaId,
      "cartão roxo": contaDois,
    });
    expect(Object.fromEntries(lembradas.entradas)).toEqual({
      "salário a": { classe: "AVULSA", contaId: contaDois },
    });
    const { rows } = await pool.query<{ total: string }>(
      "SELECT count(*)::text AS total FROM importacao_decisao",
    );
    expect(rows[0]?.total).toBe("3");
  });

  it("decisoesLembradas é vazio antes da primeira importação", async () => {
    const lembradas = await repo.decisoesLembradas();

    expect(lembradas.meios.size).toBe(0);
    expect(lembradas.entradas.size).toBe(0);
  });
});
