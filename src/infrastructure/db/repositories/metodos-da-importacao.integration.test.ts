import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { CompraPersistida, EntradaLancamentoAvulso } from "@/application/ports/repositories";
import { ViolacaoDeConservacao } from "@/application/ports/repositories";
import {
  type Cents,
  type Competencia,
  criarCompetencia,
  gerarParcelas,
  type PlanoParcelamento,
} from "@/domain";
import { type BancoDeDados, criarCliente, criarPool } from "../client";
import {
  type CadastroBase,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
  URL_BANCO_DE_TESTE,
} from "../testing/banco-de-teste";
import { CadastroRepositoryDrizzle } from "./cadastro.repository";
import { CompraRepositoryDrizzle } from "./compra.repository";
import { MovimentoRepositoryDrizzle } from "./movimento.repository";

/**
 * Os métodos que a importação acrescenta às ports existentes (T13), contra
 * Postgres real: reprecificar a compra conservando a soma **no banco**
 * (IMP-07 AC 10), gravar a origem do avulso importado no índice parcial único
 * (IMP-03 AC 8), buscar a compra por id e listar as categorias com as
 * arquivadas (IMP-03 AC 9).
 *
 * Valores por propriedade (AD-009): a compra em andamento tem parcelas 7 a 10
 * de 21000 e amortizado 126000, a mesma reprecificação de T6; a outra compra
 * tem dez parcelas de 10000, para ter também uma parcela 9 e uma 10.
 */

function competencia(texto: string): Competencia {
  const resultado = criarCompetencia(texto);
  if (!resultado.ok) {
    throw new Error(`fixture inválida: ${texto}`);
  }
  return resultado.value;
}

function plano(entrada: Parameters<typeof gerarParcelas>[0]): PlanoParcelamento {
  const resultado = gerarParcelas(entrada);
  if (!resultado.ok) {
    throw new Error(`fixture inválida: ${resultado.error.code}`);
  }
  return resultado.value;
}

let pool: Pool;
let db: BancoDeDados;
let base: CadastroBase;
let compras: CompraRepositoryDrizzle;
let movimentos: MovimentoRepositoryDrizzle;
let cadastros: CadastroRepositoryDrizzle;

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
  compras = new CompraRepositoryDrizzle(db);
  movimentos = new MovimentoRepositoryDrizzle(db);
  cadastros = new CadastroRepositoryDrizzle(db);
});

async function salvar(
  chave: string,
  descricao: string,
  entrada: Parameters<typeof gerarParcelas>[0],
): Promise<CompraPersistida> {
  const resultado = await compras.salvarComParcelas({
    idempotencyKey: chave,
    dados: {
      descricao,
      modo: entrada.modo,
      politicaResiduo: entrada.politicaResiduo,
      competenciaCompra: entrada.competenciaCompra,
      qtdParcelas: entrada.qtdParcelas,
      parcelaInicial: entrada.parcelaInicial,
      categoriaId: base.categoriaId,
      usuarioId: base.usuarioId,
      meioPagamentoId: base.cartaoId,
      dataEvento: "2026-10-01",
    },
    plano: plano(entrada),
  });
  if (!resultado.ok) {
    throw new Error(`fixture inválida: ${resultado.error.code}`);
  }
  return resultado.value;
}

/** Parcelas 7 a 10 de 21000, com a 7 em 2026-10: total 210000, amortizado 126000. */
function salvarEmAndamento(): Promise<CompraPersistida> {
  return salvar("chave-em-andamento", "Compra em andamento", {
    modo: "VALOR_PARCELA",
    valorEntrada: 21000 as Cents,
    qtdParcelas: 10,
    competenciaCompra: competencia("2026-04"),
    parcelaInicial: 7,
    politicaResiduo: "PRIMEIRAS",
  });
}

/** Dez parcelas de 10000, de 1 a 10: tem também uma parcela 9 e uma 10. */
function salvarOutra(): Promise<CompraPersistida> {
  return salvar("chave-outra", "Outra compra", {
    modo: "TOTAL",
    valorEntrada: 100000 as Cents,
    qtdParcelas: 10,
    competenciaCompra: competencia("2026-10"),
    parcelaInicial: 1,
    politicaResiduo: "PRIMEIRAS",
  });
}

const A_PARTIR_DA_9: ReadonlyArray<{ numero: number; valor: Cents }> = [
  { numero: 9, valor: 21100 as Cents },
  { numero: 10, valor: 21100 as Cents },
];

async function gravadoNoBanco(compraId: string) {
  const compra = await pool.query<{ total: string }>(
    "SELECT valor_total_centavos::text AS total FROM compra_parcelada WHERE id = $1",
    [compraId],
  );
  const parcelas = await pool.query<{ numero: number; valor: string }>(
    `SELECT numero_parcela AS numero, valor_centavos::text AS valor
       FROM movimento WHERE compra_id = $1 ORDER BY numero_parcela`,
    [compraId],
  );
  return {
    total: Number(compra.rows[0]?.total),
    parcelas: parcelas.rows.map((p) => [p.numero, Number(p.valor)]),
  };
}

describe("CompraRepository.reprecificar (T13, IMP-07 AC 10)", () => {
  it("atualiza só as parcelas informadas e o total", async () => {
    const compra = await salvarEmAndamento();

    await compras.reprecificar(compra.id, A_PARTIR_DA_9, 210200 as Cents);

    expect(await gravadoNoBanco(compra.id)).toEqual({
      total: 210200,
      parcelas: [
        [7, 21000],
        [8, 21000],
        [9, 21100],
        [10, 21100],
      ],
    });
  });

  it("falha com CONSERVACAO_VIOLADA sem gravar nada quando o total não fecha no banco", async () => {
    const compra = await salvarEmAndamento();

    const recusa = compras.reprecificar(compra.id, A_PARTIR_DA_9, 210199 as Cents);

    await expect(recusa).rejects.toBeInstanceOf(ViolacaoDeConservacao);
    await expect(recusa).rejects.toMatchObject({
      code: "CONSERVACAO_VIOLADA",
      soma: 210200,
      valorTotal: 210199,
    });
    expect(await gravadoNoBanco(compra.id)).toEqual({
      total: 210000,
      parcelas: [
        [7, 21000],
        [8, 21000],
        [9, 21000],
        [10, 21000],
      ],
    });
  });

  it("não toca outra compra nem lançamento de outra origem", async () => {
    const compra = await salvarEmAndamento();
    const outra = await salvarOutra();
    const avulso = await movimentos.criarAvulso({
      natureza: "DESPESA",
      descricao: "Avulso do mês",
      competencia: competencia("2026-10"),
      dataEvento: "2026-10-01",
      valor: 21000 as Cents,
      pagoEm: null,
      categoriaId: null,
      usuarioId: base.usuarioId,
      meioPagamentoId: base.cartaoId,
    });

    await compras.reprecificar(compra.id, A_PARTIR_DA_9, 210200 as Cents);

    const daOutra = await gravadoNoBanco(outra.id);
    expect(daOutra.total).toBe(100000);
    expect(daOutra.parcelas.map(([, valor]) => valor)).toEqual(Array(10).fill(10000));
    expect((await movimentos.buscarPorId(avulso.id))?.valor).toBe(21000);
  });
});

describe("CompraRepository.buscarPorId (T13)", () => {
  it("devolve a compra com as parcelas em ordem de número", async () => {
    const salva = await salvarEmAndamento();

    const encontrada = await compras.buscarPorId(salva.id);

    expect(encontrada).toEqual(salva);
    expect(encontrada?.valorAmortizadoAnterior).toBe(126000);
    expect(encontrada?.parcelas.map((p) => [p.numeroParcela, p.competencia])).toEqual([
      [7, "2026-10"],
      [8, "2026-11"],
      [9, "2026-12"],
      [10, "2027-01"],
    ]);
  });

  it("id inexistente devolve null", async () => {
    await salvarEmAndamento();

    expect(await compras.buscarPorId("00000000-0000-4000-8000-000000000000")).toBeNull();
  });
});

describe("MovimentoRepository.criarAvulso com origem (T13, IMP-03 AC 8)", () => {
  function avulso(origemDado?: EntradaLancamentoAvulso["origemDado"]): EntradaLancamentoAvulso {
    return {
      natureza: "DESPESA",
      descricao: "Linha importada",
      competencia: competencia("2026-10"),
      dataEvento: "2026-10-01",
      valor: 1200 as Cents,
      pagoEm: null,
      categoriaId: base.categoriaId,
      usuarioId: base.usuarioId,
      meioPagamentoId: base.cartaoId,
      origemDado,
    };
  }

  async function origemGravada(id: string) {
    const { rows } = await pool.query<{ origem_dado: string | null; origem_hash: string | null }>(
      "SELECT origem_dado, origem_hash FROM movimento WHERE id = $1",
      [id],
    );
    return rows[0];
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

  it("grava origem_dado = 'PLANILHA' e origem_hash = chave", async () => {
    const lancado = await movimentos.criarAvulso(
      avulso({ fonte: "PLANILHA", chave: "2026-10|GASTOS|2" }),
    );

    expect(await origemGravada(lancado.id)).toEqual({
      origem_dado: "PLANILHA",
      origem_hash: "2026-10|GASTOS|2",
    });
  });

  it("a mesma chave duas vezes viola movimento_origem_dado_hash_uq", async () => {
    const origem = { fonte: "PLANILHA", chave: "2026-10|GASTOS|2" } as const;
    await movimentos.criarAvulso(avulso(origem));

    let capturado: unknown;
    try {
      await movimentos.criarAvulso(avulso(origem));
    } catch (erro) {
      capturado = erro;
    }

    expect(erroDoBanco(capturado)).toMatchObject({
      code: "23505",
      constraint: "movimento_origem_dado_hash_uq",
    });
    const { rows } = await pool.query<{ total: string }>(
      "SELECT count(*)::text AS total FROM movimento",
    );
    expect(rows[0]?.total).toBe("1");
  });

  it("sem origemDado, as duas colunas ficam nulas como hoje", async () => {
    const lancado = await movimentos.criarAvulso(avulso());

    expect(await origemGravada(lancado.id)).toEqual({ origem_dado: null, origem_hash: null });
  });
});

describe("CadastroRepository.listarTodasAsCategorias (T13, IMP-03 AC 9)", () => {
  it("inclui a arquivada, ao lado das ativas", async () => {
    await cadastros.criarCategoria({
      nome: "Categoria Dois",
      arquivadaEm: "2026-09-01T00:00:00.000Z",
    });

    const todas = await cadastros.listarTodasAsCategorias();

    expect(todas.map((c) => [c.nome, c.arquivadaEm === null])).toEqual([
      ["Categoria Dois", false],
      ["Categoria Um", true],
    ]);
  });
});
