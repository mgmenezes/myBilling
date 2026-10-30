import { describe, expect, it } from "vitest";
import type { Cents, Competencia, CorDeCategoria, Lancamento } from "@/domain";
import { corAutomatica, resumoPorCategoria } from "@/domain";
import { SEM_CATEGORIA } from "./filtrar-lancamentos";
import type { LancamentoDoMes } from "./obter-visao-mensal/handler";
import { totaisPorCategoria } from "./totais-por-categoria";

/**
 * Testes derivados de LST-01 (ACs 1, 2 e 3) e do Edge Case "mês sem despesa".
 *
 * Os totais dos chips são os de "Gastos por categoria" da Visão geral: o mesmo
 * `resumoPorCategoria`, sobre o mesmo mês. Valores escolhidos para que a
 * ordem por gasto discorde da ordem de entrada e da alfabética (AD-009).
 */

const MARCO = "2026-03" as Competencia;
const ABRIL = "2026-04" as Competencia;
const CATEGORIA_X = "55555555-5555-4555-8555-555555555555";
const CATEGORIA_Y = "66666666-6666-4666-8666-666666666666";

/* X tem cor escolhida; Y não, e usa a automática do nome (COR-01, AC 3). */
const CATEGORIAS = new Map<string, { nome: string; cor: CorDeCategoria | null }>([
  [CATEGORIA_X, { nome: "Categoria X", cor: "verde" }],
  [CATEGORIA_Y, { nome: "Categoria Y", cor: null }],
]);
const COR_DE_Y = corAutomatica("Categoria Y");

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
      usuarioId: "u1",
      meioPagamentoId: "m1",
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

const MES = [
  item({ id: "x-1", categoriaId: CATEGORIA_X, valor: 1000 as Cents }),
  item({ id: "sem", categoriaId: null, valor: 700 as Cents }),
  item({ id: "y", categoriaId: CATEGORIA_Y, valor: 5000 as Cents }),
  item({ id: "x-2", categoriaId: CATEGORIA_X, valor: 2000 as Cents, pagoEm: "2026-03-12" }),
  item({ id: "receita", natureza: "RECEITA", categoriaId: null, valor: 99999 as Cents }),
];
const TOTAL_GASTOS = 8700 as Cents;

describe("os totais dos chips (LST-01, ACs 1 e 2)", () => {
  it("um total por categoria com despesa, do maior gasto para o menor", () => {
    expect(totaisPorCategoria(MES, MARCO, TOTAL_GASTOS, CATEGORIAS)).toEqual([
      { id: CATEGORIA_Y, nome: "Categoria Y", gasto: 5000, cor: COR_DE_Y },
      { id: CATEGORIA_X, nome: "Categoria X", gasto: 3000, cor: "verde" },
      { id: SEM_CATEGORIA, nome: "Sem categoria", gasto: 700, cor: null },
    ]);
  });

  /* "O mesmo cálculo de Gastos por categoria": cada gasto é, centavo por
     centavo, o que `resumoPorCategoria` devolve para a mesma categoria. */
  it("cada gasto é o de resumoPorCategoria para a mesma categoria", () => {
    const resumo = resumoPorCategoria(
      MES.map((i) => i.lancamento),
      MARCO,
      TOTAL_GASTOS,
    );

    for (const total of totaisPorCategoria(MES, MARCO, TOTAL_GASTOS, CATEGORIAS)) {
      const chave = total.id === SEM_CATEGORIA ? null : total.id;
      expect(total.gasto).toBe(resumo.find((r) => r.categoriaId === chave)?.gasto);
    }
  });

  it("despesa de outra competência não entra no total", () => {
    const comAbril = [...MES, item({ id: "abril", competencia: ABRIL, valor: 40000 as Cents })];

    expect(totaisPorCategoria(comAbril, MARCO, TOTAL_GASTOS, CATEGORIAS)[1]).toEqual({
      id: CATEGORIA_X,
      nome: "Categoria X",
      gasto: 3000,
      cor: "verde",
    });
  });
});

describe('o grupo sem categoria vira o chip "Sem categoria" (LST-01, AC 3)', () => {
  it('tem o id "sem-categoria", que é o que o filtro reconhece', () => {
    const sem = totaisPorCategoria(MES, MARCO, TOTAL_GASTOS, CATEGORIAS).find(
      (total) => total.nome === "Sem categoria",
    );

    expect(sem?.id).toBe("sem-categoria");
  });

  it("sem despesa sem categoria, não há chip Sem categoria", () => {
    const soComCategoria = MES.filter((i) => i.lancamento.id !== "sem");

    expect(
      totaisPorCategoria(soComCategoria, MARCO, 8000 as Cents, CATEGORIAS).map((total) => total.id),
    ).toEqual([CATEGORIA_Y, CATEGORIA_X]);
  });
});

describe("o nome da categoria", () => {
  it('categoria que saiu do cadastro aparece como "Categoria removida", sem cor (COR-02, AC 5)', () => {
    expect(totaisPorCategoria(MES, MARCO, TOTAL_GASTOS, new Map())[0]).toEqual({
      id: CATEGORIA_Y,
      nome: "Categoria removida",
      gasto: 5000,
      cor: null,
    });
  });
});

/** Derivado de COR-03 (AC 4) e do Done-when de T7: o chip recebe a cor efetiva. */
describe("a cor de cada total", () => {
  it("é a escolhida quando há, e a automática do nome quando a categoria não tem cor", () => {
    const totais = totaisPorCategoria(MES, MARCO, TOTAL_GASTOS, CATEGORIAS);

    expect(totais.find((total) => total.id === CATEGORIA_X)?.cor).toBe("verde");
    expect(totais.find((total) => total.id === CATEGORIA_Y)?.cor).toBe(COR_DE_Y);
  });

  it('"Sem categoria" não tem cor (COR-02, AC 5)', () => {
    const sem = totaisPorCategoria(MES, MARCO, TOTAL_GASTOS, CATEGORIAS).find(
      (total) => total.id === SEM_CATEGORIA,
    );

    expect(sem?.cor).toBeNull();
  });
});

describe("mês sem despesa (Edge Case)", () => {
  it("não há total nenhum, e portanto nenhum chip", () => {
    const soReceita = MES.filter((i) => i.lancamento.natureza === "RECEITA");

    expect(totaisPorCategoria(soReceita, MARCO, 0 as Cents, CATEGORIAS)).toEqual([]);
  });
});
