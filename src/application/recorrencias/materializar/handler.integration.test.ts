import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { obterVisaoMensal } from "@/application/mes/obter-visao-mensal/handler";
import type { Cents, Competencia } from "@/domain";
import { type BancoDeDados, criarCliente, criarPool } from "@/infrastructure/db/client";
import { CadastroRepositoryDrizzle } from "@/infrastructure/db/repositories/cadastro.repository";
import { CompraRepositoryDrizzle } from "@/infrastructure/db/repositories/compra.repository";
import { MovimentoRepositoryDrizzle } from "@/infrastructure/db/repositories/movimento.repository";
import { RecorrenciaRepositoryDrizzle } from "@/infrastructure/db/repositories/recorrencia.repository";
import {
  type CadastroBase,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
  URL_BANCO_DE_TESTE,
} from "@/infrastructure/db/testing/banco-de-teste";
import { materializarRecorrencias } from "./handler";

/**
 * A materialização contra Postgres real.
 *
 * O teste com fake já provou a lógica. O que **só** o banco demonstra está
 * aqui: que abrir a mesma página várias vezes — inclusive ao mesmo tempo — não
 * duplica nada, porque a garantia é a restrição única e não uma consulta
 * prévia. Com fake, "consultar e depois inserir" passaria.
 */

const c = (t: string) => t as Competencia;

let pool: Pool;
let db: BancoDeDados;
let base: CadastroBase;

function deps() {
  return {
    recorrencias: new RecorrenciaRepositoryDrizzle(db),
    movimentos: new MovimentoRepositoryDrizzle(db),
  };
}

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

async function criarFixo(valor = 9900, descricao = "Serviço fixo C") {
  return new RecorrenciaRepositoryDrizzle(db).criar({
    dados: {
      descricao,
      natureza: "DESPESA",
      categoriaId: base.categoriaId,
      usuarioId: base.usuarioId,
      meioPagamentoId: base.contaId,
      competenciaInicio: c("2026-03"),
      competenciaFim: null,
      diaVencimento: 28,
    },
    valorInicial: valor as Cents,
  });
}

async function contar(): Promise<number> {
  const { rows } = await pool.query<{ total: string }>(
    "SELECT COUNT(*) AS total FROM movimento WHERE recorrencia_id IS NOT NULL",
  );
  return Number(rows[0]?.total ?? "-1");
}

describe("materializar contra o banco (FIXO-02)", () => {
  it("abrir o mês cria as ocorrências faltantes da janela", async () => {
    await criarFixo();

    await materializarRecorrencias(deps(), c("2026-03"), 3);

    expect(await contar()).toBe(4);
  });

  it("abrir três vezes mantém uma ocorrência por competência (AC 1)", async () => {
    await criarFixo();

    await materializarRecorrencias(deps(), c("2026-03"), 3);
    await materializarRecorrencias(deps(), c("2026-03"), 3);
    await materializarRecorrencias(deps(), c("2026-03"), 3);

    expect(await contar()).toBe(4);
  });

  it("aberturas concorrentes não falham por conflito (AC 2)", async () => {
    await criarFixo();

    await Promise.all([
      materializarRecorrencias(deps(), c("2026-03"), 3),
      materializarRecorrencias(deps(), c("2026-03"), 3),
      materializarRecorrencias(deps(), c("2026-03"), 3),
    ]);

    expect(await contar()).toBe(4);
  });

  it("navegar mês a mês vai preenchendo sem buraco", async () => {
    await criarFixo();

    for (const mes of ["2026-03", "2026-04", "2026-05", "2026-06"]) {
      await materializarRecorrencias(deps(), c(mes), 3);
    }

    const { rows } = await pool.query<{ competencia: string }>(
      "SELECT DISTINCT competencia::text FROM movimento WHERE recorrencia_id IS NOT NULL ORDER BY 1",
    );
    expect(rows.map((r) => r.competencia)).toEqual([
      "2026-03-01",
      "2026-04-01",
      "2026-05-01",
      "2026-06-01",
      "2026-07-01",
      "2026-08-01",
      "2026-09-01",
    ]);
  });

  it("a régua de comprometimento futuro passa a incluir os fixos (FIXO-05, AC 1)", async () => {
    await criarFixo(9900);

    const antes = await obterVisaoMensal(
      {
        movimentos: new MovimentoRepositoryDrizzle(db),
        compras: new CompraRepositoryDrizzle(db),
        cadastros: new CadastroRepositoryDrizzle(db),
      },
      c("2026-03"),
    );
    expect(antes.futuro.map((f) => f.comprometido)).toEqual([0, 0, 0]);

    await materializarRecorrencias(deps(), c("2026-03"), 3);

    const depois = await obterVisaoMensal(
      {
        movimentos: new MovimentoRepositoryDrizzle(db),
        compras: new CompraRepositoryDrizzle(db),
        cadastros: new CadastroRepositoryDrizzle(db),
      },
      c("2026-03"),
    );
    expect(depois.futuro.map((f) => f.comprometido)).toEqual([9900, 9900, 9900]);
  });
});
