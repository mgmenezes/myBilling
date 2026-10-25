import { describe, expect, it } from "vitest";
import {
  type Cents,
  type Competencia,
  type DecisoesDaImportacao,
  gerarParcelas,
  type PlanoParcelamento,
} from "@/domain";
import { criarFakes, ViolacaoDeUnicidade } from "./fakes";
import {
  type DadosCompra,
  type EntradaLancamentoAvulso,
  type ImportacaoRegistrada,
  ViolacaoDeConservacao,
} from "./repositories";

/**
 * Os fakes da importação (T12). Eles só valem enquanto se comportarem como o
 * Drizzle nos pontos que os casos de uso de T17 e T18 observam: a
 * reprecificação conserva a soma, a competência registrada é única, a decisão
 * lembrada é uma por tipo e nome, e a linha importada não entra duas vezes. Os
 * mesmos pontos são asserados contra Postgres real em T13 e T14.
 *
 * Valores por propriedade (AD-009): a compra em andamento de 21000 por
 * parcela, de 7 a 10, é a mesma da reprecificação de T6.
 */

const c = (texto: string) => texto as Competencia;

function planoEmAndamento(): PlanoParcelamento {
  const resultado = gerarParcelas({
    modo: "VALOR_PARCELA",
    valorEntrada: 21000 as Cents,
    qtdParcelas: 10,
    competenciaCompra: c("2026-04"),
    parcelaInicial: 7,
    politicaResiduo: "PRIMEIRAS",
  });
  if (!resultado.ok) {
    throw new Error(`fixture inválida: ${resultado.error.code}`);
  }
  return resultado.value;
}

const DADOS_EM_ANDAMENTO: DadosCompra = {
  descricao: "Compra em andamento",
  modo: "VALOR_PARCELA",
  politicaResiduo: "PRIMEIRAS",
  competenciaCompra: c("2026-04"),
  qtdParcelas: 10,
  parcelaInicial: 7,
  categoriaId: null,
  usuarioId: "usuario-a",
  meioPagamentoId: "cartao-roxo",
  dataEvento: "2026-10-01",
};

async function criarCompraEmAndamento(fakes = criarFakes()) {
  const resultado = await fakes.compras.salvarComParcelas({
    idempotencyKey: "chave-em-andamento",
    dados: DADOS_EM_ANDAMENTO,
    plano: planoEmAndamento(),
  });
  if (!resultado.ok) {
    throw new Error(`fixture inválida: ${resultado.error.code}`);
  }
  return { fakes, compraId: resultado.value.id };
}

function avulso(origemDado?: EntradaLancamentoAvulso["origemDado"]): EntradaLancamentoAvulso {
  return {
    natureza: "DESPESA",
    descricao: "Linha importada",
    competencia: c("2026-10"),
    dataEvento: "2026-10-01",
    valor: 1200 as Cents,
    pagoEm: null,
    categoriaId: null,
    usuarioId: "usuario-a",
    meioPagamentoId: "cartao-roxo",
    origemDado,
  };
}

function importacao(competencia: string): ImportacaoRegistrada {
  return {
    competencia: c(competencia),
    nomeArquivo: `Planilha 2026 - ${competencia}.csv`,
    usuarioId: "usuario-a",
  };
}

function decisoes(
  meios: Record<string, string>,
  entradas: DecisoesDaImportacao["entradas"] = new Map(),
): DecisoesDaImportacao {
  return { meios: new Map(Object.entries(meios)), entradas };
}

describe("FakeCompraRepository.reprecificar (T12, IMP-07 AC 10)", () => {
  it("grava os valores das parcelas informadas e o total, contando o amortizado", async () => {
    const { fakes, compraId } = await criarCompraEmAndamento();

    await fakes.compras.reprecificar(
      compraId,
      [
        { numero: 9, valor: 21100 as Cents },
        { numero: 10, valor: 21100 as Cents },
      ],
      (126000 + 21000 + 21000 + 21100 + 21100) as Cents,
    );

    const compra = await fakes.compras.buscarPorId(compraId);
    expect(compra?.valorTotal).toBe(210200);
    expect(compra?.parcelas.map((p) => [p.numeroParcela, p.valor])).toEqual([
      [7, 21000],
      [8, 21000],
      [9, 21100],
      [10, 21100],
    ]);
    const noRazao = [...fakes.estado.movimentos.values()]
      .filter((m) => m.compraId === compraId)
      .map((m) => m.valor);
    expect(noRazao).toEqual([21000, 21000, 21100, 21100]);
  });

  it("recusa com CONSERVACAO_VIOLADA quando o total não fecha, sem gravar nada", async () => {
    const { fakes, compraId } = await criarCompraEmAndamento();

    const recusa = fakes.compras.reprecificar(
      compraId,
      [
        { numero: 9, valor: 21100 as Cents },
        { numero: 10, valor: 21100 as Cents },
      ],
      210199 as Cents,
    );

    await expect(recusa).rejects.toBeInstanceOf(ViolacaoDeConservacao);
    await expect(recusa).rejects.toMatchObject({
      code: "CONSERVACAO_VIOLADA",
      soma: 210200,
      valorTotal: 210199,
    });
    const compra = await fakes.compras.buscarPorId(compraId);
    expect(compra?.valorTotal).toBe(210000);
    expect(compra?.parcelas.map((p) => p.valor)).toEqual([21000, 21000, 21000, 21000]);
  });
});

describe("FakeImportacaoRepository (T12, IMP-02, IMP-04)", () => {
  it("registrar a mesma competência duas vezes lança como a unicidade do banco", async () => {
    const { importacoes } = criarFakes();
    await importacoes.registrar(importacao("2026-10"), decisoes({ débito: "conta-corrente" }));

    const recusa = importacoes.registrar(importacao("2026-10"), decisoes({ débito: "outro-meio" }));

    await expect(recusa).rejects.toBeInstanceOf(ViolacaoDeUnicidade);
    await expect(recusa).rejects.toMatchObject({ restricao: "importacao_competencia_unique" });
    expect((await importacoes.decisoesLembradas()).meios.get("débito")).toBe("conta-corrente");
  });

  it("decisoesLembradas devolve o que registrar gravou, com upsert por tipo e chave (IMP-04 AC 4)", async () => {
    const { importacoes } = criarFakes();
    await importacoes.registrar(
      importacao("2026-10"),
      decisoes(
        { débito: "conta-corrente", "cartão roxo": "cartao-roxo" },
        new Map([["salário a", { classe: "FIXA", contaId: "conta-corrente" }]]),
      ),
    );

    await importacoes.registrar(
      importacao("2026-11"),
      decisoes(
        { "cartão roxo": "cartao-novo", "cartão azul": "cartao-azul" },
        new Map([["presente", { classe: "AVULSA", contaId: "conta-corrente" }]]),
      ),
    );

    const lembradas = await importacoes.decisoesLembradas();
    expect(Object.fromEntries(lembradas.meios)).toEqual({
      débito: "conta-corrente",
      "cartão roxo": "cartao-novo",
      "cartão azul": "cartao-azul",
    });
    expect(Object.fromEntries(lembradas.entradas)).toEqual({
      "salário a": { classe: "FIXA", contaId: "conta-corrente" },
      presente: { classe: "AVULSA", contaId: "conta-corrente" },
    });
  });

  it("ultimaCompetenciaImportada é null sem registro e a mais recente depois (IMP-02 AC 4)", async () => {
    const { importacoes } = criarFakes();
    expect(await importacoes.ultimaCompetenciaImportada()).toBeNull();

    await importacoes.registrar(importacao("2026-10"), decisoes({}));
    await importacoes.registrar(importacao("2026-11"), decisoes({}));

    expect(await importacoes.ultimaCompetenciaImportada()).toBe("2026-11");
  });

  it("haLancamentoCompraOuRecorrencia enxerga avulso cancelado, compra e recorrência (IMP-02 AC 6)", async () => {
    const vazio = criarFakes();
    expect(await vazio.importacoes.haLancamentoCompraOuRecorrencia()).toBe(false);

    const comAvulso = criarFakes();
    const lancado = await comAvulso.movimentos.criarAvulso(avulso());
    await comAvulso.movimentos.cancelar(lancado.id, "2026-10-02T12:00:00.000Z");
    expect(await comAvulso.importacoes.haLancamentoCompraOuRecorrencia()).toBe(true);

    const { fakes: comCompra } = await criarCompraEmAndamento();
    comCompra.estado.movimentos.clear();
    expect(await comCompra.importacoes.haLancamentoCompraOuRecorrencia()).toBe(true);

    const comRecorrencia = criarFakes();
    await comRecorrencia.recorrencias.criar({
      dados: {
        descricao: "Conta fixa A",
        natureza: "DESPESA",
        categoriaId: null,
        usuarioId: "usuario-a",
        meioPagamentoId: "conta-corrente",
        competenciaInicio: c("2026-10"),
        competenciaFim: null,
        diaVencimento: 1,
      },
      valorInicial: 18000 as Cents,
    });
    expect(await comRecorrencia.importacoes.haLancamentoCompraOuRecorrencia()).toBe(true);
  });
});

describe("FakeCadastroRepository: categorias da importação (T12, IMP-03 AC 9-10)", () => {
  it("listarTodasAsCategorias inclui as arquivadas", async () => {
    const { cadastros, estado } = criarFakes();
    estado.categorias.push(
      { id: "cat-ativa", nome: "Categoria Um", arquivadaEm: null },
      { id: "cat-arquivada", nome: "Categoria Dois", arquivadaEm: "2026-09-01T00:00:00.000Z" },
    );

    const todas = await cadastros.listarTodasAsCategorias();

    expect(todas.map((categoria) => categoria.id)).toEqual(["cat-ativa", "cat-arquivada"]);
  });

  it("buscarCategoriaPorNome ignora caixa e encontra também a arquivada", async () => {
    const { cadastros, estado } = criarFakes();
    estado.categorias.push({
      id: "cat-arquivada",
      nome: "Categoria Dois",
      arquivadaEm: "2026-09-01T00:00:00.000Z",
    });

    expect((await cadastros.buscarCategoriaPorNome("CATEGORIA dois"))?.id).toBe("cat-arquivada");
    expect(await cadastros.buscarCategoriaPorNome("Categoria Três")).toBeNull();
  });

  it("criarCategoria grava uma ativa e reativarCategoria desfaz o arquivamento", async () => {
    const { cadastros, estado } = criarFakes();
    estado.categorias.push({
      id: "cat-arquivada",
      nome: "Categoria Dois",
      arquivadaEm: "2026-09-01T00:00:00.000Z",
    });

    const criada = await cadastros.criarCategoria({ nome: "Categoria Três", arquivadaEm: null });
    const reativada = await cadastros.reativarCategoria("cat-arquivada");

    expect(criada).toMatchObject({ nome: "Categoria Três", arquivadaEm: null });
    expect(reativada).toEqual({ id: "cat-arquivada", nome: "Categoria Dois", arquivadaEm: null });
    expect((await cadastros.listarCategoriasDisponiveis()).map((cat) => cat.nome)).toEqual([
      "Categoria Dois",
      "Categoria Três",
    ]);
  });
});

describe("FakeMovimentoRepository.criarAvulso com origem (T12, IMP-03 AC 8)", () => {
  it("guarda a origem da linha importada e recusa a mesma fonte e chave de novo", async () => {
    const { movimentos, estado } = criarFakes();
    const origem = { fonte: "PLANILHA", chave: "2026-10|GASTOS|2" } as const;

    const lancado = await movimentos.criarAvulso(avulso(origem));
    const recusa = movimentos.criarAvulso(avulso(origem));

    expect(estado.origensDeDado.get(lancado.id)).toEqual(origem);
    await expect(recusa).rejects.toBeInstanceOf(ViolacaoDeUnicidade);
    await expect(recusa).rejects.toMatchObject({ restricao: "movimento_origem_dado_hash_uq" });
    expect(estado.movimentos.size).toBe(1);
  });

  it("sem origem, nada é guardado e dois avulsos iguais entram, como hoje", async () => {
    const { movimentos, estado } = criarFakes();

    await movimentos.criarAvulso(avulso());
    await movimentos.criarAvulso(avulso());

    expect(estado.movimentos.size).toBe(2);
    expect(estado.origensDeDado.size).toBe(0);
  });
});

describe("criarFakes com a transação da importação (T12, IMP-06)", () => {
  it("executar roda a operação sobre os repositórios do mesmo estado e devolve o resultado", async () => {
    const fakes = criarFakes();

    const devolvido = await fakes.transacao.executar(async (repos) => {
      expect(repos.recorrencias).toBe(fakes.recorrencias);
      expect(repos.importacoes).toBe(fakes.importacoes);
      await repos.movimentos.criarAvulso(avulso());
      return "feito";
    });

    expect(devolvido).toBe("feito");
    expect(fakes.estado.movimentos.size).toBe(1);
  });
});
