import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Cents, Competencia } from "@/domain";
import { type BancoDeDados, criarCliente, criarPool } from "@/infrastructure/db/client";
import { MovimentoRepositoryDrizzle } from "@/infrastructure/db/repositories/movimento.repository";
import { RecorrenciaRepositoryDrizzle } from "@/infrastructure/db/repositories/recorrencia.repository";
import {
  type CadastroBase,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
  URL_BANCO_DE_TESTE,
} from "@/infrastructure/db/testing/banco-de-teste";
import { obterUsoNoMes } from "./handler";

/**
 * O uso no mês contra Postgres real (CADCOL-03, ACs 3 e 5).
 *
 * O teste com fakes já provou a regra e a concordância com a lista. O que só o
 * banco mostra está aqui: o fixo gravado sem ocorrência passa a ter uma ao abrir
 * Cadastros, o repositório deixa fora o cancelado e o de outro mês, e abrir de
 * novo não duplica ocorrência, porque a garantia é a restrição única.
 */

const c = (t: string) => t as Competencia;
const MARCO = c("2026-03");

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

  // Fixo A: Categoria Um, Conta Corrente, desde janeiro, sem fim e sem ocorrência gravada.
  await new RecorrenciaRepositoryDrizzle(db).criar({
    dados: {
      descricao: "Fixo A",
      natureza: "DESPESA",
      categoriaId: base.categoriaId,
      usuarioId: base.usuarioId,
      meioPagamentoId: base.contaId,
      competenciaInicio: c("2026-01"),
      competenciaFim: null,
      diaVencimento: 10,
    },
    valorInicial: 10000 as Cents,
  });

  const movimentos = new MovimentoRepositoryDrizzle(db);
  const avulso = (descricao: string, competencia: Competencia, meioPagamentoId: string) =>
    movimentos.criarAvulso({
      natureza: "DESPESA",
      descricao,
      competencia,
      dataEvento: `${competencia}-15`,
      valor: 2000 as Cents,
      pagoEm: null,
      categoriaId: base.categoriaId,
      usuarioId: base.usuarioId,
      meioPagamentoId,
    });

  await avulso("Gasto A", MARCO, base.cartaoId);
  const cancelado = await avulso("Gasto B", MARCO, base.contaId);
  await movimentos.cancelar(cancelado.id, "2026-03-16T12:00:00Z");
  await avulso("Gasto C", c("2026-04"), base.contaId);
});

async function ocorrenciasDoFixo(): Promise<number> {
  const { rows } = await pool.query<{ total: string }>(
    "SELECT COUNT(*) AS total FROM movimento WHERE recorrencia_id IS NOT NULL",
  );
  return Number(rows[0]?.total ?? "-1");
}

describe("obterUsoNoMes contra o banco (CADCOL-03, ACs 3 e 5)", () => {
  it("conta em março a ocorrência criada ao abrir, o gasto do mês, e não o cancelado nem o de abril", async () => {
    expect(await ocorrenciasDoFixo()).toBe(0);

    const uso = await obterUsoNoMes(deps(), MARCO);

    expect(uso.porCategoria.get(base.categoriaId)).toEqual({ fixos: 1, lancamentos: 2 });
    expect(uso.porMeio.get(base.contaId)).toEqual({ fixos: 1, lancamentos: 1 });
    expect(uso.porMeio.get(base.cartaoId)).toEqual({ fixos: 0, lancamentos: 1 });
  });

  it("abrir duas vezes não cria ocorrência nova e dá a mesma contagem", async () => {
    const primeira = await obterUsoNoMes(deps(), MARCO);
    const depoisDaPrimeira = await ocorrenciasDoFixo();
    const segunda = await obterUsoNoMes(deps(), MARCO);

    /* O mês aberto e os doze seguintes (HORIZ-01, AC 1). */
    expect(depoisDaPrimeira).toBe(13);
    expect(await ocorrenciasDoFixo()).toBe(13);
    expect(segunda.porCategoria.get(base.categoriaId)).toEqual(
      primeira.porCategoria.get(base.categoriaId),
    );
    expect(segunda.porMeio.get(base.contaId)).toEqual({ fixos: 1, lancamentos: 1 });
  });
});
