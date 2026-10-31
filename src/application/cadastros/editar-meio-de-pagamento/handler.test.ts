import { beforeEach, describe, expect, it, vi } from "vitest";
import { criarFakes, type Fakes } from "@/application/ports/fakes";
import type { MeioPagamento } from "@/domain";
import { editarMeioDePagamento } from "./handler";

/**
 * Derivado de CADCOL-07 (ACs 5 a 9, 11 e 12). Nomes genéricos e dias
 * escolhidos para serem distintos entre si (AD-009).
 */

const ARQUIVADO_EM = "2026-01-15T12:00:00.000Z";
const CICLO_ATUAL = { diaFechamento: 25, diaVencimento: 5 };

const CARTAO_ROXO: MeioPagamento = {
  id: "cartao-roxo",
  nome: "Cartão Roxo",
  tipo: "CARTAO_CREDITO",
  arquivadoEm: null,
  diaFechamento: 25,
  diaVencimento: 5,
  fechamentoVaiParaFaturaSeguinte: true,
};
const CONTA: MeioPagamento = {
  id: "conta-corrente",
  nome: "Conta Corrente",
  tipo: "CONTA_CORRENTE",
  arquivadoEm: null,
};
const CARTAO_ANTIGO: MeioPagamento = {
  id: "cartao-antigo",
  nome: "Cartão Antigo",
  tipo: "CARTAO_CREDITO",
  arquivadoEm: ARQUIVADO_EM,
  diaFechamento: 10,
  diaVencimento: 20,
  fechamentoVaiParaFaturaSeguinte: true,
};

let fakes: Fakes;

beforeEach(() => {
  fakes = criarFakes();
  fakes.estado.meiosDePagamento.push(CARTAO_ROXO, CONTA, CARTAO_ANTIGO);
});

function deps() {
  return { meios: fakes.cadastros };
}

function espiar() {
  return {
    buscaPorNome: vi.spyOn(fakes.cadastros, "buscarMeioDePagamentoAtivoPorNome"),
    gravacao: vi.spyOn(fakes.cadastros, "atualizarMeioDePagamento"),
  };
}

function meiosGravados(): MeioPagamento[] {
  return structuredClone(fakes.estado.meiosDePagamento);
}

describe("editarMeioDePagamento — meio que não existe mais (CADCOL-07, AC 12)", () => {
  it("meio inexistente devolve MEIO_PAGAMENTO_NAO_ENCONTRADO, sem gravar", async () => {
    const antes = meiosGravados();
    const { gravacao } = espiar();

    const resultado = await editarMeioDePagamento(deps(), {
      meioPagamentoId: "fantasma",
      nome: "Cartão Lilás",
      ciclo: CICLO_ATUAL,
    });

    expect(resultado).toEqual({ ok: false, error: { code: "MEIO_PAGAMENTO_NAO_ENCONTRADO" } });
    expect(gravacao).not.toHaveBeenCalled();
    expect(fakes.estado.meiosDePagamento).toEqual(antes);
  });

  it("meio arquivado devolve MEIO_PAGAMENTO_NAO_ENCONTRADO, sem gravar", async () => {
    const antes = meiosGravados();
    const { gravacao } = espiar();

    const resultado = await editarMeioDePagamento(deps(), {
      meioPagamentoId: CARTAO_ANTIGO.id,
      nome: "Cartão Lilás",
      ciclo: { diaFechamento: 10, diaVencimento: 20 },
    });

    expect(resultado).toEqual({ ok: false, error: { code: "MEIO_PAGAMENTO_NAO_ENCONTRADO" } });
    expect(gravacao).not.toHaveBeenCalled();
    expect(fakes.estado.meiosDePagamento).toEqual(antes);
  });
});

describe("editarMeioDePagamento — o ciclo tem que corresponder ao tipo (CADCOL-07, AC 11)", () => {
  it("dias para a conta devolvem CICLO_NAO_CORRESPONDE_AO_TIPO, sem gravar", async () => {
    const antes = meiosGravados();
    const { gravacao } = espiar();

    const resultado = await editarMeioDePagamento(deps(), {
      meioPagamentoId: CONTA.id,
      nome: "Conta Corrente",
      ciclo: CICLO_ATUAL,
    });

    expect(resultado).toEqual({ ok: false, error: { code: "CICLO_NAO_CORRESPONDE_AO_TIPO" } });
    expect(gravacao).not.toHaveBeenCalled();
    expect(fakes.estado.meiosDePagamento).toEqual(antes);
  });

  it("cartão sem os dias devolve CICLO_NAO_CORRESPONDE_AO_TIPO, sem gravar", async () => {
    const antes = meiosGravados();
    const { gravacao } = espiar();

    const resultado = await editarMeioDePagamento(deps(), {
      meioPagamentoId: CARTAO_ROXO.id,
      nome: "Cartão Lilás",
      ciclo: null,
    });

    expect(resultado).toEqual({ ok: false, error: { code: "CICLO_NAO_CORRESPONDE_AO_TIPO" } });
    expect(gravacao).not.toHaveBeenCalled();
    expect(fakes.estado.meiosDePagamento).toEqual(antes);
  });
});

describe("editarMeioDePagamento — nada mudou (CADCOL-07, AC 9)", () => {
  it("devolve o meio com alterado: false, sem consultar o nome e sem gravar", async () => {
    const antes = meiosGravados();
    const { buscaPorNome, gravacao } = espiar();

    const resultado = await editarMeioDePagamento(deps(), {
      meioPagamentoId: CARTAO_ROXO.id,
      nome: "Cartão Roxo",
      ciclo: CICLO_ATUAL,
    });

    expect(resultado).toEqual({ ok: true, value: { meio: CARTAO_ROXO, alterado: false } });
    expect(buscaPorNome).not.toHaveBeenCalled();
    expect(gravacao).not.toHaveBeenCalled();
    expect(fakes.estado.meiosDePagamento).toEqual(antes);
  });
});

describe("editarMeioDePagamento — o nome é único entre os ativos (CADCOL-07, ACs 6 a 8)", () => {
  it("o nome de outro meio ativo, em outra caixa, devolve MEIO_PAGAMENTO_JA_EXISTE, sem gravar", async () => {
    const antes = meiosGravados();
    const { gravacao } = espiar();

    const resultado = await editarMeioDePagamento(deps(), {
      meioPagamentoId: CARTAO_ROXO.id,
      nome: "conta corrente",
      ciclo: CICLO_ATUAL,
    });

    expect(resultado).toEqual({ ok: false, error: { code: "MEIO_PAGAMENTO_JA_EXISTE" } });
    expect(gravacao).not.toHaveBeenCalled();
    expect(fakes.estado.meiosDePagamento).toEqual(antes);
  });

  it("o nome de um meio arquivado grava (AC 7)", async () => {
    const resultado = await editarMeioDePagamento(deps(), {
      meioPagamentoId: CARTAO_ROXO.id,
      nome: "Cartão Antigo",
      ciclo: CICLO_ATUAL,
    });

    const esperado = { ...CARTAO_ROXO, nome: "Cartão Antigo" };
    expect(resultado).toEqual({ ok: true, value: { meio: esperado, alterado: true } });
    expect(await fakes.cadastros.buscarMeioDePagamento(CARTAO_ROXO.id)).toEqual(esperado);
  });

  it("o próprio nome mudando só a caixa grava (AC 8)", async () => {
    const resultado = await editarMeioDePagamento(deps(), {
      meioPagamentoId: CARTAO_ROXO.id,
      nome: "cartão roxo",
      ciclo: CICLO_ATUAL,
    });

    const esperado = { ...CARTAO_ROXO, nome: "cartão roxo" };
    expect(resultado).toEqual({ ok: true, value: { meio: esperado, alterado: true } });
    expect(await fakes.cadastros.buscarMeioDePagamento(CARTAO_ROXO.id)).toEqual(esperado);
  });
});

describe("editarMeioDePagamento — grava o que mudou (CADCOL-07, AC 5)", () => {
  it("só os dias mudando não consulta o nome, e grava os dias", async () => {
    const { buscaPorNome } = espiar();

    const resultado = await editarMeioDePagamento(deps(), {
      meioPagamentoId: CARTAO_ROXO.id,
      nome: "Cartão Roxo",
      ciclo: { diaFechamento: 10, diaVencimento: 17 },
    });

    const esperado = { ...CARTAO_ROXO, diaFechamento: 10, diaVencimento: 17 };
    expect(resultado).toEqual({ ok: true, value: { meio: esperado, alterado: true } });
    expect(buscaPorNome).not.toHaveBeenCalled();
    expect(await fakes.cadastros.buscarMeioDePagamento(CARTAO_ROXO.id)).toEqual(esperado);
  });

  it("grava o nome e os dias e devolve o meio gravado com alterado: true", async () => {
    const { gravacao } = espiar();

    const resultado = await editarMeioDePagamento(deps(), {
      meioPagamentoId: CARTAO_ROXO.id,
      nome: "Cartão Lilás",
      ciclo: { diaFechamento: 10, diaVencimento: 17 },
    });

    const esperado = {
      ...CARTAO_ROXO,
      nome: "Cartão Lilás",
      diaFechamento: 10,
      diaVencimento: 17,
    };
    expect(resultado).toEqual({ ok: true, value: { meio: esperado, alterado: true } });
    expect(gravacao).toHaveBeenCalledWith(CARTAO_ROXO.id, {
      nome: "Cartão Lilás",
      diaFechamento: 10,
      diaVencimento: 17,
    });
    expect(await fakes.cadastros.buscarMeioDePagamento(CARTAO_ROXO.id)).toEqual(esperado);
  });

  it("na conta, o nome novo grava sem dias", async () => {
    const resultado = await editarMeioDePagamento(deps(), {
      meioPagamentoId: CONTA.id,
      nome: "Conta Azul",
      ciclo: null,
    });

    const esperado = { ...CONTA, nome: "Conta Azul" };
    expect(resultado).toEqual({ ok: true, value: { meio: esperado, alterado: true } });
    expect(await fakes.cadastros.buscarMeioDePagamento(CONTA.id)).toEqual(esperado);
  });
});
