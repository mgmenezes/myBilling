import { describe, expect, it } from "vitest";
import type { Cents, Competencia, Lancamento } from "@/domain";
import type { LancamentoDoMes } from "./obter-visao-mensal/handler";
import { ultimosLancamentos } from "./ultimos-lancamentos";

/**
 * Testes derivados de TRES-05 (ACs 1 e 2): até 8 lançamentos não cancelados,
 * com data até hoje, do mais recente para o mais antigo, e o empate de data
 * resolvido pela descrição. Fixtures no formato de `filtrar-lancamentos.test.ts`,
 * com nomes genéricos (AD-009).
 */

const MARCO = "2026-03" as Competencia;
const HOJE = "2026-03-15";

function item(campos: Partial<Lancamento> & { id: string }): LancamentoDoMes {
  return {
    lancamento: {
      natureza: "DESPESA",
      origem: "AVULSO",
      descricao: `Item ${campos.id}`,
      competencia: MARCO,
      dataEvento: "2026-03-10",
      valor: 1000 as Cents,
      valorPrevisto: null,
      pagoEm: null,
      categoriaId: null,
      usuarioId: "11111111-1111-4111-8111-111111111111",
      meioPagamentoId: "22222222-2222-4222-8222-222222222222",
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

const ids = (itens: ReadonlyArray<LancamentoDoMes>) => itens.map((i) => i.lancamento.id);

describe("só entra o que vale e o que já aconteceu (TRES-05, AC 1)", () => {
  it("o lançamento cancelado fica fora", () => {
    const lista = [
      item({ id: "vale" }),
      item({ id: "cancelado", canceladoEm: "2026-03-11T12:00:00.000Z" }),
    ];

    expect(ids(ultimosLancamentos(lista, HOJE))).toEqual(["vale"]);
  });

  it("o de hoje entra e o de amanhã fica fora", () => {
    const lista = [
      item({ id: "hoje", dataEvento: "2026-03-15" }),
      item({ id: "amanha", dataEvento: "2026-03-16" }),
    ];

    expect(ids(ultimosLancamentos(lista, HOJE))).toEqual(["hoje"]);
  });

  it("sem nenhum lançamento até hoje, a lista é vazia (Edge Case: mês futuro)", () => {
    const lista = [
      item({ id: "a", dataEvento: "2026-03-20" }),
      item({ id: "b", dataEvento: "2026-03-31" }),
    ];

    expect(ultimosLancamentos(lista, HOJE)).toEqual([]);
  });
});

describe("do mais recente para o mais antigo (TRES-05, ACs 1 e 2)", () => {
  it("ordena pela data, decrescente", () => {
    const lista = [
      item({ id: "dia-10", dataEvento: "2026-03-10" }),
      item({ id: "dia-12", dataEvento: "2026-03-12" }),
      item({ id: "dia-01", dataEvento: "2026-03-01" }),
    ];

    expect(ids(ultimosLancamentos(lista, HOJE))).toEqual(["dia-12", "dia-10", "dia-01"]);
  });

  /*
   * A ordem por ponto de código poria "Banana" antes de "abacate" e "Água" por
   * último. Em ordem alfabética pt-BR, acento e caixa não mandam.
   */
  it("no empate de data, ordena pela descrição em ordem alfabética pt-BR", () => {
    const lista = [
      item({ id: "banana", descricao: "Banana" }),
      item({ id: "agua", descricao: "Água" }),
      item({ id: "abacate", descricao: "abacate" }),
    ];

    expect(ids(ultimosLancamentos(lista, HOJE))).toEqual(["abacate", "agua", "banana"]);
  });

  it("com 10 lançamentos até hoje, mostra os 8 mais recentes", () => {
    const lista = Array.from({ length: 10 }, (_, indice) =>
      item({
        id: `dia-${indice + 1}`,
        dataEvento: `2026-03-${String(indice + 1).padStart(2, "0")}`,
      }),
    );

    expect(ids(ultimosLancamentos(lista, HOJE))).toEqual([
      "dia-10",
      "dia-9",
      "dia-8",
      "dia-7",
      "dia-6",
      "dia-5",
      "dia-4",
      "dia-3",
    ]);
  });
});
