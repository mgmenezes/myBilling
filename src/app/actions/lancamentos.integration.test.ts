import { readFileSync } from "node:fs";
import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
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

const { cancelarLancamento, criarLancamentoAvulso } = await import("./lancamentos");
const { criarPool } = await import("@/infrastructure/db/client");

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

describe("cancelarLancamento: exclusão lógica (AVUL-03, AC 1, 2 e 7)", () => {
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
