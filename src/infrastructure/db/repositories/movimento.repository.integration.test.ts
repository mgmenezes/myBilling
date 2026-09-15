import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { MovimentoRepository } from "@/application/ports/repositories";
import {
  type Cents,
  type Competencia,
  cancelamentoPermitido,
  criarCompetencia,
  type Origem,
} from "@/domain";
import { type BancoDeDados, criarCliente, criarPool } from "../client";
import { movimento } from "../schema";
import {
  type CadastroBase,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
  URL_BANCO_DE_TESTE,
} from "../testing/banco-de-teste";
import { MovimentoRepositoryDrizzle } from "./movimento.repository";

/** Chaves exatas do tipo `Lancamento` do domínio. Se uma coluna do Drizzle
 * vazar pelo mapeamento, esta lista deixa de bater. */
const CHAVES_DE_LANCAMENTO = [
  "canceladoEm",
  "categoriaId",
  "competencia",
  "compraId",
  "dataEvento",
  "descricao",
  "id",
  "meioPagamentoId",
  "natureza",
  "numeroParcela",
  "origem",
  "pagoEm",
  /* Acrescentado com a fatia de recorrências: `Lancamento` passou a expor de
   * qual recorrência a ocorrência veio, simétrico ao `compraId` que já existia.
   * A lista mudar aqui é o teste funcionando — ela obriga a adição a ser
   * consciente, em vez de uma coluna do Drizzle vazando sem ninguém ver. */
  "recorrenciaId",
  "usuarioId",
  "valor",
  "valorPrevisto",
];

function competencia(texto: string): Competencia {
  const resultado = criarCompetencia(texto);
  if (!resultado.ok) {
    throw new Error(`fixture inválida: ${texto}`);
  }
  return resultado.value;
}

let pool: Pool;
let db: BancoDeDados;
let repo: MovimentoRepository;
let base: CadastroBase;

beforeAll(async () => {
  pool = criarPool(URL_BANCO_DE_TESTE);
  db = criarCliente(pool);
  repo = new MovimentoRepositoryDrizzle(db);
  await recriarBancoDeTeste(pool);
}, 60_000);

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await limparDados(pool);
  base = await semearCadastroBase(pool);
});

async function inserirAvulso(campos: {
  descricao: string;
  competencia: string;
  valorCentavos: number;
  dataEvento?: string;
  canceladoEm?: Date | null;
  pagoEm?: string | null;
}): Promise<string> {
  const [linha] = await db
    .insert(movimento)
    .values({
      natureza: "DESPESA",
      origem: "AVULSO",
      descricao: campos.descricao,
      competencia: campos.competencia,
      dataEvento: campos.dataEvento ?? "2026-03-10",
      valorCentavos: campos.valorCentavos,
      pagoEm: campos.pagoEm ?? null,
      canceladoEm: campos.canceladoEm ?? null,
      usuarioId: base.usuarioId,
      meioPagamentoId: base.contaId,
    })
    .returning({ id: movimento.id });
  if (!linha) {
    throw new Error("insert não retornou id");
  }
  return linha.id;
}

describe("MovimentoRepository: leitura por competência (T33, MOV-01)", () => {
  it("devolve lista vazia para um mês sem lançamentos", async () => {
    const lancamentos = await repo.listarPorCompetencia(competencia("2026-03"));

    expect(lancamentos).toEqual([]);
  });

  it("devolve apenas os lançamentos do mês pedido", async () => {
    await inserirAvulso({
      descricao: "De março A",
      competencia: "2026-03-01",
      valorCentavos: 1000,
    });
    await inserirAvulso({
      descricao: "De março B",
      competencia: "2026-03-01",
      valorCentavos: 2000,
      dataEvento: "2026-03-20",
    });
    await inserirAvulso({ descricao: "De abril", competencia: "2026-04-01", valorCentavos: 3000 });

    const lancamentos = await repo.listarPorCompetencia(competencia("2026-03"));

    expect(lancamentos.map((l) => l.descricao)).toEqual(["De março A", "De março B"]);
    expect(lancamentos.map((l) => l.competencia)).toEqual(["2026-03", "2026-03"]);
  });

  it("não devolve lançamento cancelado", async () => {
    await inserirAvulso({ descricao: "Vivo", competencia: "2026-03-01", valorCentavos: 1000 });
    await inserirAvulso({
      descricao: "Cancelado",
      competencia: "2026-03-01",
      valorCentavos: 5000,
      canceladoEm: new Date("2026-03-15T12:00:00Z"),
    });

    const lancamentos = await repo.listarPorCompetencia(competencia("2026-03"));

    expect(lancamentos.map((l) => l.descricao)).toEqual(["Vivo"]);
  });
});

describe("MovimentoRepository: mapeamento para o domínio (T33, AD-001, AD-006)", () => {
  it("devolve dinheiro como inteiro em centavos, sem ponto flutuante", async () => {
    await inserirAvulso({
      descricao: "Valor alto",
      competencia: "2026-03-01",
      valorCentavos: 100_000_001,
    });

    const [lancamento] = await repo.listarPorCompetencia(competencia("2026-03"));

    expect(lancamento?.valor).toBe(100_000_001);
    expect(Number.isInteger(lancamento?.valor)).toBe(true);
  });

  it("não vaza nenhuma coluna do Drizzle: as chaves são exatamente as de Lancamento", async () => {
    await inserirAvulso({ descricao: "Um", competencia: "2026-03-01", valorCentavos: 1000 });

    const [lancamento] = await repo.listarPorCompetencia(competencia("2026-03"));

    expect(Object.keys(lancamento ?? {}).sort()).toEqual(CHAVES_DE_LANCAMENTO);
  });
});

describe("MovimentoRepository: marcação de pagamento (T33, MOV-06)", () => {
  it("marca o pagamento sem alterar o valor e resolve o lançamento por id — MOV-06, AC 1", async () => {
    const id = await inserirAvulso({
      descricao: "A pagar",
      competencia: "2026-03-01",
      valorCentavos: 33334,
    });

    await repo.marcarPagamento(id, "2026-03-18");

    const lancamento = await repo.buscarPorId(id);
    expect(lancamento?.pagoEm).toBe("2026-03-18");
    expect(lancamento?.valor).toBe(33334);
  });

  it("devolve null para um id que não existe", async () => {
    const lancamento = await repo.buscarPorId("00000000-0000-0000-0000-000000000000");

    expect(lancamento).toBeNull();
  });
});

describe("MovimentoRepository: gravar lançamento avulso (AVUL-01)", () => {
  function entrada(sobrescrever: Partial<Parameters<typeof repo.criarAvulso>[0]> = {}) {
    return {
      natureza: "DESPESA" as const,
      descricao: "Gasto avulso",
      competencia: competencia("2026-03"),
      dataEvento: "2026-03-10",
      valor: 3250 as Cents,
      pagoEm: null,
      categoriaId: base.categoriaId,
      usuarioId: base.usuarioId,
      meioPagamentoId: base.contaId,
      ...sobrescrever,
    };
  }

  it("grava uma linha com origem AVULSO e nenhum vínculo — AC 1", async () => {
    const gravado = await repo.criarAvulso(entrada());

    expect(gravado.origem).toBe("AVULSO");
    expect(gravado.compraId).toBeNull();
    expect(gravado.numeroParcela).toBeNull();
    expect(gravado.recorrenciaId).toBeNull();
    expect(gravado.valor).toBe(3250);
  });

  it("devolve o id gerado pelo banco, e a linha é encontrável por ele", async () => {
    const gravado = await repo.criarAvulso(entrada());

    expect(gravado.id).toMatch(/^[0-9a-f-]{36}$/);
    expect((await repo.buscarPorId(gravado.id))?.descricao).toBe("Gasto avulso");
  });

  it("grava pagoEm quando informado e null quando não", async () => {
    const pago = await repo.criarAvulso(entrada({ pagoEm: "2026-03-10" }));
    const previsto = await repo.criarAvulso(entrada({ pagoEm: null }));

    expect(pago.pagoEm).toBe("2026-03-10");
    expect(previsto.pagoEm).toBeNull();
  });

  it("aceita categoria nula", async () => {
    const gravado = await repo.criarAvulso(entrada({ categoriaId: null }));

    expect(gravado.categoriaId).toBeNull();
  });

  it("grava receita como receita, e ela aparece na listagem do mês", async () => {
    await repo.criarAvulso(entrada({ natureza: "RECEITA", descricao: "Pix recebido" }));

    const doMes = await repo.listarPorCompetencia(competencia("2026-03"));

    expect(doMes.map((l) => [l.natureza, l.descricao])).toEqual([["RECEITA", "Pix recebido"]]);
  });

  it("é recusado pelo banco quando o valor não é positivo, e não silenciosamente aceito", async () => {
    await expect(repo.criarAvulso(entrada({ valor: 0 as Cents }))).rejects.toThrow();

    expect(await repo.listarPorCompetencia(competencia("2026-03"))).toHaveLength(0);
  });

  it("duas chamadas idênticas gravam duas linhas: duplicata é caso legítimo", async () => {
    await repo.criarAvulso(entrada());
    await repo.criarAvulso(entrada());

    expect(await repo.listarPorCompetencia(competencia("2026-03"))).toHaveLength(2);
  });
});

describe("MovimentoRepository: cancelar (AVUL-03)", () => {
  const INSTANTE = "2026-03-20T12:00:00.000Z";

  /** Insere um movimento de cada origem, respeitando os CHECK bicondicionais. */
  async function inserirPorOrigem(origem: Origem): Promise<string> {
    if (origem === "AVULSO") {
      return inserirAvulso({ descricao: "Avulso", competencia: "2026-03-01", valorCentavos: 1000 });
    }
    if (origem === "PARCELA") {
      const compraId = await inserirCompraParaParcela();
      const [linha] = await db
        .insert(movimento)
        .values({
          natureza: "DESPESA",
          origem: "PARCELA",
          descricao: "Parcela",
          competencia: "2026-03-01",
          dataEvento: "2026-03-10",
          valorCentavos: 1000,
          usuarioId: base.usuarioId,
          meioPagamentoId: base.cartaoId,
          compraId,
          numeroParcela: 1,
        })
        .returning({ id: movimento.id });
      if (!linha) {
        throw new Error("insert de parcela não retornou id");
      }
      return linha.id;
    }
    const recorrenciaId = await inserirRecorrenciaParaOcorrencia();
    const [linha] = await db
      .insert(movimento)
      .values({
        natureza: "DESPESA",
        origem: "RECORRENCIA",
        descricao: "Ocorrência",
        competencia: "2026-03-01",
        dataEvento: "2026-03-10",
        valorCentavos: 1000,
        usuarioId: base.usuarioId,
        meioPagamentoId: base.contaId,
        recorrenciaId,
      })
      .returning({ id: movimento.id });
    if (!linha) {
      throw new Error("insert de ocorrência não retornou id");
    }
    return linha.id;
  }

  async function inserirCompraParaParcela(): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO compra_parcelada
         (descricao, modo_entrada, valor_total_centavos, qtd_parcelas, parcela_inicial,
          competencia_compra, politica_residuo, valor_amortizado_anterior_centavos,
          usuario_id, meio_pagamento_id, idempotency_key)
       VALUES ('Compra', 'TOTAL', 1000, 1, 1, '2026-03-01', 'PRIMEIRAS', 0, $1, $2, $3)
       RETURNING id`,
      [base.usuarioId, base.cartaoId, `chave-${crypto.randomUUID()}`],
    );
    const linha = rows[0];
    if (!linha) {
      throw new Error("compra não retornou id");
    }
    return linha.id;
  }

  async function inserirRecorrenciaParaOcorrencia(): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO recorrencia
         (descricao, natureza, usuario_id, meio_pagamento_id, competencia_inicio, dia_vencimento)
       VALUES ('Serviço fixo', 'DESPESA', $1, $2, '2026-01-01', 10)
       RETURNING id`,
      [base.usuarioId, base.contaId],
    );
    const linha = rows[0];
    if (!linha) {
      throw new Error("recorrência não retornou id");
    }
    return linha.id;
  }

  it("preenche cancelado_em e mantém a linha no banco — AC 1", async () => {
    const id = await inserirPorOrigem("AVULSO");

    expect(await repo.cancelar(id, INSTANTE)).toBe(true);

    const { rows } = await pool.query<{ cancelado_em: Date | null }>(
      "SELECT cancelado_em FROM movimento WHERE id = $1",
      [id],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.cancelado_em).toEqual(new Date(INSTANTE));
  });

  it("o cancelado sai da listagem da competência — AC 2", async () => {
    const id = await inserirPorOrigem("AVULSO");
    await repo.cancelar(id, INSTANTE);

    expect(await repo.listarPorCompetencia(competencia("2026-03"))).toHaveLength(0);
  });

  it("não altera nada ao cancelar parcela — AC 3", async () => {
    const id = await inserirPorOrigem("PARCELA");

    expect(await repo.cancelar(id, INSTANTE)).toBe(false);
    expect((await repo.buscarPorId(id))?.canceladoEm).toBeNull();
  });

  it("não altera nada ao cancelar ocorrência de recorrência — AC 3", async () => {
    const id = await inserirPorOrigem("RECORRENCIA");

    expect(await repo.cancelar(id, INSTANTE)).toBe(false);
    expect((await repo.buscarPorId(id))?.canceladoEm).toBeNull();
  });

  it("a segunda exclusão preserva o instante da primeira — AC 4", async () => {
    const id = await inserirPorOrigem("AVULSO");
    await repo.cancelar(id, INSTANTE);

    const segunda = await repo.cancelar(id, "2026-03-25T12:00:00.000Z");

    expect(segunda).toBe(false);
    const { rows } = await pool.query<{ cancelado_em: Date }>(
      "SELECT cancelado_em FROM movimento WHERE id = $1",
      [id],
    );
    expect(rows[0]?.cancelado_em).toEqual(new Date(INSTANTE));
  });

  /*
   * A segunda metade de AVUL-04, que faltava: cancelado não se cancela de novo
   * **nem se marca como pago**. O caminho real é duas abas, ou um clique que
   * viajou junto com a exclusão feita na outra.
   */
  it("não marca como pago um lançamento já cancelado — AVUL-04", async () => {
    const id = await inserirPorOrigem("AVULSO");
    await repo.cancelar(id, INSTANTE);

    await repo.marcarPagamento(id, "2026-03-15");

    const { rows } = await pool.query<{ pago_em: string | null }>(
      "SELECT pago_em::text AS pago_em FROM movimento WHERE id = $1",
      [id],
    );
    expect(rows[0]?.pago_em).toBeNull();
  });

  it("continua marcando como pago o lançamento vigente", async () => {
    const id = await inserirPorOrigem("AVULSO");

    await repo.marcarPagamento(id, "2026-03-15");

    expect((await repo.buscarPorId(id))?.pagoEm).toBe("2026-03-15");
  });

  it("id inexistente devolve false, sem lançar", async () => {
    expect(await repo.cancelar("00000000-0000-0000-0000-000000000000", INSTANTE)).toBe(false);
  });

  /**
   * **Teste de concordância.** A regra de quem pode ser cancelado vive em dois
   * lugares: `cancelamentoPermitido`, no domínio, e o `WHERE` do `UPDATE`. Este
   * teste confronta os dois sobre as três origens reais gravadas no banco.
   *
   * Sem ele, a função pura vira dívida: o SQL passaria a ser a única verdade e
   * ninguém notaria os dois divergindo.
   */
  it("o WHERE do UPDATE concorda com cancelamentoPermitido em toda origem", async () => {
    const origens: ReadonlyArray<Origem> = ["AVULSO", "PARCELA", "RECORRENCIA"];

    for (const origem of origens) {
      const id = await inserirPorOrigem(origem);
      const lancamento = await repo.buscarPorId(id);
      if (!lancamento) {
        throw new Error(`fixture de ${origem} não foi gravada`);
      }

      const dominio = cancelamentoPermitido(lancamento).ok;
      const sql = await repo.cancelar(id, INSTANTE);

      expect(sql).toBe(dominio);
      await limparDados(pool);
      base = await semearCadastroBase(pool);
    }
  });
});
