import { describe, expect, it } from "vitest";
import type { Competencia } from "../shared/competencia";
import type { Cents } from "../shared/money";
import {
  type FixoAtual,
  type FixoEditado,
  type PlanoDeEdicao,
  planejarEdicaoDoFixo,
} from "./edicao-do-fixo";

/**
 * Derivado de EDF-02, EDF-03 e EDF-04: o que salvar o formulário de edição de
 * um fixo faz, decidido sem banco.
 *
 * A regra devolve três partes independentes: os campos da série (que valem
 * para todos os meses), a vigência nova de valor (que vale a partir de um mês)
 * e a mudança do fim. Cada teste confere o plano inteiro, para que uma parte
 * vazando para outra apareça como falha.
 */

const c = (texto: string) => texto as Competencia;

const ATUAL: FixoAtual = {
  descricao: "Conta fixa A",
  diaVencimento: 10,
  meioPagamentoId: "meio-1",
  categoriaId: "categoria-1",
  usuarioId: "pessoa-a",
  competenciaInicio: c("2026-03"),
  competenciaFim: null,
  valorNoMesExibido: 10000 as Cents,
};

/** O formulário aberto e salvo sem mexer em nada, visto em novembro. */
function semMudanca(atual: FixoAtual = ATUAL): FixoEditado {
  return {
    descricao: atual.descricao,
    diaVencimento: atual.diaVencimento,
    meioPagamentoId: atual.meioPagamentoId,
    categoriaId: atual.categoriaId,
    usuarioId: atual.usuarioId,
    competenciaFim: atual.competenciaFim,
    valor: atual.valorNoMesExibido,
    vigenteDesde: c("2026-11"),
  };
}

function plano(atual: FixoAtual, editado: FixoEditado): PlanoDeEdicao {
  const resultado = planejarEdicaoDoFixo(atual, editado);
  if (!resultado.ok) {
    throw new Error(`esperava plano válido: ${JSON.stringify(resultado.error)}`);
  }
  return resultado.value;
}

describe("salvar sem mudar nada (EDF-02 AC 4, EDF-03 AC 3)", () => {
  it("não muda a série, não registra vigência e não mexe no fim", () => {
    expect(plano(ATUAL, semMudanca())).toEqual({ serie: null, vigencia: null, fim: null });
  });
});

describe("os campos da série valem para o fixo inteiro (EDF-02 AC 1)", () => {
  it.each([
    ["a descrição", { descricao: "Conta fixa B" }],
    ["o dia de vencimento", { diaVencimento: 31 }],
    ["o meio de pagamento", { meioPagamentoId: "meio-2" }],
    ["a categoria", { categoriaId: "categoria-2" }],
    ["a categoria, para nenhuma", { categoriaId: null }],
    ["a pessoa", { usuarioId: "pessoa-b" }],
  ] as const)("mudar %s devolve a série com os cinco valores editados", (_, mudanca) => {
    const editado: FixoEditado = { ...semMudanca(), ...mudanca };

    expect(plano(ATUAL, editado)).toEqual({
      serie: {
        descricao: editado.descricao,
        diaVencimento: editado.diaVencimento,
        meioPagamentoId: editado.meioPagamentoId,
        categoriaId: editado.categoriaId,
        usuarioId: editado.usuarioId,
      },
      vigencia: null,
      fim: null,
    });
  });

  it("mudar os cinco de uma vez devolve os cinco", () => {
    const editado: FixoEditado = {
      ...semMudanca(),
      descricao: "Conta fixa B",
      diaVencimento: 31,
      meioPagamentoId: "meio-2",
      categoriaId: null,
      usuarioId: "pessoa-b",
    };

    expect(plano(ATUAL, editado).serie).toEqual({
      descricao: "Conta fixa B",
      diaVencimento: 31,
      meioPagamentoId: "meio-2",
      categoriaId: null,
      usuarioId: "pessoa-b",
    });
  });
});

describe("o valor muda a partir de um mês (EDF-03 AC 2, 3, 5)", () => {
  it("valor diferente do vigente registra a vigência no mês e no valor escolhidos", () => {
    const editado: FixoEditado = { ...semMudanca(), valor: 11000 as Cents };

    expect(plano(ATUAL, editado)).toEqual({
      serie: null,
      vigencia: { vigenteDesde: "2026-11", valor: 11000 },
      fim: null,
    });
  });

  it("valor igual ao vigente não registra vigência, seja qual for o mês informado", () => {
    const editado: FixoEditado = { ...semMudanca(), vigenteDesde: c("2026-01") };

    expect(plano(ATUAL, editado)).toEqual({ serie: null, vigencia: null, fim: null });
  });

  it("a vigência pode começar no próprio mês de início", () => {
    const editado: FixoEditado = {
      ...semMudanca(),
      valor: 11000 as Cents,
      vigenteDesde: c("2026-03"),
    };

    expect(plano(ATUAL, editado).vigencia).toEqual({ vigenteDesde: "2026-03", valor: 11000 });
  });

  it("vigência anterior ao início é PERIODO_INVALIDO, no campo da vigência", () => {
    const editado: FixoEditado = {
      ...semMudanca(),
      valor: 11000 as Cents,
      vigenteDesde: c("2026-02"),
    };

    expect(planejarEdicaoDoFixo(ATUAL, editado)).toEqual({
      ok: false,
      error: { code: "PERIODO_INVALIDO", detalhes: { campo: "vigenteDesde" } },
    });
  });
});

describe("o fim, comparando o atual com o pedido (EDF-04 AC 1-3)", () => {
  function comFim(fim: string | null): FixoAtual {
    return { ...ATUAL, competenciaFim: fim === null ? null : c(fim) };
  }

  function pedindoFim(atual: FixoAtual, fim: string | null): FixoEditado {
    return { ...semMudanca(atual), competenciaFim: fim === null ? null : c(fim) };
  }

  it("vazio e vazio: nenhuma mudança", () => {
    expect(plano(comFim(null), pedindoFim(comFim(null), null)).fim).toBeNull();
  });

  it("vazio e M: encerra a partir de M + 1", () => {
    expect(plano(comFim(null), pedindoFim(comFim(null), "2026-11")).fim).toEqual({
      tipo: "ENCERRAR",
      aPartirDe: "2026-12",
    });
  });

  it("X e vazio: reabre", () => {
    expect(plano(comFim("2026-12"), pedindoFim(comFim("2026-12"), null)).fim).toEqual({
      tipo: "REABRIR",
    });
  });

  it("X e M anterior a X: encerra a partir de M + 1, virando o ano", () => {
    expect(plano(comFim("2027-03"), pedindoFim(comFim("2027-03"), "2026-12")).fim).toEqual({
      tipo: "ENCERRAR",
      aPartirDe: "2027-01",
    });
  });

  it("X e M posterior a X: estende o fim até M", () => {
    expect(plano(comFim("2026-11"), pedindoFim(comFim("2026-11"), "2027-02")).fim).toEqual({
      tipo: "ESTENDER",
      competenciaFim: "2027-02",
    });
  });

  it("X e o mesmo X: nenhuma mudança", () => {
    expect(plano(comFim("2026-12"), pedindoFim(comFim("2026-12"), "2026-12")).fim).toBeNull();
  });

  it("a mudança do fim não toca a série nem a vigência", () => {
    expect(plano(comFim(null), pedindoFim(comFim(null), "2026-11"))).toEqual({
      serie: null,
      vigencia: null,
      fim: { tipo: "ENCERRAR", aPartirDe: "2026-12" },
    });
  });
});

describe("o fim não pode ser anterior ao início (EDF-04 AC 4)", () => {
  it("fim no próprio mês de início é válido, como no cadastro", () => {
    expect(plano(ATUAL, { ...semMudanca(), competenciaFim: c("2026-03") }).fim).toEqual({
      tipo: "ENCERRAR",
      aPartirDe: "2026-04",
    });
  });

  it("fim anterior ao início é PERIODO_INVALIDO, no campo do fim", () => {
    expect(planejarEdicaoDoFixo(ATUAL, { ...semMudanca(), competenciaFim: c("2026-02") })).toEqual({
      ok: false,
      error: { code: "PERIODO_INVALIDO", detalhes: { campo: "competenciaFim" } },
    });
  });
});

describe("as três partes juntas", () => {
  it("série, vigência e fim mudam no mesmo plano", () => {
    const editado: FixoEditado = {
      ...semMudanca(),
      descricao: "Conta fixa B",
      valor: 11000 as Cents,
      competenciaFim: c("2027-06"),
    };

    expect(plano(ATUAL, editado)).toEqual({
      serie: {
        descricao: "Conta fixa B",
        diaVencimento: 10,
        meioPagamentoId: "meio-1",
        categoriaId: "categoria-1",
        usuarioId: "pessoa-a",
      },
      vigencia: { vigenteDesde: "2026-11", valor: 11000 },
      fim: { tipo: "ENCERRAR", aPartirDe: "2027-07" },
    });
  });
});
