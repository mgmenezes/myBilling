import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type {
  CompraRepository,
  DadosCompra,
  EntradaSalvarCompra,
} from "@/application/ports/repositories";
import {
  type Cents,
  type Competencia,
  criarCents,
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
import { CompraRepositoryDrizzle } from "./compra.repository";

/**
 * Fixtures por propriedade matemática, não por realismo (AD-009):
 * R$ 1.000,00 em 3x é o caso do resíduo (33334 / 33333 / 33333) e o
 * `8/10` de R$ 60,00 por parcela é o caso da compra já em andamento.
 */

function cents(valor: number): Cents {
  const resultado = criarCents(valor);
  if (!resultado.ok) {
    throw new Error(`fixture inválida: ${resultado.error.code}`);
  }
  return resultado.value;
}

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
    valorEntrada: cents(100000),
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

function planoOitoDeDez(): PlanoParcelamento {
  const resultado = gerarParcelas({
    modo: "VALOR_PARCELA",
    valorEntrada: cents(6000),
    qtdParcelas: 10,
    competenciaCompra: competencia("2025-08"),
    parcelaInicial: 8,
    politicaResiduo: "PRIMEIRAS",
  });
  if (!resultado.ok) {
    throw new Error("fixture inválida");
  }
  return resultado.value;
}

let pool: Pool;
let db: BancoDeDados;
let repo: CompraRepository;
let base: CadastroBase;

beforeAll(async () => {
  pool = criarPool(URL_BANCO_DE_TESTE);
  db = criarCliente(pool);
  repo = new CompraRepositoryDrizzle(db);
  await recriarBancoDeTeste(pool);
}, 60_000);

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await limparDados(pool);
  base = await semearCadastroBase(pool);
});

function dados(sobrescrever: Partial<DadosCompra> = {}): DadosCompra {
  return {
    descricao: "Compra de teste",
    modo: "TOTAL",
    politicaResiduo: "PRIMEIRAS",
    competenciaCompra: competencia("2026-03"),
    qtdParcelas: 3,
    parcelaInicial: 1,
    categoriaId: base.categoriaId,
    usuarioId: base.usuarioId,
    meioPagamentoId: base.cartaoId,
    dataEvento: "2026-03-10",
    ...sobrescrever,
  };
}

function entrada(
  idempotencyKey: string,
  plano = planoDeMilReaisEmTres(),
  sobrescrever: Partial<DadosCompra> = {},
): EntradaSalvarCompra {
  return { idempotencyKey, dados: dados(sobrescrever), plano };
}

/** O Drizzle embrulha o erro do driver: a causa real está na cadeia de `cause`. */
function cadeiaDeMensagens(erro: unknown): string {
  const mensagens: string[] = [];
  let atual: unknown = erro;
  for (let profundidade = 0; atual && profundidade < 5; profundidade += 1) {
    const candidato = atual as { message?: string; cause?: unknown };
    if (candidato.message) {
      mensagens.push(candidato.message);
    }
    atual = candidato.cause;
  }
  return mensagens.join(" | ");
}

async function contar(tabela: "compra_parcelada" | "movimento", filtro = ""): Promise<number> {
  const { rows } = await pool.query<{ total: string }>(
    `SELECT count(*)::text AS total FROM ${tabela} ${filtro}`,
  );
  return Number.parseInt(rows[0]?.total ?? "0", 10);
}

describe("salvarComParcelas: caminho feliz (T34, PARC-01)", () => {
  it("grava o plano e as três parcelas com os valores do rateio — PARC-01, AC 1", async () => {
    const resultado = await repo.salvarComParcelas(entrada("chave-1"));

    if (!resultado.ok) {
      throw new Error(`esperava sucesso, veio ${resultado.error.code}`);
    }
    expect(resultado.value.parcelas.map((p) => p.valor)).toEqual([33334, 33333, 33333]);
    expect(resultado.value.parcelas.map((p) => p.competencia)).toEqual([
      "2026-03",
      "2026-04",
      "2026-05",
    ]);
    expect(await contar("movimento")).toBe(3);
    expect(await contar("compra_parcelada")).toBe(1);
  });
});

describe("salvarComParcelas: rollback da transação (T34, PARC-05, AC 8)", () => {
  /**
   * Gatilho que derruba exatamente a **terceira** parcela. As duas primeiras
   * já entraram na transação quando a falha acontece — é o cenário em que
   * uma escrita não transacional deixaria a compra órfã.
   */
  async function comFalhaNaTerceiraParcela<T>(acao: () => Promise<T>): Promise<T> {
    await pool.query(`
      CREATE OR REPLACE FUNCTION falhar_na_terceira_parcela() RETURNS trigger AS $$
      BEGIN
        IF NEW.numero_parcela = 3 THEN
          RAISE EXCEPTION 'falha simulada ao inserir a terceira parcela';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await pool.query(`
      CREATE TRIGGER derrubar_terceira_parcela BEFORE INSERT ON movimento
      FOR EACH ROW EXECUTE FUNCTION falhar_na_terceira_parcela();
    `);
    try {
      return await acao();
    } finally {
      await pool.query("DROP TRIGGER IF EXISTS derrubar_terceira_parcela ON movimento");
      await pool.query("DROP FUNCTION IF EXISTS falhar_na_terceira_parcela()");
    }
  }

  it("falha ao inserir a terceira parcela não deixa a compra órfã no banco", async () => {
    let motivo = "";
    await comFalhaNaTerceiraParcela(async () => {
      try {
        await repo.salvarComParcelas(entrada("chave-rollback"));
      } catch (erro) {
        motivo = cadeiaDeMensagens(erro);
      }
    });

    expect(motivo).toMatch(/falha simulada ao inserir a terceira parcela/);
    expect(await contar("compra_parcelada")).toBe(0);
    expect(await contar("movimento")).toBe(0);
  });

  it("depois do rollback a mesma chave de idempotência ainda pode ser usada", async () => {
    await comFalhaNaTerceiraParcela(async () => {
      await expect(repo.salvarComParcelas(entrada("chave-rollback"))).rejects.toThrow();
    });

    const resultado = await repo.salvarComParcelas(entrada("chave-rollback"));

    expect(resultado.ok).toBe(true);
    expect(await contar("compra_parcelada")).toBe(1);
    expect(await contar("movimento")).toBe(3);
  });
});

describe("salvarComParcelas: assert de conservação (T34, PARC-01, AC 2)", () => {
  it("reverte com CONSERVACAO_VIOLADA quando a soma diverge do total", async () => {
    const plano = planoDeMilReaisEmTres();
    const planoQuebrado: PlanoParcelamento = { ...plano, valorTotal: cents(99999) };

    const resultado = await repo.salvarComParcelas(entrada("chave-conservacao", planoQuebrado));

    if (resultado.ok) {
      throw new Error("esperava erro de conservação");
    }
    expect(resultado.error.code).toBe("CONSERVACAO_VIOLADA");
    expect(resultado.error.detalhes).toEqual({ somaGravada: 100000, valorTotal: 99999 });
    expect(await contar("compra_parcelada")).toBe(0);
    expect(await contar("movimento")).toBe(0);
  });
});

describe("salvarComParcelas: idempotência (T34, PARC-05, AC 9)", () => {
  it("reenvio com a mesma chave devolve a compra existente sem criar parcela nova", async () => {
    const primeiro = await repo.salvarComParcelas(entrada("chave-repetida"));
    if (!primeiro.ok) {
      throw new Error("esperava sucesso no primeiro envio");
    }

    const segundo = await repo.salvarComParcelas(entrada("chave-repetida"));

    if (!segundo.ok) {
      throw new Error("esperava sucesso no reenvio");
    }
    expect(segundo.value.id).toBe(primeiro.value.id);
    expect(segundo.value.parcelas).toHaveLength(3);
    expect(await contar("compra_parcelada")).toBe(1);
    expect(await contar("movimento")).toBe(3);
  });

  it("duplo-clique simultâneo com a mesma chave cria uma única compra", async () => {
    const [a, b] = await Promise.all([
      repo.salvarComParcelas(entrada("chave-duplo-clique")),
      repo.salvarComParcelas(entrada("chave-duplo-clique")),
    ]);

    if (!a?.ok || !b?.ok) {
      throw new Error("esperava sucesso nas duas submissões");
    }
    expect(a.value.id).toBe(b.value.id);
    expect(await contar("compra_parcelada")).toBe(1);
    expect(await contar("movimento")).toBe(3);
  });
});

describe("salvarComParcelas: compra já em andamento (T34, PARC-07)", () => {
  it("grava 3 parcelas numeradas 8, 9 e 10 e nenhuma linha antes da competência inicial", async () => {
    const resultado = await repo.salvarComParcelas(
      entrada("chave-8-10", planoOitoDeDez(), {
        qtdParcelas: 10,
        parcelaInicial: 8,
        competenciaCompra: competencia("2025-08"),
        modo: "VALOR_PARCELA",
      }),
    );

    if (!resultado.ok) {
      throw new Error(`esperava sucesso, veio ${resultado.error.code}`);
    }
    expect(resultado.value.parcelas.map((p) => p.numeroParcela)).toEqual([8, 9, 10]);
    expect(resultado.value.parcelas.map((p) => p.competencia)).toEqual([
      "2026-03",
      "2026-04",
      "2026-05",
    ]);
    expect(await contar("movimento")).toBe(3);
    expect(await contar("movimento", "WHERE competencia < DATE '2026-03-01'")).toBe(0);
    expect(resultado.value.valorAmortizadoAnterior).toBe(42000);
  });

  it("guarda o valor amortizado anterior no plano e fora de qualquer movimento — PARC-07, AC 2 e 4", async () => {
    await repo.salvarComParcelas(
      entrada("chave-8-10", planoOitoDeDez(), {
        qtdParcelas: 10,
        parcelaInicial: 8,
        competenciaCompra: competencia("2025-08"),
        modo: "VALOR_PARCELA",
      }),
    );

    const { rows } = await pool.query<{ amortizado: string; soma_movimentos: string }>(`
      SELECT c.valor_amortizado_anterior_centavos::text AS amortizado,
             coalesce(sum(m.valor_centavos), 0)::text AS soma_movimentos
      FROM compra_parcelada c LEFT JOIN movimento m ON m.compra_id = c.id
      GROUP BY c.id, c.valor_amortizado_anterior_centavos
    `);
    expect(rows[0]?.amortizado).toBe("42000");
    expect(rows[0]?.soma_movimentos).toBe("18000");
  });
});

describe("buscarPorIdempotencyKey (T34)", () => {
  it("devolve null quando a chave nunca foi usada", async () => {
    expect(await repo.buscarPorIdempotencyKey("chave-inexistente")).toBeNull();
  });

  it("devolve a compra com suas parcelas em ordem", async () => {
    await repo.salvarComParcelas(entrada("chave-1"));

    const compra = await repo.buscarPorIdempotencyKey("chave-1");

    expect(compra?.parcelas.map((p) => p.numeroParcela)).toEqual([1, 2, 3]);
    expect(compra?.valorTotal).toBe(100000);
    expect(compra?.valorAmortizadoAnterior).toBe(0);
  });
});
