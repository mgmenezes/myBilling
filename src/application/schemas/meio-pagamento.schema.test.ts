import { describe, expect, it } from "vitest";
import { entradaMeioPagamentoSchema, MAX_NOME_MEIO } from "./meio-pagamento.schema";

/**
 * O que este schema protege é a **bicondicional do banco**: cartão tem ciclo,
 * conta e rótulo não têm. Sem ele, o payload errado só morreria na constraint
 * do Postgres — erro genérico, longe do campo que o causou.
 */

const CARTAO = {
  nome: "Cartão Azul",
  tipo: "CARTAO_CREDITO",
  diaFechamento: 10,
  diaVencimento: 20,
};

describe("cartão de crédito exige o ciclo", () => {
  it("aceita um cartão completo", () => {
    expect(entradaMeioPagamentoSchema.safeParse(CARTAO).success).toBe(true);
  });

  it("rejeita cartão sem dia de fechamento", () => {
    const { diaFechamento, ...semFechamento } = CARTAO;
    expect(entradaMeioPagamentoSchema.safeParse(semFechamento).success).toBe(false);
  });

  it("rejeita cartão sem dia de vencimento", () => {
    const { diaVencimento, ...semVencimento } = CARTAO;
    expect(entradaMeioPagamentoSchema.safeParse(semVencimento).success).toBe(false);
  });

  it("aceita os extremos válidos do dia", () => {
    expect(
      entradaMeioPagamentoSchema.safeParse({ ...CARTAO, diaFechamento: 1, diaVencimento: 31 })
        .success,
    ).toBe(true);
  });

  it("rejeita dia 0 e dia 32", () => {
    expect(entradaMeioPagamentoSchema.safeParse({ ...CARTAO, diaFechamento: 0 }).success).toBe(
      false,
    );
    expect(entradaMeioPagamentoSchema.safeParse({ ...CARTAO, diaVencimento: 32 }).success).toBe(
      false,
    );
  });

  it("rejeita dia fracionário", () => {
    expect(entradaMeioPagamentoSchema.safeParse({ ...CARTAO, diaFechamento: 10.5 }).success).toBe(
      false,
    );
  });
});

describe("conta corrente e rótulo não têm ciclo", () => {
  it.each(["CONTA_CORRENTE", "ROTULO"])("aceita %s só com nome e tipo", (tipo) => {
    expect(entradaMeioPagamentoSchema.safeParse({ nome: "Conta", tipo }).success).toBe(true);
  });

  it.each(["CONTA_CORRENTE", "ROTULO"])("descarta dia de ciclo enviado para %s", (tipo) => {
    const resultado = entradaMeioPagamentoSchema.safeParse({
      nome: "Conta",
      tipo,
      diaFechamento: 10,
      diaVencimento: 20,
    });

    // O dado não chega ao repositório: seria violação do CHECK do banco.
    expect(resultado.success).toBe(true);
    expect(resultado.data).not.toHaveProperty("diaFechamento");
    expect(resultado.data).not.toHaveProperty("diaVencimento");
  });
});

describe("nome do meio de pagamento", () => {
  it("normaliza espaço igual ao nome de categoria", () => {
    const resultado = entradaMeioPagamentoSchema.safeParse({
      nome: "  Cartão   Azul  ",
      tipo: "CONTA_CORRENTE",
    });

    expect(resultado.data?.nome).toBe("Cartão Azul");
  });

  it("rejeita nome vazio e nome só de espaço", () => {
    for (const nome of ["", "   "]) {
      const resultado = entradaMeioPagamentoSchema.safeParse({ nome, tipo: "CONTA_CORRENTE" });
      expect(resultado.success).toBe(false);
    }
  });

  it("rejeita um caractere além do limite", () => {
    const resultado = entradaMeioPagamentoSchema.safeParse({
      nome: "a".repeat(MAX_NOME_MEIO + 1),
      tipo: "CONTA_CORRENTE",
    });

    expect(resultado.success).toBe(false);
  });
});

describe("tipo inválido", () => {
  it.each([undefined, "PIX", ""])("rejeita o tipo %s", (tipo) => {
    expect(entradaMeioPagamentoSchema.safeParse({ nome: "X", tipo }).success).toBe(false);
  });
});
