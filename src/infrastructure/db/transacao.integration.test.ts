import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type Cents, type Competencia, criarCompetencia, gerarParcelas } from "@/domain";
import { type BancoDeDados, criarCliente, criarPool } from "./client";
import { MovimentoRepositoryDrizzle } from "./repositories/movimento.repository";
import { RecorrenciaRepositoryDrizzle } from "./repositories/recorrencia.repository";
import {
  type CadastroBase,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
  URL_BANCO_DE_TESTE,
} from "./testing/banco-de-teste";
import { TransacaoDrizzle } from "./transacao";

/**
 * A transação genérica contra Postgres real (EDF-06 AC 1 e 2): o que os quatro
 * repositórios recebidos gravam fica junto, ou volta atrás junto.
 *
 * A falha é injetada depois de todas as escritas que uma edição de fixo faz —
 * série, ocorrências, vigência e reabertura — e de uma escrita em cada um dos
 * outros repositórios. Se algum deles estivesse fora do `tx`, a fotografia do
 * banco depois do rollback mostraria a escrita que escapou.
 *
 * Valores por propriedade (AD-009): R$ 1.000,00 em 3x é o rateio com resíduo.
 */

class FalhaInjetada extends Error {}

function competencia(texto: string): Competencia {
  const resultado = criarCompetencia(texto);
  if (!resultado.ok) {
    throw new Error(`fixture inválida: ${texto}`);
  }
  return resultado.value;
}

let pool: Pool;
let db: BancoDeDados;
let base: CadastroBase;
let recorrenciaId: string;

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
  const recorrencias = new RecorrenciaRepositoryDrizzle(db);
  const criada = await recorrencias.criar({
    dados: {
      descricao: "Conta fixa A",
      natureza: "DESPESA",
      categoriaId: base.categoriaId,
      usuarioId: base.usuarioId,
      meioPagamentoId: base.contaId,
      competenciaInicio: competencia("2026-10"),
      competenciaFim: null,
      diaVencimento: 10,
    },
    valorInicial: 10000 as Cents,
  });
  recorrenciaId = criada.id;
  await new MovimentoRepositoryDrizzle(db).materializarOcorrencias(
    ["2026-10", "2026-11"].map((texto) => ({
      recorrenciaId,
      natureza: "DESPESA" as const,
      descricao: "Conta fixa A",
      competencia: competencia(texto),
      dataEvento: `${texto}-10`,
      valorPrevisto: 10000 as Cents,
      categoriaId: base.categoriaId,
      usuarioId: base.usuarioId,
      meioPagamentoId: base.contaId,
    })),
  );
  await recorrencias.encerrar(recorrenciaId, competencia("2026-11"), "2026-10-28T12:00:00.000Z");
});

/** Tudo o que os quatro repositórios podem tocar, como o banco está agora. */
async function fotografia() {
  const um = async (consulta: string) => (await pool.query(consulta)).rows;
  return {
    categorias: await um("SELECT nome FROM categoria ORDER BY nome"),
    recorrencias: await um(
      "SELECT descricao, dia_vencimento, competencia_fim::text, encerrada_em::text FROM recorrencia",
    ),
    versoes: await um(
      "SELECT vigente_desde::text, valor_previsto_centavos::text FROM recorrencia_versao ORDER BY vigente_desde",
    ),
    compras: await um("SELECT valor_total_centavos::text AS total FROM compra_parcelada"),
    movimentos: await um(
      `SELECT origem, descricao, data_evento::text, valor_centavos::text, valor_previsto_centavos::text
       FROM movimento ORDER BY origem, competencia`,
    ),
  };
}

describe("TransacaoDrizzle: tudo ou nada (EDF-06 AC 1 e 2)", () => {
  it("uma exceção desfaz o que qualquer um dos quatro repositórios gravou", async () => {
    const antes = await fotografia();
    let gravouTudo = false;
    const plano = gerarParcelas({
      modo: "TOTAL",
      valorEntrada: 100000 as Cents,
      qtdParcelas: 3,
      competenciaCompra: competencia("2026-10"),
      parcelaInicial: 1,
      politicaResiduo: "PRIMEIRAS",
    });
    if (!plano.ok) {
      throw new Error("fixture inválida");
    }
    const serie = {
      descricao: "Conta fixa B",
      diaVencimento: 31,
      meioPagamentoId: base.contaId,
      categoriaId: null,
      usuarioId: base.usuarioId,
    };

    const execucao = new TransacaoDrizzle(db).executar(async (repos) => {
      await repos.recorrencias.atualizarSerie(recorrenciaId, serie);
      await repos.movimentos.atualizarOcorrenciasDaSerie(recorrenciaId, serie);
      await repos.recorrencias.registrarVersao(
        recorrenciaId,
        competencia("2026-11"),
        11000 as Cents,
      );
      await repos.movimentos.atualizarPrevistoNaoProtegido(
        recorrenciaId,
        competencia("2026-11"),
        11000 as Cents,
      );
      await repos.recorrencias.reabrir(recorrenciaId);
      await repos.cadastros.criarCategoria({ nome: "Categoria Dois", arquivadaEm: null });
      await repos.compras.salvarComParcelas({
        idempotencyKey: "chave-na-transacao",
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
        plano: plano.value,
      });
      await repos.movimentos.criarAvulso({
        natureza: "DESPESA",
        descricao: "Avulso de teste",
        competencia: competencia("2026-10"),
        dataEvento: "2026-10-01",
        valor: 1200 as Cents,
        pagoEm: null,
        categoriaId: null,
        usuarioId: base.usuarioId,
        meioPagamentoId: base.contaId,
      });
      gravouTudo = true;
      throw new FalhaInjetada("falha depois da última escrita");
    });

    await expect(execucao).rejects.toBeInstanceOf(FalhaInjetada);
    expect(gravouTudo).toBe(true);
    expect(await fotografia()).toEqual(antes);
  });

  it("sem exceção, as escritas ficam e o resultado da operação volta", async () => {
    const devolvido = await new TransacaoDrizzle(db).executar(async (repos) => {
      await repos.recorrencias.reabrir(recorrenciaId);
      await repos.cadastros.criarCategoria({ nome: "Categoria Dois", arquivadaEm: null });
      return "feito";
    });

    expect(devolvido).toBe("feito");
    const depois = await fotografia();
    expect(depois.recorrencias).toEqual([
      { descricao: "Conta fixa A", dia_vencimento: 10, competencia_fim: null, encerrada_em: null },
    ]);
    expect(depois.categorias).toEqual([{ nome: "Categoria Dois" }, { nome: "Categoria Um" }]);
  });
});
