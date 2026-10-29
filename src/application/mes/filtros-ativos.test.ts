import { describe, expect, it } from "vitest";
import { SEM_CATEGORIA } from "./filtrar-lancamentos";
import { filtrosAtivos } from "./filtros-ativos";

/**
 * Testes derivados de LST-03 (AC 4): a barra compacta mostra cada filtro
 * ativo pelo nome e o tira pelo parâmetro da URL. Esta função é a que diz,
 * para cada parâmetro, que nome a pessoa lê.
 */

const CATEGORIA_X = "55555555-5555-4555-8555-555555555555";
const CONTA = "33333333-3333-4333-8333-333333333333";
const PESSOA_A = "11111111-1111-4111-8111-111111111111";

const NOMES = {
  categorias: new Map([[CATEGORIA_X, "Categoria X"]]),
  meios: new Map([[CONTA, "Conta Corrente"]]),
  usuarios: new Map([[PESSOA_A, "Pessoa A"]]),
};

describe("os filtros ativos da barra compacta (LST-03, AC 4)", () => {
  it("sem filtro, nenhum", () => {
    expect(filtrosAtivos({}, NOMES)).toEqual([]);
  });

  it("cada parâmetro vem com o nome que a pessoa lê, na ordem do cartão", () => {
    expect(
      filtrosAtivos(
        {
          natureza: "RECEITA",
          situacao: "VENCIDO",
          usuarioId: PESSOA_A,
          meioPagamentoId: CONTA,
          categoriaId: CATEGORIA_X,
        },
        NOMES,
      ),
    ).toEqual([
      { chave: "categoriaId", rotulo: "Categoria X" },
      { chave: "meioPagamentoId", rotulo: "Conta Corrente" },
      { chave: "usuarioId", rotulo: "Pessoa A" },
      { chave: "situacao", rotulo: "Vencido" },
      { chave: "natureza", rotulo: "Receita" },
    ]);
  });

  it('o filtro "sem-categoria" se chama "Sem categoria"', () => {
    expect(filtrosAtivos({ categoriaId: SEM_CATEGORIA }, NOMES)).toEqual([
      { chave: "categoriaId", rotulo: "Sem categoria" },
    ]);
  });

  it("as três situações e as três naturezas têm nome", () => {
    const rotulo = (filtro: Parameters<typeof filtrosAtivos>[0]) =>
      filtrosAtivos(filtro, NOMES)[0]?.rotulo;

    expect([
      rotulo({ situacao: "PENDENTE" }),
      rotulo({ situacao: "PAGO" }),
      rotulo({ situacao: "VENCIDO" }),
      rotulo({ natureza: "DESPESA" }),
      rotulo({ natureza: "RECEITA" }),
      rotulo({ natureza: "INVESTIMENTO" }),
    ]).toEqual(["Pendente", "Pago", "Vencido", "Despesa", "Receita", "Investimento"]);
  });

  /* A busca já está no campo da barra: repeti-la como chip seria mostrar o
     mesmo filtro duas vezes. */
  it("a busca não vira filtro ativo da barra", () => {
    expect(filtrosAtivos({ busca: "agua", situacao: "PAGO" }, NOMES)).toEqual([
      { chave: "situacao", rotulo: "Pago" },
    ]);
  });

  it("id que não está no cadastro ainda aparece, para poder ser tirado", () => {
    expect(
      filtrosAtivos({ categoriaId: "outra", meioPagamentoId: "outro", usuarioId: "outra" }, NOMES),
    ).toEqual([
      { chave: "categoriaId", rotulo: "Categoria removida" },
      { chave: "meioPagamentoId", rotulo: "Meio removido" },
      { chave: "usuarioId", rotulo: "Pessoa removida" },
    ]);
  });
});
