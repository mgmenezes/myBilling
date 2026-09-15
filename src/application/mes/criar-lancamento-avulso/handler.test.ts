import { beforeEach, describe, expect, it } from "vitest";
import { criarFakes, type Fakes } from "@/application/ports/fakes";
import type { EntradaLancamentoAvulsoValidada } from "@/application/schemas/lancamento-avulso.schema";
import { criarLancamentoAvulso, jaPagoPorPadrao } from "./handler";

/** Testes derivados de AVUL-01 (AC 1), AVUL-02 (AC 1, 4, 5 e 6) e dos edge cases. */

const CARTAO = "22222222-2222-4222-8222-222222222222";
const CONTA = "33333333-3333-4333-8333-333333333333";
const CARTAO_ARQUIVADO = "44444444-4444-4444-8444-444444444444";
const USUARIO = "11111111-1111-4111-8111-111111111111";

let fakes: Fakes;

function entrada(
  sobrescrever: Partial<EntradaLancamentoAvulsoValidada> = {},
): EntradaLancamentoAvulsoValidada {
  return {
    descricao: "Almoço",
    natureza: "DESPESA",
    valorCentavos: 3250,
    competencia: "2026-03",
    dataEvento: "2026-03-10",
    categoriaId: null,
    usuarioId: USUARIO,
    meioPagamentoId: CONTA,
    jaPago: false,
    ...sobrescrever,
  };
}

beforeEach(() => {
  fakes = criarFakes();
  fakes.estado.meiosDePagamento.push(
    { id: CONTA, nome: "Conta Corrente", tipo: "CONTA_CORRENTE", arquivadoEm: null },
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
      nome: "Cartão Antigo",
      tipo: "CARTAO_CREDITO",
      arquivadoEm: "2026-01-01T00:00:00Z",
      diaFechamento: 25,
      diaVencimento: 5,
      fechamentoVaiParaFaturaSeguinte: true,
    },
  );
});

describe("criarLancamentoAvulso — grava o lançamento (AVUL-01, AC 1)", () => {
  it("grava com origem AVULSO e nenhum vínculo", async () => {
    const resultado = await criarLancamentoAvulso(fakes, entrada());

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) {
      throw new Error("esperava sucesso");
    }
    expect(resultado.value.origem).toBe("AVULSO");
    expect(resultado.value.compraId).toBeNull();
    expect(resultado.value.recorrenciaId).toBeNull();
    expect(resultado.value.valor).toBe(3250);
    expect(resultado.value.descricao).toBe("Almoço");
  });

  it("grava receita como receita — AVUL-02, AC 1", async () => {
    const resultado = await criarLancamentoAvulso(
      fakes,
      entrada({ natureza: "RECEITA", descricao: "Pix recebido", valorCentavos: 5000 }),
    );

    if (!resultado.ok) {
      throw new Error("esperava sucesso");
    }
    expect(resultado.value.natureza).toBe("RECEITA");
  });

  it("aceita categoria nula", async () => {
    const resultado = await criarLancamentoAvulso(fakes, entrada({ categoriaId: null }));

    if (!resultado.ok) {
      throw new Error("esperava sucesso");
    }
    expect(resultado.value.categoriaId).toBeNull();
  });
});

describe("criarLancamentoAvulso — a marca de pago vem do meio (AVUL-02, AC 4 a 6)", () => {
  it("meio sem fatura marcado como já pago grava pagoEm igual à data do evento", async () => {
    const resultado = await criarLancamentoAvulso(
      fakes,
      entrada({ meioPagamentoId: CONTA, jaPago: true, dataEvento: "2026-03-14" }),
    );

    if (!resultado.ok) {
      throw new Error("esperava sucesso");
    }
    expect(resultado.value.pagoEm).toBe("2026-03-14");
  });

  it("não marcado grava pagoEm nulo, qualquer que seja o meio", async () => {
    const naConta = await criarLancamentoAvulso(fakes, entrada({ jaPago: false }));
    const noCartao = await criarLancamentoAvulso(
      fakes,
      entrada({ meioPagamentoId: CARTAO, jaPago: false }),
    );

    if (!naConta.ok || !noCartao.ok) {
      throw new Error("esperava sucesso");
    }
    expect(naConta.value.pagoEm).toBeNull();
    expect(noCartao.value.pagoEm).toBeNull();
  });

  it("a escolha explícita sobrepõe o padrão nos dois sentidos — AC 6", async () => {
    /* Cartão marcado como já pago: alguém pagou na hora com o débito do cartão. */
    const cartaoPago = await criarLancamentoAvulso(
      fakes,
      entrada({ meioPagamentoId: CARTAO, jaPago: true, dataEvento: "2026-03-14" }),
    );
    /* Conta não marcada: o boleto foi emitido mas ainda não foi pago. */
    const contaPrevista = await criarLancamentoAvulso(
      fakes,
      entrada({ meioPagamentoId: CONTA, jaPago: false }),
    );

    if (!cartaoPago.ok || !contaPrevista.ok) {
      throw new Error("esperava sucesso");
    }
    expect(cartaoPago.value.pagoEm).toBe("2026-03-14");
    expect(contaPrevista.value.pagoEm).toBeNull();
  });
});

describe("jaPagoPorPadrao — o padrão que o formulário propõe (AVUL-02, AC 4 e 5)", () => {
  it("propõe marcado para meio que não gera fatura", () => {
    expect(jaPagoPorPadrao(false)).toBe(true);
  });

  it("propõe desmarcado para meio que gera fatura", () => {
    expect(jaPagoPorPadrao(true)).toBe(false);
  });
});

describe("criarLancamentoAvulso — recusas", () => {
  it("recusa meio de pagamento inexistente, sem gravar", async () => {
    const resultado = await criarLancamentoAvulso(
      fakes,
      entrada({ meioPagamentoId: "55555555-5555-4555-8555-555555555555" }),
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) {
      throw new Error("esperava recusa");
    }
    expect(resultado.error.code).toBe("MEIO_PAGAMENTO_NAO_ENCONTRADO");
    expect(fakes.estado.movimentos.size).toBe(0);
  });

  it("recusa meio arquivado entre a abertura do formulário e o envio, sem gravar", async () => {
    const resultado = await criarLancamentoAvulso(
      fakes,
      entrada({ meioPagamentoId: CARTAO_ARQUIVADO }),
    );

    if (resultado.ok) {
      throw new Error("esperava recusa");
    }
    expect(resultado.error.code).toBe("MEIO_PAGAMENTO_ARQUIVADO");
    expect(fakes.estado.movimentos.size).toBe(0);
  });

  it("recusa valor não positivo que escapou do schema, sem gravar", async () => {
    const resultado = await criarLancamentoAvulso(fakes, entrada({ valorCentavos: 0 }));

    if (resultado.ok) {
      throw new Error("esperava recusa");
    }
    expect(resultado.error.code).toBe("VALOR_NAO_POSITIVO");
    expect(fakes.estado.movimentos.size).toBe(0);
  });

  it("recusa competência inválida que escapou do schema, sem gravar", async () => {
    const resultado = await criarLancamentoAvulso(fakes, entrada({ competencia: "2026-13" }));

    if (resultado.ok) {
      throw new Error("esperava recusa");
    }
    expect(resultado.error.code).toBe("COMPETENCIA_INVALIDA");
    expect(fakes.estado.movimentos.size).toBe(0);
  });
});
