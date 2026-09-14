import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type BancoDeDados, criarCliente, criarPool } from "./client";
import {
  COMPETENCIA_BASE_PADRAO,
  criarPrng,
  MESES_DE_AVULSOS,
  SEMENTE_PADRAO,
  semear,
} from "./seed";
import { limparDados, recriarBancoDeTeste, URL_BANCO_DE_TESTE } from "./testing/banco-de-teste";

/**
 * Duas exigências, e as duas são do AD-009.
 *
 * 1. O seed é **reprodutível**: mesma semente, mesmos dados. Sem isso, o
 *    ambiente de desenvolvimento muda sob os pés de quem está depurando.
 * 2. O seed é **inventado**: nenhum valor do print da planilha aparece no
 *    arquivo. A revisão dessa exigência está abaixo, como teste, e não como
 *    promessa de que alguém olhou.
 */

/**
 * Todo valor visível no print da planilha da família, em centavos, e os
 * mesmos em texto BRL. Nenhum deles pode aparecer em `seed.ts`.
 */
const VALORES_DO_PRINT = [
  940000, 820000, 1200000, 60000, 200000, 120000, 164000, 82000, 90000, 14000, 25000, 40000, 20000,
  18000, 30000, 34750, 6000,
];
const TEXTOS_DO_PRINT = [
  "9.400,00",
  "8.200,00",
  "12.000,00",
  "1.640,00",
  "347,50",
  "95,02",
  "246,0",
  "Abraão",
  "Celpe",
  "NuBank",
  "NuMoises",
  "Bradesco",
  "Porto Seguro",
  "Latam",
  "Moisés",
  "Ana",
];

interface LinhaDeMovimento {
  natureza: string;
  origem: string;
  descricao: string;
  competencia: string;
  data_evento: string;
  valor_centavos: string;
  numero_parcela: number | null;
  pago_em: string | null;
  categoria: string | null;
  meio: string;
  usuario: string;
}

const CONSULTA_SNAPSHOT = `
  SELECT m.natureza, m.origem, m.descricao, m.competencia::text AS competencia,
         m.data_evento::text AS data_evento, m.valor_centavos::text AS valor_centavos,
         m.numero_parcela, m.pago_em::text AS pago_em,
         c.nome AS categoria, mp.nome AS meio, u.nome AS usuario
  FROM movimento m
  LEFT JOIN categoria c ON c.id = m.categoria_id
  JOIN meio_pagamento mp ON mp.id = m.meio_pagamento_id
  JOIN usuario u ON u.id = m.usuario_id
  ORDER BY m.competencia, m.descricao, m.numero_parcela NULLS FIRST, m.valor_centavos
`;

let pool: Pool;
let db: BancoDeDados;

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
});

async function snapshot(): Promise<LinhaDeMovimento[]> {
  const { rows } = await pool.query<LinhaDeMovimento>(CONSULTA_SNAPSHOT);
  return rows;
}

describe("seed determinístico (T36, DADO-02, AD-009)", () => {
  it("duas execuções com a mesma semente produzem exatamente os mesmos dados", async () => {
    await semear(db, SEMENTE_PADRAO);
    const primeira = await snapshot();

    await limparDados(pool);
    await semear(db, SEMENTE_PADRAO);
    const segunda = await snapshot();

    expect(segunda).toEqual(primeira);
    expect(primeira.length).toBeGreaterThan(0);
  });

  it("sementes diferentes produzem dados diferentes, provando que a semente é usada", async () => {
    await semear(db, SEMENTE_PADRAO);
    const comSementePadrao = await snapshot();

    await limparDados(pool);
    await semear(db, SEMENTE_PADRAO + 1);
    const comOutraSemente = await snapshot();

    expect(comOutraSemente).not.toEqual(comSementePadrao);
  });

  it("o PRNG é reprodutível para a mesma semente e diverge para outra", () => {
    const a = criarPrng(SEMENTE_PADRAO);
    const b = criarPrng(SEMENTE_PADRAO);
    const c = criarPrng(SEMENTE_PADRAO + 1);
    const dez = (prng: () => number) => Array.from({ length: 10 }, prng);

    expect(dez(a)).toEqual(dez(b));
    expect(dez(criarPrng(SEMENTE_PADRAO))).not.toEqual(dez(c));
  });
});

describe("conteúdo do seed (T36, AD-005)", () => {
  it("inclui uma compra parcelada já em andamento, com as parcelas 8, 9 e 10", async () => {
    await semear(db, SEMENTE_PADRAO);

    const { rows } = await pool.query<{ numero_parcela: number; competencia: string }>(`
      SELECT m.numero_parcela, m.competencia::text AS competencia
      FROM movimento m JOIN compra_parcelada c ON c.id = m.compra_id
      WHERE c.parcela_inicial = 8 AND c.qtd_parcelas = 10
      ORDER BY m.numero_parcela
    `);

    expect(rows.map((r) => r.numero_parcela)).toEqual([8, 9, 10]);
    expect(rows.map((r) => r.competencia)).toEqual(["2026-03-01", "2026-04-01", "2026-05-01"]);
  });

  it("não cria nenhuma linha em competência anterior à da parcela inicial — PARC-07, AC 3", async () => {
    await semear(db, SEMENTE_PADRAO);

    const { rows } = await pool.query<{ total: string }>(
      "SELECT count(*)::text AS total FROM movimento WHERE competencia < DATE '2026-03-01'",
    );

    expect(rows[0]?.total).toBe("0");
  });

  it("o relatório devolvido bate com o que foi gravado", async () => {
    const resultado = await semear(db, SEMENTE_PADRAO);

    const { rows } = await pool.query<{ total: string }>(
      "SELECT count(*)::text AS total FROM movimento",
    );
    expect(rows[0]?.total).toBe(String(resultado.movimentos));
  });
});

describe("nenhum dado real no seed (T36, AD-009)", () => {
  const fonte = readFileSync(join(process.cwd(), "src/infrastructure/db/seed.ts"), "utf-8");

  it.each(VALORES_DO_PRINT)("não contém o valor %i do print da planilha", (valor) => {
    expect(fonte).not.toMatch(new RegExp(`\\b${valor}\\b`));
  });

  it.each(TEXTOS_DO_PRINT)("não contém o termo %s do print da planilha", (termo) => {
    expect(fonte).not.toContain(termo);
  });

  it("usa apenas nomes genéricos para pessoas e e-mails de exemplo", async () => {
    await semear(db, SEMENTE_PADRAO);

    const { rows } = await pool.query<{ nome: string; email: string }>(
      "SELECT nome, email FROM usuario ORDER BY nome",
    );

    expect(rows).toEqual([
      { nome: "Pessoa A", email: "pessoa-a@example.com" },
      { nome: "Pessoa B", email: "pessoa-b@example.com" },
    ]);
  });
});

/**
 * A regressão que este bloco existe para impedir: o seed tinha os meses
 * escritos à mão (`2026-03`, `04`, `05`) e envelhecia sozinho. Passados três
 * meses, o mês corrente abria zerado e o app parecia quebrado sem estar.
 *
 * O que se testa não é "tem dado": é que **a base manda em toda a linha do
 * tempo** e que **o `pagoEm` segue a competência corrente, não a base**. Um
 * mês que ainda não chegou com conta paga é o defeito que zeraria a régua de
 * comprometimento futuro, que só soma despesa em aberto.
 */
describe("o seed é ancorado numa competência-base (DADO-02)", () => {
  async function competenciasComLancamento(): Promise<string[]> {
    const { rows } = await pool.query<{ competencia: string }>(
      "SELECT DISTINCT competencia::text AS competencia FROM movimento ORDER BY competencia",
    );
    return rows.map((r) => r.competencia);
  }

  it("não cria nada antes da base informada", async () => {
    await semear(db, SEMENTE_PADRAO, "2030-05");

    const competencias = await competenciasComLancamento();

    expect(competencias[0]).toBe("2030-05-01");
  });

  it("cobre a base e os meses seguintes com lançamentos avulsos", async () => {
    await semear(db, SEMENTE_PADRAO, "2030-05");

    const { rows } = await pool.query<{ competencia: string }>(`
      SELECT DISTINCT competencia::text AS competencia
      FROM movimento WHERE origem = 'AVULSO' ORDER BY competencia
    `);

    expect(rows.map((r) => r.competencia)).toEqual([
      "2030-05-01",
      "2030-06-01",
      "2030-07-01",
      "2030-08-01",
      "2030-09-01",
      "2030-10-01",
    ]);
    expect(rows).toHaveLength(MESES_DE_AVULSOS);
  });

  it("mudar a base desloca a linha do tempo inteira sem mudar mais nada", async () => {
    await semear(db, SEMENTE_PADRAO, "2030-05");
    const emMaio = await snapshot();

    await limparDados(pool);
    await semear(db, SEMENTE_PADRAO, "2030-06");
    const emJunho = await snapshot();

    expect(emJunho).toHaveLength(emMaio.length);
    expect(emJunho.map((l) => l.valor_centavos)).toEqual(emMaio.map((l) => l.valor_centavos));
    expect(emJunho.map((l) => l.competencia)).not.toEqual(emMaio.map((l) => l.competencia));
  });

  it("a base padrão continua sendo a que os demais testes usam", async () => {
    await semear(db, SEMENTE_PADRAO);

    const competencias = await competenciasComLancamento();

    expect(competencias[0]).toBe(`${COMPETENCIA_BASE_PADRAO}-01`);
  });
});

/**
 * O `pagoEm` não sai da base: sai da competência corrente, que é o segundo
 * parâmetro. É o que separa "mês que já passou" de "mês que ainda vem".
 */
describe("o que já está pago depende da competência corrente (MOV-06)", () => {
  const BASE = "2030-05";
  /** Dois meses após a base: 2030-05 e 06 são passado, 07 é o mês corrente. */
  const CORRENTE = "2030-07";

  async function emAberto(competencia: string): Promise<{ total: number; abertos: number }> {
    const { rows } = await pool.query<{ total: string; abertos: string }>(
      `SELECT count(*)::text AS total,
              count(*) FILTER (WHERE pago_em IS NULL)::text AS abertos
       FROM movimento WHERE competencia = $1::date`,
      [`${competencia}-01`],
    );
    return { total: Number(rows[0]?.total), abertos: Number(rows[0]?.abertos) };
  }

  it("nenhum mês posterior ao corrente tem lançamento quitado", async () => {
    await semear(db, SEMENTE_PADRAO, BASE, CORRENTE);

    for (const futuro of ["2030-08", "2030-09", "2030-10"]) {
      const { total, abertos } = await emAberto(futuro);
      expect(total).toBeGreaterThan(0);
      expect(abertos).toBe(total);
    }
  });

  it("o mês corrente tem lançamento quitado e lançamento em aberto", async () => {
    await semear(db, SEMENTE_PADRAO, BASE, CORRENTE);

    const { total, abertos } = await emAberto(CORRENTE);

    expect(abertos).toBeGreaterThan(0);
    expect(abertos).toBeLessThan(total);
  });

  it("os meses que já passaram quase não deixam conta em aberto", async () => {
    await semear(db, SEMENTE_PADRAO, BASE, CORRENTE);

    const passado = await emAberto(BASE);

    expect(passado.abertos).toBeLessThan(passado.total / 2);
  });

  it("sem competência corrente informada, a própria base faz esse papel", async () => {
    await semear(db, SEMENTE_PADRAO, BASE);

    const seguinte = await emAberto("2030-06");

    expect(seguinte.abertos).toBe(seguinte.total);
  });
});
