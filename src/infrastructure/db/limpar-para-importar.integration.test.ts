import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  type Cents,
  type Competencia,
  criarCompetencia,
  gerarParcelas,
  type PlanoParcelamento,
} from "@/domain";
import { type BancoDeDados, criarCliente, criarPool } from "./client";
import { CompraRepositoryDrizzle } from "./repositories/compra.repository";
import { ImportacaoRepositoryDrizzle } from "./repositories/importacao.repository";
import { MovimentoRepositoryDrizzle } from "./repositories/movimento.repository";
import { RecorrenciaRepositoryDrizzle } from "./repositories/recorrencia.repository";
import {
  type CadastroBase,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
  URL_BANCO_DE_TESTE,
} from "./testing/banco-de-teste";

/**
 * O script que o dono roda para recomeçar as importações (IMP-09). O teste lê
 * o arquivo como ele está e o executa contra um banco com dado em **todas** as
 * tabelas, inclusive as que apontam para as que ele esvazia: é o que prova que
 * nenhuma chave estrangeira o barra sem `CASCADE`.
 *
 * Valores por propriedade (AD-009): R$ 1.000,00 em 3x é o rateio com resíduo.
 */

const SCRIPT = readFileSync(
  join(process.cwd(), "src", "infrastructure", "db", "sql", "limpar-para-importar.sql"),
  "utf-8",
);

const ESVAZIADAS = [
  "movimento",
  "compra_parcelada",
  "recorrencia_versao",
  "recorrencia",
  "importacao",
  "importacao_decisao",
] as const;

function competencia(texto: string): Competencia {
  const resultado = criarCompetencia(texto);
  if (!resultado.ok) {
    throw new Error(`fixture inválida: ${texto}`);
  }
  return resultado.value;
}

function planoDeMilReaisEmTres(): PlanoParcelamento {
  const resultado = gerarParcelas({
    modo: "TOTAL",
    valorEntrada: 100000 as Cents,
    qtdParcelas: 3,
    competenciaCompra: competencia("2026-10"),
    parcelaInicial: 1,
    politicaResiduo: "PRIMEIRAS",
  });
  if (!resultado.ok) {
    throw new Error("fixture inválida");
  }
  return resultado.value;
}

let pool: Pool;
let db: BancoDeDados;
let base: CadastroBase;

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
});

/** Uma linha em cada uma das doze tabelas, com todas as chaves estrangeiras preenchidas. */
async function popularTudo(): Promise<void> {
  await pool.query(
    `INSERT INTO categoria (nome, arquivada_em) VALUES ('Categoria Dois', '2026-09-01T00:00:00Z')`,
  );
  await pool.query(
    `INSERT INTO orcamento_categoria (categoria_id, competencia, limite_centavos)
     VALUES ($1, '2026-10-01', 50000)`,
    [base.categoriaId],
  );
  const fatura = await pool.query<{ id: string }>(
    `INSERT INTO fatura (cartao_id, competencia_fatura, ciclo_inicio, ciclo_fim, data_vencimento)
     VALUES ($1, '2026-10-01', '2026-09-26', '2026-10-25', '2026-11-05') RETURNING id`,
    [base.cartaoId],
  );
  const faturaId = fatura.rows[0]?.id ?? "";
  await pool.query(
    `INSERT INTO pagamento_fatura (fatura_id, data_pagamento, valor_pago_centavos)
     VALUES ($1, '2026-11-05', 1000)`,
    [faturaId],
  );

  const compra = await new CompraRepositoryDrizzle(db).salvarComParcelas({
    idempotencyKey: "chave-limpeza",
    dados: {
      descricao: "Compra de teste",
      modo: "TOTAL",
      politicaResiduo: "PRIMEIRAS",
      competenciaCompra: competencia("2026-10"),
      qtdParcelas: 3,
      parcelaInicial: 1,
      categoriaId: base.categoriaId,
      usuarioId: base.usuarioId,
      meioPagamentoId: base.cartaoId,
      dataEvento: "2026-10-01",
    },
    plano: planoDeMilReaisEmTres(),
  });
  if (!compra.ok) {
    throw new Error("fixture inválida");
  }
  await pool.query("UPDATE movimento SET fatura_id = $1 WHERE compra_id = $2", [
    faturaId,
    compra.value.id,
  ]);

  const recorrencia = await new RecorrenciaRepositoryDrizzle(db).criar({
    dados: {
      descricao: "Conta fixa A",
      natureza: "DESPESA",
      categoriaId: base.categoriaId,
      usuarioId: base.usuarioId,
      meioPagamentoId: base.contaId,
      competenciaInicio: competencia("2026-10"),
      competenciaFim: null,
      diaVencimento: 1,
    },
    valorInicial: 18000 as Cents,
  });
  const movimentos = new MovimentoRepositoryDrizzle(db);
  await movimentos.materializarOcorrencias([
    {
      recorrenciaId: recorrencia.id,
      natureza: "DESPESA",
      descricao: "Conta fixa A",
      competencia: competencia("2026-10"),
      dataEvento: "2026-10-01",
      valorPrevisto: 18000 as Cents,
      categoriaId: base.categoriaId,
      usuarioId: base.usuarioId,
      meioPagamentoId: base.contaId,
    },
  ]);
  await movimentos.criarAvulso({
    natureza: "DESPESA",
    descricao: "Linha importada",
    competencia: competencia("2026-10"),
    dataEvento: "2026-10-01",
    valor: 1200 as Cents,
    pagoEm: null,
    categoriaId: base.categoriaId,
    usuarioId: base.usuarioId,
    meioPagamentoId: base.cartaoId,
    origemDado: { fonte: "PLANILHA", chave: "2026-10|GASTOS|0" },
  });

  await new ImportacaoRepositoryDrizzle(db).registrar(
    {
      competencia: competencia("2026-10"),
      nomeArquivo: "Planilha 2026 - Outubro.csv",
      usuarioId: base.usuarioId,
    },
    {
      meios: new Map([["débito", base.contaId]]),
      entradas: new Map([["salário a", { classe: "FIXA", contaId: base.contaId }]]),
    },
  );
}

async function contar(tabela: string): Promise<number> {
  const { rows } = await pool.query<{ total: string }>(
    `SELECT count(*)::text AS total FROM ${tabela}`,
  );
  return Number.parseInt(rows[0]?.total ?? "0", 10);
}

async function cadastros() {
  return {
    usuario: (await pool.query("SELECT * FROM usuario ORDER BY id")).rows,
    meio_pagamento: (await pool.query("SELECT * FROM meio_pagamento ORDER BY id")).rows,
    categoria: (await pool.query("SELECT * FROM categoria ORDER BY id")).rows,
  };
}

describe("limpar-para-importar.sql (T15, IMP-09)", () => {
  it("esvazia o que a importação cria (AC 1)", async () => {
    await popularTudo();
    for (const tabela of ESVAZIADAS) {
      expect(await contar(tabela), tabela).toBeGreaterThan(0);
    }

    await pool.query(SCRIPT);

    for (const tabela of ESVAZIADAS) {
      expect(await contar(tabela), tabela).toBe(0);
    }
  });

  it("preserva usuários, meios de pagamento e categorias como estavam (AC 2)", async () => {
    await popularTudo();
    const antes = await cadastros();

    await pool.query(SCRIPT);

    expect(antes.categoria).toHaveLength(2);
    expect(await cadastros()).toEqual(antes);
  });

  it("deixa a próxima importação ser a primeira, para qualquer mês (AC 3)", async () => {
    await popularTudo();
    const importacoes = new ImportacaoRepositoryDrizzle(db);

    await pool.query(SCRIPT);

    expect(await importacoes.ultimaCompetenciaImportada()).toBeNull();
    expect(await importacoes.haLancamentoCompraOuRecorrencia()).toBe(false);
    expect((await importacoes.decisoesLembradas()).meios.size).toBe(0);
  });

  it("falha inteiro, sem apagar nada, se outra tabela apontar para uma das esvaziadas", async () => {
    await popularTudo();
    await pool.query(
      "CREATE TABLE referencia_inesperada (movimento_id uuid REFERENCES movimento(id))",
    );
    try {
      let codigo: string | undefined;
      try {
        await pool.query(SCRIPT);
      } catch (erro) {
        codigo = (erro as { code?: string }).code;
      }

      // 0A000: TRUNCATE de tabela referenciada por chave estrangeira de fora da lista.
      expect(codigo).toBe("0A000");
      for (const tabela of ESVAZIADAS) {
        expect(await contar(tabela), tabela).toBeGreaterThan(0);
      }
    } finally {
      await pool.query("DROP TABLE referencia_inesperada");
    }
  });
});
