import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { geraFatura } from "@/domain";
import { type BancoDeDados, criarCliente, criarPool } from "../client";
import { limparDados, recriarBancoDeTeste, URL_BANCO_DE_TESTE } from "../testing/banco-de-teste";
import { CadastroRepositoryDrizzle } from "./cadastro.repository";

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
