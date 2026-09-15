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

const { criarLancamentoAvulso } = await import("./lancamentos");
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
