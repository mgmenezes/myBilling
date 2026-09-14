import { describe, expect, it } from "vitest";
import {
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
