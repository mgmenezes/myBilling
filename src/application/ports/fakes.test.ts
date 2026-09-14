import { describe, expect, it } from "vitest";
import {
  type Cents,
  type Competencia,
  criarCents,
  criarCompetencia,
  gerarParcelas,
  type PlanoParcelamento,
} from "@/domain";
import { criarFakes, ViolacaoDeUnicidade } from "./fakes";
import type { DadosCompra, EntradaSalvarCompra } from "./repositories";

/**
 * Fixtures escolhidas por propriedade matemática, não por realismo (AD-009).
 * R$ 1.000,00 em 3x é o caso do resíduo: 33334 / 33333 / 33333.
 */
function cents(valor: number): Cents {
  const resultado = criarCents(valor);
  if (!resultado.ok) {
    throw new Error(`fixture inválida: ${resultado.error.code}`);
  }
  return resultado.value;
}

function competencia(texto: string): Competencia {
  const resultado = criarCompetencia(texto);
  if (!resultado.ok) {
    throw new Error(`fixture inválida: ${resultado.error.code}`);
  }
  return resultado.value;
}

function planoDeMilReaisEmTres(): PlanoParcelamento {
  const resultado = gerarParcelas({
    modo: "TOTAL",
    valorEntrada: cents(100000),
    qtdParcelas: 3,
    competenciaCompra: competencia("2026-03"),
    parcelaInicial: 1,
    politicaResiduo: "PRIMEIRAS",
  });
  if (!resultado.ok) {
    throw new Error(`fixture inválida: ${resultado.error.code}`);
  }
  return resultado.value;
}

const DADOS: DadosCompra = {
  descricao: "Compra de teste",
  modo: "TOTAL",
  politicaResiduo: "PRIMEIRAS",
  competenciaCompra: competencia("2026-03"),
  qtdParcelas: 3,
  parcelaInicial: 1,
  categoriaId: null,
  usuarioId: "usuario-a",
  meioPagamentoId: "cartao-roxo",
  dataEvento: "2026-03-10",
};

function entrada(idempotencyKey: string, plano = planoDeMilReaisEmTres()): EntradaSalvarCompra {
  return { idempotencyKey, dados: DADOS, plano };
}

describe("FakeCompraRepository (T32, DADO-01)", () => {
  it("grava as três parcelas com os valores do plano", async () => {
    const { compras } = criarFakes();

    const resultado = await compras.salvarComParcelas(entrada("chave-1"));

    if (!resultado.ok) {
      throw new Error(`esperava sucesso, veio ${resultado.error.code}`);
    }
    expect(resultado.value.parcelas.map((p) => p.valor)).toEqual([33334, 33333, 33333]);
  });

  it("rejeita duas parcelas com o mesmo par compra e número", async () => {
    const { compras } = criarFakes();
    const plano = planoDeMilReaisEmTres();
    const primeira = plano.parcelas[0];
    if (!primeira) {
      throw new Error("fixture sem parcelas");
    }
    const planoDuplicado: PlanoParcelamento = {
      ...plano,
      parcelas: [primeira, { ...primeira, valor: cents(66666) }],
    };

    await expect(compras.salvarComParcelas(entrada("chave-1", planoDuplicado))).rejects.toThrow(
      ViolacaoDeUnicidade,
    );
  });

  it("devolve a compra existente quando a chave de idempotência se repete — PARC-05, AC 9", async () => {
    const { compras, estado } = criarFakes();
    const primeiro = await compras.salvarComParcelas(entrada("chave-repetida"));
    if (!primeiro.ok) {
      throw new Error("esperava sucesso no primeiro envio");
    }

    const segundo = await compras.salvarComParcelas(entrada("chave-repetida"));

    if (!segundo.ok) {
      throw new Error("esperava sucesso no reenvio");
    }
    expect(segundo.value.id).toBe(primeiro.value.id);
    expect(segundo.value.parcelas).toHaveLength(3);
    expect(estado.movimentos.size).toBe(3);
    expect(estado.compras.size).toBe(1);
  });

  it("recusa plano cuja soma diverge do total, com CONSERVACAO_VIOLADA — PARC-01, AC 2", async () => {
    const { compras, estado } = criarFakes();
    const plano = planoDeMilReaisEmTres();
    const planoQuebrado: PlanoParcelamento = { ...plano, valorTotal: cents(99999) };

    const resultado = await compras.salvarComParcelas(entrada("chave-1", planoQuebrado));

    if (resultado.ok) {
      throw new Error("esperava erro de conservação");
    }
    expect(resultado.error.code).toBe("CONSERVACAO_VIOLADA");
    expect(estado.movimentos.size).toBe(0);
  });

  it("registra a compra 8/10 com 3 parcelas e nada antes da competência inicial — PARC-07, AC 3", async () => {
    const { compras } = criarFakes();
    const plano = gerarParcelas({
      modo: "VALOR_PARCELA",
      valorEntrada: cents(6000),
      qtdParcelas: 10,
      competenciaCompra: competencia("2025-08"),
      parcelaInicial: 8,
      politicaResiduo: "PRIMEIRAS",
    });
    if (!plano.ok) {
      throw new Error("fixture inválida");
    }

    const resultado = await compras.salvarComParcelas({
      idempotencyKey: "chave-8-10",
      dados: {
        ...DADOS,
        qtdParcelas: 10,
        parcelaInicial: 8,
        competenciaCompra: competencia("2025-08"),
      },
      plano: plano.value,
    });

    if (!resultado.ok) {
      throw new Error(`esperava sucesso, veio ${resultado.error.code}`);
    }
    expect(resultado.value.parcelas.map((p) => p.numeroParcela)).toEqual([8, 9, 10]);
    expect(resultado.value.parcelas.map((p) => p.competencia)).toEqual([
      "2026-03",
      "2026-04",
      "2026-05",
    ]);
    expect(resultado.value.valorAmortizadoAnterior).toBe(42000);
  });
});

describe("FakeMovimentoRepository (T32)", () => {
  it("lista apenas a competência pedida e ignora cancelados — MOV-01", async () => {
    const { compras, movimentos, estado } = criarFakes();
    await compras.salvarComParcelas(entrada("chave-1"));
    const cancelada = estado.movimentos.get("compra-1#1");
    if (!cancelada) {
      throw new Error("parcela 1 não foi gravada");
    }
    estado.movimentos.set(cancelada.id, { ...cancelada, canceladoEm: "2026-03-20T00:00:00Z" });

    const deMarco = await movimentos.listarPorCompetencia(competencia("2026-03"));
    const deAbril = await movimentos.listarPorCompetencia(competencia("2026-04"));

    expect(deMarco).toHaveLength(0);
    expect(deAbril.map((m) => m.numeroParcela)).toEqual([2]);
  });

  it("marca pagamento sem alterar o valor do lançamento — MOV-06, AC 1", async () => {
    const { compras, movimentos } = criarFakes();
    await compras.salvarComParcelas(entrada("chave-1"));

    await movimentos.marcarPagamento("compra-1#1", "2026-03-18");

    const lancamento = await movimentos.buscarPorId("compra-1#1");
    expect(lancamento?.pagoEm).toBe("2026-03-18");
    expect(lancamento?.valor).toBe(33334);
  });
});

describe("FakeCadastroRepository (T32)", () => {
  it("esconde o meio arquivado da listagem mas resolve por id — CART-03, AC 6 e 7", async () => {
    const { cadastros, estado } = criarFakes();
    estado.meiosDePagamento.push(
      { id: "conta", nome: "Conta Corrente", tipo: "CONTA_CORRENTE", arquivadoEm: null },
      {
        id: "cartao-antigo",
        nome: "Cartão Antigo",
        tipo: "CARTAO_CREDITO",
        arquivadoEm: "2026-01-01T00:00:00Z",
        diaFechamento: 25,
        diaVencimento: 5,
        fechamentoVaiParaFaturaSeguinte: true,
      },
    );

    const disponiveis = await cadastros.listarMeiosDePagamentoDisponiveis();

    expect(disponiveis.map((m) => m.id)).toEqual(["conta"]);
    expect((await cadastros.buscarMeioDePagamento("cartao-antigo"))?.nome).toBe("Cartão Antigo");
  });

  it("esconde a categoria arquivada dos formulários mas a resolve em relatório", async () => {
    const { cadastros, estado } = criarFakes();
    estado.categorias.push(
      { id: "ativa", nome: "Categoria Um", arquivadaEm: null },
      { id: "arquivada", nome: "Categoria Dois", arquivadaEm: "2026-01-01T00:00:00Z" },
    );

    const disponiveis = await cadastros.listarCategoriasDisponiveis();

    expect(disponiveis.map((c) => c.id)).toEqual(["ativa"]);
    expect((await cadastros.buscarCategoria("arquivada"))?.nome).toBe("Categoria Dois");
  });
});

describe("fronteira dos fakes (DADO-01)", () => {
  it("não depende de nenhum módulo de infraestrutura", async () => {
    const { readFileSync } = await import("node:fs");
    const fonte = readFileSync("src/application/ports/fakes.ts", "utf-8");
    const imports = [...fonte.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);

    expect(imports).toEqual(["@/domain", "./repositories"]);
  });
});
