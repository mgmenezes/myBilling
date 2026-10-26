import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { type Competencia, criarCompetencia } from "../shared/competencia";
import type { Cents } from "../shared/money";
import type { Categoria } from "../tipos";
import { type Grade, lerCsv } from "./csv";
import { type AbaLida, lerAba } from "./ler-aba";
import {
  type DecisaoDeEntrada,
  type DecisoesDaImportacao,
  type EstadoParaImportacao,
  type PlanoDeImportacao,
  planejarImportacao,
} from "./planejar-importacao";
import type { CompraEmCurso } from "./reconhecer-compras";
import type { RecorrenciaVigente } from "./reconhecer-recorrencias";

type Mes = "Outubro" | "Novembro" | "Dezembro";

const CONTA = "meio-conta-corrente";
const ROXO = "meio-cartao-roxo";
const VERDE = "meio-cartao-verde";
const AZUL = "meio-cartao-azul";

function gradeDaFixture(mes: Mes): Grade {
  const texto = readFileSync(
    join(__dirname, "__fixtures__", `Planilha 2026 - ${mes}.csv`),
    "utf-8",
  );
  const grade = lerCsv(texto);
  if (!grade.ok) {
    throw new Error(`fixture ilegível: ${mes}`);
  }
  return grade.value;
}

function abaDe(grade: Grade): AbaLida {
  const aba = lerAba(grade);
  if (!aba.ok) {
    throw new Error(`aba recusada: ${JSON.stringify(aba.error)}`);
  }
  return aba.value;
}

function abaDaFixture(mes: Mes): AbaLida {
  return abaDe(gradeDaFixture(mes));
}

function substituir(grade: Grade, de: string, para: string): Grade {
  return grade.map((linha) => linha.map((celula) => (celula === de ? para : celula)));
}

function comp(texto: string): Competencia {
  const competencia = criarCompetencia(texto);
  if (!competencia.ok) {
    throw new Error(`fixture inválida: ${texto}`);
  }
  return competencia.value;
}

function decisoes(
  meios: Record<string, string>,
  entradas: Record<string, DecisaoDeEntrada>,
): DecisoesDaImportacao {
  return { meios: new Map(Object.entries(meios)), entradas: new Map(Object.entries(entradas)) };
}

const SEM_DECISOES = decisoes({}, {});

const DECISOES_DE_OUTUBRO = decisoes(
  { débito: CONTA, "cartão roxo": ROXO, "cartão verde": VERDE },
  {
    "salário a": { classe: "FIXA", contaId: CONTA },
    "salário b": { classe: "FIXA", contaId: CONTA },
    reembolso: { classe: "AVULSA", contaId: CONTA },
  },
);

/** O que outubro deixou lembrado, mais as duas decisões que novembro pede. */
const DECISOES_DE_NOVEMBRO = decisoes(
  { débito: CONTA, "cartão roxo": ROXO, "cartão verde": VERDE, "cartão azul": AZUL },
  {
    "salário a": { classe: "FIXA", contaId: CONTA },
    "salário b": { classe: "FIXA", contaId: CONTA },
    reembolso: { classe: "AVULSA", contaId: CONTA },
    presente: { classe: "AVULSA", contaId: CONTA },
  },
);

function categoria(id: string, nome: string, arquivadaEm: string | null = null): Categoria {
  return { id, nome, arquivadaEm };
}

function vigente(id: string, descricao: string, meio: string, valor: number): RecorrenciaVigente {
  return { id, descricao, meioPagamentoId: meio, valorEmM: valor as Cents };
}

function emCurso(
  compraId: string,
  descricao: string,
  meio: string,
  qtdParcelas: number,
  numeroEmM: number,
  valor: number,
): CompraEmCurso {
  return {
    compraId,
    descricao,
    meioPagamentoId: meio,
    qtdParcelas,
    numeroEmM,
    valorEmM: valor as Cents,
  };
}

const ESTADO_DE_OUTUBRO: EstadoParaImportacao = {
  competencia: comp("2026-10"),
  despesasFixasVigentes: [],
  receitasFixasVigentes: [],
  comprasEmCurso: [],
  categorias: [categoria("cat-um", "Categoria Um")],
};

const CATEGORIAS_DEPOIS_DE_OUTUBRO = [
  categoria("cat-um", "Categoria Um"),
  categoria("cat-moradia", "Moradia"),
  categoria("cat-assinaturas", "Assinaturas"),
  categoria("cat-saude", "Saúde"),
  categoria("cat-casa", "Casa"),
  categoria("cat-eletronicos", "Eletrônicos"),
  categoria("cat-estudo", "Estudo"),
  categoria("cat-mercado", "Mercado"),
  categoria("cat-lazer", "Lazer"),
];

/** O banco depois de outubro, visto de novembro: vale em 2026-10, valor em 2026-11. */
const ESTADO_DE_NOVEMBRO: EstadoParaImportacao = {
  competencia: comp("2026-11"),
  despesasFixasVigentes: [
    vigente("rec-aluguel", "Aluguel", CONTA, 150000),
    vigente("rec-internet", "Internet", ROXO, 10000),
    vigente("rec-academia-conta", "Academia", CONTA, 12000),
    vigente("rec-academia-roxo", "Academia", ROXO, 12000),
  ],
  receitasFixasVigentes: [
    vigente("rec-salario-a", "Salário A", CONTA, 600000),
    vigente("rec-salario-b", "Salário B", CONTA, 400000),
  ],
  comprasEmCurso: [
    emCurso("compra-sofa", "Sofá", ROXO, 10, 8, 21000),
    emCurso("compra-fone", "Fone", ROXO, 3, 2, 3334),
    emCurso("compra-oculos", "Óculos", CONTA, 5, 3, 8000),
    emCurso("compra-livro-20", "Livro", ROXO, 2, 2, 2000),
    emCurso("compra-livro-30", "Livro", ROXO, 2, 2, 3000),
  ],
  categorias: CATEGORIAS_DEPOIS_DE_OUTUBRO,
};

/** O banco depois de novembro, visto de dezembro. */
const ESTADO_DE_DEZEMBRO: EstadoParaImportacao = {
  competencia: comp("2026-12"),
  despesasFixasVigentes: [
    vigente("rec-aluguel", "Aluguel", CONTA, 150000),
    vigente("rec-internet", "Internet", ROXO, 11000),
    vigente("rec-academia-conta", "Academia", CONTA, 12000),
    vigente("rec-streaming", "Streaming", AZUL, 3000),
  ],
  receitasFixasVigentes: [
    vigente("rec-salario-a", "Salário A", CONTA, 600000),
    vigente("rec-salario-b", "Salário B", CONTA, 420000),
  ],
  comprasEmCurso: [
    emCurso("compra-sofa", "Sofá", ROXO, 10, 9, 21000),
    emCurso("compra-fone", "Fone", ROXO, 3, 3, 3333),
    emCurso("compra-oculos", "Óculos", CONTA, 5, 4, 8000),
    emCurso("compra-tenis", "Tênis", ROXO, 2, 2, 15000),
  ],
  categorias: [...CATEGORIAS_DEPOIS_DE_OUTUBRO, categoria("cat-vestuario", "Vestuário")],
};

function planoDe(
  aba: AbaLida,
  estado: EstadoParaImportacao,
  escolhas: DecisoesDaImportacao,
): PlanoDeImportacao {
  return planejarImportacao({ aba, estado, decisoes: escolhas });
}

function operacoesDe(plano: PlanoDeImportacao) {
  if (plano.operacoes === null) {
    throw new Error(`plano com pendência: ${JSON.stringify(plano.pendencias)}`);
  }
  return plano.operacoes;
}

describe("planejarImportacao — outubro sem decisões (IMP-04)", () => {
  const plano = planoDe(abaDaFixture("Outubro"), ESTADO_DE_OUTUBRO, SEM_DECISOES);

  it("pede um meio por Tipo, contando só as linhas lidas (AC 1)", () => {
    expect(plano.pendencias.tiposSemMeio).toEqual([
      { chave: "débito", nome: "Débito", linhas: 4 },
      { chave: "cartão roxo", nome: "Cartão Roxo", linhas: 8 },
      { chave: "cartão verde", nome: "Cartão Verde", linhas: 1 },
    ]);
  });

  it("pede a classificação de cada entrada (AC 3)", () => {
    expect(plano.pendencias.entradasSemClasse).toEqual([
      { chave: "salário a", nome: "Salário A" },
      { chave: "salário b", nome: "Salário B" },
      { chave: "reembolso", nome: "Reembolso" },
    ]);
  });

  it("não monta operação enquanto houver pendência", () => {
    expect(plano.operacoes).toBeNull();
  });

  it("já traz a conferência e as não lidas, que não dependem de decisão", () => {
    expect(plano.conferencia.blocos.GASTOS.diferenca).toBe(-1200);
    expect(plano.naoLidas).toEqual([
      {
        bloco: "FIXOS",
        posicao: 4,
        nome: "Seguro (casa, carro)",
        tipo: "Débito",
        motivo: "VALOR_VAZIO",
      },
    ]);
  });

  it("só a entrada sem classificação já é pendência (AC 7)", () => {
    const soMeios = decisoes({ débito: CONTA, "cartão roxo": ROXO, "cartão verde": VERDE }, {});
    const comPendencia = planoDe(abaDaFixture("Outubro"), ESTADO_DE_OUTUBRO, soMeios);

    expect(comPendencia.pendencias.tiposSemMeio).toEqual([]);
    expect(comPendencia.pendencias.entradasSemClasse).toHaveLength(3);
    expect(comPendencia.operacoes).toBeNull();
  });
});

describe("planejarImportacao — outubro com as decisões completas (IMP-03, IMP-05)", () => {
  const plano = planoDe(abaDaFixture("Outubro"), ESTADO_DE_OUTUBRO, DECISOES_DE_OUTUBRO);
  const operacoes = operacoesDe(plano);

  it("não deixa pendência", () => {
    expect(plano.pendencias).toEqual({ tiposSemMeio: [], entradasSemClasse: [] });
  });

  it("cria 6 recorrências: 4 despesas e 2 receitas sem categoria (IMP-03 AC 2 e 3)", () => {
    expect(operacoes.recorrenciasNovas).toEqual([
      {
        natureza: "DESPESA",
        descricao: "Aluguel",
        valor: 150000,
        meioPagamentoId: CONTA,
        chaveCategoria: "moradia",
      },
      {
        natureza: "DESPESA",
        descricao: "Internet",
        valor: 10000,
        meioPagamentoId: ROXO,
        chaveCategoria: "assinaturas",
      },
      {
        natureza: "DESPESA",
        descricao: "Academia",
        valor: 12000,
        meioPagamentoId: CONTA,
        chaveCategoria: "saúde",
      },
      {
        natureza: "DESPESA",
        descricao: "Academia",
        valor: 12000,
        meioPagamentoId: ROXO,
        chaveCategoria: "saúde",
      },
      {
        natureza: "RECEITA",
        descricao: "Salário A",
        valor: 600000,
        meioPagamentoId: CONTA,
        chaveCategoria: null,
      },
      {
        natureza: "RECEITA",
        descricao: "Salário B",
        valor: 400000,
        meioPagamentoId: CONTA,
        chaveCategoria: null,
      },
    ]);
  });

  it("cria 6 compras em andamento, com parcela inicial n e o valor da linha (IMP-03 AC 5)", () => {
    expect(operacoes.comprasNovas).toEqual([
      {
        descricao: "Sofá",
        meioPagamentoId: ROXO,
        chaveCategoria: "casa",
        qtdParcelas: 10,
        parcelaInicial: 7,
        valorParcela: 21000,
      },
      {
        descricao: "Fone",
        meioPagamentoId: ROXO,
        chaveCategoria: "eletrônicos",
        qtdParcelas: 3,
        parcelaInicial: 1,
        valorParcela: 3334,
      },
      {
        descricao: "Curso",
        meioPagamentoId: VERDE,
        chaveCategoria: "estudo",
        qtdParcelas: 3,
        parcelaInicial: 3,
        valorParcela: 5000,
      },
      {
        descricao: "Óculos",
        meioPagamentoId: CONTA,
        chaveCategoria: "saúde",
        qtdParcelas: 5,
        parcelaInicial: 2,
        valorParcela: 8000,
      },
      {
        descricao: "Livro",
        meioPagamentoId: ROXO,
        chaveCategoria: "estudo",
        qtdParcelas: 2,
        parcelaInicial: 1,
        valorParcela: 2000,
      },
      {
        descricao: "Livro",
        meioPagamentoId: ROXO,
        chaveCategoria: "estudo",
        qtdParcelas: 2,
        parcelaInicial: 1,
        valorParcela: 3000,
      },
    ]);
  });

  it("cria 4 avulsos, 3 despesas e 1 receita, com a origem de cada linha (IMP-03 AC 4, 7 e 8)", () => {
    expect(operacoes.avulsos).toEqual([
      {
        natureza: "DESPESA",
        descricao: "Feira",
        valor: 8740,
        meioPagamentoId: CONTA,
        chaveCategoria: "mercado",
        chaveDeOrigem: "2026-10|GASTOS|0",
      },
      {
        natureza: "DESPESA",
        descricao: "Farmácia",
        valor: 2510,
        meioPagamentoId: ROXO,
        chaveCategoria: "saúde",
        chaveDeOrigem: "2026-10|GASTOS|1",
      },
      {
        natureza: "DESPESA",
        descricao: "Padaria",
        valor: 1200,
        meioPagamentoId: ROXO,
        chaveCategoria: "mercado",
        chaveDeOrigem: "2026-10|GASTOS|2",
      },
      {
        natureza: "RECEITA",
        descricao: "Reembolso",
        valor: 15000,
        meioPagamentoId: CONTA,
        chaveCategoria: null,
        chaveDeOrigem: "2026-10|ENTRADAS|2",
      },
    ]);
  });

  it("a Padaria tem a chave de origem 2026-10|GASTOS|2 (IMP-03 AC 8)", () => {
    expect(operacoes.avulsos.find((avulso) => avulso.descricao === "Padaria")?.chaveDeOrigem).toBe(
      "2026-10|GASTOS|2",
    );
  });

  it("cria as oito categorias uma vez, Mercado com a grafia da primeira linha (IMP-03 AC 9 a 11)", () => {
    expect(operacoes.categorias).toEqual([
      { chave: "moradia", grafia: "Moradia", acao: "CRIAR", categoriaId: null },
      { chave: "assinaturas", grafia: "Assinaturas", acao: "CRIAR", categoriaId: null },
      { chave: "saúde", grafia: "Saúde", acao: "CRIAR", categoriaId: null },
      { chave: "casa", grafia: "Casa", acao: "CRIAR", categoriaId: null },
      { chave: "eletrônicos", grafia: "Eletrônicos", acao: "CRIAR", categoriaId: null },
      { chave: "estudo", grafia: "Estudo", acao: "CRIAR", categoriaId: null },
      { chave: "mercado", grafia: "Mercado", acao: "CRIAR", categoriaId: null },
      { chave: "lazer", grafia: "Lazer", acao: "CRIAR", categoriaId: null },
    ]);
    expect(operacoes.categorias.map((c) => c.chave)).not.toContain("seguros");
  });

  it("não reajusta, não encerra e não reprecifica nada no primeiro mês", () => {
    expect(operacoes.reajustes).toEqual([]);
    expect(operacoes.encerramentos).toEqual([]);
    expect(operacoes.reprecificacoes).toEqual([]);
    expect(plano.deixamDeValer).toEqual([]);
    expect(plano.naoAparecem).toEqual([]);
  });

  it("guarda as decisões usadas na aba", () => {
    expect(operacoes.decisoes).toEqual(DECISOES_DE_OUTUBRO);
  });

  it("lista as 16 linhas lidas como novas e importa 16 (IMP-05 AC 9)", () => {
    expect(plano.linhas.map((linha) => [linha.bloco, linha.posicao, linha.destino])).toEqual([
      ["FIXOS", 0, "NOVO"],
      ["FIXOS", 1, "NOVO"],
      ["FIXOS", 2, "NOVO"],
      ["FIXOS", 3, "NOVO"],
      ["CARTAO", 0, "COMPRA_NOVA"],
      ["CARTAO", 1, "COMPRA_NOVA"],
      ["CARTAO", 2, "COMPRA_NOVA"],
      ["CARTAO", 3, "COMPRA_NOVA"],
      ["CARTAO", 4, "COMPRA_NOVA"],
      ["CARTAO", 5, "COMPRA_NOVA"],
      ["GASTOS", 0, "NOVO"],
      ["GASTOS", 1, "NOVO"],
      ["GASTOS", 2, "NOVO"],
      ["ENTRADAS", 0, "NOVO"],
      ["ENTRADAS", 1, "NOVO"],
      ["ENTRADAS", 2, "NOVO"],
    ]);
    expect(plano.linhas[0]).toEqual({
      bloco: "FIXOS",
      posicao: 0,
      nome: "Aluguel",
      valor: 150000,
      destino: "NOVO",
      valorAnterior: null,
    });
    expect(plano.quantidadeAImportar).toBe(16);
  });
});

describe("planejarImportacao — categorias (IMP-03 AC 9, 10 e 12)", () => {
  it("reativa a existente arquivada e reaproveita a ativa, sem diferenciar caixa (AC 9)", () => {
    const estado: EstadoParaImportacao = {
      ...ESTADO_DE_OUTUBRO,
      categorias: [
        categoria("cat-moradia", "MORADIA", "2026-09-30T12:00:00.000Z"),
        categoria("cat-casa", "casa"),
      ],
    };

    const categorias = operacoesDe(
      planoDe(abaDaFixture("Outubro"), estado, DECISOES_DE_OUTUBRO),
    ).categorias;

    expect(categorias.find((c) => c.chave === "moradia")).toEqual({
      chave: "moradia",
      grafia: "Moradia",
      acao: "REATIVAR",
      categoriaId: "cat-moradia",
    });
    expect(categorias.find((c) => c.chave === "casa")).toEqual({
      chave: "casa",
      grafia: "Casa",
      acao: "REAPROVEITAR",
      categoriaId: "cat-casa",
    });
    expect(categorias.filter((c) => c.acao === "CRIAR")).toHaveLength(6);
  });

  it("cria com a grafia da primeira linha, e não com a da última ocorrência (AC 10)", () => {
    const outubro = abaDaFixture("Outubro");
    // Sem "Mercado" na tabela, a primeira e a última ocorrência de "mercado"
    // ficam nas linhas, e com grafias diferentes: a Feira e a Padaria.
    const aba: AbaLida = {
      ...outubro,
      categoriasDaTabela: outubro.categoriasDaTabela.filter((nome) => nome !== "Mercado"),
    };
    expect(aba.gastos.map((linha) => [linha.nome, linha.categoria])).toEqual([
      ["Feira", "Mercado"],
      ["Farmácia", "Saúde"],
      ["Padaria", "MERCADO"],
    ]);
    expect(
      [...aba.fixos, ...aba.cartao].map((linha) => linha.categoria.toLowerCase()),
    ).not.toContain("mercado");
    expect(aba.categoriasDaTabela.map((nome) => nome.toLowerCase())).not.toContain("mercado");

    const categorias = operacoesDe(planoDe(aba, ESTADO_DE_OUTUBRO, DECISOES_DE_OUTUBRO)).categorias;

    expect(categorias.filter((c) => c.chave === "mercado")).toEqual([
      { chave: "mercado", grafia: "Mercado", acao: "CRIAR", categoriaId: null },
    ]);
  });

  it("célula de categoria vazia cria o plano ou o lançamento sem categoria (AC 12)", () => {
    const outubro = abaDaFixture("Outubro");
    const aba: AbaLida = {
      ...outubro,
      fixos: outubro.fixos.map((l) => (l.nome === "Aluguel" ? { ...l, categoria: " " } : l)),
      cartao: outubro.cartao.map((l) => (l.nome === "Sofá" ? { ...l, categoria: "" } : l)),
      gastos: outubro.gastos.map((l) => (l.nome === "Feira" ? { ...l, categoria: "" } : l)),
    };

    const operacoes = operacoesDe(planoDe(aba, ESTADO_DE_OUTUBRO, DECISOES_DE_OUTUBRO));

    expect(operacoes.recorrenciasNovas[0]).toMatchObject({
      descricao: "Aluguel",
      chaveCategoria: null,
    });
    expect(operacoes.comprasNovas[0]).toMatchObject({ descricao: "Sofá", chaveCategoria: null });
    expect(operacoes.avulsos[0]).toMatchObject({ descricao: "Feira", chaveCategoria: null });
    expect(operacoes.categorias.map((c) => c.chave)).not.toContain("");
  });
});

describe("planejarImportacao — novembro depois de outubro (IMP-04, IMP-07)", () => {
  const novembro = abaDaFixture("Novembro");

  it("com as decisões lembradas, pede só Cartão Azul e Presente (IMP-04 AC 5)", () => {
    const plano = planoDe(novembro, ESTADO_DE_NOVEMBRO, DECISOES_DE_OUTUBRO);

    expect(plano.pendencias).toEqual({
      tiposSemMeio: [{ chave: "cartão azul", nome: "Cartão Azul", linhas: 1 }],
      entradasSemClasse: [{ chave: "presente", nome: "Presente" }],
    });
    expect(plano.operacoes).toBeNull();
  });

  describe("com as duas pendências resolvidas", () => {
    const plano = planoDe(novembro, ESTADO_DE_NOVEMBRO, DECISOES_DE_NOVEMBRO);
    const operacoes = operacoesDe(plano);

    it("dá a cada linha o destino da tabela de novembro e importa 9", () => {
      expect(plano.linhas).toEqual([
        {
          bloco: "FIXOS",
          posicao: 0,
          nome: "Aluguel",
          valor: 150000,
          destino: "JA_EXISTE",
          valorAnterior: null,
        },
        {
          bloco: "FIXOS",
          posicao: 1,
          nome: "Internet",
          valor: 11000,
          destino: "REAJUSTE",
          valorAnterior: 10000,
        },
        {
          bloco: "FIXOS",
          posicao: 2,
          nome: "Academia",
          valor: 12000,
          destino: "JA_EXISTE",
          valorAnterior: null,
        },
        {
          bloco: "FIXOS",
          posicao: 3,
          nome: "Streaming",
          valor: 3000,
          destino: "NOVO",
          valorAnterior: null,
        },
        {
          bloco: "CARTAO",
          posicao: 0,
          nome: "Sofá",
          valor: 21000,
          destino: "CONTINUA",
          valorAnterior: null,
        },
        {
          bloco: "CARTAO",
          posicao: 1,
          nome: "Fone",
          valor: 3333,
          destino: "CONTINUA_COM_NOVO_VALOR",
          valorAnterior: 3334,
        },
        {
          bloco: "CARTAO",
          posicao: 2,
          nome: "Óculos",
          valor: 8000,
          destino: "CONTINUA",
          valorAnterior: null,
        },
        {
          bloco: "CARTAO",
          posicao: 3,
          nome: "Livro",
          valor: 3002,
          destino: "CONTINUA_COM_NOVO_VALOR",
          valorAnterior: 3000,
        },
        {
          bloco: "CARTAO",
          posicao: 4,
          nome: "Livro",
          valor: 2000,
          destino: "CONTINUA",
          valorAnterior: null,
        },
        {
          bloco: "CARTAO",
          posicao: 5,
          nome: "Tênis",
          valor: 15000,
          destino: "COMPRA_NOVA",
          valorAnterior: null,
        },
        {
          bloco: "GASTOS",
          posicao: 0,
          nome: "Mercado do mês",
          valor: 30000,
          destino: "NOVO",
          valorAnterior: null,
        },
        {
          bloco: "GASTOS",
          posicao: 1,
          nome: "Cinema",
          valor: 4500,
          destino: "NOVO",
          valorAnterior: null,
        },
        {
          bloco: "ENTRADAS",
          posicao: 0,
          nome: "Salário A",
          valor: 600000,
          destino: "JA_EXISTE",
          valorAnterior: null,
        },
        {
          bloco: "ENTRADAS",
          posicao: 1,
          nome: "Salário B",
          valor: 420000,
          destino: "REAJUSTE",
          valorAnterior: 400000,
        },
        {
          bloco: "ENTRADAS",
          posicao: 2,
          nome: "Presente",
          valor: 20000,
          destino: "NOVO",
          valorAnterior: null,
        },
      ]);
      expect(plano.quantidadeAImportar).toBe(9);
    });

    it("encerra Academia no Cartão Roxo, que não está na aba (IMP-07 AC 5)", () => {
      expect(plano.deixamDeValer).toEqual([
        { recorrenciaId: "rec-academia-roxo", descricao: "Academia" },
      ]);
      expect(operacoes.encerramentos).toEqual(["rec-academia-roxo"]);
    });

    it("reajusta Internet e Salário B e reprecifica Fone e o Livro de 30 (IMP-07 AC 4 e 10)", () => {
      expect(operacoes.reajustes).toEqual([
        { recorrenciaId: "rec-internet", valor: 11000 },
        { recorrenciaId: "rec-salario-b", valor: 420000 },
      ]);
      expect(operacoes.reprecificacoes).toEqual([
        { compraId: "compra-fone", aPartirDe: 2, valor: 3333 },
        { compraId: "compra-livro-30", aPartirDe: 2, valor: 3002 },
      ]);
    });

    it("cria só Streaming, Tênis e os avulsos do mês", () => {
      expect(operacoes.recorrenciasNovas).toEqual([
        {
          natureza: "DESPESA",
          descricao: "Streaming",
          valor: 3000,
          meioPagamentoId: AZUL,
          chaveCategoria: "assinaturas",
        },
      ]);
      expect(operacoes.comprasNovas).toEqual([
        {
          descricao: "Tênis",
          meioPagamentoId: ROXO,
          chaveCategoria: "vestuário",
          qtdParcelas: 2,
          parcelaInicial: 1,
          valorParcela: 15000,
        },
      ]);
      expect(operacoes.avulsos).toEqual([
        {
          natureza: "DESPESA",
          descricao: "Mercado do mês",
          valor: 30000,
          meioPagamentoId: CONTA,
          chaveCategoria: "mercado",
          chaveDeOrigem: "2026-11|GASTOS|0",
        },
        {
          natureza: "DESPESA",
          descricao: "Cinema",
          valor: 4500,
          meioPagamentoId: ROXO,
          chaveCategoria: "lazer",
          chaveDeOrigem: "2026-11|GASTOS|1",
        },
        {
          natureza: "RECEITA",
          descricao: "Presente",
          valor: 20000,
          meioPagamentoId: CONTA,
          chaveCategoria: null,
          chaveDeOrigem: "2026-11|ENTRADAS|2",
        },
      ]);
    });

    it("reaproveita as categorias de outubro e cria Vestuário", () => {
      expect(operacoes.categorias.filter((c) => c.acao !== "REAPROVEITAR")).toEqual([
        { chave: "vestuário", grafia: "Vestuário", acao: "CRIAR", categoriaId: null },
      ]);
      expect(operacoes.categorias.find((c) => c.chave === "mercado")).toEqual({
        chave: "mercado",
        grafia: "Mercado",
        acao: "REAPROVEITAR",
        categoriaId: "cat-mercado",
      });
    });
  });
});

describe("planejarImportacao — dezembro depois de novembro (IMP-07)", () => {
  const plano = planoDe(abaDaFixture("Dezembro"), ESTADO_DE_DEZEMBRO, DECISOES_DE_NOVEMBRO);
  const operacoes = operacoesDe(plano);

  it("não pede nada: o Bônus ilegível não pede classificação", () => {
    expect(plano.pendencias).toEqual({ tiposSemMeio: [], entradasSemClasse: [] });
  });

  it("aponta o Óculos, parcela 4, como não aparece nesta aba (AC 11)", () => {
    expect(plano.naoAparecem).toEqual([
      { compraId: "compra-oculos", descricao: "Óculos", numero: 4 },
    ]);
  });

  it("encerra Salário B e mantém Internet, presente sem valor (AC 5 e 6)", () => {
    expect(plano.deixamDeValer).toEqual([
      { recorrenciaId: "rec-salario-b", descricao: "Salário B" },
    ]);
    expect(operacoes.encerramentos).toEqual(["rec-salario-b"]);
    expect(operacoes.reajustes).toEqual([]);
    expect(plano.linhas.find((linha) => linha.nome === "Internet")).toBeUndefined();
    expect(plano.naoLidas).toContainEqual({
      bloco: "FIXOS",
      posicao: 1,
      nome: "Internet",
      tipo: "Cartão Roxo",
      motivo: "VALOR_VAZIO",
    });
  });

  it("importa 2: a Ceia e o Presente", () => {
    expect(plano.quantidadeAImportar).toBe(2);
    expect(operacoes.avulsos.map((avulso) => avulso.descricao)).toEqual(["Ceia", "Presente"]);
    expect(operacoes.recorrenciasNovas).toEqual([]);
    expect(operacoes.comprasNovas).toEqual([]);
    expect(operacoes.reprecificacoes).toEqual([]);
  });

  it("entrada fixa reconhecida com valor ilegível continua valendo (AC 6)", () => {
    // Na fixture de dezembro, o valor do Salário A tem o espaço não separável.
    const aba = abaDe(substituir(gradeDaFixture("Dezembro"), "R$ 6.000,00", ""));
    expect(aba.naoLidas).toContainEqual({
      bloco: "ENTRADAS",
      posicao: 0,
      nome: "Salário A",
      tipo: "",
      motivo: "VALOR_VAZIO",
    });

    const semValor = planoDe(aba, ESTADO_DE_DEZEMBRO, DECISOES_DE_NOVEMBRO);

    expect(semValor.deixamDeValer).toEqual([
      { recorrenciaId: "rec-salario-b", descricao: "Salário B" },
    ]);
    expect(semValor.linhas.filter((linha) => linha.bloco === "ENTRADAS")).toEqual([
      {
        bloco: "ENTRADAS",
        posicao: 2,
        nome: "Presente",
        valor: 10000,
        destino: "NOVO",
        valorAnterior: null,
      },
    ]);
  });
});

describe("planejarImportacao — ordem de aparição (IMP-07 AC 12, IMP-05 AC 5)", () => {
  it("o fixo sem valor que vem antes pareia primeiro; o homônimo seguinte é novo", () => {
    const dezembro = abaDaFixture("Dezembro");
    const aba: AbaLida = {
      ...dezembro,
      fixos: [
        ...dezembro.fixos,
        {
          bloco: "FIXOS",
          posicao: 4,
          nome: "Internet",
          tipo: "Cartão Roxo",
          categoria: "Assinaturas",
          valor: 11000 as Cents,
        },
      ],
    };

    const plano = planoDe(aba, ESTADO_DE_DEZEMBRO, DECISOES_DE_NOVEMBRO);

    expect(plano.linhas.find((linha) => linha.nome === "Internet")).toMatchObject({
      posicao: 4,
      destino: "NOVO",
    });
  });

  it("homônimos de mesmo meio pareiam na ordem das vigentes do estado, cada um com o seu valor", () => {
    const novembro = abaDaFixture("Novembro");
    const aba: AbaLida = {
      ...novembro,
      fixos: [
        ...novembro.fixos,
        {
          bloco: "FIXOS",
          posicao: 4,
          nome: "Academia",
          tipo: "Débito",
          categoria: "Saúde",
          valor: 13000 as Cents,
        },
      ],
    };
    const estado: EstadoParaImportacao = {
      ...ESTADO_DE_NOVEMBRO,
      despesasFixasVigentes: [
        ...ESTADO_DE_NOVEMBRO.despesasFixasVigentes,
        vigente("rec-academia-conta-2", "Academia", CONTA, 13000),
      ],
    };

    const plano = planoDe(aba, estado, DECISOES_DE_NOVEMBRO);

    expect(
      plano.linhas
        .filter((linha) => linha.bloco === "FIXOS" && linha.nome === "Academia")
        .map((linha) => [linha.posicao, linha.destino]),
    ).toEqual([
      [2, "JA_EXISTE"],
      [4, "JA_EXISTE"],
    ]);
    expect(
      operacoesDe(plano).reajustes.filter((reajuste) =>
        reajuste.recorrenciaId.startsWith("rec-academia"),
      ),
    ).toEqual([]);
  });

  it("entradas fixas homônimas pareiam na ordem das receitas vigentes, cada uma com o seu valor", () => {
    const novembro = abaDaFixture("Novembro");
    const aba: AbaLida = {
      ...novembro,
      entradas: [
        ...novembro.entradas,
        {
          bloco: "ENTRADAS",
          posicao: 3,
          nome: "Salário A",
          tipo: "",
          categoria: "",
          valor: 650000 as Cents,
        },
      ],
    };
    const estado: EstadoParaImportacao = {
      ...ESTADO_DE_NOVEMBRO,
      receitasFixasVigentes: [
        ...ESTADO_DE_NOVEMBRO.receitasFixasVigentes,
        vigente("rec-salario-a-2", "Salário A", CONTA, 650000),
      ],
    };

    const plano = planoDe(aba, estado, DECISOES_DE_NOVEMBRO);

    expect(
      plano.linhas
        .filter((linha) => linha.bloco === "ENTRADAS" && linha.nome === "Salário A")
        .map((linha) => [linha.posicao, linha.destino]),
    ).toEqual([
      [0, "JA_EXISTE"],
      [3, "JA_EXISTE"],
    ]);
    expect(
      operacoesDe(plano).reajustes.filter((reajuste) =>
        reajuste.recorrenciaId.startsWith("rec-salario-a"),
      ),
    ).toEqual([]);
  });

  it("lista as entradas na ordem da aba, com a avulsa antes da fixa", () => {
    const outubro = gradeDaFixture("Outubro");
    const trocada = substituir(
      substituir(substituir(outubro, "Salário A", "@"), "Reembolso", "Salário A"),
      "@",
      "Reembolso",
    );

    const plano = planoDe(abaDe(trocada), ESTADO_DE_OUTUBRO, DECISOES_DE_OUTUBRO);

    expect(
      plano.linhas
        .filter((linha) => linha.bloco === "ENTRADAS")
        .map((linha) => [linha.posicao, linha.nome]),
    ).toEqual([
      [0, "Reembolso"],
      [1, "Salário B"],
      [2, "Salário A"],
    ]);
  });
});

describe("planejarImportacao — o mesmo nome escrito de dois jeitos (Review Focus 2 e 5)", () => {
  it("a decisão lembrada para cartão roxo atende o Tipo `Cartão  Roxo`", () => {
    const outubro = abaDaFixture("Outubro");
    const aba: AbaLida = {
      ...outubro,
      fixos: outubro.fixos.map((l) => (l.nome === "Internet" ? { ...l, tipo: "Cartão  Roxo" } : l)),
    };

    const plano = planoDe(aba, ESTADO_DE_OUTUBRO, DECISOES_DE_OUTUBRO);

    expect(plano.pendencias.tiposSemMeio).toEqual([]);
    expect(operacoesDe(plano).recorrenciasNovas[1]).toMatchObject({
      descricao: "Internet",
      meioPagamentoId: ROXO,
    });
  });

  it("`Cartão Laranja` e `cartão laranja ` na mesma aba são uma pendência, com a soma das linhas", () => {
    const outubro = abaDaFixture("Outubro");
    const tipos: Record<string, string> = {
      Farmácia: "Cartão Laranja",
      Padaria: "cartão laranja ",
    };
    const aba: AbaLida = {
      ...outubro,
      gastos: outubro.gastos.map((l) => ({ ...l, tipo: tipos[l.nome] ?? l.tipo })),
    };

    const plano = planoDe(aba, ESTADO_DE_OUTUBRO, DECISOES_DE_OUTUBRO);

    expect(plano.pendencias.tiposSemMeio).toEqual([
      { chave: "cartão laranja", nome: "Cartão Laranja", linhas: 2 },
    ]);
  });

  it("duas entradas com o mesmo nome normalizado pedem uma classificação só (IMP-04 AC 4)", () => {
    const outubro = abaDaFixture("Outubro");
    const aba: AbaLida = {
      ...outubro,
      entradas: [
        ...outubro.entradas,
        {
          bloco: "ENTRADAS",
          posicao: 3,
          nome: "reembolso ",
          tipo: "",
          categoria: "",
          valor: 5000 as Cents,
        },
      ],
    };

    const plano = planoDe(aba, ESTADO_DE_OUTUBRO, SEM_DECISOES);

    expect(plano.pendencias.entradasSemClasse).toEqual([
      { chave: "salário a", nome: "Salário A" },
      { chave: "salário b", nome: "Salário B" },
      { chave: "reembolso", nome: "Reembolso" },
    ]);
  });

  it("fixo não lido com Tipo sem ligação não gera pendência nem reconhece nada", () => {
    const aba = abaDe(
      substituir(gradeDaFixture("Outubro"), "Seguro (casa, carro)", "Seguro").map((linha) =>
        linha[2] === "Seguro"
          ? linha.map((celula, coluna) => (coluna === 6 ? "Cartão Laranja" : celula))
          : linha,
      ),
    );

    const plano = planoDe(aba, ESTADO_DE_OUTUBRO, DECISOES_DE_OUTUBRO);

    expect(plano.naoLidas).toEqual([
      { bloco: "FIXOS", posicao: 4, nome: "Seguro", tipo: "Cartão Laranja", motivo: "VALOR_VAZIO" },
    ]);
    expect(plano.pendencias.tiposSemMeio).toEqual([]);
    expect(operacoesDe(plano).recorrenciasNovas).toHaveLength(6);
  });
});
