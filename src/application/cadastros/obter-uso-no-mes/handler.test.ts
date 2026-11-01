import { beforeEach, describe, expect, it } from "vitest";
import { filtrarLancamentos } from "@/application/mes/filtrar-lancamentos";
import { obterVisaoMensal } from "@/application/mes/obter-visao-mensal/handler";
import { criarFakes, type Fakes } from "@/application/ports/fakes";
import {
  MESES_DE_PROJECAO,
  materializarRecorrencias,
} from "@/application/recorrencias/materializar/handler";
import {
  addMeses,
  type Cents,
  type Competencia,
  type Lancamento,
  type Natureza,
  rangeCompetencias,
} from "@/domain";
import { obterUsoNoMes } from "./handler";

/**
 * Testes derivados de CADCOL-03 (ACs 4 e 5). Tudo com os fakes em memória.
 * Nomes genéricos e valores redondos (AD-009).
 */

const c = (t: string) => t as Competencia;
const MARCO = c("2026-03");

const CATEGORIA_UM = "cat-um";
const CATEGORIA_DOIS = "cat-dois";
const CATEGORIA_TRES = "cat-tres";
const CONTA = "meio-conta";
const CARTAO = "meio-cartao";
const ROTULO = "meio-rotulo";
const USUARIO = "pessoa-a";

let fakes: Fakes;

beforeEach(() => {
  fakes = criarFakes();
  fakes.estado.meiosDePagamento.push(
    {
      id: CARTAO,
      nome: "Cartão Roxo",
      tipo: "CARTAO_CREDITO",
      arquivadoEm: null,
      diaFechamento: 25,
      diaVencimento: 5,
      fechamentoVaiParaFaturaSeguinte: true,
    },
    { id: CONTA, nome: "Conta Corrente", tipo: "CONTA_CORRENTE", arquivadoEm: null },
    { id: ROTULO, nome: "Rótulo Âmbar", tipo: "ROTULO", arquivadoEm: null },
  );
});

async function criarFixo(opcoes: {
  descricao: string;
  natureza?: Natureza;
  categoriaId: string | null;
  meioPagamentoId: string;
  inicio: string;
  fim?: string;
}) {
  return fakes.recorrencias.criar({
    dados: {
      descricao: opcoes.descricao,
      natureza: opcoes.natureza ?? "DESPESA",
      categoriaId: opcoes.categoriaId,
      usuarioId: USUARIO,
      meioPagamentoId: opcoes.meioPagamentoId,
      competenciaInicio: c(opcoes.inicio),
      competenciaFim: opcoes.fim === undefined ? null : c(opcoes.fim),
      diaVencimento: 10,
    },
    valorInicial: 10000 as Cents,
  });
}

function semear(campos: Partial<Lancamento> & { id: string }): void {
  fakes.estado.movimentos.set(campos.id, {
    natureza: "DESPESA",
    origem: "AVULSO",
    descricao: "Gasto",
    competencia: MARCO,
    dataEvento: "2026-03-10",
    valor: 2000 as Cents,
    valorPrevisto: null,
    pagoEm: null,
    categoriaId: CATEGORIA_UM,
    usuarioId: USUARIO,
    meioPagamentoId: CARTAO,
    compraId: null,
    numeroParcela: null,
    recorrenciaId: null,
    canceladoEm: null,
    ...campos,
  });
}

function ocorrencias(): Lancamento[] {
  return [...fakes.estado.movimentos.values()]
    .filter((m) => m.origem === "RECORRENCIA")
    .sort((a, b) => a.competencia.localeCompare(b.competencia));
}

describe("obterUsoNoMes — materializa antes de contar (CADCOL-03, AC 5)", () => {
  it("num mês nunca aberto, a ocorrência do fixo entra em lançamentos da categoria e do meio", async () => {
    await criarFixo({
      descricao: "Fixo A",
      categoriaId: CATEGORIA_UM,
      meioPagamentoId: CONTA,
      inicio: "2026-01",
    });
    expect(ocorrencias()).toEqual([]);

    const uso = await obterUsoNoMes(fakes, MARCO);

    expect(uso.porCategoria.get(CATEGORIA_UM)?.lancamentos).toBe(1);
    expect(uso.porMeio.get(CONTA)?.lancamentos).toBe(1);
  });

  it("o fixo do mês conta em fixos, tirado das recorrências lidas", async () => {
    await criarFixo({
      descricao: "Fixo A",
      categoriaId: CATEGORIA_UM,
      meioPagamentoId: CONTA,
      inicio: "2026-01",
    });

    const uso = await obterUsoNoMes(fakes, MARCO);

    expect(uso.porCategoria.get(CATEGORIA_UM)?.fixos).toBe(1);
    expect(uso.porMeio.get(CONTA)?.fixos).toBe(1);
  });

  it("materializa a mesma janela de Lançamentos: o mês aberto e os meses da projeção", async () => {
    await criarFixo({
      descricao: "Fixo A",
      categoriaId: CATEGORIA_UM,
      meioPagamentoId: CONTA,
      inicio: "2026-01",
    });

    await obterUsoNoMes(fakes, MARCO);

    expect(ocorrencias().map((o) => o.competencia)).toEqual(
      rangeCompetencias(MARCO, addMeses(MARCO, MESES_DE_PROJECAO)),
    );
  });

  it("abrir o mês duas vezes não cria ocorrência nova nem muda a contagem", async () => {
    await criarFixo({
      descricao: "Fixo A",
      categoriaId: CATEGORIA_UM,
      meioPagamentoId: CONTA,
      inicio: "2026-01",
    });

    const primeira = await obterUsoNoMes(fakes, MARCO);
    const segunda = await obterUsoNoMes(fakes, MARCO);

    /* O mês aberto e os doze seguintes (HORIZ-01, AC 1). */
    expect(ocorrencias()).toHaveLength(13);
    expect(segunda.porCategoria.get(CATEGORIA_UM)).toEqual(primeira.porCategoria.get(CATEGORIA_UM));
    expect(segunda.porCategoria.get(CATEGORIA_UM)?.lancamentos).toBe(1);
  });
});

/**
 * **Teste de concordância** (L-014). "Ver em Lançamentos" abre a lista com o
 * filtro da categoria ou do meio, e o número da linha de Cadastros é a promessa
 * de quantas linhas a lista mostra. Cada item da fixture é um ramo em que as
 * duas contagens poderiam divergir: o avulso cancelado, o avulso de abril, a
 * parcela, a receita fixa sem categoria e o fixo encerrado em fevereiro.
 */
describe("obterUsoNoMes — a mesma contagem que Lançamentos mostra com o filtro (CADCOL-03, AC 4)", () => {
  beforeEach(async () => {
    await criarFixo({
      descricao: "Fixo A",
      categoriaId: CATEGORIA_UM,
      meioPagamentoId: CONTA,
      inicio: "2026-01",
    });
    await criarFixo({
      descricao: "Fixo encerrado",
      categoriaId: CATEGORIA_UM,
      meioPagamentoId: CONTA,
      inicio: "2026-01",
      fim: "2026-02",
    });
    await criarFixo({
      descricao: "Entrada A",
      natureza: "RECEITA",
      categoriaId: null,
      meioPagamentoId: CONTA,
      inicio: "2026-01",
    });
    semear({ id: "gasto-a", categoriaId: CATEGORIA_UM, meioPagamentoId: CARTAO });
    semear({
      id: "gasto-cancelado",
      categoriaId: CATEGORIA_DOIS,
      meioPagamentoId: CARTAO,
      canceladoEm: "2026-03-12T10:00:00Z",
    });
    semear({
      id: "gasto-de-abril",
      categoriaId: CATEGORIA_DOIS,
      meioPagamentoId: CARTAO,
      competencia: c("2026-04"),
      dataEvento: "2026-04-10",
    });
    semear({
      id: "parcela-2",
      origem: "PARCELA",
      compraId: "compra-a",
      numeroParcela: 2,
      categoriaId: CATEGORIA_DOIS,
      meioPagamentoId: CARTAO,
    });
  });

  /** O que Lançamentos faz: materializa, lê a visão do mês e filtra. */
  async function linhasDeLancamentos(filtro: {
    categoriaId?: string;
    meioPagamentoId?: string;
  }): Promise<number> {
    await materializarRecorrencias(fakes, MARCO, MESES_DE_PROJECAO);
    const visao = await obterVisaoMensal(fakes, MARCO);
    return filtrarLancamentos(visao.lancamentos, filtro, MARCO).length;
  }

  it.each([
    [CATEGORIA_UM, 2],
    [CATEGORIA_DOIS, 1],
    [CATEGORIA_TRES, 0],
  ])("categoria %s: %i lançamentos, os mesmos da lista filtrada", async (categoriaId, esperado) => {
    const uso = await obterUsoNoMes(fakes, MARCO);
    const contagem = uso.porCategoria.get(categoriaId)?.lancamentos ?? 0;

    expect(contagem).toBe(esperado);
    expect(contagem).toBe(await linhasDeLancamentos({ categoriaId }));
  });

  it.each([
    [CONTA, 2],
    [CARTAO, 2],
    [ROTULO, 0],
  ])("meio %s: %i lançamentos, os mesmos da lista filtrada", async (meioPagamentoId, esperado) => {
    const uso = await obterUsoNoMes(fakes, MARCO);
    const contagem = uso.porMeio.get(meioPagamentoId)?.lancamentos ?? 0;

    expect(contagem).toBe(esperado);
    expect(contagem).toBe(await linhasDeLancamentos({ meioPagamentoId }));
  });
});
