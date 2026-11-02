import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  type CompraRepository,
  type DadosCompra,
  type EntradaSalvarCompra,
  ViolacaoDeConservacao,
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

  /**
   * `Promise.all` acima não garante o interleaving: na prática a segunda
   * submissão chega ao pré-check quando a primeira já commitou, e as duas
   * saem pelo caminho fácil. O caminho difícil — o `catch` de colisão — só
   * roda quando **os dois pré-checks acontecem antes de qualquer commit**.
   *
   * Este repositório reproduz exatamente essa janela, de forma determinística:
   * o pré-check dele devolve `null` uma vez, como se tivesse consultado o
   * banco antes de a outra submissão commitar. Da segunda consulta em diante
   * o comportamento é o real, porque é a consulta que o `catch` faz para
   * recuperar a compra que venceu a corrida.
   */
  function repositorioQueNaoViuACompraNoPreCheck(): CompraRepository {
    const instancia = new CompraRepositoryDrizzle(db);
    const consultaReal = instancia.buscarPorIdempotencyKey.bind(instancia);
    let preCheck = true;
    instancia.buscarPorIdempotencyKey = async (idempotencyKey: string) => {
      if (preCheck) {
        preCheck = false;
        return null;
      }
      return consultaReal(idempotencyKey);
    };
    return instancia;
  }

  it("recupera a compra existente quando o pré-check perdeu a corrida — PARC-05, AC 9", async () => {
    const primeiro = await repo.salvarComParcelas(entrada("chave-corrida"));
    if (!primeiro.ok) {
      throw new Error("esperava sucesso na submissão que venceu a corrida");
    }
    const emCorrida = repositorioQueNaoViuACompraNoPreCheck();

    const segundo = await emCorrida.salvarComParcelas(entrada("chave-corrida"));

    if (!segundo.ok) {
      throw new Error(`esperava sucesso na submissão que perdeu, veio ${segundo.error.code}`);
    }
    expect(segundo.value.id).toBe(primeiro.value.id);
    expect(segundo.value.parcelas.map((p) => p.numeroParcela)).toEqual([1, 2, 3]);
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

describe("totaisDeParcelas (T51, PARC-08, AC 7)", () => {
  it("devolve a quantidade total de parcelas de cada compra informada", async () => {
    const dez = await repo.salvarComParcelas(
      entrada("chave-8-de-10", planoOitoDeDez(), {
        qtdParcelas: 10,
        parcelaInicial: 8,
        competenciaCompra: competencia("2025-08"),
        modo: "VALOR_PARCELA",
      }),
    );
    const tres = await repo.salvarComParcelas(entrada("chave-3"));
    expect(dez.ok && tres.ok).toBe(true);
    if (!dez.ok || !tres.ok) {
      return;
    }

    const totais = await repo.totaisDeParcelas([dez.value.id, tres.value.id]);

    expect(totais.get(dez.value.id)).toBe(10);
    expect(totais.get(tres.value.id)).toBe(3);
  });

  it("ignora id que não corresponde a nenhuma compra e aceita lista vazia", async () => {
    const totais = await repo.totaisDeParcelas(["99999999-9999-4999-8999-999999999999"]);

    expect(totais.size).toBe(0);
    expect((await repo.totaisDeParcelas([])).size).toBe(0);
  });
});

describe("trocarCategoria (TRC-03 AC 3 e 5)", () => {
  let categoriaDois: string;
  let escolhida: string;
  let outra: string;

  beforeEach(async () => {
    const { rows } = await pool.query<{ id: string }>(
      "INSERT INTO categoria (nome) VALUES ('Categoria Dois') RETURNING id",
    );
    categoriaDois = rows[0]?.id ?? "";
    const a = await repo.salvarComParcelas(entrada("chave-escolhida"));
    const b = await repo.salvarComParcelas(entrada("chave-outra"));
    if (!a.ok || !b.ok) {
      throw new Error("fixture inválida");
    }
    escolhida = a.value.id;
    outra = b.value.id;
    await pool.query(
      "UPDATE movimento SET pago_em = '2026-03-12' WHERE compra_id = $1 AND numero_parcela = 1",
      [escolhida],
    );
  });

  async function compraGravada(compraId: string): Promise<Record<string, unknown>> {
    const { rows } = await pool.query("SELECT * FROM compra_parcelada WHERE id = $1", [compraId]);
    return rows[0] ?? {};
  }

  async function parcelasGravadas(compraId: string): Promise<Record<string, unknown>[]> {
    const { rows } = await pool.query(
      "SELECT * FROM movimento WHERE compra_id = $1 ORDER BY numero_parcela",
      [compraId],
    );
    return rows;
  }

  it("grava a categoria na compra e em todas as parcelas, da primeira à última — AC 3", async () => {
    const antes = {
      compra: await compraGravada(escolhida),
      parcelas: await parcelasGravadas(escolhida),
    };
    expect(antes.parcelas.map((p) => p.numero_parcela)).toEqual([1, 2, 3]);

    await repo.trocarCategoria(escolhida, categoriaDois);

    expect(await compraGravada(escolhida)).toEqual({
      ...antes.compra,
      categoria_id: categoriaDois,
    });
    expect(await parcelasGravadas(escolhida)).toEqual(
      antes.parcelas.map((p) => ({ ...p, categoria_id: categoriaDois })),
    );
  });

  it("não toca em valor, número, data nem pagamento de nenhuma parcela — AC 3", async () => {
    await repo.trocarCategoria(escolhida, categoriaDois);

    const { rows } = await pool.query(
      `SELECT numero_parcela, valor_centavos::text AS valor, competencia::text, data_evento::text AS data,
              pago_em::text AS pago, cancelado_em::text AS cancelado
       FROM movimento WHERE compra_id = $1 ORDER BY numero_parcela`,
      [escolhida],
    );
    expect(rows).toEqual([
      {
        numero_parcela: 1,
        valor: "33334",
        competencia: "2026-03-01",
        data: "2026-03-10",
        pago: "2026-03-12",
        cancelado: null,
      },
      {
        numero_parcela: 2,
        valor: "33333",
        competencia: "2026-04-01",
        data: "2026-03-10",
        pago: null,
        cancelado: null,
      },
      {
        numero_parcela: 3,
        valor: "33333",
        competencia: "2026-05-01",
        data: "2026-03-10",
        pago: null,
        cancelado: null,
      },
    ]);
  });

  it("outra compra e as parcelas dela ficam iguais", async () => {
    const antes = { compra: await compraGravada(outra), parcelas: await parcelasGravadas(outra) };

    await repo.trocarCategoria(escolhida, categoriaDois);

    expect(await compraGravada(outra)).toEqual(antes.compra);
    expect(await parcelasGravadas(outra)).toEqual(antes.parcelas);
  });

  it("null grava a ausência de categoria na compra e em todas as parcelas — AC 5", async () => {
    await repo.trocarCategoria(escolhida, null);

    expect((await compraGravada(escolhida)).categoria_id).toBeNull();
    expect((await parcelasGravadas(escolhida)).map((p) => p.categoria_id)).toEqual([
      null,
      null,
      null,
    ]);
  });
});

/**
 * Excluir desta parcela em diante (excluir-compra T3). A compra A é 4x de
 * R$ 10,00, de dezembro a março: valor redondo para a soma de cabeça.
 */
function planoQuatroDeDez(): PlanoParcelamento {
  const resultado = gerarParcelas({
    modo: "VALOR_PARCELA",
    valorEntrada: cents(1000),
    qtdParcelas: 4,
    competenciaCompra: competencia("2026-12"),
    parcelaInicial: 1,
    politicaResiduo: "PRIMEIRAS",
  });
  if (!resultado.ok) {
    throw new Error("fixture inválida");
  }
  return resultado.value;
}

async function salvarQuatroDeDez(chave: string, descricao: string): Promise<string> {
  const resultado = await repo.salvarComParcelas(
    entrada(chave, planoQuatroDeDez(), {
      descricao,
      modo: "VALOR_PARCELA",
      qtdParcelas: 4,
      competenciaCompra: competencia("2026-12"),
      dataEvento: "2026-12-05",
    }),
  );
  if (!resultado.ok) {
    throw new Error(`fixture inválida: ${resultado.error.code}`);
  }
  return resultado.value.id;
}

async function marcarNoBanco(
  compraId: string,
  numero: number,
  coluna: "pago_em" | "cancelado_em",
): Promise<void> {
  const valor = coluna === "pago_em" ? "2027-02-10" : "2026-12-20T12:00:00Z";
  await pool.query(
    `UPDATE movimento SET ${coluna} = $3 WHERE compra_id = $1 AND numero_parcela = $2`,
    [compraId, numero, valor],
  );
}

describe("parcelasVigentes (excluir-compra T3, EXC-02, EXC-04 AC 5)", () => {
  it("devolve amortizado, quantidade do plano e só as parcelas não canceladas de cada compra", async () => {
    const a = await salvarQuatroDeDez("chave-a", "Compra A");
    await marcarNoBanco(a, 3, "pago_em");
    await marcarNoBanco(a, 4, "cancelado_em");
    const emAndamento = await repo.salvarComParcelas(
      entrada("chave-8-de-10", planoOitoDeDez(), {
        qtdParcelas: 10,
        parcelaInicial: 8,
        competenciaCompra: competencia("2025-08"),
        modo: "VALOR_PARCELA",
      }),
    );
    if (!emAndamento.ok) {
      throw new Error("fixture inválida");
    }
    const b = emAndamento.value.id;

    const vigentes = await repo.parcelasVigentes([a, b, "99999999-9999-4999-8999-999999999999"]);

    expect(vigentes.size).toBe(2);
    expect(vigentes.get(a)).toEqual({
      qtdParcelas: 4,
      valorAmortizadoAnterior: 0,
      parcelas: [
        { numero: 1, competencia: "2026-12", valor: 1000, paga: false },
        { numero: 2, competencia: "2027-01", valor: 1000, paga: false },
        { numero: 3, competencia: "2027-02", valor: 1000, paga: true },
      ],
    });
    expect(vigentes.get(b)).toEqual({
      qtdParcelas: 10,
      valorAmortizadoAnterior: 42000,
      parcelas: [
        { numero: 8, competencia: "2026-03", valor: 6000, paga: false },
        { numero: 9, competencia: "2026-04", valor: 6000, paga: false },
        { numero: 10, competencia: "2026-05", valor: 6000, paga: false },
      ],
    });
  });

  it("compra com todas as parcelas canceladas entra com a lista vazia, e lista vazia devolve mapa vazio", async () => {
    const a = await salvarQuatroDeDez("chave-a", "Compra A");
    for (const numero of [1, 2, 3, 4]) {
      await marcarNoBanco(a, numero, "cancelado_em");
    }

    const vigentes = await repo.parcelasVigentes([a]);

    expect(vigentes.get(a)).toEqual({ qtdParcelas: 4, valorAmortizadoAnterior: 0, parcelas: [] });
    expect((await repo.parcelasVigentes([])).size).toBe(0);
  });
});

describe("excluirParcelas (excluir-compra T3, EXC-03)", () => {
  const AGORA = "2027-01-15T13:00:00.000Z";
  let a: string;

  beforeEach(async () => {
    a = await salvarQuatroDeDez("chave-a", "Compra A");
  });

  async function parcelas(compraId: string) {
    const { rows } = await pool.query(
      `SELECT numero_parcela AS numero, valor_centavos::text AS valor, competencia::text,
              data_evento::text AS data, categoria_id AS categoria, pago_em::text AS pago,
              cancelado_em AS cancelado
         FROM movimento WHERE compra_id = $1 ORDER BY numero_parcela`,
      [compraId],
    );
    return rows as Array<Record<string, unknown> & { cancelado: Date | null }>;
  }

  async function totalGravado(compraId: string): Promise<number> {
    const { rows } = await pool.query<{ total: string }>(
      "SELECT valor_total_centavos::text AS total FROM compra_parcelada WHERE id = $1",
      [compraId],
    );
    return Number(rows[0]?.total);
  }

  it("cancela 2 e 4 com o instante dado, deixa 1 e 3 iguais e grava o total — AC 1, 2 e 4", async () => {
    const antes = await parcelas(a);

    await repo.excluirParcelas(a, [2, 4], cents(2000), AGORA);

    const depois = await parcelas(a);
    expect(depois.map((p) => p.cancelado?.toISOString() ?? null)).toEqual([
      null,
      AGORA,
      null,
      AGORA,
    ]);
    expect(depois[0]).toEqual(antes[0]);
    expect(depois[2]).toEqual(antes[2]);
    expect(await totalGravado(a)).toBe(2000);
  });

  it("parcela paga do alcance fica com o mesmo valor e o mesmo pago_em — AC 3", async () => {
    await marcarNoBanco(a, 3, "pago_em");

    await repo.excluirParcelas(a, [2, 4], cents(2000), AGORA);

    const terceira = (await parcelas(a))[2];
    expect(terceira).toMatchObject({
      numero: 3,
      valor: "1000",
      pago: "2027-02-10",
      cancelado: null,
    });
  });

  it("parcela paga na lista não é cancelada, e o assert desfaz tudo — AC 3 e 6", async () => {
    await marcarNoBanco(a, 3, "pago_em");
    const antes = await parcelas(a);

    const recusa = repo.excluirParcelas(a, [2, 3, 4], cents(1000), AGORA);

    await expect(recusa).rejects.toBeInstanceOf(ViolacaoDeConservacao);
    await expect(recusa).rejects.toMatchObject({ soma: 2000, valorTotal: 1000 });
    expect(await parcelas(a)).toEqual(antes);
    expect(await totalGravado(a)).toBe(4000);
  });

  it("total que não fecha lança ViolacaoDeConservacao e nenhuma parcela é cancelada — AC 6", async () => {
    const antes = await parcelas(a);

    const recusa = repo.excluirParcelas(a, [2, 4], cents(1999), AGORA);

    await expect(recusa).rejects.toMatchObject({
      code: "CONSERVACAO_VIOLADA",
      soma: 2000,
      valorTotal: 1999,
    });
    expect(await parcelas(a)).toEqual(antes);
    expect(await totalGravado(a)).toBe(4000);
  });

  it("conta o amortizado anterior da compra em andamento no total — AC 4", async () => {
    const emAndamento = await repo.salvarComParcelas(
      entrada("chave-8-de-10", planoOitoDeDez(), {
        qtdParcelas: 10,
        parcelaInicial: 8,
        competenciaCompra: competencia("2025-08"),
        modo: "VALOR_PARCELA",
      }),
    );
    if (!emAndamento.ok) {
      throw new Error("fixture inválida");
    }

    await repo.excluirParcelas(emAndamento.value.id, [9, 10], cents(42000 + 6000), AGORA);

    expect(await totalGravado(emAndamento.value.id)).toBe(48000);
    expect((await parcelas(emAndamento.value.id)).map((p) => p.cancelado !== null)).toEqual([
      false,
      true,
      true,
    ]);
  });

  it("outra compra, um avulso e uma ocorrência de fixo da mesma competência ficam iguais — AC 5", async () => {
    await salvarQuatroDeDez("chave-outra", "Compra B");
    await pool.query(
      `INSERT INTO movimento (natureza, origem, descricao, competencia, data_evento, valor_centavos,
                              usuario_id, meio_pagamento_id)
       VALUES ('DESPESA', 'AVULSO', 'Avulso A', '2027-01-01', '2027-01-05', 1000, $1, $2)`,
      [base.usuarioId, base.cartaoId],
    );
    const { rows: recorrencia } = await pool.query<{ id: string }>(
      `INSERT INTO recorrencia (descricao, natureza, usuario_id, meio_pagamento_id,
                                competencia_inicio, dia_vencimento)
       VALUES ('Fixo A', 'DESPESA', $1, $2, '2027-01-01', 10) RETURNING id`,
      [base.usuarioId, base.contaId],
    );
    await pool.query(
      `INSERT INTO movimento (natureza, origem, descricao, competencia, data_evento, valor_centavos,
                              valor_previsto_centavos, usuario_id, meio_pagamento_id, recorrencia_id)
       VALUES ('DESPESA', 'RECORRENCIA', 'Fixo A', '2027-01-01', '2027-01-10', 1000, 1000, $1, $2, $3)`,
      [base.usuarioId, base.contaId, recorrencia[0]?.id],
    );
    const fora = async () => ({
      compra: (await pool.query("SELECT * FROM compra_parcelada WHERE id <> $1", [a])).rows,
      movimentos: (
        await pool.query(
          "SELECT * FROM movimento WHERE compra_id IS DISTINCT FROM $1 ORDER BY origem, id",
          [a],
        )
      ).rows,
    });
    const antes = await fora();
    expect(antes.movimentos.map((m) => m.origem)).toEqual([
      "AVULSO",
      "PARCELA",
      "PARCELA",
      "PARCELA",
      "PARCELA",
      "RECORRENCIA",
    ]);

    await repo.excluirParcelas(a, [2, 3, 4], cents(1000), AGORA);

    expect(await fora()).toEqual(antes);
  });
});
