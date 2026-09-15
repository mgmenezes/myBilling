import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { MovimentoRepository } from "@/application/ports/repositories";
import { type Cents, type Competencia, criarCompetencia } from "@/domain";
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
