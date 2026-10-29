import { readFileSync } from "node:fs";
import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Cents, Competencia } from "@/domain";
import {
  type CadastroBase,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
  URL_BANCO_DE_TESTE,
} from "@/infrastructure/db/testing/banco-de-teste";

/**
 * As Server Actions do lançamento avulso contra o Postgres real (AD-010). O que
 * está sob teste é a borda: sessão, revalidação do payload no servidor, as
 * rotas revalidadas e o envelope uniforme.
 *
 * `next/cache` é o único módulo trocado por dublê — `revalidatePath` exige um
 * contexto de requisição do Next que não existe aqui.
 */

process.env.DATABASE_URL = URL_BANCO_DE_TESTE;
process.env.AUTH_SECRET ??= "segredo-local-de-teste-nao-e-credencial";
process.env.AUTH_GOOGLE_ID ??= "client-id-placeholder";
process.env.AUTH_GOOGLE_SECRET ??= "client-secret-placeholder";
process.env.EMAILS_PERMITIDOS = "pessoa-a@example.com,pessoa-b@example.com";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (rota: string) => revalidatePath(rota) }));

let sessaoAtual: { user: { email: string; name: string } } | null = null;
vi.mock("@/infrastructure/auth/auth", async (original) => ({
  ...(await original<typeof import("@/infrastructure/auth/auth")>()),
  auth: async () => sessaoAtual,
}));

const { cancelarLancamento, criarLancamentoAvulso, trocarCategoria } = await import(
  "./lancamentos"
);
const { criarCliente, criarPool } = await import("@/infrastructure/db/client");
const { MovimentoRepositoryDrizzle } = await import(
  "@/infrastructure/db/repositories/movimento.repository"
);
const { RecorrenciaRepositoryDrizzle } = await import(
  "@/infrastructure/db/repositories/recorrencia.repository"
);
const { materializarRecorrencias } = await import(
  "@/application/recorrencias/materializar/handler"
);

const EMAIL_PERMITIDO = "pessoa-a@example.com";

let pool: Pool;
let base: CadastroBase;

function entrada(mudancas: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    descricao: "Almoço",
    natureza: "DESPESA",
    valorCentavos: 3250,
    competencia: "2026-03",
    dataEvento: "2026-03-10",
    categoriaId: base.categoriaId,
    usuarioId: base.usuarioId,
    meioPagamentoId: base.contaId,
    jaPago: false,
    ...mudancas,
  };
}

async function contarMovimentos(): Promise<number> {
  const { rows } = await pool.query<{ total: string }>("SELECT COUNT(*) AS total FROM movimento");
  return Number(rows[0]?.total ?? "-1");
}

/** Só os que ainda contam para o mês. A diferença para o total acima é o que
 *  prova que a exclusão é lógica e não física. */
async function contarVigentes(): Promise<number> {
  const { rows } = await pool.query<{ total: string }>(
    "SELECT COUNT(*) AS total FROM movimento WHERE cancelado_em IS NULL",
  );
  return Number(rows[0]?.total ?? "-1");
}

/** Uma parcela de compra real, para provar a recusa contra o banco. */
async function inserirParcela(): Promise<string> {
  const compra = await pool.query<{ id: string }>(
    `INSERT INTO compra_parcelada
       (descricao, modo_entrada, valor_total_centavos, qtd_parcelas, parcela_inicial,
        competencia_compra, politica_residuo, valor_amortizado_anterior_centavos,
        usuario_id, meio_pagamento_id, idempotency_key)
     VALUES ('Compra', 'TOTAL', 1000, 1, 1, '2026-03-01', 'PRIMEIRAS', 0, $1, $2, $3)
     RETURNING id`,
    [base.usuarioId, base.cartaoId, `chave-${crypto.randomUUID()}`],
  );
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO movimento
       (natureza, origem, descricao, competencia, data_evento, valor_centavos,
        usuario_id, meio_pagamento_id, compra_id, numero_parcela)
     VALUES ('DESPESA', 'PARCELA', 'Parcela', '2026-03-01', '2026-03-10', 1000, $1, $2, $3, 1)
     RETURNING id`,
    [base.usuarioId, base.cartaoId, compra.rows[0]?.id],
  );
  const linha = rows[0];
  if (!linha) {
    throw new Error("parcela não retornou id");
  }
  return linha.id;
}

beforeAll(async () => {
  pool = criarPool(URL_BANCO_DE_TESTE);
  await recriarBancoDeTeste(pool);
}, 60_000);

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await limparDados(pool);
  base = await semearCadastroBase(pool);
  sessaoAtual = { user: { email: EMAIL_PERMITIDO, name: "Pessoa A" } };
  revalidatePath.mockClear();
});

describe("criarLancamentoAvulso: sessão (AVUL-01, AC 7)", () => {
  it("`requireSession` é a primeira instrução da action", () => {
    const fonte = readFileSync(new URL("./lancamentos.ts", import.meta.url), "utf8");
    const corpo = fonte.slice(fonte.indexOf("export async function criarLancamentoAvulso"));
    const primeiraInstrucao =
      corpo
        .slice(corpo.indexOf("{") + 1)
        .trim()
        .split("\n")[0] ?? "";

    expect(primeiraInstrucao).toContain("requireSession()");
  });

  it("sem sessão devolve NAO_AUTENTICADO, sem lançar e sem gravar", async () => {
    sessaoAtual = null;

    const resultado = await criarLancamentoAvulso(entrada());

    expect(resultado.ok).toBe(false);
    if (resultado.ok) {
      throw new Error("esperava recusa");
    }
    expect(resultado.erro.code).toBe("NAO_AUTENTICADO");
    expect(await contarMovimentos()).toBe(0);
  });
});

describe("criarLancamentoAvulso: caminho feliz (AVUL-01, AC 1)", () => {
  it("grava a despesa e devolve o envelope de sucesso", async () => {
    const resultado = await criarLancamentoAvulso(entrada());

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) {
      throw new Error("esperava sucesso");
    }
    expect(resultado.data.valorCentavos).toBe(3250);
    expect(resultado.data.natureza).toBe("DESPESA");
    expect(resultado.data.pago).toBe(false);
    expect(await contarMovimentos()).toBe(1);
  });

  it("grava a receita com a marca de já recebido — AVUL-02, AC 1 e 4", async () => {
    const resultado = await criarLancamentoAvulso(
      entrada({
        natureza: "RECEITA",
        descricao: "Pix recebido",
        valorCentavos: 5000,
        jaPago: true,
      }),
    );

    if (!resultado.ok) {
      throw new Error("esperava sucesso");
    }
    expect(resultado.data.natureza).toBe("RECEITA");
    expect(resultado.data.pago).toBe(true);

    /* `pago_em::text` porque o driver devolve `date` como `Date` no fuso da
       máquina, e o que interessa aqui é a data que o Postgres guardou. */
    const { rows } = await pool.query<{ pago_em: string | null; natureza: string }>(
      "SELECT pago_em::text AS pago_em, natureza FROM movimento",
    );
    expect(rows[0]?.natureza).toBe("RECEITA");
    expect(rows[0]?.pago_em).toBe("2026-03-10");
  });
});

describe("criarLancamentoAvulso: revalidação (AVUL-01, AC 6)", () => {
  it("revalida o painel e a lista da competência", async () => {
    await criarLancamentoAvulso(entrada());

    expect(revalidatePath.mock.calls.flat()).toEqual(["/2026-03", "/2026-03/lancamentos"]);
  });

  it("revalida a competência informada, e não a que estava aberta", async () => {
    await criarLancamentoAvulso(entrada({ competencia: "2026-04", dataEvento: "2026-04-02" }));

    expect(revalidatePath.mock.calls.flat()).toEqual(["/2026-04", "/2026-04/lancamentos"]);
  });

  it("não revalida nada quando a gravação é recusada", async () => {
    await criarLancamentoAvulso(entrada({ descricao: "" }));

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("criarLancamentoAvulso: validação no servidor (AVUL-01, AC 2 a 5)", () => {
  it("devolve o erro no campo da descrição vazia, sem gravar", async () => {
    const resultado = await criarLancamentoAvulso(entrada({ descricao: "" }));

    if (resultado.ok) {
      throw new Error("esperava recusa");
    }
    expect(resultado.erro.code).toBe("VALIDACAO");
    expect(resultado.erro.campos?.descricao).toBeDefined();
    expect(await contarMovimentos()).toBe(0);
  });

  it("devolve o erro no campo do valor não positivo, sem gravar", async () => {
    const resultado = await criarLancamentoAvulso(entrada({ valorCentavos: 0 }));

    if (resultado.ok) {
      throw new Error("esperava recusa");
    }
    expect(resultado.erro.campos?.valorCentavos).toBeDefined();
    expect(await contarMovimentos()).toBe(0);
  });

  it("devolve o erro no campo da competência malformada, sem gravar", async () => {
    const resultado = await criarLancamentoAvulso(entrada({ competencia: "março" }));

    if (resultado.ok) {
      throw new Error("esperava recusa");
    }
    expect(resultado.erro.campos?.competencia).toBeDefined();
    expect(await contarMovimentos()).toBe(0);
  });

  it("devolve o erro no campo da data malformada, sem gravar", async () => {
    const resultado = await criarLancamentoAvulso(entrada({ dataEvento: "10/03/2026" }));

    if (resultado.ok) {
      throw new Error("esperava recusa");
    }
    expect(resultado.erro.campos?.dataEvento).toBeDefined();
    expect(await contarMovimentos()).toBe(0);
  });

  it("recusa investimento, que o formulário não oferece", async () => {
    const resultado = await criarLancamentoAvulso(entrada({ natureza: "INVESTIMENTO" }));

    if (resultado.ok) {
      throw new Error("esperava recusa");
    }
    expect(resultado.erro.campos?.natureza).toBeDefined();
    expect(await contarMovimentos()).toBe(0);
  });

  it("recusa meio de pagamento que não existe no banco, sem gravar", async () => {
    const resultado = await criarLancamentoAvulso(
      entrada({ meioPagamentoId: "99999999-9999-4999-8999-999999999999" }),
    );

    if (resultado.ok) {
      throw new Error("esperava recusa");
    }
    expect(resultado.erro.code).toBe("MEIO_PAGAMENTO_NAO_ENCONTRADO");
    expect(resultado.erro.mensagem).not.toBe("");
    expect(await contarMovimentos()).toBe(0);
  });
});

describe("cancelarLancamento: sessão e validação (AVUL-03)", () => {
  it("`requireSession` é a primeira instrução da action", () => {
    const fonte = readFileSync(new URL("./lancamentos.ts", import.meta.url), "utf8");
    const corpo = fonte.slice(fonte.indexOf("export async function cancelarLancamento"));
    const primeiraInstrucao =
      corpo
        .slice(corpo.indexOf("{") + 1)
        .trim()
        .split("\n")[0] ?? "";

    expect(primeiraInstrucao).toContain("requireSession()");
  });

  it("sem sessão devolve NAO_AUTENTICADO antes de tocar no banco", async () => {
    const criado = await criarLancamentoAvulso(entrada());
    if (!criado.ok) {
      throw new Error("fixture não gravou");
    }
    sessaoAtual = null;

    const resultado = await cancelarLancamento(criado.data.id);

    if (resultado.ok) {
      throw new Error("esperava recusa");
    }
    expect(resultado.erro.code).toBe("NAO_AUTENTICADO");
    expect(await contarVigentes()).toBe(1);
  });

  it("recusa id que não é string, sem lançar", async () => {
    const resultado = await cancelarLancamento(42);

    if (resultado.ok) {
      throw new Error("esperava recusa");
    }
    expect(resultado.erro.code).toBe("VALIDACAO");
  });
});

describe("cancelarLancamento: exclusão lógica (AVUL-03, AC 1, 2 e 8)", () => {
  it("cancela o avulso, tira da soma do mês e mantém a linha no banco", async () => {
    const criado = await criarLancamentoAvulso(entrada());
    if (!criado.ok) {
      throw new Error("fixture não gravou");
    }
    revalidatePath.mockClear();

    const resultado = await cancelarLancamento(criado.data.id);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) {
      throw new Error("esperava sucesso");
    }
    expect(resultado.data.alterou).toBe(true);
    expect(await contarVigentes()).toBe(0);
    /* A linha continua no banco: exclusão é lógica, não física. */
    expect(await contarMovimentos()).toBe(1);
    expect(revalidatePath.mock.calls.flat()).toEqual(["/2026-03", "/2026-03/lancamentos"]);
  });

  it("revalida a competência do lançamento, não a que estava aberta", async () => {
    const criado = await criarLancamentoAvulso(
      entrada({ competencia: "2026-04", dataEvento: "2026-04-02" }),
    );
    if (!criado.ok) {
      throw new Error("fixture não gravou");
    }
    revalidatePath.mockClear();

    await cancelarLancamento(criado.data.id);

    expect(revalidatePath.mock.calls.flat()).toEqual(["/2026-04", "/2026-04/lancamentos"]);
  });

  it("a segunda exclusão devolve sucesso com alterou falso — AC 4", async () => {
    const criado = await criarLancamentoAvulso(entrada());
    if (!criado.ok) {
      throw new Error("fixture não gravou");
    }
    await cancelarLancamento(criado.data.id);

    const segunda = await cancelarLancamento(criado.data.id);

    expect(segunda.ok).toBe(true);
    if (!segunda.ok) {
      throw new Error("esperava sucesso");
    }
    expect(segunda.data.alterou).toBe(false);
  });
});

describe("cancelarLancamento: recusas (AVUL-03, AC 3)", () => {
  it("recusa parcela com LANCAMENTO_NAO_CANCELAVEL, e a linha fica vigente", async () => {
    const parcelaId = await inserirParcela();

    const resultado = await cancelarLancamento(parcelaId);

    if (resultado.ok) {
      throw new Error("esperava recusa");
    }
    expect(resultado.erro.code).toBe("LANCAMENTO_NAO_CANCELAVEL");
    expect(resultado.erro.mensagem).toContain("avulso");
    expect(await contarVigentes()).toBe(1);
  });

  it("recusa id inexistente com LANCAMENTO_NAO_ENCONTRADO", async () => {
    const resultado = await cancelarLancamento("00000000-0000-0000-0000-000000000000");

    if (resultado.ok) {
      throw new Error("esperava recusa");
    }
    expect(resultado.erro.code).toBe("LANCAMENTO_NAO_ENCONTRADO");
  });

  it("não revalida nada quando a exclusão é recusada", async () => {
    await inserirParcela();
    revalidatePath.mockClear();

    await cancelarLancamento("00000000-0000-0000-0000-000000000000");

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("erro inesperado nas duas actions (AVUL-01, AC 8)", () => {
  /*
   * A prova existia só para `compras.ts` e nunca tinha sido replicada aqui. Um
   * envelope que vaza stack trace não falha nenhum teste: ele só aparece no
   * navegador de quem usa, num dia ruim.
   */
  it("criar devolve ERRO_INESPERADO com identificador e sem stack trace", async () => {
    const silencio = vi.spyOn(console, "error").mockImplementation(() => {});

    // Categoria que não existe: a chave estrangeira estoura no insert, que é
    // falha não prevista pela aplicação.
    const resultado = await criarLancamentoAvulso(
      entrada({ categoriaId: "99999999-9999-4999-8999-999999999999" }),
    );

    silencio.mockRestore();

    expect(resultado.ok).toBe(false);
    if (resultado.ok) {
      throw new Error("esperava recusa");
    }
    expect(resultado.erro.code).toBe("ERRO_INESPERADO");
    expect(resultado.erro.mensagem).toMatch(/informe o código [0-9a-f]{8}\.$/);
    expect(resultado.erro.mensagem).not.toMatch(/at |\.ts:|node_modules|insert|violates/i);
    expect(await contarMovimentos()).toBe(0);
  });

  it("o identificador vai para o log do servidor, e só para lá", async () => {
    const logado: unknown[] = [];
    const silencio = vi.spyOn(console, "error").mockImplementation((...args) => {
      logado.push(...args);
    });

    const resultado = await criarLancamentoAvulso(
      entrada({ categoriaId: "99999999-9999-4999-8999-999999999999" }),
    );

    silencio.mockRestore();

    if (resultado.ok) {
      throw new Error("esperava recusa");
    }
    const correlacao = resultado.erro.mensagem.match(/código ([0-9a-f]{8})\./)?.[1];
    expect(correlacao).toBeDefined();
    /* O mesmo identificador nos dois lados é o que permite achar o detalhe no
       log a partir do que a pessoa leu na tela. */
    expect(String(logado[0])).toContain(correlacao);
  });

  it("excluir devolve ERRO_INESPERADO com identificador e sem stack trace", async () => {
    const silencio = vi.spyOn(console, "error").mockImplementation(() => {});

    // Id que não é UUID: o Postgres recusa a comparação, e a falha não é prevista.
    const resultado = await cancelarLancamento("nao-e-um-uuid");

    silencio.mockRestore();

    if (resultado.ok) {
      throw new Error("esperava recusa");
    }
    expect(resultado.erro.code).toBe("ERRO_INESPERADO");
    expect(resultado.erro.mensagem).toMatch(/informe o código [0-9a-f]{8}\.$/);
    expect(resultado.erro.mensagem).not.toMatch(/at |\.ts:|node_modules|invalid input syntax/i);
  });
});

describe("trocarCategoria (TRC-03, TRC-04 AC 5, TRC-05)", () => {
  const INEXISTENTE = "99999999-9999-4999-8999-999999999999";
  let categoriaDois: string;
  let recorrenciaId: string;

  /** Um fixo de outubro a dezembro, com outubro pago, como no Independent Test do TRC-03. */
  beforeEach(async () => {
    categoriaDois =
      (
        await pool.query<{ id: string }>(
          "INSERT INTO categoria (nome) VALUES ('Categoria Dois') RETURNING id",
        )
      ).rows[0]?.id ?? "";
    const banco = criarCliente(pool);
    const recorrencias = new RecorrenciaRepositoryDrizzle(banco);
    const fixo = await recorrencias.criar({
      dados: {
        descricao: "Conta fixa A",
        natureza: "DESPESA",
        categoriaId: base.categoriaId,
        usuarioId: base.usuarioId,
        meioPagamentoId: base.contaId,
        competenciaInicio: "2026-10" as Competencia,
        competenciaFim: "2026-12" as Competencia,
        diaVencimento: 10,
      },
      valorInicial: 10000 as Cents,
    });
    recorrenciaId = fixo.id;
    await materializarRecorrencias(
      { recorrencias, movimentos: new MovimentoRepositoryDrizzle(banco) },
      "2026-10" as Competencia,
      3,
    );
    await pool.query(
      "UPDATE movimento SET pago_em = '2026-10-10' WHERE recorrencia_id = $1 AND competencia = '2026-10-01'",
      [recorrenciaId],
    );
    revalidatePath.mockClear();
  });

  async function ocorrencia(competencia: string): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      "SELECT id FROM movimento WHERE recorrencia_id = $1 AND competencia = $2",
      [recorrenciaId, `${competencia}-01`],
    );
    return rows[0]?.id ?? "";
  }

  /** O fixo, as compras e os lançamentos, como o banco está agora. */
  async function fotografia() {
    const todas = async (consulta: string) => (await pool.query(consulta)).rows;
    return {
      recorrencias: await todas("SELECT * FROM recorrencia ORDER BY id"),
      compras: await todas("SELECT * FROM compra_parcelada ORDER BY id"),
      movimentos: await todas("SELECT * FROM movimento ORDER BY id"),
    };
  }

  function recusa(resultado: Awaited<ReturnType<typeof trocarCategoria>>) {
    if (resultado.ok) {
      throw new Error("esperava recusa");
    }
    return resultado.erro;
  }

  it("`requireSession` é a primeira instrução da action (TRC-05 AC 6)", () => {
    const fonte = readFileSync(new URL("./lancamentos.ts", import.meta.url), "utf8");
    const corpo = fonte.slice(fonte.indexOf("export async function trocarCategoria"));
    const primeiraInstrucao =
      corpo
        .slice(corpo.indexOf("{") + 1)
        .trim()
        .split("\n")[0] ?? "";

    expect(primeiraInstrucao).toContain("requireSession()");
  });

  it("sem sessão recusa com o código da sessão antes de ler o lançamento, com payload válido ou não (TRC-05 AC 6)", async () => {
    sessaoAtual = null;
    const antes = await fotografia();
    const leitura = vi.spyOn(MovimentoRepositoryDrizzle.prototype, "buscarPorId");

    try {
      const valido = await trocarCategoria({
        lancamentoId: await ocorrencia("2026-11"),
        categoriaId: categoriaDois,
      });
      const invalido = await trocarCategoria({ lancamentoId: "nao-e-uuid" });

      expect(recusa(valido).code).toBe("NAO_AUTENTICADO");
      expect(recusa(invalido).code).toBe("NAO_AUTENTICADO");
      expect(leitura).not.toHaveBeenCalled();
      expect(await fotografia()).toEqual(antes);
      expect(revalidatePath).not.toHaveBeenCalled();
    } finally {
      leitura.mockRestore();
    }
  });

  it.each([
    ["lancamentoId que não é uuid", () => ({ lancamentoId: "mov-1", categoriaId: null })],
    ["categoriaId ausente", (id: string) => ({ lancamentoId: id })],
    ["categoriaId que não é uuid", (id: string) => ({ lancamentoId: id, categoriaId: "cat-1" })],
    ["campo a mais", (id: string) => ({ lancamentoId: id, categoriaId: null, valorCentavos: 1 })],
  ])("payload com %s é VALIDACAO, sem gravar (TRC-05 AC 5)", async (_, payload) => {
    const antes = await fotografia();

    const resultado = await trocarCategoria(payload(await ocorrencia("2026-11")));

    expect(recusa(resultado).code).toBe("VALIDACAO");
    expect(await fotografia()).toEqual(antes);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("lançamento inexistente é LANCAMENTO_NAO_ENCONTRADO com a mensagem de erros.ts (TRC-05 AC 2)", async () => {
    const antes = await fotografia();

    const resultado = await trocarCategoria({ lancamentoId: INEXISTENTE, categoriaId: null });

    expect(recusa(resultado)).toEqual({
      code: "LANCAMENTO_NAO_ENCONTRADO",
      mensagem: "Esse lançamento não existe mais.",
    });
    expect(await fotografia()).toEqual(antes);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("categoria inexistente é CATEGORIA_NAO_ENCONTRADA com a mensagem de erros.ts (TRC-05 AC 3)", async () => {
    const antes = await fotografia();

    const resultado = await trocarCategoria({
      lancamentoId: await ocorrencia("2026-11"),
      categoriaId: INEXISTENTE,
    });

    const erro = recusa(resultado);
    expect(erro.code).toBe("CATEGORIA_NAO_ENCONTRADA");
    expect(erro.mensagem).toBe("Escolha uma categoria válida.");
    expect(await fotografia()).toEqual(antes);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("entrada é CATEGORIA_EM_RECEITA com “Entrada não tem categoria.” (TRC-05 AC 4)", async () => {
    const criada = await criarLancamentoAvulso(entrada({ natureza: "RECEITA", categoriaId: null }));
    const entradaId = criada.ok ? criada.data.id : "";
    revalidatePath.mockClear();
    const antes = await fotografia();

    const resultado = await trocarCategoria({
      lancamentoId: entradaId,
      categoriaId: categoriaDois,
    });

    expect(recusa(resultado)).toEqual({
      code: "CATEGORIA_EM_RECEITA",
      mensagem: "Entrada não tem categoria.",
    });
    expect(await fotografia()).toEqual(antes);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("trocar em novembro grava a categoria no fixo e nos três meses, e outubro continua pago (TRC-03 AC 1)", async () => {
    const lancamentoId = await ocorrencia("2026-11");
    const antes = await fotografia();

    const resultado = await trocarCategoria({ lancamentoId, categoriaId: categoriaDois });

    expect(resultado).toEqual({
      ok: true,
      data: { lancamentoId, alcance: "FIXO", categoriaId: categoriaDois },
    });
    const depois = await fotografia();
    expect(depois.movimentos).toEqual(
      antes.movimentos.map((m) => ({ ...m, categoria_id: categoriaDois })),
    );
    expect(depois.recorrencias).toEqual(
      antes.recorrencias.map((r) => ({ ...r, categoria_id: categoriaDois })),
    );
    const { rows } = await pool.query(
      `SELECT competencia::text, data_evento::text AS data, valor_centavos::text AS valor,
              pago_em::text AS pago
       FROM movimento WHERE recorrencia_id = $1 ORDER BY competencia`,
      [recorrenciaId],
    );
    expect(rows).toEqual([
      { competencia: "2026-10-01", data: "2026-10-10", valor: "10000", pago: "2026-10-10" },
      { competencia: "2026-11-01", data: "2026-11-10", valor: "10000", pago: null },
      { competencia: "2026-12-01", data: "2026-12-10", valor: "10000", pago: null },
    ]);
  });

  it("sucesso revalida a lista, a Visão geral e Todo mês (TRC-04 AC 5)", async () => {
    await trocarCategoria({
      lancamentoId: await ocorrencia("2026-11"),
      categoriaId: categoriaDois,
    });

    expect(revalidatePath.mock.calls.map((chamada) => chamada[0]).sort()).toEqual([
      "/[competencia]",
      "/[competencia]/fixos",
      "/[competencia]/lancamentos",
    ]);
  });

  it("falha injetada nas ocorrências desfaz o fixo já gravado e vira ERRO_INESPERADO com referência (TRC-03 AC 6, TRC-05 AC 7)", async () => {
    const lancamentoId = await ocorrencia("2026-11");
    const antes = await fotografia();
    const serie = vi.spyOn(RecorrenciaRepositoryDrizzle.prototype, "atualizarSerie");
    const falha = vi
      .spyOn(MovimentoRepositoryDrizzle.prototype, "atualizarOcorrenciasDaSerie")
      .mockRejectedValueOnce(new Error("falha injetada no banco"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const resultado = await trocarCategoria({ lancamentoId, categoriaId: categoriaDois });

      expect(serie).toHaveBeenCalledOnce();
      expect(falha).toHaveBeenCalledOnce();
      const erro = recusa(resultado);
      expect(erro.code).toBe("ERRO_INESPERADO");
      expect(erro.mensagem).toMatch(
        /^Não foi possível concluir a operação\. Tente de novo\. Se continuar, informe o código [0-9a-f]{8}\.$/,
      );
      expect(await fotografia()).toEqual(antes);
      expect(revalidatePath).not.toHaveBeenCalled();
    } finally {
      serie.mockRestore();
      falha.mockRestore();
      log.mockRestore();
    }
  });
});
