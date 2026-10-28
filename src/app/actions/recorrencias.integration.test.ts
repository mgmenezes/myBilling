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

const { criarRecorrencia, registrarNovaVigencia, encerrarRecorrencia, editarRecorrencia } =
  await import("./recorrencias");
const { criarPool, criarCliente } = await import("@/infrastructure/db/client");
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

/**
 * Editar um fixo pela action, contra Postgres (EDF-02, EDF-05 e EDF-06). O
 * cenário é um fixo de R$ 100,00 que começa em outubro, com outubro já pago e
 * as ocorrências até janeiro materializadas, editado por quem vê novembro.
 */
describe("editar pela action", () => {
  let recorrenciaId: string;
  let categoriaDois: string;

  beforeEach(async () => {
    const criada = await criarRecorrencia(
      entrada({
        descricao: "Conta fixa A",
        valorCentavos: 10000,
        diaVencimento: 10,
        competenciaInicio: "2026-10",
      }),
    );
    recorrenciaId = criada.ok ? criada.data.id : "";
    const banco = criarCliente(pool);
    await materializarRecorrencias(
      {
        recorrencias: new RecorrenciaRepositoryDrizzle(banco),
        movimentos: new MovimentoRepositoryDrizzle(banco),
      },
      "2026-10" as Competencia,
      3,
    );
    await pool.query(
      "UPDATE movimento SET pago_em = '2026-10-10' WHERE recorrencia_id = $1 AND competencia = '2026-10-01'",
      [recorrenciaId],
    );
    categoriaDois =
      (
        await pool.query<{ id: string }>(
          "INSERT INTO categoria (nome) VALUES ('Categoria Dois') RETURNING id",
        )
      ).rows[0]?.id ?? "";
    revalidatePath.mockReset();
  });

  function edicao(mudancas: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      recorrenciaId,
      descricao: "Conta fixa A",
      valorCentavos: 10000,
      diaVencimento: 10,
      competenciaFim: null,
      categoriaId: base.categoriaId,
      usuarioId: base.usuarioId,
      meioPagamentoId: base.contaId,
      vigenteDesde: "2026-11",
      competenciaExibida: "2026-11",
      ...mudancas,
    };
  }

  /** O fixo, as vigências e as ocorrências, como o banco está agora. */
  async function fotografia() {
    const um = async (consulta: string) => (await pool.query(consulta)).rows;
    return {
      recorrencias: await um(
        "SELECT descricao, categoria_id, competencia_fim::text, encerrada_em::text FROM recorrencia",
      ),
      versoes: await um(
        "SELECT vigente_desde::text, valor_previsto_centavos::text FROM recorrencia_versao ORDER BY vigente_desde",
      ),
      movimentos: await um(
        `SELECT competencia::text, descricao, categoria_id, data_evento::text,
                valor_centavos::text, pago_em::text
         FROM movimento ORDER BY competencia`,
      ),
    };
  }

  it("sem sessão é recusado com o código de sessão antes de validar e sem tocar no banco (EDF-06 AC 3)", async () => {
    sessaoAtual = null;
    const antes = await fotografia();

    const valido = await editarRecorrencia(edicao({ descricao: "Conta fixa B" }));
    const invalido = await editarRecorrencia(edicao({ natureza: "RECEITA" }));

    expect(!valido.ok && valido.erro.code).toBe("NAO_AUTENTICADO");
    expect(!invalido.ok && invalido.erro.code).toBe("NAO_AUTENTICADO");
    expect(await fotografia()).toEqual(antes);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("trocar categoria e descrição em novembro muda também outubro, que continua pago (EDF-02)", async () => {
    const resultado = await editarRecorrencia(
      edicao({ descricao: "Conta fixa B", categoriaId: categoriaDois }),
    );

    expect(resultado).toEqual({ ok: true, data: { mudou: true } });
    const { rows } = await pool.query(
      `SELECT competencia::text, descricao, categoria_id, data_evento::text, pago_em::text
       FROM movimento WHERE recorrencia_id = $1 ORDER BY competencia`,
      [recorrenciaId],
    );
    expect(rows).toEqual([
      {
        competencia: "2026-10-01",
        descricao: "Conta fixa B",
        categoria_id: categoriaDois,
        data_evento: "2026-10-10",
        pago_em: "2026-10-10",
      },
      {
        competencia: "2026-11-01",
        descricao: "Conta fixa B",
        categoria_id: categoriaDois,
        data_evento: "2026-11-10",
        pago_em: null,
      },
      {
        competencia: "2026-12-01",
        descricao: "Conta fixa B",
        categoria_id: categoriaDois,
        data_evento: "2026-12-10",
        pago_em: null,
      },
      {
        competencia: "2027-01-01",
        descricao: "Conta fixa B",
        categoria_id: categoriaDois,
        data_evento: "2027-01-10",
        pago_em: null,
      },
    ]);
  });

  it("revalida as três rotas afetadas (EDF-06 AC 6)", async () => {
    await editarRecorrencia(edicao({ descricao: "Conta fixa B" }));

    expect(revalidatePath.mock.calls.map((chamada) => chamada[0]).sort()).toEqual([
      "/[competencia]",
      "/[competencia]/fixos",
      "/[competencia]/lancamentos",
    ]);
  });

  it("falha injetada nas ocorrências desfaz a série já gravada no fixo (EDF-06 AC 1, 2 e 4)", async () => {
    const antes = await fotografia();
    const falha = vi
      .spyOn(MovimentoRepositoryDrizzle.prototype, "atualizarOcorrenciasDaSerie")
      .mockRejectedValueOnce(new Error("falha injetada no banco"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const resultado = await editarRecorrencia(
        edicao({ descricao: "Conta fixa B", categoriaId: categoriaDois }),
      );

      expect(falha).toHaveBeenCalledOnce();
      expect(resultado.ok).toBe(false);
      expect(!resultado.ok && resultado.erro.code).toBe("ERRO_INESPERADO");
      expect(!resultado.ok && resultado.erro.mensagem).toMatch(
        /^Não foi possível concluir a operação\. Tente de novo\. \(ref\. [0-9a-f-]{36}\)$/,
      );
      expect(await fotografia()).toEqual(antes);
      expect(revalidatePath).not.toHaveBeenCalled();
    } finally {
      falha.mockRestore();
      log.mockRestore();
    }
  });

  it("payload com natureza é recusado na validação, no campo dela, sem gravar (EDF-05 AC 2)", async () => {
    const antes = await fotografia();

    const resultado = await editarRecorrencia(edicao({ natureza: "RECEITA" }));

    expect(!resultado.ok && resultado.erro.code).toBe("VALIDACAO");
    expect(!resultado.ok && resultado.erro.campos?.natureza).toBe(
      "Natureza e início não mudam na edição. Para mudar, encerre este e cadastre de novo.",
    );
    expect(await fotografia()).toEqual(antes);
  });

  it("fixo inexistente é RECORRENCIA_NAO_ENCONTRADA (EDF-06 AC 5)", async () => {
    const resultado = await editarRecorrencia(
      edicao({ recorrenciaId: "11111111-1111-4111-8111-111111111111" }),
    );

    expect(!resultado.ok && resultado.erro).toEqual({
      code: "RECORRENCIA_NAO_ENCONTRADA",
      mensagem: "Esse gasto fixo não existe mais.",
    });
  });

  it("categoria inexistente é recusada no campo da categoria (EDF-05 AC 3)", async () => {
    const resultado = await editarRecorrencia(
      edicao({ categoriaId: "11111111-1111-4111-8111-111111111111" }),
    );

    expect(!resultado.ok && resultado.erro).toEqual({
      code: "CATEGORIA_NAO_ENCONTRADA",
      mensagem: "Escolha uma categoria válida.",
      campos: { categoriaId: "Escolha uma categoria válida." },
    });
  });

  it("fim antes do início é PERIODO_INVALIDO no campo do fim (EDF-04 AC 4)", async () => {
    const resultado = await editarRecorrencia(edicao({ competenciaFim: "2026-09" }));

    expect(!resultado.ok && resultado.erro).toEqual({
      code: "PERIODO_INVALIDO",
      mensagem: "O mês de fim não pode ser anterior ao de início.",
      campos: { competenciaFim: "O mês de fim não pode ser anterior ao de início." },
    });
  });

  it("vigência antes do início é PERIODO_INVALIDO no campo da vigência (EDF-03 AC 5)", async () => {
    const antes = await fotografia();

    const resultado = await editarRecorrencia(
      edicao({ valorCentavos: 11000, vigenteDesde: "2026-09" }),
    );

    expect(!resultado.ok && resultado.erro).toEqual({
      code: "PERIODO_INVALIDO",
      mensagem: "O valor novo não pode valer antes do mês de início.",
      campos: { vigenteDesde: "O valor novo não pode valer antes do mês de início." },
    });
    expect(await fotografia()).toEqual(antes);
  });
});
