import { describe, expect, it } from "vitest";
import { dataParaCompetencia } from "../shared/competencia";
import { isOk } from "../shared/result";
import type { Cartao } from "../tipos";
import { type CicloFatura, diaEfetivo, resolverCicloFatura, ultimoDiaDoMes } from "./ciclo-fatura";

/** Cartão genérico, sem nome nem valor real (AD-009). */
function cartao(sobrescrever: Partial<Cartao> = {}): Cartao {
  return {
    id: "cartao-a",
    nome: "Cartão A",
    tipo: "CARTAO_CREDITO",
    arquivadoEm: null,
    diaFechamento: 25,
    diaVencimento: 5,
    fechamentoVaiParaFaturaSeguinte: true,
    ...sobrescrever,
  };
}

function cicloOk(dataCompra: string, sobrescrever: Partial<Cartao> = {}): CicloFatura {
  const resultado = resolverCicloFatura(cartao(sobrescrever), dataCompra);
  if (!isOk(resultado)) {
    throw new Error(`esperava ciclo válido para ${dataCompra}`);
  }
  return resultado.value;
}

/**
 * Oráculo independente da implementação: `Date` é proibido em `src/domain`
 * (AD-002), mas usá-lo AQUI, no teste, garante que a verificação de
 * contiguidade não compartilhe um eventual bug com a aritmética testada.
 */
function diaSeguinteOracle(dataISO: string): string {
  const ano = Number.parseInt(dataISO.slice(0, 4), 10);
  const mes = Number.parseInt(dataISO.slice(5, 7), 10);
  const dia = Number.parseInt(dataISO.slice(8, 10), 10);
  return new Date(Date.UTC(ano, mes - 1, dia) + 86_400_000).toISOString().slice(0, 10);
}

describe("resolverCicloFatura — o fechamento move a fatura, nunca a competência", () => {
  const FUSO = "America/Sao_Paulo";

  it.each([
    ["2026-03-20", "2026-04", "2026-04-05"],
    ["2026-03-25", "2026-05", "2026-05-05"],
    ["2026-03-26", "2026-05", "2026-05-05"],
  ])(
    "compra em %s com fechamento dia 25 cai na fatura %s e mantém a competência 2026-03",
    (dataCompra, competenciaFatura, dataVencimento) => {
      const ciclo = cicloOk(dataCompra);

      expect(ciclo.competenciaFatura).toBe(competenciaFatura);
      expect(ciclo.dataVencimento).toBe(dataVencimento);

      const competenciaLancamento = dataParaCompetencia(`${dataCompra}T12:00:00Z`, FUSO);

      expect(competenciaLancamento).toEqual({ ok: true, value: "2026-03" });
      expect(ciclo.competenciaFatura).not.toBe("2026-03");
    },
  );

  it("compra no dia do fechamento entra na fatura do próprio ciclo quando o cartão é configurado assim", () => {
    const ciclo = cicloOk("2026-03-25", { fechamentoVaiParaFaturaSeguinte: false });

    expect(ciclo.competenciaFatura).toBe("2026-04");
    expect(ciclo.cicloFim).toBe("2026-03-25");
  });
});

describe("diaEfetivo e último dia do mês (CART-03, AC 3)", () => {
  it("fechamento dia 31 usa o dia 28 em fevereiro e o dia 29 em ano bissexto", () => {
    expect(cicloOk("2026-02-10", { diaFechamento: 31 }).cicloFim).toBe("2026-02-28");
    expect(cicloOk("2028-02-10", { diaFechamento: 31 }).cicloFim).toBe("2028-02-29");
  });

  it("vencimento dia 31 usa o dia 30 em abril", () => {
    expect(cicloOk("2026-03-20", { diaVencimento: 31 }).dataVencimento).toBe("2026-04-30");
  });

  it("aplica min(dia, último dia do mês)", () => {
    expect(diaEfetivo(31, 2026, 2)).toBe(28);
    expect(diaEfetivo(31, 2028, 2)).toBe(29);
    expect(diaEfetivo(31, 2026, 4)).toBe(30);
    expect(diaEfetivo(10, 2026, 1)).toBe(10);
  });

  it("aplica a regra de século do ano bissexto", () => {
    expect(ultimoDiaDoMes(2100, 2)).toBe(28);
    expect(ultimoDiaDoMes(2000, 2)).toBe(29);
  });
});

describe("contiguidade de 24 ciclos consecutivos (CART-03, AC 4)", () => {
  it.each([25, 31])(
    "com fechamento dia %p, o início de cada ciclo é o dia seguinte ao fim do anterior",
    (diaFechamento) => {
      const ciclos: CicloFatura[] = [];
      for (let deslocamento = 0; deslocamento < 24; deslocamento += 1) {
        const ano = 2026 + Math.floor(deslocamento / 12);
        const mes = String((deslocamento % 12) + 1).padStart(2, "0");
        ciclos.push(cicloOk(`${ano}-${mes}-01`, { diaFechamento }));
      }

      expect(ciclos).toHaveLength(24);
      for (let indice = 1; indice < ciclos.length; indice += 1) {
        const anterior = ciclos[indice - 1] as CicloFatura;
        const atual = ciclos[indice] as CicloFatura;

        expect(atual.cicloInicio).toBe(diaSeguinteOracle(anterior.cicloFim));
        expect(atual.cicloFim > atual.cicloInicio).toBe(true);
      }
    },
  );
});

describe("resolverCicloFatura — entrada inválida", () => {
  it.each(["2026-03", "20/03/2026", "2026-13-01", "abc"])(
    "rejeita a data malformada %p com COMPETENCIA_INVALIDA",
    (dataCompra) => {
      const resultado = resolverCicloFatura(cartao(), dataCompra);

      expect(resultado.ok).toBe(false);
      expect(resultado.ok === false && resultado.error.code).toBe("COMPETENCIA_INVALIDA");
    },
  );
});
