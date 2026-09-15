import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Imprime as migrations como um bloco SQL único, para colar num console web.
 *
 * ```
 * pnpm db:sql > /tmp/migrations.sql
 * ```
 *
 * **Existe porque `pnpm db:migrate` nem sempre consegue conectar.** Rede
 * corporativa costuma bloquear a saída na porta 5432, e foi o que aconteceu na
 * primeira aplicação no Neon: os dois endpoints resolviam DNS e nenhum aceitava
 * TCP. O SQL Editor do Neon fala HTTPS e passa.
 *
 * **Não é um segundo mecanismo de migration.** Quem manda continua sendo o
 * `drizzle-kit`: este comando não inventa SQL, ele lê `drizzle/meta/_journal.json`
 * e concatena os arquivos na ordem registrada. Por isso é um **gerador**, e não
 * um arquivo `.sql` commitado — um bloco gravado no repositório ficaria obsoleto
 * na quarta migration, e alguém colaria o velho achando que está em dia.
 *
 * **A parte que importa são os `INSERT`.** Cada migration é seguida de um
 * registro em `drizzle.__drizzle_migrations`, que é como o drizzle sabe o que
 * já aplicou. Sem eles o schema existiria e o próximo `db:migrate` — do
 * pipeline de deploy, de outra máquina — tentaria criar tudo de novo e
 * estouraria em "relation already exists".
 *
 * O `hash` é o SHA-256 do conteúdo **integral** de cada arquivo e o `created_at`
 * é o `when` do journal. Os dois valores vêm de
 * `node_modules/drizzle-orm/migrator.cjs`; se um dia o drizzle mudar a forma de
 * computá-los, este arquivo passa a mentir. É o custo aceito de reproduzir
 * comportamento de biblioteca.
 */

interface EntradaDoJournal {
  readonly idx: number;
  readonly when: number;
  readonly tag: string;
}

const raiz = process.cwd();
const journal = JSON.parse(
  readFileSync(join(raiz, "drizzle", "meta", "_journal.json"), "utf-8"),
) as { readonly entries: ReadonlyArray<EntradaDoJournal> };

const partes: string[] = [
  `-- ============================================================================
-- myBilling — migrations para colar num console SQL (gerado por \`pnpm db:sql\`)
--
-- NÃO EDITE e NÃO COMMITE este resultado: gere de novo quando precisar. Quem
-- manda no schema é o \`drizzle-kit\`; isto é só um caminho alternativo de
-- aplicação, para quando a porta 5432 estiver bloqueada.
--
-- Rode tudo de uma vez. É uma transação só: se qualquer parte falhar, nada fica.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS "drizzle";

CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);

BEGIN;
`,
];

for (const entrada of journal.entries) {
  const conteudo = readFileSync(join(raiz, "drizzle", `${entrada.tag}.sql`), "utf-8");
  const hash = createHash("sha256").update(conteudo).digest("hex");
  partes.push(`
-- ----------------------------------------------------------------------------
-- ${entrada.tag}   (idx ${entrada.idx}, when ${entrada.when})
-- ----------------------------------------------------------------------------
${conteudo.trimEnd()}

INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
VALUES ('${hash}', ${entrada.when});
`);
}

/*
 * A conferência sai junto, numa linha só com veredito. Quatro `SELECT`
 * separados obrigariam quem colou a comparar número por número em quatro abas
 * de resultado, que é onde o erro passa.
 *
 * Os números esperados são derivados, não digitados: tabelas e restrições saem
 * do próprio schema, e migrations sai do journal.
 */
const schema = readFileSync(join(raiz, "src", "infrastructure", "db", "schema.ts"), "utf-8");
const tabelasEsperadas = [...schema.matchAll(/pgTable\(\s*"([a-z_]+)"/g)].length;
const checksEsperados = new Set([...schema.matchAll(/check\(\s*"([a-z0-9_]+)"/g)].map((m) => m[1]))
  .size;
const migrationsEsperadas = journal.entries.length;
const hashes = journal.entries
  .map((e) => {
    const conteudo = readFileSync(join(raiz, "drizzle", `${e.tag}.sql`), "utf-8");
    return `'${createHash("sha256").update(conteudo).digest("hex")}'`;
  })
  .join(",\n        ");

const contagens = `
    (SELECT count(*) FROM information_schema.tables WHERE table_schema='public') = ${tabelasEsperadas}
AND (SELECT count(*) FROM drizzle.__drizzle_migrations) = ${migrationsEsperadas}
AND (SELECT count(*) FROM pg_constraint
       WHERE contype='c' AND connamespace='public'::regnamespace) = ${checksEsperados}
AND (SELECT count(*) FROM movimento) = 0
AND (SELECT count(*) FROM drizzle.__drizzle_migrations
       WHERE hash IN (
        ${hashes}
     )) = ${migrationsEsperadas}`;

partes.push(`
COMMIT;

-- ============================================================================
-- Conferência — uma linha, com veredito. Rode depois do bloco acima.
--
-- \`hashes_certos\` é a coluna que importa: ela prova que o controle de
-- migrations casa com os arquivos do repositório. Se vier menor que
-- ${migrationsEsperadas}, o próximo \`db:migrate\` tentaria aplicar tudo de novo.
-- ============================================================================
SELECT
  (SELECT count(*) FROM information_schema.tables
     WHERE table_schema = 'public')                                AS tabelas,
  (SELECT count(*) FROM drizzle.__drizzle_migrations)               AS migrations,
  (SELECT count(*) FROM pg_constraint
     WHERE contype = 'c' AND connamespace = 'public'::regnamespace) AS checks,
  (SELECT count(*) FROM movimento)                                  AS movimentos,
  (SELECT count(*) FROM drizzle.__drizzle_migrations
     WHERE hash IN (
        ${hashes}
     ))                                                             AS hashes_certos,
  CASE WHEN${contagens}
       THEN 'TUDO OK'
       ELSE 'DIVERGENTE'
  END                                                               AS veredito;
`);

process.stdout.write(partes.join(""));
