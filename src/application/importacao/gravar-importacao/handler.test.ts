import { describe, expect, it } from "vitest";
import type { Fakes } from "@/application/ports/fakes";
import type { EntradaDaImportacao } from "../prever-importacao/handler";
import {
  CONTA,
  c,
  conteudoDaFixture,
  criarCenario,
  DECISOES_DE_OUTUBRO,
  DECISOES_NOVAS_DE_NOVEMBRO,
  decisoes,
  type Mes,
  PESSOA_A,
  ROXO,
  VERDE,
} from "../testing/cenario";
import { type EntradaGravarImportacao, gravarImportacao } from "./handler";

/**
 * A gravação de uma aba sobre os fakes (T18): o plano da prévia executado
 * pelos casos de uso que já existem (IMP-03, IMP-07), as recusas antes de
 * qualquer escrita (IMP-04 AC 7, IMP-05 AC 8) e o registro com as decisões
 * lembradas (IMP-04 AC 4). O rollback de verdade é prova de integração, em T19.
 */

const AGORA = "2026-11-05T12:00:00.000Z";

function entrada(
  mes: Mes,
  competencia: string,
  mudancas: Partial<EntradaGravarImportacao> = {},
): EntradaGravarImportacao {
  return {
    nomeArquivo: `Planilha 2026 - ${mes}.csv`,
    conteudo: conteudoDaFixture(mes),
    competencia: c(competencia),
    decisoes: DECISOES_DE_OUTUBRO,
    confirmouDivergencia: true,
    usuarioId: PESSOA_A,
    agora: AGORA,
    ...mudancas,
  };
}

const outubro = (mudancas: Partial<EntradaGravarImportacao> = {}) =>
  entrada("Outubro", "2026-10", mudancas);
const novembro = (mudancas: Partial<EntradaDaImportacao> = {}) =>
  entrada("Novembro", "2026-11", { decisoes: DECISOES_NOVAS_DE_NOVEMBRO, ...mudancas });

function categoriaDe(fakes: Fakes, id: string | null): string | null {
  return id === null ? null : (fakes.estado.categorias.find((cat) => cat.id === id)?.nome ?? id);
}

function recorrenciasGravadas(fakes: Fakes) {
  return [...fakes.estado.recorrencias.values()].map(({ recorrencia: r, versoes }) => ({
    descricao: r.descricao,
    natureza: r.natureza,
    meio: r.meioPagamentoId,
    categoria: categoriaDe(fakes, r.categoriaId),
    usuarioId: r.usuarioId,
    inicio: r.competenciaInicio,
    fim: r.competenciaFim,
    diaVencimento: r.diaVencimento,
    versoes: versoes.map((v) => [v.vigenteDesde, v.valorPrevisto]),
  }));
}

function parcelasDa(fakes: Fakes, compraId: string) {
  return [...fakes.estado.movimentos.values()]
    .filter((m) => m.compraId === compraId)
    .sort((a, b) => (a.numeroParcela ?? 0) - (b.numeroParcela ?? 0));
}

function comprasGravadas(fakes: Fakes) {
  return [...fakes.estado.compras.values()].map((compra) => {
    const parcelas = parcelasDa(fakes, compra.id);
    return {
      descricao: parcelas[0]?.descricao,
      meio: parcelas[0]?.meioPagamentoId,
      categoria: categoriaDe(fakes, parcelas[0]?.categoriaId ?? null),
      qtdParcelas: compra.qtdParcelas,
      parcelaInicial: compra.parcelaInicial,
      valorTotal: compra.valorTotal,
      amortizado: compra.valorAmortizadoAnterior,
      parcelas: parcelas.map((p) => [p.numeroParcela, p.competencia, p.valor]),
    };
  });
}

function avulsosGravados(fakes: Fakes) {
  return [...fakes.estado.movimentos.values()]
    .filter((m) => m.origem === "AVULSO")
    .map((m) => ({
      descricao: m.descricao,
      natureza: m.natureza,
      meio: m.meioPagamentoId,
      categoria: categoriaDe(fakes, m.categoriaId),
      valor: m.valor,
      competencia: m.competencia,
      origem: fakes.estado.origensDeDado.get(m.id),
    }));
}

function compraChamada(fakes: Fakes, descricao: string, valorDaPrimeira: number) {
  return comprasGravadas(fakes).find(
    (compra) => compra.descricao === descricao && compra.parcelas[0]?.[2] === valorDaPrimeira,
  );
}

function recorrenciaChamada(fakes: Fakes, descricao: string, meio: string) {
  return recorrenciasGravadas(fakes).find((r) => r.descricao === descricao && r.meio === meio);
}

describe("gravarImportacao: outubro num banco vazio (T18, IMP-03)", () => {
  it("cria as seis recorrências com a versão de outubro, dia 1, em nome de quem importa (AC 2 e 3)", async () => {
    const fakes = criarCenario();

    await gravarImportacao(fakes.transacao, outubro());

    const fixa = (descricao: string, natureza: string, meio: string, categoria: string | null) => ({
      descricao,
      natureza,
      meio,
      categoria,
      usuarioId: PESSOA_A,
      inicio: "2026-10",
      fim: null,
      diaVencimento: 1,
    });
    expect(recorrenciasGravadas(fakes)).toEqual([
      { ...fixa("Aluguel", "DESPESA", CONTA, "Moradia"), versoes: [["2026-10", 150000]] },
      { ...fixa("Internet", "DESPESA", ROXO, "Assinaturas"), versoes: [["2026-10", 10000]] },
      { ...fixa("Academia", "DESPESA", CONTA, "Saúde"), versoes: [["2026-10", 12000]] },
      { ...fixa("Academia", "DESPESA", ROXO, "Saúde"), versoes: [["2026-10", 12000]] },
      { ...fixa("Salário A", "RECEITA", CONTA, null), versoes: [["2026-10", 600000]] },
      { ...fixa("Salário B", "RECEITA", CONTA, null), versoes: [["2026-10", 400000]] },
    ]);
  });

  it("cria as seis compras em andamento, com as parcelas de n a t a partir de outubro (AC 5 e 6)", async () => {
    const fakes = criarCenario();

    await gravarImportacao(fakes.transacao, outubro());

    expect(comprasGravadas(fakes)).toEqual([
      {
        descricao: "Sofá",
        meio: ROXO,
        categoria: "Casa",
        qtdParcelas: 10,
        parcelaInicial: 7,
        valorTotal: 210000,
        amortizado: 126000,
        parcelas: [
          [7, "2026-10", 21000],
          [8, "2026-11", 21000],
          [9, "2026-12", 21000],
          [10, "2027-01", 21000],
        ],
      },
      {
        descricao: "Fone",
        meio: ROXO,
        categoria: "Eletrônicos",
        qtdParcelas: 3,
        parcelaInicial: 1,
        valorTotal: 10002,
        amortizado: 0,
        parcelas: [
          [1, "2026-10", 3334],
          [2, "2026-11", 3334],
          [3, "2026-12", 3334],
        ],
      },
      {
        descricao: "Curso",
        meio: VERDE,
        categoria: "Estudo",
        qtdParcelas: 3,
        parcelaInicial: 3,
        valorTotal: 15000,
        amortizado: 10000,
        parcelas: [[3, "2026-10", 5000]],
      },
      {
        descricao: "Óculos",
        meio: CONTA,
        categoria: "Saúde",
        qtdParcelas: 5,
        parcelaInicial: 2,
        valorTotal: 40000,
        amortizado: 8000,
        parcelas: [
          [2, "2026-10", 8000],
          [3, "2026-11", 8000],
          [4, "2026-12", 8000],
          [5, "2027-01", 8000],
        ],
      },
      {
        descricao: "Livro",
        meio: ROXO,
        categoria: "Estudo",
        qtdParcelas: 2,
        parcelaInicial: 1,
        valorTotal: 4000,
        amortizado: 0,
        parcelas: [
          [1, "2026-10", 2000],
          [2, "2026-11", 2000],
        ],
      },
      {
        descricao: "Livro",
        meio: ROXO,
        categoria: "Estudo",
        qtdParcelas: 2,
        parcelaInicial: 1,
        valorTotal: 6000,
        amortizado: 0,
        parcelas: [
          [1, "2026-10", 3000],
          [2, "2026-11", 3000],
        ],
      },
    ]);
  });

  it("cria os quatro avulsos com a origem da planilha e a chave de cada linha (AC 4, 7 e 8)", async () => {
    const fakes = criarCenario();

    await gravarImportacao(fakes.transacao, outubro());

    const daPlanilha = (chave: string) => ({ fonte: "PLANILHA", chave });
    expect(avulsosGravados(fakes)).toEqual([
      {
        descricao: "Feira",
        natureza: "DESPESA",
        meio: CONTA,
        categoria: "Mercado",
        valor: 8740,
        competencia: "2026-10",
        origem: daPlanilha("2026-10|GASTOS|0"),
      },
      {
        descricao: "Farmácia",
        natureza: "DESPESA",
        meio: ROXO,
        categoria: "Saúde",
        valor: 2510,
        competencia: "2026-10",
        origem: daPlanilha("2026-10|GASTOS|1"),
      },
      {
        descricao: "Padaria",
        natureza: "DESPESA",
        meio: ROXO,
        categoria: "Mercado",
        valor: 1200,
        competencia: "2026-10",
        origem: daPlanilha("2026-10|GASTOS|2"),
      },
      {
        descricao: "Reembolso",
        natureza: "RECEITA",
        meio: CONTA,
        categoria: null,
        valor: 15000,
        competencia: "2026-10",
        origem: daPlanilha("2026-10|ENTRADAS|2"),
      },
    ]);
  });

  it("todo lançamento gravado é de quem importa, do dia 1 de outubro e previsto (AC 1)", async () => {
    const fakes = criarCenario();

    await gravarImportacao(fakes.transacao, outubro());

    const lancamentos = [...fakes.estado.movimentos.values()];
    expect(lancamentos).toHaveLength(20);
    expect(new Set(lancamentos.map((m) => m.usuarioId))).toEqual(new Set([PESSOA_A]));
    expect(new Set(lancamentos.map((m) => m.dataEvento))).toEqual(new Set(["2026-10-01"]));
    expect(new Set(lancamentos.map((m) => m.pagoEm))).toEqual(new Set([null]));
  });

  it("cria as oito categorias com a grafia da primeira linha, sem Seguros (AC 9 a 11)", async () => {
    const fakes = criarCenario();

    await gravarImportacao(fakes.transacao, outubro());

    expect(fakes.estado.categorias.map((cat) => [cat.nome, cat.arquivadaEm])).toEqual([
      ["Categoria Um", null],
      ["Moradia", null],
      ["Assinaturas", null],
      ["Saúde", null],
      ["Casa", null],
      ["Eletrônicos", null],
      ["Estudo", null],
      ["Mercado", null],
      ["Lazer", null],
    ]);
  });

  it("reativa a categoria arquivada de mesmo nome em vez de criar outra (AC 9)", async () => {
    const fakes = criarCenario();
    fakes.estado.categorias.push({
      id: "categoria-arquivada",
      nome: "lazer",
      arquivadaEm: "2026-09-01T12:00:00.000Z",
      cor: null,
    });

    await gravarImportacao(fakes.transacao, outubro());

    expect(fakes.estado.categorias.filter((cat) => cat.nome.toLowerCase() === "lazer")).toEqual([
      { id: "categoria-arquivada", nome: "lazer", arquivadaEm: null, cor: null },
    ]);
  });

  it("registra a importação e lembra as decisões usadas, e o resumo conta 16 criados (IMP-04 AC 4)", async () => {
    const fakes = criarCenario();

    const resultado = await gravarImportacao(fakes.transacao, outubro());

    expect(resultado).toEqual({
      ok: true,
      value: {
        competencia: "2026-10",
        proxima: "2026-11",
        criados: 16,
        alterados: 0,
        encerrados: 0,
      },
    });
    expect(fakes.estado.importacoes).toEqual([
      { competencia: "2026-10", nomeArquivo: "Planilha 2026 - Outubro.csv", usuarioId: PESSOA_A },
    ]);
    expect(fakes.estado.decisoes.meios).toEqual(DECISOES_DE_OUTUBRO.meios);
    expect(fakes.estado.decisoes.entradas).toEqual(DECISOES_DE_OUTUBRO.entradas);
  });
});

describe("gravarImportacao: recusas antes de qualquer escrita (T18)", () => {
  it("divergência sem confirmação → IMPORTACAO_DIVERGENCIA_NAO_CONFIRMADA, nada gravado (IMP-05 AC 8)", async () => {
    const fakes = criarCenario();
    const antes = structuredClone(fakes.estado);

    const resultado = await gravarImportacao(
      fakes.transacao,
      outubro({ confirmouDivergencia: false }),
    );

    expect(resultado).toEqual({
      ok: false,
      error: { code: "IMPORTACAO_DIVERGENCIA_NAO_CONFIRMADA" },
    });
    expect(fakes.estado).toEqual(antes);
  });

  it("um Tipo sem meio → IMPORTACAO_PENDENCIA_ABERTA, nada gravado (IMP-04 AC 7)", async () => {
    const fakes = criarCenario();
    const antes = structuredClone(fakes.estado);
    const semCartaoVerde = decisoes(
      { débito: CONTA, "cartão roxo": ROXO },
      Object.fromEntries(DECISOES_DE_OUTUBRO.entradas),
    );

    const resultado = await gravarImportacao(
      fakes.transacao,
      outubro({ decisoes: semCartaoVerde }),
    );

    expect(resultado).toEqual({ ok: false, error: { code: "IMPORTACAO_PENDENCIA_ABERTA" } });
    expect(fakes.estado).toEqual(antes);
  });

  it("repetir outubro depois de gravado → IMPORTACAO_FORA_DE_ORDEM, nada gravado (IMP-02 AC 5)", async () => {
    const fakes = criarCenario();
    await gravarImportacao(fakes.transacao, outubro());
    const antes = structuredClone(fakes.estado);

    const resultado = await gravarImportacao(fakes.transacao, outubro());

    expect(resultado).toEqual({
      ok: false,
      error: { code: "IMPORTACAO_FORA_DE_ORDEM", detalhes: { esperada: "2026-11" } },
    });
    expect(fakes.estado).toEqual(antes);
  });

  it("recusa de um caso de uso reaproveitado lança, para a transação desfazer tudo (IMP-06 AC 2)", async () => {
    const fakes = criarCenario();
    const verde = fakes.estado.meiosDePagamento.findIndex((m) => m.id === VERDE);
    const atual = fakes.estado.meiosDePagamento[verde];
    if (atual) {
      fakes.estado.meiosDePagamento[verde] = { ...atual, arquivadoEm: "2026-09-01T12:00:00.000Z" };
    }

    await expect(gravarImportacao(fakes.transacao, outubro())).rejects.toThrow(
      "MEIO_PAGAMENTO_ARQUIVADO",
    );
    expect(fakes.estado.importacoes).toEqual([]);
  });
});

describe("gravarImportacao: novembro depois de outubro (T18, IMP-07)", () => {
  async function depoisDeNovembro() {
    const fakes = criarCenario();
    await gravarImportacao(fakes.transacao, outubro());
    const resultado = await gravarImportacao(fakes.transacao, novembro());
    return { fakes, resultado };
  }

  it("a Internet ganha a vigência de novembro com R$ 110,00, pelo registrar-versao (AC 4)", async () => {
    const { fakes } = await depoisDeNovembro();

    expect(recorrenciaChamada(fakes, "Internet", ROXO)?.versoes).toEqual([
      ["2026-10", 10000],
      ["2026-11", 11000],
    ]);
    expect(recorrenciaChamada(fakes, "Salário B", CONTA)?.versoes).toEqual([
      ["2026-10", 400000],
      ["2026-11", 420000],
    ]);
  });

  it("a Academia no Cartão Roxo é encerrada com fim em outubro, pelo encerrar (AC 5)", async () => {
    const { fakes } = await depoisDeNovembro();

    expect(recorrenciaChamada(fakes, "Academia", ROXO)?.fim).toBe("2026-10");
    expect(recorrenciaChamada(fakes, "Academia", CONTA)?.fim).toBeNull();
    const encerrada = [...fakes.estado.recorrencias.values()].find(
      ({ recorrencia }) =>
        recorrencia.descricao === "Academia" && recorrencia.meioPagamentoId === ROXO,
    );
    expect(encerrada?.recorrencia.encerradaEm).toBe(AGORA);
  });

  it("o Fone é reprecificado da parcela 2 em diante, com total 10000 (AC 10)", async () => {
    const { fakes } = await depoisDeNovembro();

    const fone = compraChamada(fakes, "Fone", 3334);
    expect(fone?.parcelas).toEqual([
      [1, "2026-10", 3334],
      [2, "2026-11", 3333],
      [3, "2026-12", 3333],
    ]);
    expect(fone?.valorTotal).toBe(10000);
    expect(compraChamada(fakes, "Livro", 3000)?.valorTotal).toBe(6002);
  });

  it("o Tênis vira compra nova e as compras reconhecidas não se repetem (AC 7)", async () => {
    const { fakes } = await depoisDeNovembro();

    expect(compraChamada(fakes, "Tênis", 15000)).toEqual({
      descricao: "Tênis",
      meio: ROXO,
      categoria: "Vestuário",
      qtdParcelas: 2,
      parcelaInicial: 1,
      valorTotal: 30000,
      amortizado: 0,
      parcelas: [
        [1, "2026-11", 15000],
        [2, "2026-12", 15000],
      ],
    });
    expect(fakes.estado.compras.size).toBe(7);
    expect(fakes.estado.recorrencias.size).toBe(7);
  });

  it("reaproveita as categorias de outubro e só cria Vestuário (IMP-03 AC 9 e 10)", async () => {
    const { fakes } = await depoisDeNovembro();

    expect(fakes.estado.categorias.map((cat) => cat.nome)).toEqual([
      "Categoria Um",
      "Moradia",
      "Assinaturas",
      "Saúde",
      "Casa",
      "Eletrônicos",
      "Estudo",
      "Mercado",
      "Lazer",
      "Vestuário",
    ]);
    expect(
      recorrenciaChamada(
        fakes,
        "Streaming",
        DECISOES_NOVAS_DE_NOVEMBRO.meios.get("cartão azul") ?? "",
      )?.categoria,
    ).toBe("Assinaturas");
  });

  it("o resumo conta 5 criados, 4 alterados e 1 encerrado, e a próxima é dezembro", async () => {
    const { resultado } = await depoisDeNovembro();

    expect(resultado).toEqual({
      ok: true,
      value: {
        competencia: "2026-11",
        proxima: "2026-12",
        criados: 5,
        alterados: 4,
        encerrados: 1,
      },
    });
  });

  it("lembra as decisões novas ao lado das de outubro (IMP-04 AC 4)", async () => {
    const { fakes } = await depoisDeNovembro();

    expect(Object.fromEntries(fakes.estado.decisoes.meios)).toEqual({
      débito: CONTA,
      "cartão roxo": ROXO,
      "cartão verde": VERDE,
      "cartão azul": DECISOES_NOVAS_DE_NOVEMBRO.meios.get("cartão azul"),
    });
    expect([...fakes.estado.decisoes.entradas.keys()]).toEqual([
      "salário a",
      "salário b",
      "reembolso",
      "presente",
    ]);
    expect(fakes.estado.importacoes.map((i) => i.competencia)).toEqual(["2026-10", "2026-11"]);
  });
});
