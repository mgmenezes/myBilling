import { describe, expect, it } from "vitest";
import { isOk } from "../shared/result";
import type { Cartao, MeioSemFatura } from "../tipos";
import { resolverCicloFatura } from "./ciclo-fatura";
import { geraFatura, podeReceberNovaCompra } from "./regras-cartao";

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

describe("geraFatura (CART-02, AC 5)", () => {
  it("conta corrente não gera fatura e não expõe dia de fechamento", () => {
    const conta: MeioSemFatura = {
      id: "meio-a",
      nome: "Conta A",
      tipo: "CONTA_CORRENTE",
      arquivadoEm: null,
    };

    expect(geraFatura(conta)).toBe(false);
    // @ts-expect-error meio sem fatura não tem dia de fechamento (CART-02, AC 5).
    expect(conta.diaFechamento).toBeUndefined();
  });

  it("rótulo não gera fatura e não exige ciclo", () => {
    const rotulo: MeioSemFatura = {
      id: "meio-b",
      nome: "Rótulo B",
      tipo: "ROTULO",
      arquivadoEm: null,
    };

    expect(geraFatura(rotulo)).toBe(false);
    // @ts-expect-error rótulo não tem dia de vencimento (CART-02, AC 5).
    expect(rotulo.diaVencimento).toBeUndefined();
  });

  it("cartão de crédito gera fatura e exige fechamento e vencimento", () => {
    expect(geraFatura(cartao())).toBe(true);

    // @ts-expect-error cartão de crédito sem diaFechamento e diaVencimento não compila.
    const semCiclo: Cartao = {
      id: "cartao-b",
      nome: "Cartão B",
      tipo: "CARTAO_CREDITO",
      arquivadoEm: null,
      fechamentoVaiParaFaturaSeguinte: true,
    };

    expect(semCiclo.tipo).toBe("CARTAO_CREDITO");
  });
});

describe("podeReceberNovaCompra (CART-03)", () => {
  it("aceita nova compra em meio ativo", () => {
    expect(podeReceberNovaCompra(cartao())).toEqual({ ok: true, value: undefined });
  });

  it("rejeita nova compra em meio arquivado com MEIO_PAGAMENTO_ARQUIVADO (AC 7)", () => {
    const resultado = podeReceberNovaCompra(cartao({ arquivadoEm: "2026-02-01" }));

    expect(resultado.ok).toBe(false);
    expect(resultado.ok === false && resultado.error.code).toBe("MEIO_PAGAMENTO_ARQUIVADO");
  });

  it("mantém as parcelas pendentes de um meio arquivado contabilizadas (AC 6)", () => {
    const arquivado = cartao({ arquivadoEm: "2026-02-01" });

    // Arquivar fecha a porta de entrada, e só ela: o cartão segue gerando
    // fatura para as parcelas que já existem.
    expect(podeReceberNovaCompra(arquivado).ok).toBe(false);
    expect(geraFatura(arquivado)).toBe(true);

    const ciclo = resolverCicloFatura(arquivado, "2026-03-20");

    expect(isOk(ciclo)).toBe(true);
    expect(isOk(ciclo) && ciclo.value.competenciaFatura).toBe("2026-04");
  });
});
