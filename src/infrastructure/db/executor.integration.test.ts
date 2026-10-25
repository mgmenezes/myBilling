import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  type Cents,
  type Competencia,
  criarCompetencia,
  gerarParcelas,
  type PlanoParcelamento,
} from "@/domain";
import { type BancoDeDados, criarCliente, criarPool, type Executor } from "./client";
import { CompraRepositoryDrizzle } from "./repositories/compra.repository";
import { RecorrenciaRepositoryDrizzle } from "./repositories/recorrencia.repository";
import {
  type CadastroBase,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
  URL_BANCO_DE_TESTE,
} from "./testing/banco-de-teste";

/**
 * Repositórios construídos sobre uma transação de fora (IMP-06, design
 * Decisão 1).
 *
 * `criar` e `salvarComParcelas` abrem a própria transação. Sobre um `tx`, ela
 * vira savepoint, e o que este arquivo prova é que o savepoint **não escapa**
 * do rollback externo: um `throw` depois das duas escritas desfaz as quatro
 * tabelas. Sem isso, a importação não seria tudo ou nada.
 *
 * Fixtures por propriedade matemática (AD-009): R$ 1.000,00 em 3x é o rateio
 * com resíduo, 33334 + 33333 + 33333.
 */

class FalhaDepoisDasEscritas extends Error {}

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
    competenciaCompra: competencia("2026-03"),
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

type Tabela = "recorrencia" | "recorrencia_versao" | "compra_parcelada" | "movimento";

async function contar(tabela: Tabela): Promise<number> {
  const { rows } = await pool.query<{ total: string }>(
    `SELECT count(*)::text AS total FROM ${tabela}`,
  );
  return Number.parseInt(rows[0]?.total ?? "0", 10);
}

async function contarTodas(): Promise<Record<Tabela, number>> {
  return {
    recorrencia: await contar("recorrencia"),
    recorrencia_versao: await contar("recorrencia_versao"),
    compra_parcelada: await contar("compra_parcelada"),
    movimento: await contar("movimento"),
  };
}

/** As duas escritas que abrem transação própria, sobre o mesmo executor. */
async function escreverRecorrenciaECompra(executor: Executor) {
  const recorrencias = new RecorrenciaRepositoryDrizzle(executor);
  const compras = new CompraRepositoryDrizzle(executor);
  await recorrencias.criar({
    dados: {
      descricao: "Conta fixa A",
      natureza: "DESPESA",
      categoriaId: base.categoriaId,
      usuarioId: base.usuarioId,
      meioPagamentoId: base.contaId,
      competenciaInicio: competencia("2026-03"),
      competenciaFim: null,
      diaVencimento: 1,
    },
    valorInicial: 18000 as Cents,
  });
  const compra = await compras.salvarComParcelas({
    idempotencyKey: "chave-da-transacao-externa",
    dados: {
      descricao: "Compra de teste",
      modo: "TOTAL",
      politicaResiduo: "PRIMEIRAS",
      competenciaCompra: competencia("2026-03"),
      qtdParcelas: 3,
      parcelaInicial: 1,
      categoriaId: base.categoriaId,
      usuarioId: base.usuarioId,
      meioPagamentoId: base.cartaoId,
      dataEvento: "2026-03-01",
    },
    plano: planoDeMilReaisEmTres(),
  });
  return { recorrencias: await recorrencias.listarComVersoes(), compra };
}

describe("repositórios sobre uma transação de fora (T10, IMP-06)", () => {
  it("um throw depois das escritas desfaz recorrência, versão, compra e parcelas", async () => {
    let vistoDentro: Awaited<ReturnType<typeof escreverRecorrenciaECompra>> | undefined;

    await expect(
      db.transaction(async (tx) => {
        vistoDentro = await escreverRecorrenciaECompra(tx);
        throw new FalhaDepoisDasEscritas("falha depois das escritas");
      }),
    ).rejects.toBeInstanceOf(FalhaDepoisDasEscritas);

    // Dentro da transação, as escritas aconteceram de fato.
    expect(vistoDentro?.recorrencias).toHaveLength(1);
    expect(vistoDentro?.recorrencias[0]?.versoes).toEqual([
      { vigenteDesde: "2026-03", valorPrevisto: 18000 },
    ]);
    if (!vistoDentro?.compra.ok) {
      throw new Error("esperava a compra gravada dentro da transação");
    }
    expect(vistoDentro.compra.value.parcelas.map((p) => p.valor)).toEqual([33334, 33333, 33333]);

    // Fora dela, nada ficou: o savepoint interno não escapou do rollback.
    expect(await contarTodas()).toEqual({
      recorrencia: 0,
      recorrencia_versao: 0,
      compra_parcelada: 0,
      movimento: 0,
    });
  });

  it("sem throw, as mesmas escritas são commitadas com a transação de fora", async () => {
    await db.transaction(async (tx) => {
      await escreverRecorrenciaECompra(tx);
    });

    expect(await contarTodas()).toEqual({
      recorrencia: 1,
      recorrencia_versao: 1,
      compra_parcelada: 1,
      movimento: 3,
    });
  });
});
