import { describe, expect, it } from "vitest";
import type { Cents, Competencia, Lancamento } from "@/domain";
import { contarFiltrosAtivos, filtrarLancamentos, situacaoDe } from "./filtrar-lancamentos";
import type { LancamentoDoMes } from "./obter-visao-mensal/handler";

/**
 * Testes derivados de REDE-01 (ACs 1 a 4) e de VENC-01 (ACs 1 a 3).
 *
 * Este módulo é o predicado que o painel e a lista compartilham, e até aqui era
 * um dos dois da fatia sem arquivo de teste: `filtrarLancamentos` podia devolver
 * a lista inteira sem nada reclamar. As fixtures seguem o formato de
 * `obter-visao-mensal/handler.test.ts` — nomes genéricos e valores escolhidos
 * por propriedade aritmética (AD-009).
 */

const CARTAO = "22222222-2222-4222-8222-222222222222";
const CONTA = "33333333-3333-4333-8333-333333333333";
const PESSOA_A = "11111111-1111-4111-8111-111111111111";
const PESSOA_B = "44444444-4444-4444-8444-444444444444";
const CATEGORIA_X = "55555555-5555-4555-8555-555555555555";
const CATEGORIA_Y = "66666666-6666-4666-8666-666666666666";

const FEVEREIRO = "2026-02" as Competencia;
const MARCO = "2026-03" as Competencia;
const ABRIL = "2026-04" as Competencia;

function item(campos: Partial<Lancamento> & { id: string }): LancamentoDoMes {
  return {
    lancamento: {
      natureza: "DESPESA",
      origem: "AVULSO",
      descricao: "Lançamento avulso A",
      competencia: MARCO,
      dataEvento: "2026-03-10",
      valor: 1000 as Cents,
      valorPrevisto: null,
      pagoEm: null,
      categoriaId: CATEGORIA_X,
      usuarioId: PESSOA_A,
      meioPagamentoId: CARTAO,
      compraId: null,
      numeroParcela: null,
      recorrenciaId: null,
      canceladoEm: null,
      ...campos,
    },
    parcela: null,
    bloco: "AVULSOS",
  };
}

const ids = (visiveis: ReadonlyArray<LancamentoDoMes>) => visiveis.map((i) => i.lancamento.id);

describe("a busca ignora acento e caixa (REDE-01, AC 1)", () => {
  const lista = [
    item({ id: "acentuado", descricao: "Água" }),
    item({ id: "sem-acento", descricao: "agua" }),
    item({ id: "outro", descricao: "Energia" }),
  ];

  it('digitar "agua" acha a descrição acentuada', () => {
    expect(ids(filtrarLancamentos(lista, { busca: "agua" }, MARCO))).toEqual([
      "acentuado",
      "sem-acento",
    ]);
  });

  it('digitar "ÁGUA" acha a descrição sem acento e em caixa baixa', () => {
    expect(ids(filtrarLancamentos(lista, { busca: "ÁGUA" }, MARCO))).toEqual([
      "acentuado",
      "sem-acento",
    ]);
  });

  it("casa por trecho, e não só pela descrição inteira", () => {
    expect(ids(filtrarLancamentos(lista, { busca: "nerg" }, MARCO))).toEqual(["outro"]);
  });

  it("busca sem correspondência devolve lista vazia", () => {
    expect(filtrarLancamentos(lista, { busca: "inexistente" }, MARCO)).toEqual([]);
  });
});

describe("cada dimensão de filtro isolada (REDE-01, AC 2)", () => {
  const lista = [
    item({ id: "base" }),
    item({ id: "outra-categoria", categoriaId: CATEGORIA_Y }),
    item({ id: "outro-meio", meioPagamentoId: CONTA }),
    item({ id: "outra-pessoa", usuarioId: PESSOA_B }),
    item({ id: "pago", pagoEm: "2026-03-12" }),
    item({ id: "receita", natureza: "RECEITA" }),
  ];

  it("categoria devolve só os daquela categoria", () => {
    expect(ids(filtrarLancamentos(lista, { categoriaId: CATEGORIA_Y }, MARCO))).toEqual([
      "outra-categoria",
    ]);
  });

  it("meio de pagamento devolve só os daquele meio", () => {
    expect(ids(filtrarLancamentos(lista, { meioPagamentoId: CONTA }, MARCO))).toEqual([
      "outro-meio",
    ]);
  });

  it("pessoa devolve só os daquela pessoa", () => {
    expect(ids(filtrarLancamentos(lista, { usuarioId: PESSOA_B }, MARCO))).toEqual([
      "outra-pessoa",
    ]);
  });

  it("situação devolve só os naquele estado", () => {
    expect(ids(filtrarLancamentos(lista, { situacao: "PAGO" }, MARCO))).toEqual(["pago"]);
  });

  it("natureza devolve só os daquela natureza", () => {
    expect(ids(filtrarLancamentos(lista, { natureza: "RECEITA" }, MARCO))).toEqual(["receita"]);
  });

  it("filtro vazio devolve a lista inteira do mês", () => {
    expect(filtrarLancamentos(lista, {}, MARCO)).toHaveLength(6);
  });
});

describe("filtros combinados são interseção (REDE-01, AC 3)", () => {
  const lista = [
    item({ id: "x-pessoa-a", categoriaId: CATEGORIA_X, usuarioId: PESSOA_A }),
    item({ id: "x-pessoa-b", categoriaId: CATEGORIA_X, usuarioId: PESSOA_B }),
    item({ id: "y-pessoa-a", categoriaId: CATEGORIA_Y, usuarioId: PESSOA_A }),
    item({ id: "y-pessoa-b", categoriaId: CATEGORIA_Y, usuarioId: PESSOA_B }),
  ];

  it("categoria e pessoa juntas devolvem só quem casa nas duas", () => {
    const visiveis = filtrarLancamentos(
      lista,
      { categoriaId: CATEGORIA_X, usuarioId: PESSOA_B },
      MARCO,
    );

    expect(ids(visiveis)).toEqual(["x-pessoa-b"]);
    /* A união devolveria três; a interseção devolve um. */
    expect(visiveis).toHaveLength(1);
  });

  it("busca e natureza juntas devolvem só quem casa nas duas", () => {
    const comNatureza = [
      item({ id: "despesa-agua", descricao: "Água" }),
      item({ id: "receita-agua", descricao: "Água", natureza: "RECEITA" }),
      item({ id: "receita-outra", descricao: "Energia", natureza: "RECEITA" }),
    ];

    expect(
      ids(filtrarLancamentos(comNatureza, { busca: "agua", natureza: "RECEITA" }, MARCO)),
    ).toEqual(["receita-agua"]);
  });

  it("combinação sem interseção devolve lista vazia, e não a união", () => {
    expect(
      filtrarLancamentos(lista, { categoriaId: CATEGORIA_X, meioPagamentoId: CONTA }, MARCO),
    ).toEqual([]);
  });
});

describe("contagem de filtros ativos (REDE-01, AC 4)", () => {
  it("filtro sem nenhuma dimensão conta zero", () => {
    expect(contarFiltrosAtivos({})).toBe(0);
  });

  it("cada dimensão preenchida conta uma", () => {
    expect(contarFiltrosAtivos({ busca: "agua" })).toBe(1);
    expect(contarFiltrosAtivos({ categoriaId: CATEGORIA_X })).toBe(1);
    expect(contarFiltrosAtivos({ meioPagamentoId: CONTA })).toBe(1);
    expect(contarFiltrosAtivos({ usuarioId: PESSOA_A })).toBe(1);
    expect(contarFiltrosAtivos({ situacao: "PENDENTE" })).toBe(1);
    expect(contarFiltrosAtivos({ natureza: "DESPESA" })).toBe(1);
  });

  it("as seis dimensões juntas contam seis", () => {
    expect(
      contarFiltrosAtivos({
        busca: "agua",
        categoriaId: CATEGORIA_X,
        meioPagamentoId: CONTA,
        usuarioId: PESSOA_A,
        situacao: "PENDENTE",
        natureza: "DESPESA",
      }),
    ).toBe(6);
  });

  /* Edge case do spec: busca só com espaços é ausência de busca. */
  it("busca só com espaços não conta como filtro ativo", () => {
    expect(contarFiltrosAtivos({ busca: "   " })).toBe(0);
  });

  it("busca em branco não conta como filtro ativo", () => {
    expect(contarFiltrosAtivos({ busca: "" })).toBe(0);
  });

  it("busca em branco ao lado de outra dimensão conta só a outra", () => {
    expect(contarFiltrosAtivos({ busca: "  ", situacao: "PAGO" })).toBe(1);
  });
});

describe("situação derivada da competência corrente (VENC-01, ACs 1 a 3)", () => {
  const naoPago = item({ id: "nao-pago" });

  it("não pago de competência anterior à corrente é vencido (AC 1)", () => {
    expect(situacaoDe(item({ id: "fev", competencia: FEVEREIRO }), MARCO)).toBe("VENCIDO");
  });

  it("não pago da competência corrente é pendente (AC 2)", () => {
    expect(situacaoDe(naoPago, MARCO)).toBe("PENDENTE");
  });

  it("não pago de competência posterior é pendente, e não vencido (AC 2, edge case)", () => {
    expect(situacaoDe(item({ id: "abr", competencia: ABRIL }), MARCO)).toBe("PENDENTE");
  });

  it("com data de pagamento é pago em qualquer competência (AC 3)", () => {
    for (const competencia of [FEVEREIRO, MARCO, ABRIL]) {
      expect(situacaoDe(item({ id: "pago", competencia, pagoEm: "2026-03-12" }), MARCO)).toBe(
        "PAGO",
      );
    }
  });
});

describe("o filtro de situação usa a competência corrente, e não a da lista", () => {
  const lista = [
    item({ id: "fev-pendente", competencia: FEVEREIRO }),
    item({ id: "fev-pago", competencia: FEVEREIRO, pagoEm: "2026-02-12" }),
  ];

  /* Com a corrente em março, o não pago de fevereiro está vencido (VENC-01, AC 4). */
  it('"Vencido" num mês passado devolve exatamente os não pagos daquele mês', () => {
    expect(ids(filtrarLancamentos(lista, { situacao: "VENCIDO" }, MARCO))).toEqual([
      "fev-pendente",
    ]);
  });

  it('"Pendente" no mesmo mês passado não devolve nenhum', () => {
    expect(filtrarLancamentos(lista, { situacao: "PENDENTE" }, MARCO)).toEqual([]);
  });

  /* E a mesma lista, com a corrente igual à competência dela, inverte: o que
     era vencido volta a ser pendente. É a prova de que o argumento manda. */
  it("a mesma lista com a corrente em fevereiro devolve pendente, e nada vencido", () => {
    expect(ids(filtrarLancamentos(lista, { situacao: "PENDENTE" }, FEVEREIRO))).toEqual([
      "fev-pendente",
    ]);
    expect(filtrarLancamentos(lista, { situacao: "VENCIDO" }, FEVEREIRO)).toEqual([]);
  });
});
