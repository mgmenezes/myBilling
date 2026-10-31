import { describe, expect, it } from "vitest";
import type { Cartao, MeioSemFatura } from "../tipos";
import { mudancasDoMeio } from "./mudancas-do-meio";

/** Testes derivados de CADCOL-07 (ACs 4, 5, 8, 9 e 11). */

/** Nomes genéricos e dias escolhidos para serem distintos entre si (AD-009). */
const CARTAO_ROXO: Cartao = {
  id: "meio-cartao",
  nome: "Cartão Roxo",
  tipo: "CARTAO_CREDITO",
  arquivadoEm: null,
  diaFechamento: 25,
  diaVencimento: 5,
  fechamentoVaiParaFaturaSeguinte: true,
};

const CONTA: MeioSemFatura = {
  id: "meio-conta",
  nome: "Conta Corrente",
  tipo: "CONTA_CORRENTE",
  arquivadoEm: null,
};

const ROTULO: MeioSemFatura = {
  id: "meio-rotulo",
  nome: "Rótulo Âmbar",
  tipo: "ROTULO",
  arquivadoEm: null,
};

const CICLO_ATUAL = { diaFechamento: 25, diaVencimento: 5 };

describe("mudancasDoMeio — o que mudou no cartão (CADCOL-07, AC 5)", () => {
  it("o nome diferente devolve só o nome", () => {
    const resultado = mudancasDoMeio(CARTAO_ROXO, { nome: "Cartão Lilás", ciclo: CICLO_ATUAL });

    expect(resultado).toEqual({ ok: true, value: { nome: "Cartão Lilás" } });
  });

  it("o fechamento diferente devolve só o fechamento", () => {
    const resultado = mudancasDoMeio(CARTAO_ROXO, {
      nome: "Cartão Roxo",
      ciclo: { diaFechamento: 10, diaVencimento: 5 },
    });

    expect(resultado).toEqual({ ok: true, value: { diaFechamento: 10 } });
  });

  it("o vencimento diferente devolve só o vencimento", () => {
    const resultado = mudancasDoMeio(CARTAO_ROXO, {
      nome: "Cartão Roxo",
      ciclo: { diaFechamento: 25, diaVencimento: 17 },
    });

    expect(resultado).toEqual({ ok: true, value: { diaVencimento: 17 } });
  });

  it("os três diferentes devolvem os três", () => {
    const resultado = mudancasDoMeio(CARTAO_ROXO, {
      nome: "Cartão Lilás",
      ciclo: { diaFechamento: 10, diaVencimento: 17 },
    });

    expect(resultado).toEqual({
      ok: true,
      value: { nome: "Cartão Lilás", diaFechamento: 10, diaVencimento: 17 },
    });
  });

  it("na conta, o nome diferente devolve o nome", () => {
    const resultado = mudancasDoMeio(CONTA, { nome: "Conta Azul", ciclo: null });

    expect(resultado).toEqual({ ok: true, value: { nome: "Conta Azul" } });
  });
});

describe("mudancasDoMeio — a caixa do nome conta (CADCOL-07, AC 8)", () => {
  it("o nome que difere só na caixa é mudança", () => {
    const resultado = mudancasDoMeio(CARTAO_ROXO, { nome: "cartão roxo", ciclo: CICLO_ATUAL });

    expect(resultado).toEqual({ ok: true, value: { nome: "cartão roxo" } });
  });
});

describe("mudancasDoMeio — nada mudou (CADCOL-07, AC 9)", () => {
  it("no cartão, nome e dias iguais devolvem null", () => {
    const resultado = mudancasDoMeio(CARTAO_ROXO, { nome: "Cartão Roxo", ciclo: CICLO_ATUAL });

    expect(resultado).toEqual({ ok: true, value: null });
  });

  it("na conta, o nome igual devolve null", () => {
    const resultado = mudancasDoMeio(CONTA, { nome: "Conta Corrente", ciclo: null });

    expect(resultado).toEqual({ ok: true, value: null });
  });
});

describe("mudancasDoMeio — o ciclo tem que corresponder ao tipo (CADCOL-07, AC 11)", () => {
  it("conta com ciclo é recusada", () => {
    const resultado = mudancasDoMeio(CONTA, { nome: "Conta Corrente", ciclo: CICLO_ATUAL });

    expect(resultado).toEqual({ ok: false, error: { code: "CICLO_NAO_CORRESPONDE_AO_TIPO" } });
  });

  it("rótulo com ciclo é recusado", () => {
    const resultado = mudancasDoMeio(ROTULO, { nome: "Rótulo Âmbar", ciclo: CICLO_ATUAL });

    expect(resultado).toEqual({ ok: false, error: { code: "CICLO_NAO_CORRESPONDE_AO_TIPO" } });
  });

  it("cartão sem ciclo é recusado", () => {
    const resultado = mudancasDoMeio(CARTAO_ROXO, { nome: "Cartão Roxo", ciclo: null });

    expect(resultado).toEqual({ ok: false, error: { code: "CICLO_NAO_CORRESPONDE_AO_TIPO" } });
  });

  it("a recusa vale mesmo com o nome mudando", () => {
    const resultado = mudancasDoMeio(CONTA, { nome: "Conta Azul", ciclo: CICLO_ATUAL });

    expect(resultado).toEqual({ ok: false, error: { code: "CICLO_NAO_CORRESPONDE_AO_TIPO" } });
  });
});

describe("mudancasDoMeio — o tipo não muda (CADCOL-07, AC 4)", () => {
  it("o resultado só tem nome e dias, nunca o tipo", () => {
    const resultado = mudancasDoMeio(CARTAO_ROXO, {
      nome: "Cartão Lilás",
      ciclo: { diaFechamento: 10, diaVencimento: 17 },
    });
    const mudancas = resultado.ok ? resultado.value : null;

    expect(mudancas).not.toHaveProperty("tipo");
    expect(Object.keys(mudancas ?? {}).sort()).toEqual(["diaFechamento", "diaVencimento", "nome"]);
  });
});
