import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type {
  ImportacaoRegistrada,
  RepositoriosDaImportacao,
} from "@/application/ports/repositories";
import {
  type Cents,
  type Competencia,
  criarCompetencia,
  type DecisoesDaImportacao,
  gerarParcelas,
  type PlanoParcelamento,
} from "@/domain";
import { type BancoDeDados, criarCliente, criarPool } from "./client";
import { CompraRepositoryDrizzle } from "./repositories/compra.repository";
import {
  type CadastroBase,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
  URL_BANCO_DE_TESTE,
} from "./testing/banco-de-teste";
import { TransacaoDaImportacaoDrizzle } from "./transacao-da-importacao";

/**
 * A transação da importação (T14, design Decisão 1) contra Postgres real.
 *
 * Duas garantias: tudo o que os cinco repositórios recebidos gravam volta
 * atrás junto (IMP-06 AC 2), e duas importações ao mesmo tempo são
 * serializadas pela trava `pg_advisory_xact_lock(hashtext('importacao'))`.
 * A segunda só começa depois que a primeira termina, enxerga o que ela gravou
 * e esbarra na competência única (IMP-02 AC 7).
 *
 * Valores por propriedade (AD-009): R$ 1.000,00 em 3x é o rateio com resíduo,
 * 33334 + 33333 + 33333.
 */

class FalhaInjetada extends Error {}

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
let transacao: TransacaoDaImportacaoDrizzle;

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
  transacao = new TransacaoDaImportacaoDrizzle(db);
});

function outubro(): ImportacaoRegistrada {
  return {
    competencia: competencia("2026-10"),
    nomeArquivo: "Planilha 2026 - Outubro.csv",
    usuarioId: base.usuarioId,
  };
}

const SEM_DECISOES: DecisoesDaImportacao = { meios: new Map(), entradas: new Map() };

function salvarCompra(repos: Pick<RepositoriosDaImportacao, "compras">, chave: string) {
  return repos.compras.salvarComParcelas({
    idempotencyKey: chave,
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
}

/** Tudo o que uma importação pode tocar, como o banco está agora. */
async function fotografia() {
  const um = async (consulta: string) => (await pool.query(consulta)).rows;
  return {
    categorias: await um("SELECT nome, arquivada_em IS NULL AS ativa FROM categoria ORDER BY nome"),
    recorrencias: await um("SELECT descricao FROM recorrencia"),
    versoes: await um("SELECT valor_previsto_centavos::text AS valor FROM recorrencia_versao"),
    compras: await um("SELECT valor_total_centavos::text AS total FROM compra_parcelada"),
    movimentos: await um(
      "SELECT origem, valor_centavos::text AS valor FROM movimento ORDER BY origem, numero_parcela",
    ),
    importacoes: await um("SELECT competencia::text FROM importacao"),
    decisoes: await um("SELECT nome_normalizado FROM importacao_decisao"),
  };
}

function adiado() {
  let liberar: () => void = () => {};
  const promessa = new Promise<void>((resolver) => {
    liberar = resolver;
  });
  return { promessa, liberar };
}

async function esperarAlguemNaTrava(): Promise<void> {
  for (let tentativa = 0; tentativa < 100; tentativa += 1) {
    const { rows } = await pool.query<{ esperando: string }>(
      "SELECT count(*)::text AS esperando FROM pg_locks WHERE locktype = 'advisory' AND NOT granted",
    );
    if (rows[0]?.esperando === "1") {
      return;
    }
    await new Promise((resolver) => setTimeout(resolver, 20));
  }
  throw new Error("a segunda importação nunca esperou na trava da importação");
}

/** O Drizzle embrulha o erro do driver: código e restrição estão na cadeia de `cause`. */
function erroDoBanco(erro: unknown): { code?: string; constraint?: string } {
  let atual: unknown = erro;
  for (let profundidade = 0; atual && profundidade < 5; profundidade += 1) {
    const candidato = atual as { code?: string; constraint?: string; cause?: unknown };
    if (candidato.constraint) {
      return candidato;
    }
    atual = candidato.cause;
  }
  return {};
}

describe("TransacaoDaImportacaoDrizzle: tudo ou nada (T14, IMP-06 AC 2)", () => {
  it("uma exceção desfaz o que qualquer um dos cinco repositórios gravou", async () => {
    const { rows } = await pool.query<{ id: string }>(
      "INSERT INTO categoria (nome, arquivada_em) VALUES ('Categoria Dois', now()) RETURNING id",
    );
    const arquivadaId = rows[0]?.id ?? "";
    const existente = await salvarCompra({ compras: new CompraRepositoryDrizzle(db) }, "antes");
    if (!existente.ok) {
      throw new Error("fixture inválida");
    }
    const antes = await fotografia();
    let gravouTudo = false;

    const execucao = transacao.executar(async (repos) => {
      await repos.cadastros.criarCategoria({ nome: "Categoria Três", arquivadaEm: null });
      await repos.cadastros.reativarCategoria(arquivadaId);
      await repos.recorrencias.criar({
        dados: {
          descricao: "Conta fixa A",
          natureza: "DESPESA",
          categoriaId: null,
          usuarioId: base.usuarioId,
          meioPagamentoId: base.contaId,
          competenciaInicio: competencia("2026-10"),
          competenciaFim: null,
          diaVencimento: 1,
        },
        valorInicial: 18000 as Cents,
      });
      await salvarCompra(repos, "chave-na-transacao");
      await repos.compras.reprecificar(
        existente.value.id,
        [{ numero: 3, valor: 33334 as Cents }],
        100001 as Cents,
      );
      await repos.movimentos.criarAvulso({
        natureza: "DESPESA",
        descricao: "Linha importada",
        competencia: competencia("2026-10"),
        dataEvento: "2026-10-01",
        valor: 1200 as Cents,
        pagoEm: null,
        categoriaId: null,
        usuarioId: base.usuarioId,
        meioPagamentoId: base.cartaoId,
        origemDado: { fonte: "PLANILHA", chave: "2026-10|GASTOS|0" },
      });
      await repos.importacoes.registrar(outubro(), {
        meios: new Map([["débito", base.contaId]]),
        entradas: new Map(),
      });
      gravouTudo = true;
      throw new FalhaInjetada("falha depois da última escrita");
    });

    await expect(execucao).rejects.toBeInstanceOf(FalhaInjetada);
    expect(gravouTudo).toBe(true);
    expect(await fotografia()).toEqual(antes);
  });
});

describe("TransacaoDaImportacaoDrizzle: importações concorrentes (T14, IMP-02 AC 7)", () => {
  it("a segunda espera a trava, enxerga a primeira e falha na competência única", async () => {
    const primeiraDentro = adiado();
    const liberarPrimeira = adiado();
    let vistaPelaSegunda: Competencia | null | undefined;

    const primeira = transacao.executar(async (repos) => {
      await repos.importacoes.registrar(outubro(), SEM_DECISOES);
      primeiraDentro.liberar();
      await liberarPrimeira.promessa;
      return "primeira";
    });
    await primeiraDentro.promessa;

    const segunda = transacao.executar(async (repos) => {
      vistaPelaSegunda = await repos.importacoes.ultimaCompetenciaImportada();
      await repos.importacoes.registrar(outubro(), SEM_DECISOES);
      return "segunda";
    });
    const desfechoDaSegunda = segunda.then(
      () => null,
      (erro: unknown) => erro,
    );
    try {
      await esperarAlguemNaTrava();
      expect(vistaPelaSegunda).toBeUndefined();
    } finally {
      liberarPrimeira.liberar();
    }

    expect(await primeira).toBe("primeira");
    expect(erroDoBanco(await desfechoDaSegunda)).toMatchObject({
      code: "23505",
      constraint: "importacao_competencia_unique",
    });
    expect(vistaPelaSegunda).toBe("2026-10");
    const { rows } = await pool.query<{ total: string }>(
      "SELECT count(*)::text AS total FROM importacao",
    );
    expect(rows[0]?.total).toBe("1");
  });
});
