import { beforeEach, describe, expect, it } from "vitest";
import { criarFakes, type Fakes } from "@/application/ports/fakes";
import type { EntradaCompraValidada } from "@/application/schemas/compra.schema";
import { criarCompraParcelada } from "./handler";

/**
 * Testes derivados de PARC-01 (AC 1 e AC 2), PARC-06 (AC 1, AC 2, AC 3 e AC 5),
 * PARC-05 (AC 6, AC 7 e AC 9), CART-03 (AC 7) e COMP-01 (AC 1).
 *
 * Tudo roda **sem banco**, com os fakes em memória: o caso de uso é orquestração
 * e a aritmética é do domínio. Os valores são escolhidos por propriedade
 * matemática — 100000 em 3x existe por causa do centavo residual (AD-009).
 */

const CARTAO = "22222222-2222-4222-8222-222222222222";
const CARTAO_ARQUIVADO = "33333333-3333-4333-8333-333333333333";
const USUARIO = "11111111-1111-4111-8111-111111111111";

let fakes: Fakes;

const BASE: EntradaCompraValidada = {
  idempotencyKey: "6f1c1b3e-3a2d-4c5b-8e7f-9a0b1c2d3e4f",
  descricao: "Compra parcelada A",
  modo: "TOTAL",
  valorCentavos: 100000,
  qtdParcelas: 3,
  parcelaInicial: 1,
  competenciaInicial: "2026-03",
  politicaResiduo: "PRIMEIRAS",
  categoriaId: null,
  usuarioId: USUARIO,
  meioPagamentoId: CARTAO,
  dataEvento: "2026-03-04",
};

function entrada(mudancas: Partial<EntradaCompraValidada> = {}): EntradaCompraValidada {
  return { ...BASE, ...mudancas };
}

beforeEach(() => {
  fakes = criarFakes();
  fakes.estado.meiosDePagamento.push(
    {
      id: CARTAO,
      nome: "Cartão Roxo",
      tipo: "CARTAO_CREDITO",
      arquivadoEm: null,
      diaFechamento: 25,
      diaVencimento: 5,
      fechamentoVaiParaFaturaSeguinte: true,
    },
    {
      id: CARTAO_ARQUIVADO,
      nome: "Cartão Encerrado",
      tipo: "CARTAO_CREDITO",
      arquivadoEm: "2026-01-10T12:00:00.000Z",
      diaFechamento: 15,
      diaVencimento: 25,
      fechamentoVaiParaFaturaSeguinte: true,
    },
  );
});

describe("criarCompraParcelada", () => {
  it("R$ 1.000,00 em 3x em 2026-03 grava 33334, 33333 e 33333 em março, abril e maio (PARC-01, AC 1)", async () => {
    const resultado = await criarCompraParcelada(fakes, entrada());

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) {
      return;
    }
    expect(resultado.value.parcelas).toEqual([
      { numero: 1, valor: 33334, competencia: "2026-03" },
      { numero: 2, valor: 33333, competencia: "2026-04" },
      { numero: 3, valor: 33333, competencia: "2026-05" },
    ]);
    expect(resultado.value.valorTotal).toBe(100000);
  });

  it("a soma das parcelas gravadas mais o amortizado anterior é exatamente o total (PARC-01, AC 2)", async () => {
    const resultado = await criarCompraParcelada(fakes, entrada());

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) {
      return;
    }
    const soma = resultado.value.parcelas.reduce((total, p) => total + p.valor, 0);
    expect(soma + resultado.value.valorAmortizadoAnterior).toBe(100000);
  });

  it("compra 8/10 grava 3 parcelas numeradas 8, 9 e 10 (PARC-06, AC 1)", async () => {
    const resultado = await criarCompraParcelada(
      fakes,
      entrada({ modo: "VALOR_PARCELA", valorCentavos: 6000, qtdParcelas: 10, parcelaInicial: 8 }),
    );

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) {
      return;
    }
    expect(resultado.value.parcelas).toEqual([
      { numero: 8, valor: 6000, competencia: "2026-03" },
      { numero: 9, valor: 6000, competencia: "2026-04" },
      { numero: 10, valor: 6000, competencia: "2026-05" },
    ]);
  });

  it("compra 8/10 registra as sete parcelas anteriores como valor amortizado (PARC-06, AC 2)", async () => {
    const resultado = await criarCompraParcelada(
      fakes,
      entrada({ modo: "VALOR_PARCELA", valorCentavos: 6000, qtdParcelas: 10, parcelaInicial: 8 }),
    );

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) {
      return;
    }
    expect(resultado.value.valorAmortizadoAnterior).toBe(42000);
    expect(resultado.value.valorTotal).toBe(60000);
  });

  it("compra 8/10 não cria nenhum lançamento em competência anterior à inicial (PARC-06, AC 3)", async () => {
    await criarCompraParcelada(
      fakes,
      entrada({ modo: "VALOR_PARCELA", valorCentavos: 6000, qtdParcelas: 10, parcelaInicial: 8 }),
    );

    const competencias = [...fakes.estado.movimentos.values()].map((m) => m.competencia);
    expect(competencias).toHaveLength(3);
    expect(competencias.filter((c) => c < "2026-03")).toEqual([]);
  });

  it("compra na última parcela, 10 de 10, grava exatamente 1 parcela (PARC-06, AC 5)", async () => {
    const resultado = await criarCompraParcelada(
      fakes,
      entrada({ modo: "VALOR_PARCELA", valorCentavos: 6000, qtdParcelas: 10, parcelaInicial: 10 }),
    );

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) {
      return;
    }
    expect(resultado.value.parcelas).toEqual([{ numero: 10, valor: 6000, competencia: "2026-03" }]);
  });

  it("compra em 2026-12 em 3x chega a 2027-02 (COMP-01, AC 1)", async () => {
    const resultado = await criarCompraParcelada(
      fakes,
      entrada({ competenciaInicial: "2026-12", valorCentavos: 30000 }),
    );

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) {
      return;
    }
    expect(resultado.value.parcelas.map((p) => p.competencia)).toEqual([
      "2026-12",
      "2027-01",
      "2027-02",
    ]);
  });

  it("modo valor da parcela calcula o total como parcela x quantidade, sem resto (PARC-04, AC 4)", async () => {
    const resultado = await criarCompraParcelada(
      fakes,
      entrada({ modo: "VALOR_PARCELA", valorCentavos: 33333, qtdParcelas: 3 }),
    );

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) {
      return;
    }
    expect(resultado.value.valorTotal).toBe(99999);
    expect(resultado.value.parcelas.map((p) => p.valor)).toEqual([33333, 33333, 33333]);
  });

  it("rejeita compra em cartão arquivado com MEIO_PAGAMENTO_ARQUIVADO (CART-03, AC 7)", async () => {
    const resultado = await criarCompraParcelada(
      fakes,
      entrada({ meioPagamentoId: CARTAO_ARQUIVADO }),
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) {
      return;
    }
    expect(resultado.error.code).toBe("MEIO_PAGAMENTO_ARQUIVADO");
    expect(fakes.estado.movimentos.size).toBe(0);
  });

  it("rejeita meio de pagamento inexistente sem gravar nada", async () => {
    const resultado = await criarCompraParcelada(
      fakes,
      entrada({ meioPagamentoId: "44444444-4444-4444-8444-444444444444" }),
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) {
      return;
    }
    expect(resultado.error.code).toBe("MEIO_PAGAMENTO_NAO_ENCONTRADO");
    expect(fakes.estado.movimentos.size).toBe(0);
  });

  it("chave de idempotência repetida devolve a compra existente sem duplicar parcelas (PARC-05, AC 9)", async () => {
    const primeira = await criarCompraParcelada(fakes, entrada());
    const segunda = await criarCompraParcelada(fakes, entrada({ descricao: "Outra descrição" }));

    expect(primeira.ok).toBe(true);
    expect(segunda.ok).toBe(true);
    if (!primeira.ok || !segunda.ok) {
      return;
    }
    expect(segunda.value.compraId).toBe(primeira.value.compraId);
    expect(segunda.value.parcelas).toHaveLength(3);
    expect(segunda.value.jaExistia).toBe(true);
    expect(primeira.value.jaExistia).toBe(false);
    expect(fakes.estado.movimentos.size).toBe(3);
    expect(fakes.estado.compras.size).toBe(1);
  });

  it("rejeita quantidade de parcelas fora de 1 a 120 com QTD_PARCELAS_INVALIDA (PARC-05, AC 6)", async () => {
    const zero = await criarCompraParcelada(fakes, entrada({ qtdParcelas: 0 }));
    const acima = await criarCompraParcelada(
      fakes,
      entrada({ qtdParcelas: 121, idempotencyKey: "7f1c1b3e-3a2d-4c5b-8e7f-9a0b1c2d3e4f" }),
    );

    expect(zero.ok).toBe(false);
    expect(acima.ok).toBe(false);
    if (zero.ok || acima.ok) {
      return;
    }
    expect(zero.error.code).toBe("QTD_PARCELAS_INVALIDA");
    expect(acima.error.code).toBe("QTD_PARCELAS_INVALIDA");
    expect(fakes.estado.movimentos.size).toBe(0);
  });

  it("rejeita valor menor que um centavo com VALOR_NAO_POSITIVO (PARC-05, AC 7)", async () => {
    const resultado = await criarCompraParcelada(fakes, entrada({ valorCentavos: 0 }));

    expect(resultado.ok).toBe(false);
    if (resultado.ok) {
      return;
    }
    expect(resultado.error.code).toBe("VALOR_NAO_POSITIVO");
  });

  it("rejeita parcela inicial maior que a quantidade com PARCELA_INICIAL_INVALIDA (PARC-06, AC 6)", async () => {
    const resultado = await criarCompraParcelada(
      fakes,
      entrada({ qtdParcelas: 3, parcelaInicial: 4 }),
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) {
      return;
    }
    expect(resultado.error.code).toBe("PARCELA_INICIAL_INVALIDA");
    expect(fakes.estado.movimentos.size).toBe(0);
  });

  it("rejeita mais parcelas que centavos com PARCELA_INFERIOR_A_UM_CENTAVO (PARC-01, AC 5)", async () => {
    const resultado = await criarCompraParcelada(
      fakes,
      entrada({ valorCentavos: 2, qtdParcelas: 3 }),
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) {
      return;
    }
    expect(resultado.error.code).toBe("PARCELA_INFERIOR_A_UM_CENTAVO");
    expect(fakes.estado.movimentos.size).toBe(0);
  });

  it("rejeita competência malformada com COMPETENCIA_INVALIDA", async () => {
    const resultado = await criarCompraParcelada(fakes, entrada({ competenciaInicial: "2026-13" }));

    expect(resultado.ok).toBe(false);
    if (resultado.ok) {
      return;
    }
    expect(resultado.error.code).toBe("COMPETENCIA_INVALIDA");
  });
});
