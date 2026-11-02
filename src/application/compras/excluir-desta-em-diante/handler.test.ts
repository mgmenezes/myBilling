import { beforeEach, describe, expect, it, vi } from "vitest";
import { criarCompraParcelada } from "@/application/compras/criar-compra-parcelada/handler";
import { criarFakes, type Fakes } from "@/application/ports/fakes";
import type { Cents, Competencia, Lancamento } from "@/domain";
import { excluirCompraDestaEmDiante } from "./handler";

/**
 * Testes derivados de EXC-03 (AC 1 a 4, 6 e 7) e EXC-05 (AC 3 a 5). A compra A
 * é 4x de R$ 10,00, de dezembro de 2026 a março de 2027 (AD-009); no fake ela
 * vira `compra-1`, e a parcela `n` é `compra-1#n`.
 */

const AGORA = "2027-01-15T13:00:00.000Z";
const USUARIO = "11111111-1111-4111-8111-111111111111";
const CARTAO = "22222222-2222-4222-8222-222222222222";

let fakes: Fakes;

beforeEach(async () => {
  fakes = criarFakes();
  fakes.estado.meiosDePagamento.push({
    id: CARTAO,
    nome: "Cartão Roxo",
    tipo: "CARTAO_CREDITO",
    arquivadoEm: null,
    diaFechamento: 25,
    diaVencimento: 5,
    fechamentoVaiParaFaturaSeguinte: true,
  });
  const criada = await criarCompraParcelada(fakes, {
    idempotencyKey: "0b7c4e2a-1d3f-4a5b-8c6d-7e8f9a0b1c2d",
    descricao: "Compra A",
    modo: "VALOR_PARCELA",
    valorCentavos: 1000,
    qtdParcelas: 4,
    parcelaInicial: 1,
    competenciaInicial: "2026-12",
    politicaResiduo: "PRIMEIRAS",
    categoriaId: null,
    usuarioId: USUARIO,
    meioPagamentoId: CARTAO,
    dataEvento: "2026-12-05",
  });
  if (!criada.ok) {
    throw new Error(`fixture inválida: ${criada.error.code}`);
  }
});

function parcelas(): Lancamento[] {
  return [...fakes.estado.movimentos.values()].filter((m) => m.compraId === "compra-1");
}

/** Tudo o que uma escrita poderia mudar: o razão e as compras. */
function estado() {
  return structuredClone({
    movimentos: [...fakes.estado.movimentos.entries()],
    compras: [...fakes.estado.compras.entries()],
  });
}

function excluir(lancamentoId: string) {
  return excluirCompraDestaEmDiante(fakes, { lancamentoId, agora: AGORA });
}

describe("excluirCompraDestaEmDiante — o alcance (EXC-03 AC 1 a 4)", () => {
  it("a partir da 2/4 com a 3 paga: cancela 2 e 4, a 1 e a 3 ficam, e o total vira R$ 20,00", async () => {
    await fakes.movimentos.marcarPagamento("compra-1#3", "2027-02-10");

    const resultado = await excluir("compra-1#2");

    expect(resultado).toEqual({ ok: true, value: { alterou: true, parcelasExcluidas: 2 } });
    expect(parcelas().map((p) => [p.numeroParcela, p.canceladoEm, p.pagoEm, p.valor])).toEqual([
      [1, null, null, 1000],
      [2, AGORA, null, 1000],
      [3, null, "2027-02-10", 1000],
      [4, AGORA, null, 1000],
    ]);
    expect(fakes.estado.compras.get("compra-1")?.valorTotal).toBe(2000);
  });
});

describe("excluirCompraDestaEmDiante — sem escrita", () => {
  it("parcela já cancelada responde sem erro e sem mudar nada (EXC-03 AC 7)", async () => {
    await excluir("compra-1#2");
    const antes = estado();

    const segunda = await excluir("compra-1#3");

    expect(segunda).toEqual({ ok: true, value: { alterou: false, parcelasExcluidas: 0 } });
    expect(estado()).toEqual(antes);
  });

  it("parcela que outra aba excluiu entre as duas leituras também responde sem erro e sem escrita (EXC-03 AC 7)", async () => {
    const lidaAntesDaOutraAba = fakes.estado.movimentos.get("compra-1#2") ?? null;
    await fakes.compras.excluirParcelas("compra-1", [2, 3, 4], 1000 as Cents, AGORA);
    vi.spyOn(fakes.movimentos, "buscarPorId").mockResolvedValue(lidaAntesDaOutraAba);
    const antes = estado();

    const resultado = await excluir("compra-1#2");

    expect(resultado).toEqual({ ok: true, value: { alterou: false, parcelasExcluidas: 0 } });
    expect(estado()).toEqual(antes);
  });

  it("lançamento inexistente recusa com LANCAMENTO_NAO_ENCONTRADO (EXC-05 AC 3)", async () => {
    const antes = estado();

    const resultado = await excluir("fantasma");

    expect(resultado).toEqual({ ok: false, error: { code: "LANCAMENTO_NAO_ENCONTRADO" } });
    expect(estado()).toEqual(antes);
  });

  it.each([
    ["avulso", { origem: "AVULSO" as const, recorrenciaId: null }],
    ["ocorrência de fixo", { origem: "RECORRENCIA" as const, recorrenciaId: "rec-1" }],
  ])("%s recusa com LANCAMENTO_NAO_E_PARCELA (EXC-05 AC 4)", async (_, campos) => {
    fakes.estado.movimentos.set("outro", {
      id: "outro",
      natureza: "DESPESA",
      descricao: "Lançamento A",
      competencia: "2027-01" as Competencia,
      dataEvento: "2027-01-10",
      valor: 1000 as Cents,
      valorPrevisto: null,
      pagoEm: null,
      categoriaId: null,
      usuarioId: USUARIO,
      meioPagamentoId: CARTAO,
      compraId: null,
      numeroParcela: null,
      canceladoEm: null,
      ...campos,
    });
    const antes = estado();

    const resultado = await excluir("outro");

    expect(resultado).toEqual({ ok: false, error: { code: "LANCAMENTO_NAO_E_PARCELA" } });
    expect(estado()).toEqual(antes);
  });

  it("alcance todo pago recusa com NADA_A_EXCLUIR (EXC-05 AC 5)", async () => {
    await fakes.movimentos.marcarPagamento("compra-1#3", "2027-02-10");
    await fakes.movimentos.marcarPagamento("compra-1#4", "2027-03-10");
    const antes = estado();

    const resultado = await excluir("compra-1#3");

    expect(resultado).toEqual({ ok: false, error: { code: "NADA_A_EXCLUIR" } });
    expect(estado()).toEqual(antes);
  });
});

describe("excluirCompraDestaEmDiante — falhas (EXC-03 AC 6)", () => {
  it("a exceção de excluirParcelas sobe sem ser engolida", async () => {
    const falha = new Error("falha simulada na transação");
    vi.spyOn(fakes.compras, "excluirParcelas").mockRejectedValue(falha);

    await expect(excluir("compra-1#2")).rejects.toBe(falha);
  });

  it("parcela que aponta para compra inexistente é defeito e lança", async () => {
    fakes.estado.compras.delete("compra-1");

    await expect(excluir("compra-1#2")).rejects.toThrow("compra-1, que não existe");
  });
});
