import { describe, expect, it } from "vitest";
import {
  entradaEdicaoDoMeioSchema,
  entradaMeioPagamentoSchema,
  MAX_NOME_MEIO,
} from "./meio-pagamento.schema";

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

/**
 * A edição do meio (CADCOL-07, AC 10). O mesmo nome e os mesmos dias da
 * criação, com as mesmas mensagens; o tipo não vem, porque não muda (AC 4).
 */
describe("entradaEdicaoDoMeioSchema", () => {
  const ID = "22222222-2222-4222-8222-222222222222";
  const EDICAO = {
    meioPagamentoId: ID,
    nome: "Cartão Roxo",
    ciclo: { diaFechamento: 25, diaVencimento: 5 },
  };

  /** A primeira recusa, com o caminho do campo e a mensagem. */
  function recusa(payload: unknown) {
    const resultado = entradaEdicaoDoMeioSchema.safeParse(payload);
    const issue = resultado.error?.issues[0];
    return { success: resultado.success, campo: issue?.path.join("."), mensagem: issue?.message };
  }

  it("aceita o cartão com os dois dias", () => {
    expect(entradaEdicaoDoMeioSchema.safeParse(EDICAO).data).toEqual(EDICAO);
  });

  it("aceita ciclo: null, o da conta e do rótulo", () => {
    const resultado = entradaEdicaoDoMeioSchema.safeParse({ ...EDICAO, ciclo: null });

    expect(resultado.data).toEqual({ ...EDICAO, ciclo: null });
  });

  it("recusa ciclo ausente: o pedido diz sempre se há dias", () => {
    const { ciclo, ...semCiclo } = EDICAO;

    expect(entradaEdicaoDoMeioSchema.safeParse(semCiclo).success).toBe(false);
  });

  it("recusa id que não é uuid, no campo meioPagamentoId", () => {
    expect(recusa({ ...EDICAO, meioPagamentoId: "meio-1" })).toEqual({
      success: false,
      campo: "meioPagamentoId",
      mensagem: "Meio de pagamento inválido.",
    });
  });

  it("é estrito: recusa chave a mais, como um tipo novo", () => {
    expect(entradaEdicaoDoMeioSchema.safeParse({ ...EDICAO, tipo: "CONTA_CORRENTE" }).success).toBe(
      false,
    );
  });

  it("é estrito também no ciclo", () => {
    const ciclo = { ...EDICAO.ciclo, fechamentoVaiParaFaturaSeguinte: false };

    expect(entradaEdicaoDoMeioSchema.safeParse({ ...EDICAO, ciclo }).success).toBe(false);
  });

  it("normaliza o nome como a criação", () => {
    expect(
      entradaEdicaoDoMeioSchema.safeParse({ ...EDICAO, nome: "  Cartão   Lilás " }).data?.nome,
    ).toBe("Cartão Lilás");
  });

  it.each(["", "   "])("recusa o nome %p com a mensagem da criação", (nome) => {
    expect(recusa({ ...EDICAO, nome })).toEqual({
      success: false,
      campo: "nome",
      mensagem: "Informe o nome do meio de pagamento.",
    });
  });

  it("aceita o nome com 40 caracteres e recusa com 41", () => {
    expect(entradaEdicaoDoMeioSchema.safeParse({ ...EDICAO, nome: "a".repeat(40) }).success).toBe(
      true,
    );
    expect(recusa({ ...EDICAO, nome: "a".repeat(41) })).toEqual({
      success: false,
      campo: "nome",
      mensagem: "O nome pode ter no máximo 40 caracteres.",
    });
  });

  it("aceita os dias 1 e 31", () => {
    const ciclo = { diaFechamento: 1, diaVencimento: 31 };

    expect(entradaEdicaoDoMeioSchema.safeParse({ ...EDICAO, ciclo }).data?.ciclo).toEqual(ciclo);
  });

  it.each([
    ["diaFechamento", 0, "O dia de fechamento vai de 1 a 31."],
    ["diaFechamento", 32, "O dia de fechamento vai de 1 a 31."],
    ["diaVencimento", 0, "O dia de vencimento vai de 1 a 31."],
    ["diaVencimento", 32, "O dia de vencimento vai de 1 a 31."],
  ])("recusa %s %i no campo do dia, com a mensagem da criação", (dia, valor, mensagem) => {
    const ciclo = { ...EDICAO.ciclo, [dia]: valor };

    expect(recusa({ ...EDICAO, ciclo })).toEqual({
      success: false,
      campo: `ciclo.${dia}`,
      mensagem,
    });
  });

  it("as mensagens dos dias são as mesmas da criação", () => {
    const naCriacao = entradaMeioPagamentoSchema.safeParse({ ...CARTAO, diaFechamento: 0 });
    const naEdicao = recusa({ ...EDICAO, ciclo: { diaFechamento: 0, diaVencimento: 5 } });

    expect(naEdicao.mensagem).toBe(naCriacao.error?.issues[0]?.message);
  });
});
