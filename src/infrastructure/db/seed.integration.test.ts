import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type BancoDeDados, criarCliente, criarPool } from "./client";
import { criarPrng, SEMENTE_PADRAO, semear } from "./seed";
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
