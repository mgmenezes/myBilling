import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CORES_DE_CATEGORIA, geraFatura } from "@/domain";
import { type BancoDeDados, criarCliente, criarPool } from "../client";
import { limparDados, recriarBancoDeTeste, URL_BANCO_DE_TESTE } from "../testing/banco-de-teste";
import { CadastroRepositoryDrizzle } from "./cadastro.repository";
import { DadoInvalidoNoBanco, paraCategoria } from "./mapeadores";

const ARQUIVADO_EM = "2026-01-15T12:00:00.000Z";

let pool: Pool;
let db: BancoDeDados;
let repo: CadastroRepositoryDrizzle;

beforeAll(async () => {
  pool = criarPool(URL_BANCO_DE_TESTE);
  db = criarCliente(pool);
  repo = new CadastroRepositoryDrizzle(db);
  await recriarBancoDeTeste(pool);
}, 60_000);

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await limparDados(pool);
});

describe("CadastroRepository: meios de pagamento (T35, CART-03)", () => {
  it("não lista o meio arquivado para nova compra — CART-03, AC 7", async () => {
    await repo.criarMeioDePagamento({
      nome: "Conta Corrente",
      tipo: "CONTA_CORRENTE",
      arquivadoEm: null,
    });
    await repo.criarMeioDePagamento({
      nome: "Cartão Antigo",
      tipo: "CARTAO_CREDITO",
      arquivadoEm: ARQUIVADO_EM,
      diaFechamento: 25,
      diaVencimento: 5,
      fechamentoVaiParaFaturaSeguinte: true,
    });

    const disponiveis = await repo.listarMeiosDePagamentoDisponiveis();

    expect(disponiveis.map((m) => m.nome)).toEqual(["Conta Corrente"]);
  });

  it("continua resolvendo o meio arquivado por id, para exibir parcelas existentes — CART-03, AC 6", async () => {
    const arquivado = await repo.criarMeioDePagamento({
      nome: "Cartão Antigo",
      tipo: "CARTAO_CREDITO",
      arquivadoEm: ARQUIVADO_EM,
      diaFechamento: 25,
      diaVencimento: 5,
      fechamentoVaiParaFaturaSeguinte: true,
    });

    const encontrado = await repo.buscarMeioDePagamento(arquivado.id);

    expect(encontrado?.nome).toBe("Cartão Antigo");
    expect(encontrado?.arquivadoEm).toBe(ARQUIVADO_EM);
  });

  it("mapeia o cartão com seu ciclo e a conta corrente sem ciclo — CART-02, AC 5", async () => {
    const cartao = await repo.criarMeioDePagamento({
      nome: "Cartão Roxo",
      tipo: "CARTAO_CREDITO",
      arquivadoEm: null,
      diaFechamento: 25,
      diaVencimento: 5,
      fechamentoVaiParaFaturaSeguinte: true,
    });
    const conta = await repo.criarMeioDePagamento({
      nome: "Conta Corrente",
      tipo: "CONTA_CORRENTE",
      arquivadoEm: null,
    });

    if (!geraFatura(cartao)) {
      throw new Error("esperava que o cartão gerasse fatura");
    }
    expect(cartao.diaFechamento).toBe(25);
    expect(cartao.diaVencimento).toBe(5);
    expect(geraFatura(conta)).toBe(false);
  });

  it("devolve null para um meio que não existe", async () => {
    expect(await repo.buscarMeioDePagamento("00000000-0000-0000-0000-000000000000")).toBeNull();
  });
});

describe("CadastroRepository: categorias (T35)", () => {
  it("não lista a categoria arquivada nos formulários mas a resolve em relatório", async () => {
    await repo.criarCategoria({ nome: "Categoria Um", arquivadaEm: null });
    const arquivada = await repo.criarCategoria({
      nome: "Categoria Dois",
      arquivadaEm: ARQUIVADO_EM,
    });

    const disponiveis = await repo.listarCategoriasDisponiveis();

    expect(disponiveis.map((c) => c.nome)).toEqual(["Categoria Um"]);
    expect((await repo.buscarCategoria(arquivada.id))?.nome).toBe("Categoria Dois");
  });

  it("devolve null para uma categoria que não existe", async () => {
    expect(await repo.buscarCategoria("00000000-0000-0000-0000-000000000000")).toBeNull();
  });
});

describe("CadastroRepository: usuários (T35, DADO-02)", () => {
  it("cria e lista usuários em ordem de nome", async () => {
    await repo.criarUsuario({ nome: "Pessoa B", email: "pessoa-b@example.com" });
    await repo.criarUsuario({ nome: "Pessoa A", email: "pessoa-a@example.com" });

    const usuarios = await repo.listarUsuarios();

    expect(usuarios.map((u) => u.nome)).toEqual(["Pessoa A", "Pessoa B"]);
    expect(Object.keys(usuarios[0] ?? {}).sort()).toEqual(["email", "id", "nome"]);
  });
});

describe("CadastroRepository: quais meios geram fatura (BLOCO-01, AC 6)", () => {
  const CARTAO = {
    tipo: "CARTAO_CREDITO",
    diaFechamento: 25,
    diaVencimento: 5,
    fechamentoVaiParaFaturaSeguinte: true,
  } as const;

  it("devolve o id de um cartão ativo", async () => {
    const cartao = await repo.criarMeioDePagamento({
      nome: "Cartão Roxo",
      arquivadoEm: null,
      ...CARTAO,
    });

    expect(await repo.idsDeMeiosComFatura()).toEqual(new Set([cartao.id]));
  });

  it("devolve também o cartão arquivado, para não reclassificar o passado", async () => {
    const ativo = await repo.criarMeioDePagamento({
      nome: "Cartão Roxo",
      arquivadoEm: null,
      ...CARTAO,
    });
    const encerrado = await repo.criarMeioDePagamento({
      nome: "Cartão Azul",
      arquivadoEm: ARQUIVADO_EM,
      ...CARTAO,
    });

    const ids = await repo.idsDeMeiosComFatura();

    expect(ids).toEqual(new Set([ativo.id, encerrado.id]));
    /* O contraste é a prova: a listagem dos formulários exclui o arquivado,
       e esta consulta não. As duas leem a mesma tabela. */
    expect((await repo.listarMeiosDePagamentoDisponiveis()).map((m) => m.id)).toEqual([ativo.id]);
  });

  it("não devolve conta corrente nem rótulo", async () => {
    const cartao = await repo.criarMeioDePagamento({
      nome: "Cartão Roxo",
      arquivadoEm: null,
      ...CARTAO,
    });
    await repo.criarMeioDePagamento({
      nome: "Conta Corrente",
      tipo: "CONTA_CORRENTE",
      arquivadoEm: null,
    });
    await repo.criarMeioDePagamento({ nome: "Dinheiro", tipo: "ROTULO", arquivadoEm: null });

    expect(await repo.idsDeMeiosComFatura()).toEqual(new Set([cartao.id]));
  });

  it("devolve conjunto vazio quando não há nenhum cartão", async () => {
    await repo.criarMeioDePagamento({
      nome: "Conta Corrente",
      tipo: "CONTA_CORRENTE",
      arquivadoEm: null,
    });

    expect(await repo.idsDeMeiosComFatura()).toEqual(new Set());
  });
});

/**
 * Testes derivados de COR-01 (ACs 2, 4 e 5) e do Done-when de T2.
 *
 * A cor é um nome da paleta fechada, ou nada. Quem cria categoria não escolhe
 * cor; quem troca a cor ou renomeia passa por `atualizarCategoria`, que grava
 * nome e cor numa escrita só. Nomes genéricos (AD-009).
 */
describe("CadastroRepository: a cor da categoria (T2, COR-01)", () => {
  interface ErroPostgres {
    readonly code?: string;
    readonly constraint?: string;
    readonly cause?: ErroPostgres;
  }

  /** O erro do driver, também quando o Drizzle o embrulha em `cause`. */
  async function erroDoBanco(acao: () => Promise<unknown>): Promise<ErroPostgres> {
    try {
      await acao();
    } catch (erro) {
      const capturado = erro as ErroPostgres;
      return capturado.code === undefined && capturado.cause !== undefined
        ? capturado.cause
        : capturado;
    }
    throw new Error("o banco aceitou um dado que deveria ter sido recusado");
  }

  it("a categoria criada pelo repositório nasce sem cor escolhida (AC 5)", async () => {
    const criada = await repo.criarCategoria({ nome: "Categoria Um", arquivadaEm: null });

    expect(criada.cor).toBeNull();
    expect((await repo.buscarCategoria(criada.id))?.cor).toBeNull();
    expect((await repo.listarCategoriasDisponiveis()).map((c) => c.cor)).toEqual([null]);
  });

  it("atualizarCategoria grava a cor, e ela volta em toda leitura (AC 2)", async () => {
    const criada = await repo.criarCategoria({ nome: "Categoria Um", arquivadaEm: null });

    const atualizada = await repo.atualizarCategoria(criada.id, { cor: "verde" });

    expect(atualizada).toEqual({
      id: criada.id,
      nome: "Categoria Um",
      arquivadaEm: null,
      cor: "verde",
    });
    expect(await repo.buscarCategoria(criada.id)).toEqual(atualizada);
    expect(await repo.listarCategoriasDisponiveis()).toEqual([atualizada]);
    expect(await repo.listarTodasAsCategorias()).toEqual([atualizada]);
    expect(await repo.buscarCategoriaPorNome("categoria um")).toEqual(atualizada);
  });

  it("{ cor: null } apaga a cor escolhida (AC 2)", async () => {
    const criada = await repo.criarCategoria({ nome: "Categoria Um", arquivadaEm: null });
    await repo.atualizarCategoria(criada.id, { cor: "roxo" });

    const apagada = await repo.atualizarCategoria(criada.id, { cor: null });

    expect(apagada.cor).toBeNull();
    expect(apagada.nome).toBe("Categoria Um");
    expect((await repo.buscarCategoria(criada.id))?.cor).toBeNull();
  });

  it("atualizarCategoria grava o nome e a cor juntos", async () => {
    const criada = await repo.criarCategoria({ nome: "Categoria Um", arquivadaEm: null });

    const atualizada = await repo.atualizarCategoria(criada.id, {
      nome: "Categoria Dez",
      cor: "roxo",
    });

    expect(atualizada).toEqual({
      id: criada.id,
      nome: "Categoria Dez",
      arquivadaEm: null,
      cor: "roxo",
    });
    expect(await repo.buscarCategoria(criada.id)).toEqual(atualizada);
  });

  /* A prova de que é uma escrita só: o nome repetido derruba a escrita, e a
     cor que vinha junto não fica gravada pela metade. */
  it("nome e cor numa escrita: se o nome é recusado, a cor também não muda", async () => {
    await repo.criarCategoria({ nome: "Categoria Um", arquivadaEm: null });
    const dois = await repo.criarCategoria({ nome: "Categoria Dois", arquivadaEm: null });

    const erro = await erroDoBanco(() =>
      repo.atualizarCategoria(dois.id, { nome: "Categoria Um", cor: "roxo" }),
    );

    expect(erro.code).toBe("23505");
    expect(await repo.buscarCategoria(dois.id)).toEqual({
      id: dois.id,
      nome: "Categoria Dois",
      arquivadaEm: null,
      cor: null,
    });
  });

  it("atualizar uma categoria que não existe é recusado", async () => {
    await expect(
      repo.atualizarCategoria("00000000-0000-0000-0000-000000000000", { cor: "verde" }),
    ).rejects.toThrow("update de categoria não retornou linha");
  });

  it("o banco aceita cada uma das dez cores da paleta (AC 4)", async () => {
    for (const cor of CORES_DE_CATEGORIA) {
      await pool.query("INSERT INTO categoria (nome, cor) VALUES ($1, $2)", [
        `Categoria ${cor}`,
        cor,
      ]);
    }

    const { rows } = await pool.query<{ cor: string }>("SELECT cor FROM categoria ORDER BY cor");
    expect(rows.map((linha) => linha.cor)).toEqual([...CORES_DE_CATEGORIA].sort());
  });

  it.each([["dourado"], [""], ["Verde"], ["âmbar"]])(
    "o banco recusa a cor %p pelo CHECK, ao inserir e ao atualizar (AC 4)",
    async (cor) => {
      const naInsercao = await erroDoBanco(() =>
        pool.query("INSERT INTO categoria (nome, cor) VALUES ($1, $2)", ["Categoria Um", cor]),
      );
      expect(naInsercao.code).toBe("23514");
      expect(naInsercao.constraint).toBe("categoria_cor_valida");

      const criada = await repo.criarCategoria({ nome: "Categoria Dois", arquivadaEm: null });
      const naAtualizacao = await erroDoBanco(() =>
        pool.query("UPDATE categoria SET cor = $1 WHERE id = $2", [cor, criada.id]),
      );
      expect(naAtualizacao.code).toBe("23514");
      expect(naAtualizacao.constraint).toBe("categoria_cor_valida");
    },
  );

  /* O CHECK garante que isto não acontece; se acontecer, é corrupção e o
     mapeador não deixa a cor desconhecida subir para a tela. */
  it("o mapeador trata cor fora da paleta como dado inválido no banco", () => {
    expect(() =>
      paraCategoria({ id: "cat-1", nome: "Categoria Um", arquivadaEm: null, cor: "dourado" }),
    ).toThrow(DadoInvalidoNoBanco);
  });
});

describe("CadastroRepository: editar um meio de pagamento (CADCOL-07)", () => {
  interface ErroPostgres {
    readonly code?: string;
    readonly constraint?: string;
    readonly cause?: ErroPostgres;
  }

  /** O erro do driver, também quando o Drizzle o embrulha em `cause`. */
  async function erroDoBanco(acao: () => Promise<unknown>): Promise<ErroPostgres> {
    try {
      await acao();
    } catch (erro) {
      const capturado = erro as ErroPostgres;
      return capturado.code === undefined && capturado.cause !== undefined
        ? capturado.cause
        : capturado;
    }
    throw new Error("o banco aceitou um dado que deveria ter sido recusado");
  }

  interface LinhaDoMeio {
    readonly nome: string;
    readonly tipo: string;
    readonly gera_fatura: boolean;
    readonly dia_fechamento: number | null;
    readonly dia_vencimento: number | null;
    readonly fechamento_vai_para_fatura_seguinte: boolean;
    readonly arquivado_em: Date | null;
  }

  /** As colunas como o banco as guarda, inclusive as que o tipo de domínio não mostra. */
  async function linhaNoBanco(id: string): Promise<LinhaDoMeio | undefined> {
    const { rows } = await pool.query<LinhaDoMeio>(
      `SELECT nome, tipo::text AS tipo, gera_fatura, dia_fechamento, dia_vencimento,
              fechamento_vai_para_fatura_seguinte, arquivado_em
         FROM meio_pagamento WHERE id = $1`,
      [id],
    );
    return rows[0];
  }

  /* Valores que diferem do padrão de cada coluna, para a escrita que os
     sobrescrevesse aparecer: fechamento na fatura do mês e cartão arquivado. */
  async function cartaoRoxo() {
    return repo.criarMeioDePagamento({
      nome: "Cartão Roxo",
      tipo: "CARTAO_CREDITO",
      arquivadoEm: ARQUIVADO_EM,
      diaFechamento: 25,
      diaVencimento: 5,
      fechamentoVaiParaFaturaSeguinte: false,
    });
  }

  it("com { nome }, grava só o nome, e o resto da linha fica como estava", async () => {
    const cartao = await cartaoRoxo();
    const antes = await linhaNoBanco(cartao.id);

    await repo.atualizarMeioDePagamento(cartao.id, { nome: "Cartão Lilás" });

    expect(await linhaNoBanco(cartao.id)).toEqual({ ...antes, nome: "Cartão Lilás" });
    expect(antes).toEqual({
      nome: "Cartão Roxo",
      tipo: "CARTAO_CREDITO",
      gera_fatura: true,
      dia_fechamento: 25,
      dia_vencimento: 5,
      fechamento_vai_para_fatura_seguinte: false,
      arquivado_em: new Date(ARQUIVADO_EM),
    });
  });

  it("com os dois dias, grava só os dias, e o resto da linha fica como estava", async () => {
    const cartao = await cartaoRoxo();
    const antes = await linhaNoBanco(cartao.id);

    await repo.atualizarMeioDePagamento(cartao.id, { diaFechamento: 10, diaVencimento: 17 });

    expect(await linhaNoBanco(cartao.id)).toEqual({
      ...antes,
      dia_fechamento: 10,
      dia_vencimento: 17,
    });
  });

  it("devolve o meio gravado, igual ao que a leitura por id devolve", async () => {
    const cartao = await cartaoRoxo();

    const gravado = await repo.atualizarMeioDePagamento(cartao.id, {
      nome: "Cartão Lilás",
      diaFechamento: 10,
    });

    expect(gravado).toEqual({
      id: cartao.id,
      nome: "Cartão Lilás",
      tipo: "CARTAO_CREDITO",
      arquivadoEm: ARQUIVADO_EM,
      diaFechamento: 10,
      diaVencimento: 5,
      fechamentoVaiParaFaturaSeguinte: false,
    });
    expect(await repo.buscarMeioDePagamento(cartao.id)).toEqual(gravado);
  });

  it("os dias 1 e 31 gravam", async () => {
    const cartao = await cartaoRoxo();

    await repo.atualizarMeioDePagamento(cartao.id, { diaFechamento: 1, diaVencimento: 31 });

    const depois = await linhaNoBanco(cartao.id);
    expect([depois?.dia_fechamento, depois?.dia_vencimento]).toEqual([1, 31]);
  });

  it.each([
    ["fechamento 0", { diaFechamento: 0 }],
    ["fechamento 32", { diaFechamento: 32 }],
    ["vencimento 0", { diaVencimento: 0 }],
    ["vencimento 32", { diaVencimento: 32 }],
  ])("%s é recusado pelo CHECK de dias, e a linha fica como estava", async (_caso, mudancas) => {
    const cartao = await cartaoRoxo();
    const antes = await linhaNoBanco(cartao.id);

    const erro = await erroDoBanco(() => repo.atualizarMeioDePagamento(cartao.id, mudancas));

    expect(erro.code).toBe("23514");
    expect(erro.constraint).toBe("meio_pagamento_dias_validos");
    expect(await linhaNoBanco(cartao.id)).toEqual(antes);
  });

  it("dias numa conta são recusados pelo CHECK do ciclo, e a linha fica como estava", async () => {
    const conta = await repo.criarMeioDePagamento({
      nome: "Conta Corrente",
      tipo: "CONTA_CORRENTE",
      arquivadoEm: null,
    });
    const antes = await linhaNoBanco(conta.id);

    const erro = await erroDoBanco(() =>
      repo.atualizarMeioDePagamento(conta.id, { diaFechamento: 10, diaVencimento: 17 }),
    );

    expect(erro.code).toBe("23514");
    expect(erro.constraint).toBe("meio_pagamento_cartao_tem_ciclo");
    expect(await linhaNoBanco(conta.id)).toEqual(antes);
  });

  it("id inexistente lança, sem gravar nada", async () => {
    const cartao = await cartaoRoxo();
    const antes = await linhaNoBanco(cartao.id);

    await expect(
      repo.atualizarMeioDePagamento("00000000-0000-0000-0000-000000000000", {
        nome: "Cartão Lilás",
      }),
    ).rejects.toThrow("update de meio_pagamento não retornou linha");
    expect(await linhaNoBanco(cartao.id)).toEqual(antes);
    const { rows } = await pool.query<{ total: number }>(
      "SELECT COUNT(*)::int AS total FROM meio_pagamento",
    );
    expect(rows[0]).toEqual({ total: 1 });
  });
});
