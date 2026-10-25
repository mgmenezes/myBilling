import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { type Grade, lerCsv } from "./csv";
import { type AbaLida, lerAba } from "./ler-aba";

type Mes = "Outubro" | "Novembro" | "Dezembro";

function textoDaFixture(mes: Mes): string {
  return readFileSync(join(__dirname, "__fixtures__", `Planilha 2026 - ${mes}.csv`), "utf-8");
}

function gradeDaFixture(mes: Mes): Grade {
  const lida = lerCsv(textoDaFixture(mes));
  if (!lida.ok) {
    throw new Error(`fixture ilegível: ${mes}`);
  }
  return lida.value;
}

function abaDe(grade: Grade): AbaLida {
  const lida = lerAba(grade);
  if (!lida.ok) {
    throw new Error(`aba recusada: ${JSON.stringify(lida.error)}`);
  }
  return lida.value;
}

/** Cópia da grade com toda célula igual a `de` trocada por `para`. */
function substituir(grade: Grade, de: string, para: string): Grade {
  return grade.map((linha) => linha.map((celula) => (celula === de ? para : celula)));
}

function todosOsTextos(aba: AbaLida): string[] {
  const linhas = [...aba.fixos, ...aba.cartao, ...aba.gastos, ...aba.entradas];
  return [
    ...linhas.flatMap((linha) => [linha.nome, linha.tipo, linha.categoria]),
    ...aba.naoLidas.flatMap((linha) => [linha.nome, linha.tipo]),
    ...aba.categoriasDaTabela,
  ];
}

const OUTUBRO_ESPERADO = {
  fixos: [
    {
      bloco: "FIXOS",
      posicao: 0,
      nome: "Aluguel",
      tipo: "Débito",
      categoria: "Moradia",
      valor: 150000,
    },
    {
      bloco: "FIXOS",
      posicao: 1,
      nome: "Internet",
      tipo: "Cartão Roxo",
      categoria: "Assinaturas",
      valor: 10000,
    },
    {
      bloco: "FIXOS",
      posicao: 2,
      nome: "Academia",
      tipo: "Débito",
      categoria: "Saúde",
      valor: 12000,
    },
    {
      bloco: "FIXOS",
      posicao: 3,
      nome: "Academia",
      tipo: "Cartão Roxo",
      categoria: "Saúde",
      valor: 12000,
    },
  ],
  cartao: [
    {
      bloco: "CARTAO",
      posicao: 0,
      nome: "Sofá",
      tipo: "Cartão Roxo",
      categoria: "Casa",
      valor: 21000,
      parcela: { numero: 7, total: 10 },
    },
    {
      bloco: "CARTAO",
      posicao: 1,
      nome: "Fone",
      tipo: "Cartão Roxo",
      categoria: "Eletrônicos",
      valor: 3334,
      parcela: { numero: 1, total: 3 },
    },
    {
      bloco: "CARTAO",
      posicao: 2,
      nome: "Curso",
      tipo: "Cartão Verde",
      categoria: "Estudo",
      valor: 5000,
      parcela: { numero: 3, total: 3 },
    },
    {
      bloco: "CARTAO",
      posicao: 3,
      nome: "Óculos",
      tipo: "Débito",
      categoria: "Saúde",
      valor: 8000,
      parcela: { numero: 2, total: 5 },
    },
    {
      bloco: "CARTAO",
      posicao: 4,
      nome: "Livro",
      tipo: "Cartão Roxo",
      categoria: "Estudo",
      valor: 2000,
      parcela: { numero: 1, total: 2 },
    },
    {
      bloco: "CARTAO",
      posicao: 5,
      nome: "Livro",
      tipo: "Cartão Roxo",
      categoria: "Estudo",
      valor: 3000,
      parcela: { numero: 1, total: 2 },
    },
  ],
  gastos: [
    {
      bloco: "GASTOS",
      posicao: 0,
      nome: "Feira",
      tipo: "Débito",
      categoria: "Mercado",
      valor: 8740,
    },
    {
      bloco: "GASTOS",
      posicao: 1,
      nome: "Farmácia",
      tipo: "Cartão Roxo",
      categoria: "Saúde",
      valor: 2510,
    },
    {
      bloco: "GASTOS",
      posicao: 2,
      nome: "Padaria",
      tipo: "Cartão Roxo",
      categoria: "MERCADO",
      valor: 1200,
    },
  ],
  entradas: [
    { bloco: "ENTRADAS", posicao: 0, nome: "Salário A", tipo: "", categoria: "", valor: 600000 },
    { bloco: "ENTRADAS", posicao: 1, nome: "Salário B", tipo: "", categoria: "", valor: 400000 },
    { bloco: "ENTRADAS", posicao: 2, nome: "Reembolso", tipo: "", categoria: "", valor: 15000 },
  ],
  naoLidas: [
    {
      bloco: "FIXOS",
      posicao: 4,
      nome: "Seguro (casa, carro)",
      tipo: "Débito",
      motivo: "VALOR_VAZIO",
    },
  ],
  totais: { FIXOS: 184000, CARTAO: 42334, GASTOS: 11250, ENTRADAS: 1015000, SAIDAS: 238784 },
  categoriasDaTabela: [
    "Moradia",
    "Assinaturas",
    "Saúde",
    "Casa",
    "Eletrônicos",
    "Estudo",
    "Mercado",
    "Lazer",
  ],
};

describe("lerAba — a aba de outubro exportada (IMP-01)", () => {
  const outubro = gradeDaFixture("Outubro");

  it("lê os quatro blocos, a não lida, os totais e a tabela de categorias", () => {
    expect(lerAba(outubro)).toEqual({ ok: true, value: OUTUBRO_ESPERADO });
  });

  it("conta 4 fixos, 6 linhas de cartão, 3 gastos e 3 entradas lidas, e 1 não lida", () => {
    const aba = abaDe(outubro);

    expect([aba.fixos.length, aba.cartao.length, aba.gastos.length, aba.entradas.length]).toEqual([
      4, 6, 3, 3,
    ]);
    expect(aba.naoLidas).toEqual([
      {
        bloco: "FIXOS",
        posicao: 4,
        nome: "Seguro (casa, carro)",
        tipo: "Débito",
        motivo: "VALOR_VAZIO",
      },
    ]);
  });

  it("lê os totais da própria planilha, inclusive o de Saídas", () => {
    expect(abaDe(outubro).totais).toEqual({
      FIXOS: 184000,
      CARTAO: 42334,
      GASTOS: 11250,
      ENTRADAS: 1015000,
      SAIDAS: 238784,
    });
  });

  it("lê os nomes da tabela de categorias sem parar na linha vazia do meio (AC 14)", () => {
    expect(abaDe(outubro).categoriasDaTabela).toEqual([
      "Moradia",
      "Assinaturas",
      "Saúde",
      "Casa",
      "Eletrônicos",
      "Estudo",
      "Mercado",
      "Lazer",
    ]);
  });

  it("ignora a linha do Gastos do Mês que só tem o Tipo, e não conta posição para ela (AC 8)", () => {
    const aba = abaDe(outubro);

    expect(aba.gastos.map((linha) => [linha.posicao, linha.nome])).toEqual([
      [0, "Feira"],
      [1, "Farmácia"],
      [2, "Padaria"],
    ]);
    expect(aba.naoLidas.filter((linha) => linha.bloco === "GASTOS")).toEqual([]);
  });

  it("ignora A1, a linha 2, Saídas exceto o total, Investimentos e os gastos por tipo (AC 16)", () => {
    const textos = todosOsTextos(abaDe(outubro));

    for (const ignorado of [
      "X",
      "Total de gastos",
      "Outubro",
      "Saldo",
      "Saídas",
      "Gastos fixos",
      "Parcelas do cartão",
      "Gastos avulsos",
      "Investimentos",
      "Reserva",
      "Gastos por tipo de pagamento",
    ]) {
      expect(textos).not.toContain(ignorado);
    }
    expect(abaDe(outubro).categoriasDaTabela).not.toContain("Débito");
    expect(abaDe(outubro).categoriasDaTabela).not.toContain("Cartão Verde");
  });

  it("encontra o título `Gastos do Mês ` com o espaço do fim (AC 4)", () => {
    expect(outubro.some((linha) => linha.includes("Gastos do Mês "))).toBe(true);
    expect(abaDe(outubro).gastos).toHaveLength(3);
  });

  it("lê a mesma aba com a grade deslocada duas colunas para a direita (AC 5)", () => {
    const deslocada = outubro.map((linha) => ["", "", ...linha]);

    expect(lerAba(deslocada)).toEqual({ ok: true, value: OUTUBRO_ESPERADO });
  });

  it("lista como NOME_VAZIO a linha que tem valor e não tem nome (AC 12)", () => {
    const aba = abaDe(substituir(outubro, "Feira", ""));

    expect(aba.naoLidas).toContainEqual({
      bloco: "GASTOS",
      posicao: 0,
      nome: "",
      tipo: "Débito",
      motivo: "NOME_VAZIO",
    });
    expect(aba.gastos.map((linha) => [linha.posicao, linha.nome])).toEqual([
      [1, "Farmácia"],
      [2, "Padaria"],
    ]);
  });
});

describe("lerAba — linha do cartão sem valor (IMP-01 AC 9)", () => {
  it("lista como VALOR_VAZIO a compra que tem nome e não tem valor", () => {
    const aba = abaDe(substituir(gradeDaFixture("Outubro"), "R$ 50,00", ""));

    expect(aba.naoLidas).toContainEqual({
      bloco: "CARTAO",
      posicao: 2,
      nome: "Curso",
      tipo: "Cartão Verde",
      motivo: "VALOR_VAZIO",
    });
    expect(aba.cartao.map((linha) => linha.nome)).not.toContain("Curso");
  });
});

describe("lerAba — blocos ausentes (IMP-01 AC 3)", () => {
  const outubro = gradeDaFixture("Outubro");

  it.each([
    ["Fixos", "Fixos"],
    ["Cartão de Crédito", "Cartão de Crédito"],
    ["Gastos do Mês ", "Gastos do Mês"],
    ["Entradas", "Entradas"],
  ])("sem a célula %p, recusa com PLANILHA_BLOCO_AUSENTE nomeando %p", (celula, titulo) => {
    expect(lerAba(substituir(outubro, celula, ""))).toEqual({
      ok: false,
      error: { code: "PLANILHA_BLOCO_AUSENTE", detalhes: { bloco: titulo } },
    });
  });

  it("nomeia o primeiro título ausente na ordem Fixos, Cartão, Gastos do Mês, Entradas", () => {
    const semNenhum = ["Fixos", "Cartão de Crédito", "Gastos do Mês ", "Entradas"].reduce(
      (grade, titulo) => substituir(grade, titulo, ""),
      outubro,
    );
    const semGastosNemEntradas = substituir(
      substituir(outubro, "Entradas", ""),
      "Gastos do Mês ",
      "",
    );

    expect(lerAba(semNenhum)).toEqual({
      ok: false,
      error: { code: "PLANILHA_BLOCO_AUSENTE", detalhes: { bloco: "Fixos" } },
    });
    expect(lerAba(semGastosNemEntradas)).toEqual({
      ok: false,
      error: { code: "PLANILHA_BLOCO_AUSENTE", detalhes: { bloco: "Gastos do Mês" } },
    });
  });
});

describe("lerAba — arquivo que não é a aba exportada (IMP-01 AC 17)", () => {
  it("recusa com PLANILHA_ARQUIVO_INVALIDO a aba salva de novo com ponto e vírgula", () => {
    const lida = lerCsv(textoDaFixture("Outubro").replaceAll(",", ";"));
    if (!lida.ok) {
      throw new Error("o CSV com ponto e vírgula deveria ser lido como uma coluna só");
    }

    expect(lerAba(lida.value)).toEqual({
      ok: false,
      error: { code: "PLANILHA_ARQUIVO_INVALIDO" },
    });
  });
});

describe("lerAba — tabela de categorias (IMP-01 AC 14 e 15)", () => {
  const outubro = gradeDaFixture("Outubro");

  it("sem a tabela, aceita o arquivo com a lista de categorias vazia (AC 15)", () => {
    const aba = abaDe(substituir(outubro, "Gastos do mês por categoria:", ""));

    expect(aba.categoriasDaTabela).toEqual([]);
    expect(aba.fixos).toHaveLength(4);
  });

  it("sem o rótulo Gastos por tipo de pagamento, lê a tabela até o fim do arquivo (AC 14)", () => {
    const aba = abaDe(substituir(outubro, "Gastos por tipo de pagamento", ""));

    expect(aba.categoriasDaTabela).toEqual([
      "Moradia",
      "Assinaturas",
      "Saúde",
      "Casa",
      "Eletrônicos",
      "Estudo",
      "Mercado",
      "Lazer",
      "Débito",
      "Cartão Roxo",
      "Cartão Verde",
    ]);
  });
});

describe("lerAba — totais que a conferência usa (IMP-05 AC 2 e 3)", () => {
  const outubro = gradeDaFixture("Outubro");

  it("sem o rótulo Total de Fixos:, o total de Fixos é null", () => {
    expect(abaDe(substituir(outubro, "Total de Fixos:", "")).totais.FIXOS).toBeNull();
  });

  it("total que não é dinheiro é null", () => {
    expect(abaDe(substituir(outubro, "R$ 10.150,00", "—")).totais.ENTRADAS).toBeNull();
  });

  it("total R$ 0,00 é lido como zero, não como ausente", () => {
    expect(abaDe(substituir(outubro, "R$ 112,50", "R$ 0,00")).totais.GASTOS).toBe(0);
  });

  it("sem o bloco Saídas, o total de Saídas é null", () => {
    const aba = abaDe(substituir(outubro, "Saídas", ""));

    expect(aba.totais.SAIDAS).toBeNull();
    expect(aba.totais.ENTRADAS).toBe(1015000);
  });
});

describe("lerAba — a aba de dezembro", () => {
  it("lista Internet sem valor, Mesa 12/10 e Bônus 200* como não lidas (AC 9-11)", () => {
    expect(abaDe(gradeDaFixture("Dezembro")).naoLidas).toEqual([
      { bloco: "FIXOS", posicao: 1, nome: "Internet", tipo: "Cartão Roxo", motivo: "VALOR_VAZIO" },
      {
        bloco: "CARTAO",
        posicao: 3,
        nome: "Mesa",
        tipo: "Cartão Roxo",
        motivo: "PARCELA_INVALIDA",
      },
      { bloco: "ENTRADAS", posicao: 1, nome: "Bônus", tipo: "", motivo: "VALOR_INVALIDO" },
    ]);
  });
});
