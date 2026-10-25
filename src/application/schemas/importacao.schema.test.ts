import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ZodType } from "zod";
import {
  entradaGravacaoImportacaoSchema,
  entradaPreviaImportacaoSchema,
  MAX_CONTEUDO_PLANILHA,
} from "./importacao.schema";

/**
 * Testes derivados de IMP-01 AC 1 e IMP-06 AC 6 e do Done when de T16. O
 * schema é a barreira de formato do payload que o servidor relê; o conteúdo do
 * arquivo é lido de novo pelo domínio, não confiado.
 */

const CONTA = "11111111-1111-4111-8111-111111111111";
const CARTAO = "22222222-2222-4222-8222-222222222222";

const PREVIA = {
  nomeArquivo: "Planilha 2026 - Outubro.csv",
  conteudo: "X,,\n,,Fixos",
  competencia: "2026-10",
  decisoes: {
    meios: { débito: CONTA, "cartão roxo": CARTAO },
    entradas: { "salário a": { classe: "FIXA", contaId: CONTA } },
  },
} as const;

const GRAVACAO = { ...PREVIA, confirmouDivergencia: false } as const;

function camposComErro(schema: ZodType, entrada: unknown): string[] {
  const resultado = schema.safeParse(entrada);
  if (resultado.success) {
    return [];
  }
  return resultado.error.issues.map((issue) => issue.path.join("."));
}

describe("entradaPreviaImportacaoSchema", () => {
  it("aceita a prévia bem formada e devolve as decisões como vieram", () => {
    const resultado = entradaPreviaImportacaoSchema.safeParse(PREVIA);

    expect(resultado.success).toBe(true);
    expect(resultado.data?.competencia).toBe("2026-10");
    expect(resultado.data?.decisoes).toEqual({
      meios: { débito: CONTA, "cartão roxo": CARTAO },
      entradas: { "salário a": { classe: "FIXA", contaId: CONTA } },
    });
  });

  it("recusa arquivo sem a extensão .csv e aceita .CSV em maiúsculas (IMP-01 AC 1)", () => {
    expect(
      camposComErro(entradaPreviaImportacaoSchema, { ...PREVIA, nomeArquivo: "aba.xlsx" }),
    ).toEqual(["nomeArquivo"]);
    expect(
      entradaPreviaImportacaoSchema.safeParse({ ...PREVIA, nomeArquivo: "ABA.CSV" }).success,
    ).toBe(true);
  });

  it("recusa conteúdo acima de 1 MB e aceita exatamente no limite (IMP-01 AC 1)", () => {
    expect(MAX_CONTEUDO_PLANILHA).toBe(1_048_576);
    expect(
      camposComErro(entradaPreviaImportacaoSchema, {
        ...PREVIA,
        conteudo: "a".repeat(1_048_577),
      }),
    ).toEqual(["conteudo"]);
    expect(
      entradaPreviaImportacaoSchema.safeParse({ ...PREVIA, conteudo: "a".repeat(1_048_576) })
        .success,
    ).toBe(true);
  });

  it("mede o limite em caracteres: conteúdo com menos de 1 MB em caracteres e mais em bytes passa (IMP-01 AC 1)", () => {
    const conteudo = "\u00e9".repeat(600_000);
    expect(conteudo.length).toBeLessThan(MAX_CONTEUDO_PLANILHA);
    expect(new TextEncoder().encode(conteudo).length).toBeGreaterThan(MAX_CONTEUDO_PLANILHA);

    expect(entradaPreviaImportacaoSchema.safeParse({ ...PREVIA, conteudo }).success).toBe(true);
  });

  it("recusa competência com mês 13", () => {
    expect(
      camposComErro(entradaPreviaImportacaoSchema, { ...PREVIA, competencia: "2026-13" }),
    ).toEqual(["competencia"]);
  });

  it("recusa meio de pagamento que não é uuid numa decisão de Tipo", () => {
    expect(
      camposComErro(entradaPreviaImportacaoSchema, {
        ...PREVIA,
        decisoes: { meios: { débito: "conta-corrente" }, entradas: {} },
      }),
    ).toEqual(["decisoes.meios.débito"]);
  });

  it("recusa classe de entrada fora de FIXA e AVULSA", () => {
    expect(
      camposComErro(entradaPreviaImportacaoSchema, {
        ...PREVIA,
        decisoes: { meios: {}, entradas: { bônus: { classe: "EVENTUAL", contaId: CONTA } } },
      }),
    ).toEqual(["decisoes.entradas.bônus.classe"]);
  });

  it("é importável pelo cliente e pelo servidor: só depende de zod e do domínio", () => {
    const fonte = readFileSync(new URL("./importacao.schema.ts", import.meta.url), "utf8");
    const importados = [...fonte.matchAll(/from "([^"]+)"/g)].map((m) => m[1]);

    expect(importados.every((modulo) => modulo === "zod" || modulo === "@/domain")).toBe(true);
  });
});

describe("entradaGravacaoImportacaoSchema", () => {
  it("aceita o payload da prévia com a confirmação de divergência", () => {
    const resultado = entradaGravacaoImportacaoSchema.safeParse(GRAVACAO);

    expect(resultado.success).toBe(true);
    expect(resultado.data?.confirmouDivergencia).toBe(false);
  });

  it("exige confirmouDivergencia, e booleano (IMP-05 AC 8)", () => {
    const { confirmouDivergencia: _omitida, ...semConfirmacao } = GRAVACAO;

    expect(camposComErro(entradaGravacaoImportacaoSchema, semConfirmacao)).toEqual([
      "confirmouDivergencia",
    ]);
    expect(
      camposComErro(entradaGravacaoImportacaoSchema, { ...GRAVACAO, confirmouDivergencia: "sim" }),
    ).toEqual(["confirmouDivergencia"]);
  });

  it("revalida no servidor as mesmas regras da prévia (IMP-06 AC 6)", () => {
    expect(
      camposComErro(entradaGravacaoImportacaoSchema, { ...GRAVACAO, nomeArquivo: "aba.xlsx" }),
    ).toEqual(["nomeArquivo"]);
  });
});
