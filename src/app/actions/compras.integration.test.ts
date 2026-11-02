import { readFileSync } from "node:fs";
import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Competencia } from "@/domain";
import {
  type CadastroBase,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
  URL_BANCO_DE_TESTE,
} from "@/infrastructure/db/testing/banco-de-teste";

/**
 * A Server Action contra o Postgres real (AD-010). O que está sob teste é a
 * borda: sessão, revalidação do payload no servidor e o envelope uniforme.
 *
 * `next/cache` é o único módulo trocado por dublê — `revalidatePath` exige um
 * contexto de requisição do Next que não existe aqui, e o que interessa
 * verificar são as rotas que ela recebe.
 */

process.env.DATABASE_URL = URL_BANCO_DE_TESTE;
process.env.AUTH_SECRET ??= "segredo-local-de-teste-nao-e-credencial";
process.env.AUTH_GOOGLE_ID ??= "client-id-placeholder";
process.env.AUTH_GOOGLE_SECRET ??= "client-secret-placeholder";
process.env.EMAILS_PERMITIDOS = "pessoa-a@example.com,pessoa-b@example.com";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (rota: string) => revalidatePath(rota) }));

/** Sessão do Auth.js: `null` = ninguém logado. O resto de `auth.ts` é o real. */
let sessaoAtual: { user: { email: string; name: string } } | null = null;
vi.mock("@/infrastructure/auth/auth", async (original) => ({
  ...(await original<typeof import("@/infrastructure/auth/auth")>()),
  auth: async () => sessaoAtual,
}));

const { criarCompra, excluirCompraDestaParcela } = await import("./compras");
const { criarPool } = await import("@/infrastructure/db/client");
const { CompraRepositoryDrizzle } = await import(
  "@/infrastructure/db/repositories/compra.repository"
);
const { MovimentoRepositoryDrizzle } = await import(
  "@/infrastructure/db/repositories/movimento.repository"
);
const { criarRepositorios } = await import("@/infrastructure/container");
const { obterVisaoMensal } = await import("@/application/mes/obter-visao-mensal/handler");

const EMAIL_PERMITIDO = "pessoa-a@example.com";
const EMAIL_NEGADO = "intruso@example.com";

let pool: Pool;
let base: CadastroBase;

function entrada(mudancas: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    idempotencyKey: crypto.randomUUID(),
    descricao: "Compra parcelada A",
    modo: "TOTAL",
    valorCentavos: 100000,
    qtdParcelas: 3,
    parcelaInicial: 1,
    competenciaInicial: "2026-03",
    politicaResiduo: "PRIMEIRAS",
    categoriaId: base.categoriaId,
    usuarioId: base.usuarioId,
    meioPagamentoId: base.cartaoId,
    dataEvento: "2026-03-04",
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

describe("criarCompra: sessão (AUTH-02, AC 3)", () => {
  it("`requireSession` é a primeira instrução da action", () => {
    const fonte = readFileSync(new URL("./compras.ts", import.meta.url), "utf8");
    const corpo = fonte.slice(fonte.indexOf("export async function criarCompra"));
    const primeiraInstrucao =
      corpo
        .slice(corpo.indexOf("{") + 1)
        .trim()
        .split("\n")[0] ?? "";

    expect(primeiraInstrucao).toContain("requireSession()");
  });

  it("sem sessão devolve NAO_AUTENTICADO no envelope, sem lançar e sem gravar", async () => {
    sessaoAtual = null;

    const resultado = await criarCompra(entrada());

    expect(resultado.ok).toBe(false);
    if (resultado.ok) {
      return;
    }
    expect(resultado.erro.code).toBe("NAO_AUTENTICADO");
    expect(await contarMovimentos()).toBe(0);
  });

  it("e-mail fora da allowlist devolve ACESSO_NEGADO e não grava nada", async () => {
    sessaoAtual = { user: { email: EMAIL_NEGADO, name: "Intruso" } };

    const resultado = await criarCompra(entrada());

    expect(resultado.ok).toBe(false);
    if (resultado.ok) {
      return;
    }
    expect(resultado.erro.code).toBe("ACESSO_NEGADO");
    expect(await contarMovimentos()).toBe(0);
  });
});

describe("criarCompra: revalidação do payload no servidor (AUTH-02, AC 4)", () => {
  it("rejeita quantidade de parcelas fora da faixa mesmo vindo pronta do cliente", async () => {
    const resultado = await criarCompra(entrada({ qtdParcelas: 121 }));

    expect(resultado.ok).toBe(false);
    if (resultado.ok) {
      return;
    }
    expect(resultado.erro.code).toBe("VALIDACAO");
    expect(resultado.erro.campos?.qtdParcelas).toBe("A compra pode ter no máximo 120 parcelas.");
    expect(await contarMovimentos()).toBe(0);
  });

  it("rejeita payload sem os campos obrigatórios, endereçando cada campo", async () => {
    const resultado = await criarCompra({ descricao: "" });

    expect(resultado.ok).toBe(false);
    if (resultado.ok) {
      return;
    }
    expect(resultado.erro.code).toBe("VALIDACAO");
    expect(Object.keys(resultado.erro.campos ?? {})).toEqual(
      expect.arrayContaining(["descricao", "valorCentavos", "qtdParcelas", "meioPagamentoId"]),
    );
  });

  it("rejeita valor não inteiro: dinheiro é centavo inteiro (AD-001)", async () => {
    const resultado = await criarCompra(entrada({ valorCentavos: 1000.5 }));

    expect(resultado.ok).toBe(false);
    if (resultado.ok) {
      return;
    }
    expect(resultado.erro.campos?.valorCentavos).toBe("O valor precisa ser maior que zero.");
  });
});

describe("criarCompra: erro de domínio vira envelope, nunca exceção", () => {
  it("cartão arquivado devolve MEIO_PAGAMENTO_ARQUIVADO com mensagem em pt-BR", async () => {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO meio_pagamento (nome, tipo, gera_fatura, dia_fechamento, dia_vencimento, arquivado_em)
       VALUES ('Cartão Encerrado', 'CARTAO_CREDITO', true, 15, 25, now()) RETURNING id`,
    );
    const arquivado = rows[0]?.id ?? "";

    const resultado = await criarCompra(entrada({ meioPagamentoId: arquivado }));

    expect(resultado.ok).toBe(false);
    if (resultado.ok) {
      return;
    }
    expect(resultado.erro.code).toBe("MEIO_PAGAMENTO_ARQUIVADO");
    expect(resultado.erro.mensagem).toBe(
      "Esse meio de pagamento está arquivado e não recebe compra nova.",
    );
    expect(resultado.erro.campos?.meioPagamentoId).toBe(resultado.erro.mensagem);
    expect(await contarMovimentos()).toBe(0);
  });

  it("mais parcelas que centavos devolve PARCELA_INFERIOR_A_UM_CENTAVO sem gravar", async () => {
    const resultado = await criarCompra(entrada({ valorCentavos: 2, qtdParcelas: 3 }));

    expect(resultado.ok).toBe(false);
    if (resultado.ok) {
      return;
    }
    expect(resultado.erro.code).toBe("PARCELA_INFERIOR_A_UM_CENTAVO");
    expect(await contarMovimentos()).toBe(0);
  });
});

describe("criarCompra: erro inesperado (UI-02, AC 8)", () => {
  it("devolve ERRO_INESPERADO com identificador de correlação e sem stack trace", async () => {
    const silencio = vi.spyOn(console, "error").mockImplementation(() => {});

    // Categoria que não existe: a chave estrangeira estoura no insert, que é
    // uma falha que a aplicação não previu.
    const resultado = await criarCompra(
      entrada({ categoriaId: "99999999-9999-4999-8999-999999999999" }),
    );

    silencio.mockRestore();

    expect(resultado.ok).toBe(false);
    if (resultado.ok) {
      return;
    }
    expect(resultado.erro.code).toBe("ERRO_INESPERADO");
    expect(resultado.erro.mensagem).toMatch(/informe o código [0-9a-f]{8}\.$/);
    expect(resultado.erro.mensagem).not.toMatch(/at |\.ts:|node_modules|insert|violates/i);
    expect(await contarMovimentos()).toBe(0);
  });
});

describe("criarCompra: sucesso", () => {
  it("grava as 3 parcelas de R$ 1.000,00 em 3x e devolve o envelope de sucesso (PARC-01, AC 1)", async () => {
    const resultado = await criarCompra(entrada());

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) {
      return;
    }
    expect(resultado.data.parcelas).toEqual([
      { numero: 1, valorCentavos: 33334, competencia: "2026-03" },
      { numero: 2, valorCentavos: 33333, competencia: "2026-04" },
      { numero: 3, valorCentavos: 33333, competencia: "2026-05" },
    ]);
    expect(resultado.data.valorTotalCentavos).toBe(100000);
    expect(await contarMovimentos()).toBe(3);
  });

  it("revalida a competência da compra e a de cada parcela", async () => {
    await criarCompra(entrada());

    expect(revalidatePath.mock.calls.map(([rota]) => rota).sort()).toEqual([
      "/2026-03",
      "/2026-04",
      "/2026-05",
    ]);
  });

  it("a mesma chave de idempotência não duplica as parcelas (PARC-05, AC 9)", async () => {
    const payload = entrada();

    const primeira = await criarCompra(payload);
    const segunda = await criarCompra(payload);

    expect(primeira.ok).toBe(true);
    expect(segunda.ok).toBe(true);
    if (!primeira.ok || !segunda.ok) {
      return;
    }
    expect(segunda.data.compraId).toBe(primeira.data.compraId);
    expect(segunda.data.jaExistia).toBe(true);
    expect(await contarMovimentos()).toBe(3);
  });
});

describe("excluirCompraDestaParcela (excluir-compra T7, EXC-03, EXC-04, EXC-05)", () => {
  const INEXISTENTE = "99999999-9999-4999-8999-999999999999";
  let compraId: string;

  /** Compra A: 4x de R$ 10,00, de dezembro de 2026 a março de 2027 (AD-009). */
  beforeEach(async () => {
    const criada = await criarCompra(
      entrada({
        descricao: "Compra A",
        modo: "VALOR_PARCELA",
        valorCentavos: 1000,
        qtdParcelas: 4,
        competenciaInicial: "2026-12",
        dataEvento: "2026-12-05",
      }),
    );
    if (!criada.ok) {
      throw new Error(`fixture inválida: ${criada.erro.code}`);
    }
    compraId = criada.data.compraId;
    revalidatePath.mockClear();
  });

  async function parcela(numero: number): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      "SELECT id FROM movimento WHERE compra_id = $1 AND numero_parcela = $2",
      [compraId, numero],
    );
    return rows[0]?.id ?? "";
  }

  async function pagar(numero: number, pagoEm: string): Promise<void> {
    await pool.query(
      "UPDATE movimento SET pago_em = $3 WHERE compra_id = $1 AND numero_parcela = $2",
      [compraId, numero, pagoEm],
    );
  }

  async function fotografia() {
    const compras = await pool.query("SELECT * FROM compra_parcelada ORDER BY id");
    const movimentos = await pool.query("SELECT * FROM movimento ORDER BY id");
    return { compras: compras.rows, movimentos: movimentos.rows };
  }

  function recusa(resultado: Awaited<ReturnType<typeof excluirCompraDestaParcela>>) {
    if (resultado.ok) {
      throw new Error("esperava recusa");
    }
    return resultado.erro;
  }

  it("`requireSession` é a primeira instrução da action (EXC-05 AC 1)", () => {
    const fonte = readFileSync(new URL("./compras.ts", import.meta.url), "utf8");
    const corpo = fonte.slice(fonte.indexOf("export async function excluirCompraDestaParcela"));
    const primeiraInstrucao =
      corpo
        .slice(corpo.indexOf("{") + 1)
        .trim()
        .split("\n")[0] ?? "";

    expect(primeiraInstrucao).toContain("requireSession()");
  });

  it("sem sessão recusa com o código da sessão antes de ler o lançamento (EXC-05 AC 1)", async () => {
    sessaoAtual = null;
    const lancamentoId = await parcela(2);
    const antes = await fotografia();
    const leitura = vi.spyOn(MovimentoRepositoryDrizzle.prototype, "buscarPorId");

    try {
      const resultado = await excluirCompraDestaParcela({ lancamentoId });

      expect(recusa(resultado).code).toBe("NAO_AUTENTICADO");
      expect(leitura).not.toHaveBeenCalled();
      expect(await fotografia()).toEqual(antes);
      expect(revalidatePath).not.toHaveBeenCalled();
    } finally {
      leitura.mockRestore();
    }
  });

  it.each([
    ["lancamentoId ausente", () => ({})],
    ["lancamentoId que não é uuid", () => ({ lancamentoId: "compra-1#2" })],
    ["campo a mais", (id: string) => ({ lancamentoId: id, numeros: [2, 3, 4] })],
  ])("payload com %s é VALIDACAO, sem ler o banco (EXC-05 AC 2)", async (_, payload) => {
    const lancamentoId = await parcela(2);
    const antes = await fotografia();
    const leitura = vi.spyOn(MovimentoRepositoryDrizzle.prototype, "buscarPorId");

    try {
      const resultado = await excluirCompraDestaParcela(payload(lancamentoId));

      expect(recusa(resultado).code).toBe("VALIDACAO");
      expect(leitura).not.toHaveBeenCalled();
      expect(await fotografia()).toEqual(antes);
      expect(revalidatePath).not.toHaveBeenCalled();
    } finally {
      leitura.mockRestore();
    }
  });

  it("lançamento inexistente é LANCAMENTO_NAO_ENCONTRADO com a mensagem de erros.ts (EXC-05 AC 3)", async () => {
    const antes = await fotografia();

    const resultado = await excluirCompraDestaParcela({ lancamentoId: INEXISTENTE });

    expect(recusa(resultado)).toEqual({
      code: "LANCAMENTO_NAO_ENCONTRADO",
      mensagem: "Esse lançamento não existe mais.",
    });
    expect(await fotografia()).toEqual(antes);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("avulso é LANCAMENTO_NAO_E_PARCELA com a mensagem de erros.ts, sem gravar (EXC-05 AC 4)", async () => {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO movimento (natureza, origem, descricao, competencia, data_evento, valor_centavos,
                              usuario_id, meio_pagamento_id)
       VALUES ('DESPESA', 'AVULSO', 'Avulso A', '2027-01-01', '2027-01-05', 1000, $1, $2)
       RETURNING id`,
      [base.usuarioId, base.contaId],
    );
    const antes = await fotografia();

    const resultado = await excluirCompraDestaParcela({ lancamentoId: rows[0]?.id });

    expect(recusa(resultado)).toEqual({
      code: "LANCAMENTO_NAO_E_PARCELA",
      mensagem: "Só parcela de compra se exclui por aqui.",
    });
    expect(await fotografia()).toEqual(antes);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("alcance todo pago é NADA_A_EXCLUIR com a mensagem de erros.ts, sem gravar (EXC-05 AC 5)", async () => {
    await pagar(3, "2027-02-10");
    await pagar(4, "2027-03-10");
    const antes = await fotografia();

    const resultado = await excluirCompraDestaParcela({ lancamentoId: await parcela(3) });

    expect(recusa(resultado)).toEqual({
      code: "NADA_A_EXCLUIR",
      mensagem: "Todas as parcelas desta em diante já foram pagas. Nada a excluir.",
    });
    expect(await fotografia()).toEqual(antes);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("a partir da 2/4 com a 3 paga: 1 e 3 continuam somando e o total vira R$ 20,00 (EXC-03 AC 1 a 4)", async () => {
    await pagar(3, "2027-02-10");

    const resultado = await excluirCompraDestaParcela({ lancamentoId: await parcela(2) });

    expect(resultado).toEqual({ ok: true, data: { parcelasExcluidas: 2 } });
    const { rows } = await pool.query(
      `SELECT numero_parcela AS numero, valor_centavos::text AS valor, pago_em::text AS pago,
              cancelado_em IS NOT NULL AS cancelada
         FROM movimento WHERE compra_id = $1 ORDER BY numero_parcela`,
      [compraId],
    );
    expect(rows).toEqual([
      { numero: 1, valor: "1000", pago: null, cancelada: false },
      { numero: 2, valor: "1000", pago: null, cancelada: true },
      { numero: 3, valor: "1000", pago: "2027-02-10", cancelada: false },
      { numero: 4, valor: "1000", pago: null, cancelada: true },
    ]);
    const compra = await pool.query<{ total: string; amortizado: string }>(
      `SELECT valor_total_centavos::text AS total,
              valor_amortizado_anterior_centavos::text AS amortizado
         FROM compra_parcelada WHERE id = $1`,
      [compraId],
    );
    expect(Number(compra.rows[0]?.total)).toBe(Number(compra.rows[0]?.amortizado) + 2000);
  });

  it("depois de excluir, janeiro não tem a 2/4, março não tem a 4/4 e a 1/4 é a última (EXC-04 AC 2, 3 e 5)", async () => {
    await excluirCompraDestaParcela({ lancamentoId: await parcela(2) });

    const repositorios = criarRepositorios();
    const dezembro = await obterVisaoMensal(repositorios, "2026-12" as Competencia);
    const janeiro = await obterVisaoMensal(repositorios, "2027-01" as Competencia);
    const marco = await obterVisaoMensal(repositorios, "2027-03" as Competencia);

    expect(dezembro.lancamentos.map((item) => item.parcela?.restantes)).toEqual([0]);
    expect(janeiro.lancamentos).toEqual([]);
    expect(marco.lancamentos).toEqual([]);
    expect(janeiro.competenciaView.totalGastos).toBe(0);
    expect(dezembro.futuro.find((mes) => mes.competencia === "2027-03")?.comprometido).toBe(0);
  });

  it("sucesso revalida Visão geral, Lançamentos e Simular de toda competência, e a home (EXC-04 AC 1 a 3)", async () => {
    await excluirCompraDestaParcela({ lancamentoId: await parcela(2) });

    expect(revalidatePath.mock.calls.map(([rota]) => rota).sort()).toEqual([
      "/",
      "/[competencia]",
      "/[competencia]/lancamentos",
      "/[competencia]/simular",
    ]);
  });

  it("falha na transação vira ERRO_INESPERADO com referência, sem lançar e sem gravar (EXC-05 AC 6; EXC-03 AC 6)", async () => {
    const lancamentoId = await parcela(2);
    const antes = await fotografia();
    const falha = vi
      .spyOn(CompraRepositoryDrizzle.prototype, "excluirParcelas")
      .mockRejectedValueOnce(new Error("falha injetada no banco"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const resultado = await excluirCompraDestaParcela({ lancamentoId });

      expect(falha).toHaveBeenCalledOnce();
      const erro = recusa(resultado);
      expect(erro.code).toBe("ERRO_INESPERADO");
      expect(erro.mensagem).toMatch(
        /^Não foi possível concluir a operação\. Tente de novo\. Se continuar, informe o código [0-9a-f]{8}\.$/,
      );
      expect(erro.mensagem).not.toMatch(/falha injetada|at |\.ts:/);
      expect(await fotografia()).toEqual(antes);
      expect(revalidatePath).not.toHaveBeenCalled();
    } finally {
      falha.mockRestore();
      log.mockRestore();
    }
  });
});
