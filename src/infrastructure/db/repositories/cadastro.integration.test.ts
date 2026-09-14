import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type BancoDeDados, criarCliente, criarPool } from "../client";
import { limparDados, recriarBancoDeTeste, URL_BANCO_DE_TESTE } from "../testing/banco-de-teste";
import { CadastroRepositoryDrizzle } from "./cadastro.repository";

/**
 * O que estes testes prendem é o comportamento que impede as listas de
 * cadastro de virarem lixo: **nome repetido nunca produz uma gêmea, e nunca
 * produz um beco sem saída.**
 *
 * O `UNIQUE` de `categoria.nome` no Postgres é sensível a caixa. Sem a busca
 * sem caixa, "Mercado" e "mercado" entram as duas e ninguém consegue
 * distingui-las na tela. E o nome de uma categoria **arquivada** continua
 * ocupando esse `UNIQUE`: sem a reativação, quem tentasse recriá-la receberia
 * um erro de duplicidade apontando para algo que não aparece em lista alguma.
 */

let pool: Pool;
let db: BancoDeDados;
let cadastros: CadastroRepositoryDrizzle;

beforeAll(async () => {
  pool = criarPool(URL_BANCO_DE_TESTE);
  db = criarCliente(pool);
  await recriarBancoDeTeste(pool);
}, 60_000);

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await limparDados(pool);
  cadastros = new CadastroRepositoryDrizzle(db);
});

async function nomesDisponiveis(): Promise<string[]> {
  const linhas = await cadastros.listarCategoriasDisponiveis();
  return linhas.map((c) => c.nome);
}

describe("busca de categoria por nome", () => {
  it("encontra ignorando a caixa", async () => {
    await cadastros.criarCategoria({ nome: "Mercado", arquivadaEm: null });

    expect((await cadastros.buscarCategoriaPorNome("mercado"))?.nome).toBe("Mercado");
    expect((await cadastros.buscarCategoriaPorNome("MERCADO"))?.nome).toBe("Mercado");
    expect((await cadastros.buscarCategoriaPorNome("MeRcAdO"))?.nome).toBe("Mercado");
  });

  it("devolve null quando não existe", async () => {
    expect(await cadastros.buscarCategoriaPorNome("Mercado")).toBeNull();
  });

  it("enxerga categoria arquivada, que `listarCategoriasDisponiveis` esconde", async () => {
    await cadastros.criarCategoria({ nome: "Mercado", arquivadaEm: "2026-01-01T12:00:00.000Z" });

    expect(await nomesDisponiveis()).toEqual([]);
    expect((await cadastros.buscarCategoriaPorNome("mercado"))?.nome).toBe("Mercado");
  });

  it("não confunde uma categoria com outra de nome parecido", async () => {
    await cadastros.criarCategoria({ nome: "Casa", arquivadaEm: null });

    expect(await cadastros.buscarCategoriaPorNome("Casa e jardim")).toBeNull();
  });
});

describe("reativação de categoria", () => {
  it("devolve uma categoria arquivada para a lista de disponíveis", async () => {
    const arquivada = await cadastros.criarCategoria({
      nome: "Mercado",
      arquivadaEm: "2026-01-01T12:00:00.000Z",
    });

    const reativada = await cadastros.reativarCategoria(arquivada.id);

    expect(reativada.id).toBe(arquivada.id);
    expect(reativada.arquivadaEm).toBeNull();
    expect(await nomesDisponiveis()).toEqual(["Mercado"]);
  });

  it("é idempotente: reativar uma categoria ativa não a altera", async () => {
    const ativa = await cadastros.criarCategoria({ nome: "Mercado", arquivadaEm: null });

    const depois = await cadastros.reativarCategoria(ativa.id);

    expect(depois).toEqual(ativa);
  });

  it("preserva o id, para que os lançamentos antigos continuem apontando para ela", async () => {
    const original = await cadastros.criarCategoria({
      nome: "Mercado",
      arquivadaEm: "2026-01-01T12:00:00.000Z",
    });

    const reativada = await cadastros.reativarCategoria(original.id);

    expect(reativada.id).toBe(original.id);
    expect(await cadastros.buscarCategoria(original.id)).toEqual(reativada);
  });
});

describe("a categoria criada não pertence a mês nenhum (DADO-02)", () => {
  it("aparece em `listarCategoriasDisponiveis` sem receber competência", async () => {
    await cadastros.criarCategoria({ nome: "Mercado", arquivadaEm: null });

    // A consulta não recebe competência porque a coluna não existe: é isso que
    // faz a categoria valer para setembro, para outubro e para 2028 sem que
    // ninguém precise repetir o cadastro, que era a re-digitação da planilha.
    expect(await nomesDisponiveis()).toEqual(["Mercado"]);
  });
});

/**
 * Busca de meio de pagamento, que **não** é a de categoria com outro nome.
 *
 * A diferença está no recorte: aqui só interessa o que está ativo. `categoria`
 * tem `UNIQUE` no nome, então um nome arquivado continua ocupando o lugar e
 * precisa ser reativável; `meio_pagamento` não tem, e recriar um cartão que
 * foi encerrado é operação legítima. Travá-la por causa de um homônimo
 * arquivado seria inventar uma regra que o banco não tem.
 */
describe("busca de meio de pagamento ativo por nome", () => {
  it("encontra ignorando a caixa", async () => {
    await cadastros.criarMeioDePagamento({
      nome: "Cartão Azul",
      tipo: "CARTAO_CREDITO",
      arquivadoEm: null,
      diaFechamento: 10,
      diaVencimento: 20,
      fechamentoVaiParaFaturaSeguinte: true,
    });

    expect((await cadastros.buscarMeioDePagamentoAtivoPorNome("cartão azul"))?.nome).toBe(
      "Cartão Azul",
    );
  });

  it("ignora o arquivado: o nome dele volta a estar livre", async () => {
    await cadastros.criarMeioDePagamento({
      nome: "Cartão Azul",
      tipo: "CARTAO_CREDITO",
      arquivadoEm: "2026-01-01T12:00:00.000Z",
      diaFechamento: 10,
      diaVencimento: 20,
      fechamentoVaiParaFaturaSeguinte: true,
    });

    expect(await cadastros.buscarMeioDePagamentoAtivoPorNome("Cartão Azul")).toBeNull();
  });

  it("devolve null quando não existe", async () => {
    expect(await cadastros.buscarMeioDePagamentoAtivoPorNome("Nada")).toBeNull();
  });
});

describe("gravação de meio de pagamento respeita a bicondicional do banco", () => {
  it("cartão grava com ciclo e gera fatura", async () => {
    const criado = await cadastros.criarMeioDePagamento({
      nome: "Cartão Azul",
      tipo: "CARTAO_CREDITO",
      arquivadoEm: null,
      diaFechamento: 25,
      diaVencimento: 5,
      fechamentoVaiParaFaturaSeguinte: true,
    });

    expect(criado).toMatchObject({ tipo: "CARTAO_CREDITO", diaFechamento: 25, diaVencimento: 5 });
  });

  it.each(["CONTA_CORRENTE", "ROTULO"] as const)("%s grava sem ciclo", async (tipo) => {
    const criado = await cadastros.criarMeioDePagamento({
      nome: `M ${tipo}`,
      tipo,
      arquivadoEm: null,
    });

    expect(criado.tipo).toBe(tipo);
    expect(criado).not.toHaveProperty("diaFechamento");
  });

  it("o meio criado aparece nos disponíveis sem receber competência", async () => {
    await cadastros.criarMeioDePagamento({
      nome: "Conta Nova",
      tipo: "CONTA_CORRENTE",
      arquivadoEm: null,
    });

    const nomes = (await cadastros.listarMeiosDePagamentoDisponiveis()).map((m) => m.nome);
    expect(nomes).toEqual(["Conta Nova"]);
  });
});
