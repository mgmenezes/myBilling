import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type FiltroDeLancamentos,
  filtrarLancamentos,
  type Situacao,
} from "@/application/mes/filtrar-lancamentos";
import { obterVisaoMensal, type VisaoMensal } from "@/application/mes/obter-visao-mensal/handler";
import { criarFakes, type Fakes } from "@/application/ports/fakes";
import type { Cents, Competencia, Lancamento, Natureza } from "@/domain";
import { GradeDeIndicadores } from "./painel-indicadores";

/**
 * Testes derivados de REDE-02 (ACs 1, 2 e 4).
 *
 * É o teste que `design.md:180` prescreveu e que nunca existiu: trocar o filtro
 * de um indicador para a natureza errada não quebrava nada, e o painel podia
 * prometer um total que a lista não confirma.
 *
 * **O predicado sai do `href` do próprio link** (AC 4). Redigitá-lo aqui faria
 * o teste concordar com a minha leitura do componente, não com o que o link
 * leva para a lista — que é justamente o caminho por onde a divergência entra.
 * O mapeamento de query para filtro é o mesmo que a página faz.
 *
 * Valores escolhidos por propriedade aritmética, nomes genéricos (AD-009).
 */

const CARTAO = "22222222-2222-4222-8222-222222222222";
const CONTA = "33333333-3333-4333-8333-333333333333";
const PESSOA_A = "11111111-1111-4111-8111-111111111111";
const MARCO = "2026-03" as Competencia;

let fakes: Fakes;
let visao: VisaoMensal;

function lancamento(campos: Partial<Lancamento> & { id: string }): Lancamento {
  return {
    natureza: "DESPESA",
    origem: "AVULSO",
    descricao: "Lançamento avulso A",
    competencia: MARCO,
    dataEvento: "2026-03-10",
    valor: 1000 as Cents,
    valorPrevisto: null,
    pagoEm: null,
    categoriaId: null,
    usuarioId: PESSOA_A,
    meioPagamentoId: CONTA,
    compraId: null,
    numeroParcela: null,
    recorrenciaId: null,
    canceladoEm: null,
    ...campos,
  };
}

beforeEach(async () => {
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
  );

  /* Receitas ≠ despesas, pago ≠ pendente, e um investimento: sem essa
     separação a igualdade entre dois indicadores passaria por acaso. */
  for (const item of [
    lancamento({ id: "despesa-pendente", valor: 50000 as Cents, meioPagamentoId: CARTAO }),
    lancamento({ id: "despesa-paga", valor: 70000 as Cents, pagoEm: "2026-03-12" }),
    lancamento({
      id: "receita-recebida",
      natureza: "RECEITA",
      valor: 500000 as Cents,
      pagoEm: "2026-03-05",
    }),
    lancamento({ id: "receita-a-receber", natureza: "RECEITA", valor: 30000 as Cents }),
    lancamento({
      id: "aporte",
      natureza: "INVESTIMENTO",
      valor: 80000 as Cents,
      pagoEm: "2026-03-07",
    }),
  ]) {
    fakes.estado.movimentos.set(item.id, item);
  }

  visao = await obterVisaoMensal(fakes, MARCO);
});

afterEach(cleanup);

function montar(
  tipo: "planejamento" | "movimentacoes",
  /* O mês de hoje. Por padrão é o próprio mês aberto, que é o recorte em que
     os testes de reconciliação nasceram. */
  corrente: Competencia = MARCO,
) {
  return render(
    <GradeDeIndicadores
      competencia={MARCO}
      competenciaCorrente={corrente}
      visao={tipo}
      planejamento={{
        entradas: visao.competenciaView.entradas,
        totalGastos: visao.competenciaView.totalGastos,
        pendente: visao.competenciaView.pendente,
        saldo: visao.competenciaView.saldo,
      }}
      movimentacoes={{
        entradasRecebidas: visao.caixaView.entradasRecebidas,
        saidas: visao.caixaView.saidas,
        saldo: visao.caixaView.saldo,
      }}
    />,
  );
}

/** O valor impresso no cartão, de volta em centavos inteiros (AD-001). */
function valorExibido(elemento: Element): number {
  const encontrado = (elemento.textContent ?? "").match(/R\$\s*([\d.]*\d),(\d{2})/);
  if (encontrado === null) {
    throw new Error(`cartão sem valor legível em: ${elemento.textContent}`);
  }
  return Number(encontrado[1]?.replaceAll(".", "")) * 100 + Number(encontrado[2]);
}

/** O mesmo mapeamento de query para filtro que a página de lançamentos faz. */
function filtroDoLink(href: string): FiltroDeLancamentos {
  const query = new URLSearchParams(href.split("?")[1] ?? "");
  const opcional = (chave: string) => query.get(chave) ?? undefined;
  return {
    busca: opcional("busca"),
    categoriaId: opcional("categoriaId"),
    meioPagamentoId: opcional("meioPagamentoId"),
    usuarioId: opcional("usuarioId"),
    situacao: opcional("situacao") as Situacao | undefined,
    natureza: opcional("natureza") as Natureza | undefined,
  };
}

function somaDaLista(filtro: FiltroDeLancamentos, corrente: Competencia = MARCO): number {
  return listaFiltrada(filtro, corrente).reduce((total, item) => total + item.lancamento.valor, 0);
}

function listaFiltrada(filtro: FiltroDeLancamentos, corrente: Competencia = MARCO) {
  return filtrarLancamentos(visao.lancamentos, filtro, corrente);
}

/** O cartão de um indicador, seja ele link ou o cartão de ênfase sem link. */
function cartao(rotulo: string): HTMLElement {
  const nome = screen.getByText(rotulo);
  const caixa = nome.parentElement;
  if (caixa === null) {
    throw new Error(`indicador "${rotulo}" sem cartão`);
  }
  return caixa;
}

function href(rotulo: string): string {
  const link = screen.getByRole("link", { name: new RegExp(rotulo) });
  return link.getAttribute("href") ?? "";
}

describe("o eixo competência reconcilia com a lista (REDE-02, AC 1)", () => {
  for (const rotulo of ["Receitas do mês", "Despesas do mês", "Ainda não pago"]) {
    it(`"${rotulo}" exibe a soma da lista filtrada pelo filtro do seu link`, () => {
      montar("planejamento");

      const exibido = valorExibido(cartao(rotulo));

      expect(exibido).toBe(somaDaLista(filtroDoLink(href(rotulo))));
      /* E não é zero: uma igualdade entre dois zeros não provaria nada. */
      expect(exibido).toBeGreaterThan(0);
    });
  }

  /* O cartão de saldo não leva filtro nenhum — ele é composição, não recorte.
     A reconciliação possível é a fórmula, sobre a mesma lista. */
  it('"Saldo previsto" é entradas menos gastos menos investimentos da lista', () => {
    montar("planejamento");

    const exibido = valorExibido(cartao("Saldo previsto"));

    expect(exibido).toBe(
      somaDaLista({ natureza: "RECEITA" }) -
        somaDaLista({ natureza: "DESPESA" }) -
        somaDaLista({ natureza: "INVESTIMENTO" }),
    );
    expect(exibido).toBeGreaterThan(0);
  });

  it("apresenta exatamente quatro indicadores no eixo competência", () => {
    montar("planejamento");

    for (const rotulo of [
      "Receitas do mês",
      "Despesas do mês",
      "Ainda não pago",
      "Saldo previsto",
    ]) {
      expect(screen.getByText(rotulo)).toBeTruthy();
    }
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });
});

describe("o eixo caixa reconcilia com a lista (REDE-02, AC 2)", () => {
  for (const rotulo of ["Recebido", "Saiu da conta", "Ainda não saiu"]) {
    it(`"${rotulo}" exibe a soma da lista filtrada pelo filtro do seu link`, () => {
      montar("movimentacoes");

      const exibido = valorExibido(cartao(rotulo));

      expect(exibido).toBe(somaDaLista(filtroDoLink(href(rotulo))));
      expect(exibido).toBeGreaterThan(0);
    });
  }

  it('"Saldo do período" é o recebido menos o que saiu menos o investido', () => {
    montar("movimentacoes");

    const exibido = valorExibido(cartao("Saldo do período"));

    expect(exibido).toBe(
      somaDaLista({ natureza: "RECEITA", situacao: "PAGO" }) -
        somaDaLista({ natureza: "DESPESA", situacao: "PAGO" }) -
        somaDaLista({ natureza: "INVESTIMENTO", situacao: "PAGO" }),
    );
    expect(exibido).toBeGreaterThan(0);
  });

  it("apresenta exatamente quatro indicadores no eixo caixa", () => {
    montar("movimentacoes");

    for (const rotulo of ["Recebido", "Saiu da conta", "Ainda não saiu", "Saldo do período"]) {
      expect(screen.getByText(rotulo)).toBeTruthy();
    }
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });
});

describe("o link de cada indicador abre a lista da competência aberta", () => {
  it("leva para a lista do mês, e não para outra competência", () => {
    montar("planejamento");

    for (const rotulo of ["Receitas do mês", "Despesas do mês", "Ainda não pago"]) {
      expect(href(rotulo).startsWith(`/${MARCO}/lancamentos?`)).toBe(true);
    }
  });

  /* Sem isto, dois indicadores com o mesmo filtro passariam nos testes acima
     e a lista mostraria o mesmo recorte para cartões que dizem coisas
     diferentes. */
  it("cada indicador do eixo carrega um filtro distinto", () => {
    montar("planejamento");

    const filtros = ["Receitas do mês", "Despesas do mês", "Ainda não pago"].map(href);
    expect(new Set(filtros).size).toBe(3);
  });
});

/**
 * O indicador do não pago em mês passado (T15).
 *
 * Com a competência corrente vindo do relógio, todo não pago de mês passado
 * virou `VENCIDO` — e o link do cartão continuava carregando
 * `situacao=PENDENTE`. O cartão mostrava um número e a lista voltava vazia.
 * Os testes acima não pegavam porque o mês aberto deles é o mês corrente.
 */
describe("o não pago aponta para o estado que o mês tem (REDE-02, ACs 1, 3 e 4)", () => {
  /** Seis meses depois do mês aberto: março está no passado. */
  const SETEMBRO = "2026-09" as Competencia;

  for (const caso of [
    { visao: "planejamento" as const, rotulo: "Ainda não pago" },
    { visao: "movimentacoes" as const, rotulo: "Ainda não saiu" },
  ]) {
    it(`"${caso.rotulo}" leva à lista filtrada por Vencido em mês passado`, () => {
      montar(caso.visao, SETEMBRO);

      expect(href(caso.rotulo)).toContain("situacao=VENCIDO");
    });

    it(`a lista que "${caso.rotulo}" abre não volta vazia em mês passado`, () => {
      montar(caso.visao, SETEMBRO);

      expect(listaFiltrada(filtroDoLink(href(caso.rotulo)), SETEMBRO).length).toBeGreaterThan(0);
    });

    it(`o total de "${caso.rotulo}" é a soma da lista que ele abre, em mês passado`, () => {
      montar(caso.visao, SETEMBRO);

      const exibido = valorExibido(cartao(caso.rotulo));

      expect(exibido).toBe(somaDaLista(filtroDoLink(href(caso.rotulo)), SETEMBRO));
      expect(exibido).toBeGreaterThan(0);
    });

    it(`"${caso.rotulo}" continua em Pendente no mês corrente`, () => {
      montar(caso.visao, MARCO);

      expect(href(caso.rotulo)).toContain("situacao=PENDENTE");
    });

    it(`"${caso.rotulo}" continua em Pendente quando o mês aberto é futuro`, () => {
      /* Hoje em janeiro, com março aberto: o não pago de março ainda não
         venceu. */
      montar(caso.visao, "2026-01" as Competencia);

      expect(href(caso.rotulo)).toContain("situacao=PENDENTE");
    });
  }
});
