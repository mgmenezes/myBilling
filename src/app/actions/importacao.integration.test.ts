import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Pool } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type CadastroBase,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
  URL_BANCO_DE_TESTE,
} from "@/infrastructure/db/testing/banco-de-teste";

/**
 * As actions da importação contra o Postgres real (AD-010). O que está sob
 * teste é a borda e a transação de verdade: sessão primeiro (IMP-06 AC 4),
 * payload revalidado (AC 6), o envelope com as mensagens compostas, a
 * sequência das três fixtures até o estado final esperado do design (IMP-07),
 * o rollback de uma falha na última escrita (IMP-06 AC 2) e duas gravações do
 * mesmo mês ao mesmo tempo (IMP-02 AC 7).
 *
 * `next/cache` e a sessão do Auth.js são os únicos dublês, como em
 * `compras.integration.test.ts`. Fixtures sintéticas (AD-009).
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

const { importarPlanilha, previaDaPlanilha } = await import("./importacao");
const { criarPool } = await import("@/infrastructure/db/client");
const { MovimentoRepositoryDrizzle } = await import(
  "@/infrastructure/db/repositories/movimento.repository"
);
const { ImportacaoRepositoryDrizzle } = await import(
  "@/infrastructure/db/repositories/importacao.repository"
);
const { CadastroRepositoryDrizzle } = await import(
  "@/infrastructure/db/repositories/cadastro.repository"
);
const { TransacaoDaImportacaoDrizzle } = await import(
  "@/infrastructure/db/transacao-da-importacao"
);

type Mes = "Outubro" | "Novembro" | "Dezembro";

let pool: Pool;
let base: CadastroBase;

function conteudoDaFixture(mes: Mes): string {
  return readFileSync(
    join(__dirname, "../../domain/importacao/__fixtures__", `Planilha 2026 - ${mes}.csv`),
    "utf-8",
  );
}

async function criarCartao(nome: string): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO meio_pagamento (nome, tipo, gera_fatura, dia_fechamento, dia_vencimento)
     VALUES ($1, 'CARTAO_CREDITO', true, 25, 5) RETURNING id`,
    [nome],
  );
  return rows[0]?.id ?? "";
}

function payload(
  mes: Mes,
  competencia: string,
  decisoes: { meios: Record<string, string>; entradas: Record<string, unknown> },
  confirmouDivergencia = true,
): Record<string, unknown> {
  return {
    nomeArquivo: `Planilha 2026 - ${mes}.csv`,
    conteudo: conteudoDaFixture(mes),
    competencia,
    decisoes,
    confirmouDivergencia,
  };
}

/** As decisões que outubro pede, com os ids do cadastro base e o Cartão Verde. */
function decisoesDeOutubro(cartaoVerde: string) {
  return {
    meios: { débito: base.contaId, "cartão roxo": base.cartaoId, "cartão verde": cartaoVerde },
    entradas: {
      "salário a": { classe: "FIXA", contaId: base.contaId },
      "salário b": { classe: "FIXA", contaId: base.contaId },
      reembolso: { classe: "AVULSA", contaId: base.contaId },
    },
  };
}

async function contar(tabela: string): Promise<number> {
  const { rows } = await pool.query<{ total: string }>(
    `SELECT count(*)::text AS total FROM ${tabela}`,
  );
  return Number(rows[0]?.total ?? "-1");
}

/** Tudo o que uma importação pode tocar, como o banco está agora. */
async function fotografia() {
  const tabelas = [
    "categoria",
    "meio_pagamento",
    "recorrencia",
    "recorrencia_versao",
    "compra_parcelada",
    "movimento",
    "importacao",
    "importacao_decisao",
  ];
  const resultado: Record<string, unknown[]> = {};
  for (const tabela of tabelas) {
    resultado[tabela] = (await pool.query(`SELECT * FROM ${tabela} ORDER BY id`)).rows;
  }
  return resultado;
}

/** Outubro gravado pela action, num banco que só tem o cadastro base. */
async function importarOutubro() {
  const verde = await criarCartao("Cartão Verde");
  const resultado = await importarPlanilha(payload("Outubro", "2026-10", decisoesDeOutubro(verde)));
  if (!resultado.ok) {
    throw new Error(`outubro recusado: ${resultado.erro.code}`);
  }
  return { verde, resultado };
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
  sessaoAtual = { user: { email: "pessoa-a@example.com", name: "Pessoa A" } };
  revalidatePath.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("actions da importação: sessão primeiro (T19, IMP-06 AC 4)", () => {
  it.each([["previaDaPlanilha"], ["importarPlanilha"]])(
    "`requireSession` é a primeira instrução de %s",
    (nome) => {
      const fonte = readFileSync(new URL("./importacao.ts", import.meta.url), "utf8");
      const corpo = fonte.slice(fonte.indexOf(`export async function ${nome}`));
      const primeiraInstrucao =
        corpo
          .slice(corpo.indexOf("{") + 1)
          .trim()
          .split("\n")[0] ?? "";

      expect(primeiraInstrucao).toContain("requireSession()");
    },
  );

  it("sem sessão, as duas devolvem NAO_AUTENTICADO sem consultar o banco", async () => {
    sessaoAtual = null;
    const usuarios = vi.spyOn(CadastroRepositoryDrizzle.prototype, "listarUsuarios");
    const ordem = vi.spyOn(ImportacaoRepositoryDrizzle.prototype, "ultimaCompetenciaImportada");
    const transacao = vi.spyOn(TransacaoDaImportacaoDrizzle.prototype, "executar");

    const previa = await previaDaPlanilha(payload("Outubro", "2026-10", decisoesDeOutubro("x")));
    const gravacao = await importarPlanilha(payload("Outubro", "2026-10", decisoesDeOutubro("x")));

    expect(previa.ok === false && previa.erro.code).toBe("NAO_AUTENTICADO");
    expect(gravacao.ok === false && gravacao.erro.code).toBe("NAO_AUTENTICADO");
    expect(usuarios).not.toHaveBeenCalled();
    expect(ordem).not.toHaveBeenCalled();
    expect(transacao).not.toHaveBeenCalled();
    expect(await contar("importacao")).toBe(0);
  });
});

describe("actions da importação: payload revalidado no servidor (T19, IMP-06 AC 6)", () => {
  it("prévia com arquivo que não é .csv devolve VALIDACAO com o campo", async () => {
    const resultado = await previaDaPlanilha({
      ...payload("Outubro", "2026-10", { meios: {}, entradas: {} }),
      nomeArquivo: "aba.xlsx",
    });

    expect(resultado).toEqual({
      ok: false,
      erro: {
        code: "VALIDACAO",
        mensagem: "Confira os campos destacados.",
        campos: { nomeArquivo: "Escolha a aba exportada em .csv." },
      },
    });
  });

  it("gravação sem confirmouDivergencia devolve VALIDACAO com o campo, sem gravar", async () => {
    const { confirmouDivergencia: _omitida, ...semConfirmacao } = payload("Outubro", "2026-10", {
      meios: {},
      entradas: {},
    });

    const resultado = await importarPlanilha(semConfirmacao);

    expect(resultado.ok === false && resultado.erro.code).toBe("VALIDACAO");
    expect(resultado.ok === false && resultado.erro.campos).toEqual({
      confirmouDivergencia: "Confirme se entendeu a diferença.",
    });
    expect(await contar("importacao")).toBe(0);
  });
});

describe("previaDaPlanilha (T19)", () => {
  it("devolve a prévia de outubro em registros simples, sem operações nem Map", async () => {
    const verde = await criarCartao("Cartão Verde");

    const resultado = await previaDaPlanilha(
      payload("Outubro", "2026-10", decisoesDeOutubro(verde)),
    );

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) {
      return;
    }
    expect(resultado.data.competencia).toBe("2026-10");
    expect(resultado.data.competenciaEsperada).toBeNull();
    expect(resultado.data.quantidadeAImportar).toBe(16);
    expect(resultado.data.conferencia.blocos.GASTOS.diferenca).toBe(-1200);
    expect("operacoes" in resultado.data).toBe(false);
    expect(JSON.parse(JSON.stringify(resultado.data))).toEqual(resultado.data);
    expect(await contar("categoria")).toBe(1);
  });

  it("bloco ausente sai com a mensagem que nomeia o bloco (IMP-01 AC 3)", async () => {
    const resultado = await previaDaPlanilha({
      ...payload("Outubro", "2026-10", { meios: {}, entradas: {} }),
      conteudo: conteudoDaFixture("Outubro").replace(",Entradas,", ",,"),
    });

    expect(resultado).toEqual({
      ok: false,
      erro: {
        code: "PLANILHA_BLOCO_AUSENTE",
        mensagem: "O arquivo não tem o bloco “Entradas”. Exporte a aba de um mês da planilha.",
      },
    });
  });

  it("falha não prevista na prévia devolve ERRO_INESPERADO com referência e sem stack (IMP-06 AC 5)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(ImportacaoRepositoryDrizzle.prototype, "ultimaCompetenciaImportada").mockRejectedValue(
      new Error("conexão perdida em movimento.repository.ts:42"),
    );

    const resultado = await previaDaPlanilha(
      payload("Outubro", "2026-10", { meios: {}, entradas: {} }),
    );

    expect(resultado.ok === false && resultado.erro.code).toBe("ERRO_INESPERADO");
    expect(resultado.ok === false && resultado.erro.mensagem).toMatch(
      /^Não foi possível concluir a operação\. Tente de novo\. Se continuar, informe o código [0-9a-f]{8}\.$/,
    );
  });
});

describe("importarPlanilha: outubro → novembro → dezembro (T19, IMP-07)", () => {
  it("produz exatamente o estado final esperado do design", async () => {
    const verde = await criarCartao("Cartão Verde");

    const semConfirmar = await importarPlanilha(
      payload("Outubro", "2026-10", decisoesDeOutubro(verde), false),
    );
    expect(semConfirmar).toEqual({
      ok: false,
      erro: {
        code: "IMPORTACAO_DIVERGENCIA_NAO_CONFIRMADA",
        mensagem: "Há totais que não batem. Confirme que entendeu a diferença antes de importar.",
      },
    });

    const outubro = await importarPlanilha(payload("Outubro", "2026-10", decisoesDeOutubro(verde)));
    expect(outubro).toEqual({
      ok: true,
      data: {
        competencia: "2026-10",
        proxima: "2026-11",
        criados: 16,
        alterados: 0,
        encerrados: 0,
      },
    });

    const azul = await criarCartao("Cartão Azul");
    const novasDeNovembro = {
      meios: { "cartão azul": azul },
      entradas: { presente: { classe: "AVULSA", contaId: base.contaId } },
    };
    const previaDeNovembro = await previaDaPlanilha(
      payload("Novembro", "2026-11", { meios: {}, entradas: {} }),
    );
    expect(previaDeNovembro.ok && previaDeNovembro.data.pendencias).toEqual({
      tiposSemMeio: [{ chave: "cartão azul", nome: "Cartão Azul", linhas: 1 }],
      entradasSemClasse: [{ chave: "presente", nome: "Presente" }],
    });
    const novembro = await importarPlanilha(payload("Novembro", "2026-11", novasDeNovembro, false));
    expect(novembro).toEqual({
      ok: true,
      data: { competencia: "2026-11", proxima: "2026-12", criados: 5, alterados: 4, encerrados: 1 },
    });

    const dezembro = await importarPlanilha(
      payload("Dezembro", "2026-12", { meios: {}, entradas: {} }),
    );
    expect(dezembro).toEqual({
      ok: true,
      data: { competencia: "2026-12", proxima: "2027-01", criados: 2, alterados: 0, encerrados: 1 },
    });

    const { rows: recorrencias } = await pool.query<{
      chave: string;
      natureza: string;
      inicio: string;
      fim: string | null;
      versoes: Array<[string, number]>;
    }>(
      `SELECT r.descricao || ' / ' || mp.nome AS chave, r.natureza, r.competencia_inicio::text AS inicio,
              r.competencia_fim::text AS fim,
              (SELECT json_agg(json_build_array(v.vigente_desde::text, v.valor_previsto_centavos)
                               ORDER BY v.vigente_desde)
                 FROM recorrencia_versao v WHERE v.recorrencia_id = r.id) AS versoes
         FROM recorrencia r JOIN meio_pagamento mp ON mp.id = r.meio_pagamento_id`,
    );
    const fixa = (natureza: string, inicio: string, fim: string | null, versoes: unknown[]) => ({
      natureza,
      inicio,
      fim,
      versoes,
    });
    expect(Object.fromEntries(recorrencias.map(({ chave, ...resto }) => [chave, resto]))).toEqual({
      "Aluguel / Conta Corrente": fixa("DESPESA", "2026-10-01", null, [["2026-10-01", 150000]]),
      "Internet / Cartão Roxo": fixa("DESPESA", "2026-10-01", null, [
        ["2026-10-01", 10000],
        ["2026-11-01", 11000],
      ]),
      "Academia / Conta Corrente": fixa("DESPESA", "2026-10-01", null, [["2026-10-01", 12000]]),
      "Academia / Cartão Roxo": fixa("DESPESA", "2026-10-01", "2026-10-01", [
        ["2026-10-01", 12000],
      ]),
      "Streaming / Cartão Azul": fixa("DESPESA", "2026-11-01", null, [["2026-11-01", 3000]]),
      "Salário A / Conta Corrente": fixa("RECEITA", "2026-10-01", null, [["2026-10-01", 600000]]),
      "Salário B / Conta Corrente": fixa("RECEITA", "2026-10-01", "2026-11-01", [
        ["2026-10-01", 400000],
        ["2026-11-01", 420000],
      ]),
    });

    const { rows: compras } = await pool.query<{
      chave: string;
      meio: string;
      amortizado: number;
      parcelas: Array<[number, string, number]>;
    }>(
      `SELECT cp.descricao || ' ' || cp.valor_total_centavos AS chave, mp.nome AS meio,
              cp.valor_amortizado_anterior_centavos::int AS amortizado,
              (SELECT json_agg(json_build_array(m.numero_parcela, m.competencia::text, m.valor_centavos)
                               ORDER BY m.numero_parcela)
                 FROM movimento m WHERE m.compra_id = cp.id) AS parcelas
         FROM compra_parcelada cp JOIN meio_pagamento mp ON mp.id = cp.meio_pagamento_id`,
    );
    expect(Object.fromEntries(compras.map(({ chave, ...resto }) => [chave, resto]))).toEqual({
      "Sofá 210000": {
        meio: "Cartão Roxo",
        amortizado: 126000,
        parcelas: [
          [7, "2026-10-01", 21000],
          [8, "2026-11-01", 21000],
          [9, "2026-12-01", 21000],
          [10, "2027-01-01", 21000],
        ],
      },
      "Fone 10000": {
        meio: "Cartão Roxo",
        amortizado: 0,
        parcelas: [
          [1, "2026-10-01", 3334],
          [2, "2026-11-01", 3333],
          [3, "2026-12-01", 3333],
        ],
      },
      "Curso 15000": {
        meio: "Cartão Verde",
        amortizado: 10000,
        parcelas: [[3, "2026-10-01", 5000]],
      },
      "Óculos 40000": {
        meio: "Conta Corrente",
        amortizado: 8000,
        parcelas: [
          [2, "2026-10-01", 8000],
          [3, "2026-11-01", 8000],
          [4, "2026-12-01", 8000],
          [5, "2027-01-01", 8000],
        ],
      },
      "Livro 4000": {
        meio: "Cartão Roxo",
        amortizado: 0,
        parcelas: [
          [1, "2026-10-01", 2000],
          [2, "2026-11-01", 2000],
        ],
      },
      "Livro 6002": {
        meio: "Cartão Roxo",
        amortizado: 0,
        parcelas: [
          [1, "2026-10-01", 3000],
          [2, "2026-11-01", 3002],
        ],
      },
      "Tênis 30000": {
        meio: "Cartão Roxo",
        amortizado: 0,
        parcelas: [
          [1, "2026-11-01", 15000],
          [2, "2026-12-01", 15000],
        ],
      },
    });

    const { rows: avulsos } = await pool.query<{ origem_hash: string; descricao: string }>(
      `SELECT origem_hash, descricao || ' ' || natureza || ' ' || valor_centavos AS descricao
         FROM movimento WHERE origem = 'AVULSO' AND origem_dado = 'PLANILHA'`,
    );
    expect(Object.fromEntries(avulsos.map((a) => [a.origem_hash, a.descricao]))).toEqual({
      "2026-10|GASTOS|0": "Feira DESPESA 8740",
      "2026-10|GASTOS|1": "Farmácia DESPESA 2510",
      "2026-10|GASTOS|2": "Padaria DESPESA 1200",
      "2026-10|ENTRADAS|2": "Reembolso RECEITA 15000",
      "2026-11|GASTOS|0": "Mercado do mês DESPESA 30000",
      "2026-11|GASTOS|1": "Cinema DESPESA 4500",
      "2026-11|ENTRADAS|2": "Presente RECEITA 20000",
      "2026-12|GASTOS|0": "Ceia DESPESA 40000",
      "2026-12|ENTRADAS|2": "Presente RECEITA 10000",
    });
    expect(await contar("movimento WHERE origem = 'AVULSO'")).toBe(9);

    const { rows: importacoes } = await pool.query(
      "SELECT competencia::text, nome_arquivo, usuario_id FROM importacao ORDER BY competencia",
    );
    expect(importacoes).toEqual([
      {
        competencia: "2026-10-01",
        nome_arquivo: "Planilha 2026 - Outubro.csv",
        usuario_id: base.usuarioId,
      },
      {
        competencia: "2026-11-01",
        nome_arquivo: "Planilha 2026 - Novembro.csv",
        usuario_id: base.usuarioId,
      },
      {
        competencia: "2026-12-01",
        nome_arquivo: "Planilha 2026 - Dezembro.csv",
        usuario_id: base.usuarioId,
      },
    ]);

    const { rows: decisoes } = await pool.query<{ chave: string; valor: string }>(
      `SELECT d.tipo || ' ' || d.nome_normalizado AS chave, mp.nome || ' ' || coalesce(d.classe::text, '-') AS valor
         FROM importacao_decisao d JOIN meio_pagamento mp ON mp.id = d.meio_pagamento_id`,
    );
    expect(Object.fromEntries(decisoes.map((d) => [d.chave, d.valor]))).toEqual({
      "MEIO débito": "Conta Corrente -",
      "MEIO cartão roxo": "Cartão Roxo -",
      "MEIO cartão verde": "Cartão Verde -",
      "MEIO cartão azul": "Cartão Azul -",
      "ENTRADA salário a": "Conta Corrente FIXA",
      "ENTRADA salário b": "Conta Corrente FIXA",
      "ENTRADA reembolso": "Conta Corrente AVULSA",
      "ENTRADA presente": "Conta Corrente AVULSA",
    });

    const { rows: pessoas } = await pool.query<{ usuario_id: string }>(
      `SELECT usuario_id FROM movimento UNION SELECT usuario_id FROM compra_parcelada
       UNION SELECT usuario_id FROM recorrencia`,
    );
    expect(pessoas).toEqual([{ usuario_id: base.usuarioId }]);
  });

  it("repetir outubro depois de gravado é recusado nomeando novembro (IMP-02 AC 5)", async () => {
    const { verde } = await importarOutubro();
    const antes = await fotografia();

    const resultado = await importarPlanilha(
      payload("Outubro", "2026-10", decisoesDeOutubro(verde)),
    );

    expect(resultado).toEqual({
      ok: false,
      erro: {
        code: "IMPORTACAO_FORA_DE_ORDEM",
        mensagem: "As abas entram em sequência. A próxima é Novembro de 2026.",
      },
    });
    expect(await fotografia()).toEqual(antes);
  });

  it("sucesso revalida o painel, a lista e o Todo mês da competência (IMP-06 AC 3)", async () => {
    await importarOutubro();

    expect(revalidatePath.mock.calls.map(([rota]) => rota).sort()).toEqual([
      "/2026-10",
      "/2026-10/fixos",
      "/2026-10/lancamentos",
    ]);
  });
});

describe("importarPlanilha: tudo ou nada (T19, IMP-06 AC 2 e 5)", () => {
  it("falha na última escrita deixa o banco como estava e sem registro de importação", async () => {
    const verde = await criarCartao("Cartão Verde");
    const antes = await fotografia();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const original = MovimentoRepositoryDrizzle.prototype.criarAvulso;
    let chamadas = 0;
    vi.spyOn(MovimentoRepositoryDrizzle.prototype, "criarAvulso").mockImplementation(
      async function (this: InstanceType<typeof MovimentoRepositoryDrizzle>, entrada) {
        chamadas += 1;
        if (chamadas === 4) {
          throw new Error("falha injetada no quarto avulso, em movimento.repository.ts:51");
        }
        return original.call(this, entrada);
      },
    );

    const resultado = await importarPlanilha(
      payload("Outubro", "2026-10", decisoesDeOutubro(verde)),
    );

    expect(chamadas).toBe(4);
    expect(resultado.ok === false && resultado.erro.code).toBe("ERRO_INESPERADO");
    expect(resultado.ok === false && resultado.erro.mensagem).toMatch(
      /^Não foi possível concluir a operação\. Tente de novo\. Se continuar, informe o código [0-9a-f]{8}\.$/,
    );
    expect(await fotografia()).toEqual(antes);
    expect(await contar("importacao")).toBe(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("importarPlanilha: duas gravações de outubro ao mesmo tempo (T19, IMP-02 AC 7)", () => {
  it("uma grava e a outra termina com IMPORTACAO_FORA_DE_ORDEM", async () => {
    const verde = await criarCartao("Cartão Verde");
    const mesmoPayload = payload("Outubro", "2026-10", decisoesDeOutubro(verde));

    const resultados = await Promise.all([
      importarPlanilha(mesmoPayload),
      importarPlanilha(mesmoPayload),
    ]);

    expect(resultados.filter((r) => r.ok)).toHaveLength(1);
    expect(resultados.filter((r) => !r.ok)).toEqual([
      {
        ok: false,
        erro: {
          code: "IMPORTACAO_FORA_DE_ORDEM",
          mensagem: "As abas entram em sequência. A próxima é Novembro de 2026.",
        },
      },
    ]);
    expect(await contar("importacao")).toBe(1);
    expect(await contar("recorrencia")).toBe(6);
  });
});
