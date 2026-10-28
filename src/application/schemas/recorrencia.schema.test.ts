import { describe, expect, it } from "vitest";
import {
  entradaEdicaoRecorrenciaSchema,
  entradaEncerramentoSchema,
  entradaRecorrenciaSchema,
  entradaVigenciaSchema,
  MAX_NOME_RECORRENCIA,
} from "./recorrencia.schema";

/**
 * O schema é a mesma validação nos dois lados da rede (AUTH-02, AC 4). O que
 * ele prende é formato; a regra que compara dois campos entre si — fim antes do
 * início — é do caso de uso, porque a mensagem precisa chegar endereçada.
 */

const UUID = "11111111-1111-4111-8111-111111111111";

function base(overrides: Record<string, unknown> = {}) {
  return {
    descricao: "Conta de luz",
    natureza: "DESPESA",
    valorCentavos: 18000,
    diaVencimento: 20,
    competenciaInicio: "2026-03",
    competenciaFim: null,
    categoriaId: null,
    usuarioId: UUID,
    meioPagamentoId: UUID,
    ...overrides,
  };
}

describe("entrada de recorrência", () => {
  it("aceita uma despesa completa", () => {
    expect(entradaRecorrenciaSchema.safeParse(base()).success).toBe(true);
  });

  it("aceita receita", () => {
    expect(entradaRecorrenciaSchema.safeParse(base({ natureza: "RECEITA" })).success).toBe(true);
  });

  it("recusa natureza que não é despesa nem receita", () => {
    expect(entradaRecorrenciaSchema.safeParse(base({ natureza: "INVESTIMENTO" })).success).toBe(
      false,
    );
  });

  it("normaliza a descrição igual aos outros cadastros", () => {
    const resultado = entradaRecorrenciaSchema.safeParse(base({ descricao: "  Conta  de   luz " }));

    expect(resultado.data?.descricao).toBe("Conta de luz");
  });

  it("recusa descrição vazia e só de espaço", () => {
    for (const descricao of ["", "   "]) {
      expect(entradaRecorrenciaSchema.safeParse(base({ descricao })).success).toBe(false);
    }
  });

  it("recusa descrição acima do limite", () => {
    const longa = "a".repeat(MAX_NOME_RECORRENCIA + 1);
    expect(entradaRecorrenciaSchema.safeParse(base({ descricao: longa })).success).toBe(false);
  });

  it("aceita os extremos do dia de vencimento", () => {
    expect(entradaRecorrenciaSchema.safeParse(base({ diaVencimento: 1 })).success).toBe(true);
    expect(entradaRecorrenciaSchema.safeParse(base({ diaVencimento: 31 })).success).toBe(true);
  });

  it("recusa dia 0, dia 32 e dia fracionário", () => {
    for (const diaVencimento of [0, 32, 10.5]) {
      expect(entradaRecorrenciaSchema.safeParse(base({ diaVencimento })).success).toBe(false);
    }
  });

  it("recusa valor zero e negativo", () => {
    for (const valorCentavos of [0, -1]) {
      expect(entradaRecorrenciaSchema.safeParse(base({ valorCentavos })).success).toBe(false);
    }
  });

  it("recusa competência fora de AAAA-MM", () => {
    for (const competenciaInicio of ["2026-3", "2026-13", "03/2026", ""]) {
      expect(entradaRecorrenciaSchema.safeParse(base({ competenciaInicio })).success).toBe(false);
    }
  });

  it("fim nulo é aceito e significa sem fim", () => {
    expect(entradaRecorrenciaSchema.safeParse(base({ competenciaFim: null })).success).toBe(true);
  });

  it("fim ausente NÃO é aceito: a ausência precisa ser explícita", () => {
    const { competenciaFim, ...semFim } = base();
    expect(entradaRecorrenciaSchema.safeParse(semFim).success).toBe(false);
  });

  it("recusa id que não é uuid", () => {
    expect(entradaRecorrenciaSchema.safeParse(base({ usuarioId: "u1" })).success).toBe(false);
  });
});

describe("entrada de vigência", () => {
  it("aceita o caso completo", () => {
    const entrada = { recorrenciaId: UUID, vigenteDesde: "2026-05", valorCentavos: 24000 };
    expect(entradaVigenciaSchema.safeParse(entrada).success).toBe(true);
  });

  it("recusa valor não positivo", () => {
    const entrada = { recorrenciaId: UUID, vigenteDesde: "2026-05", valorCentavos: 0 };
    expect(entradaVigenciaSchema.safeParse(entrada).success).toBe(false);
  });
});

describe("entrada de encerramento", () => {
  it("aceita o caso completo", () => {
    expect(
      entradaEncerramentoSchema.safeParse({ recorrenciaId: UUID, aPartirDe: "2026-05" }).success,
    ).toBe(true);
  });

  it("recusa competência malformada", () => {
    expect(
      entradaEncerramentoSchema.safeParse({ recorrenciaId: UUID, aPartirDe: "maio" }).success,
    ).toBe(false);
  });
});

/**
 * A edição usa os mesmos limites do cadastro (EDF-05 AC 3), mas é estrita:
 * natureza e início não fazem parte do payload, e um formulário adulterado que
 * os mande é recusado na validação, antes de qualquer banco (EDF-05 AC 2).
 */
describe("entrada de edição de recorrência (EDF-05)", () => {
  function edicao(overrides: Record<string, unknown> = {}) {
    return {
      recorrenciaId: UUID,
      descricao: "Conta fixa A",
      valorCentavos: 10000,
      diaVencimento: 10,
      competenciaFim: null,
      categoriaId: null,
      usuarioId: UUID,
      meioPagamentoId: UUID,
      vigenteDesde: "2026-11",
      competenciaExibida: "2026-11",
      ...overrides,
    };
  }

  it("aceita a edição completa", () => {
    expect(entradaEdicaoRecorrenciaSchema.safeParse(edicao()).success).toBe(true);
  });

  it("normaliza a descrição como o cadastro", () => {
    const resultado = entradaEdicaoRecorrenciaSchema.safeParse(
      edicao({ descricao: "  Conta  fixa   A " }),
    );

    expect(resultado.data?.descricao).toBe("Conta fixa A");
  });

  it.each([
    ["descrição vazia", { descricao: "" }],
    ["descrição só de espaço", { descricao: "   " }],
    ["descrição acima do limite", { descricao: "a".repeat(MAX_NOME_RECORRENCIA + 1) }],
    ["valor zero", { valorCentavos: 0 }],
    ["valor negativo", { valorCentavos: -1 }],
    ["dia 0", { diaVencimento: 0 }],
    ["dia 32", { diaVencimento: 32 }],
    ["dia fracionário", { diaVencimento: 10.5 }],
    ["meio que não é uuid", { meioPagamentoId: "m1" }],
    ["categoria que não é uuid", { categoriaId: "c1" }],
    ["fixo que não é uuid", { recorrenciaId: "r1" }],
  ])("recusa %s, como o cadastro (EDF-05 AC 3)", (_, mudanca) => {
    expect(entradaEdicaoRecorrenciaSchema.safeParse(edicao(mudanca)).success).toBe(false);
  });

  it("aceita os extremos do dia de vencimento e a descrição no limite", () => {
    for (const mudanca of [
      { diaVencimento: 1 },
      { diaVencimento: 31 },
      { descricao: "a".repeat(MAX_NOME_RECORRENCIA) },
    ]) {
      expect(entradaEdicaoRecorrenciaSchema.safeParse(edicao(mudanca)).success).toBe(true);
    }
  });

  it.each([
    ["natureza", { natureza: "RECEITA" }],
    ["início", { competenciaInicio: "2026-01" }],
  ])("recusa payload com %s, que não muda na edição (Review Focus 5)", (_, extra) => {
    const resultado = entradaEdicaoRecorrenciaSchema.safeParse(edicao(extra));

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues).toEqual([
      expect.objectContaining({
        code: "unrecognized_keys",
        message:
          "Natureza e início não mudam na edição. Para mudar, encerre este e cadastre de novo.",
      }),
    ]);
  });

  it("fim nulo é aceito e significa sem fim; um mês também", () => {
    expect(entradaEdicaoRecorrenciaSchema.safeParse(edicao({ competenciaFim: null })).success).toBe(
      true,
    );
    expect(
      entradaEdicaoRecorrenciaSchema.safeParse(edicao({ competenciaFim: "2027-01" })).success,
    ).toBe(true);
  });

  it.each(["competenciaFim", "vigenteDesde", "competenciaExibida"])(
    "%s ausente NÃO é aceito",
    (campo) => {
      const { [campo as keyof ReturnType<typeof edicao>]: _, ...semCampo } = edicao();
      expect(entradaEdicaoRecorrenciaSchema.safeParse(semCampo).success).toBe(false);
    },
  );

  it.each(["competenciaFim", "vigenteDesde", "competenciaExibida"])(
    "%s fora de AAAA-MM é recusado",
    (campo) => {
      expect(entradaEdicaoRecorrenciaSchema.safeParse(edicao({ [campo]: "2026-13" })).success).toBe(
        false,
      );
    },
  );
});
