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
 * As Server Actions de recorrência contra Postgres real (AD-010). O que está
 * sob teste é a **borda**: sessão, revalidação do payload no servidor, o
 * envelope uniforme, e quais rotas são revalidadas.
 *
 * A última importa mais do que parece: criar um gasto fixo muda a área que os
 * administra, a lista do mês e os indicadores do painel. Revalidar só uma
 * deixaria as outras duas mentindo até o próximo carregamento.
 */

process.env.DATABASE_URL = URL_BANCO_DE_TESTE;
process.env.AUTH_SECRET ??= "segredo-local-de-teste-nao-e-credencial";
process.env.AUTH_GOOGLE_ID ??= "client-id-placeholder";
process.env.AUTH_GOOGLE_SECRET ??= "client-secret-placeholder";
process.env.EMAILS_PERMITIDOS = "pessoa-a@example.com";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (rota: string) => revalidatePath(rota) }));

let sessaoAtual: { user: { email: string; name: string } } | null = null;
vi.mock("@/infrastructure/auth/auth", async (original) => ({
  ...(await original<typeof import("@/infrastructure/auth/auth")>()),
  auth: async () => sessaoAtual,
}));

const { criarRecorrencia, registrarNovaVigencia, encerrarRecorrencia } = await import(
  "./recorrencias"
);
const { criarPool } = await import("@/infrastructure/db/client");

const EMAIL_PERMITIDO = "pessoa-a@example.com";

let pool: Pool;
let base: CadastroBase;

function entrada(mudancas: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    descricao: "Conta de luz",
    natureza: "DESPESA",
    valorCentavos: 18000,
    diaVencimento: 20,
    competenciaInicio: "2026-03",
    competenciaFim: null,
    categoriaId: base.categoriaId,
    usuarioId: base.usuarioId,
    meioPagamentoId: base.contaId,
    ...mudancas,
  };
}

async function contarRecorrencias(): Promise<number> {
  const { rows } = await pool.query<{ total: string }>("SELECT COUNT(*) AS total FROM recorrencia");
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
  revalidatePath.mockReset();
  sessaoAtual = { user: { email: EMAIL_PERMITIDO, name: "Pessoa A" } };
});

describe("criar recorrência pela action", () => {
  it("grava e devolve o envelope de sucesso", async () => {
    const resultado = await criarRecorrencia(entrada());

    expect(resultado.ok).toBe(true);
    expect(resultado.ok && resultado.data.descricao).toBe("Conta de luz");
    expect(await contarRecorrencias()).toBe(1);
  });

  it("revalida as três rotas afetadas", async () => {
    await criarRecorrencia(entrada());

    expect(revalidatePath.mock.calls.map((c) => c[0]).sort()).toEqual([
      "/[competencia]",
      "/[competencia]/fixos",
      "/[competencia]/lancamentos",
    ]);
  });

  it("não autenticado é recusado sem tocar no banco", async () => {
    sessaoAtual = null;

    const resultado = await criarRecorrencia(entrada());

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.erro.code).toBe("NAO_AUTENTICADO");
    expect(await contarRecorrencias()).toBe(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("payload inválido devolve erro endereçado ao campo", async () => {
    const resultado = await criarRecorrencia(entrada({ diaVencimento: 42 }));

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.erro.campos?.diaVencimento).toContain("1 a 31");
    expect(await contarRecorrencias()).toBe(0);
  });

  it("período impossível é recusado pelo caso de uso, no campo de fim", async () => {
    const resultado = await criarRecorrencia(
      entrada({ competenciaInicio: "2026-06", competenciaFim: "2026-04" }),
    );

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.erro.code).toBe("PERIODO_INVALIDO");
    expect(await contarRecorrencias()).toBe(0);
  });

  it("meio de pagamento inexistente é recusado", async () => {
    const resultado = await criarRecorrencia(
      entrada({ meioPagamentoId: "11111111-1111-4111-8111-111111111111" }),
    );

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.erro.code).toBe("MEIO_PAGAMENTO_NAO_ENCONTRADO");
  });
});

describe("registrar vigência pela action", () => {
  it("grava a versão nova", async () => {
    const criada = await criarRecorrencia(entrada());
    const id = criada.ok ? criada.data.id : "";

    const resultado = await registrarNovaVigencia({
      recorrenciaId: id,
      vigenteDesde: "2026-05",
      valorCentavos: 24000,
    });

    expect(resultado.ok).toBe(true);
    const { rows } = await pool.query<{ total: string }>(
      "SELECT COUNT(*) AS total FROM recorrencia_versao",
    );
    expect(Number(rows[0]?.total)).toBe(2);
  });

  it("recorrência inexistente é recusada", async () => {
    const resultado = await registrarNovaVigencia({
      recorrenciaId: "11111111-1111-4111-8111-111111111111",
      vigenteDesde: "2026-05",
      valorCentavos: 24000,
    });

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.erro.code).toBe("RECORRENCIA_NAO_ENCONTRADA");
  });

  it("não autenticado é recusado", async () => {
    sessaoAtual = null;

    const resultado = await registrarNovaVigencia({
      recorrenciaId: "11111111-1111-4111-8111-111111111111",
      vigenteDesde: "2026-05",
      valorCentavos: 24000,
    });

    expect(!resultado.ok && resultado.erro.code).toBe("NAO_AUTENTICADO");
  });
});

describe("encerrar pela action", () => {
  it("grava o fim na competência ANTERIOR à informada", async () => {
    const criada = await criarRecorrencia(entrada());
    const id = criada.ok ? criada.data.id : "";

    const resultado = await encerrarRecorrencia({ recorrenciaId: id, aPartirDe: "2026-05" });

    expect(resultado.ok).toBe(true);
    const { rows } = await pool.query<{ competencia_fim: string; encerrada_em: string | null }>(
      "SELECT competencia_fim::text, encerrada_em::text FROM recorrencia WHERE id = $1",
      [id],
    );
    expect(rows[0]?.competencia_fim).toBe("2026-04-01");
    expect(rows[0]?.encerrada_em).not.toBeNull();
  });

  it("competência malformada é recusada", async () => {
    const resultado = await encerrarRecorrencia({
      recorrenciaId: "11111111-1111-4111-8111-111111111111",
      aPartirDe: "maio",
    });

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.erro.code).toBe("VALIDACAO");
  });
});
