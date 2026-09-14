import {
  type Cents,
  type Competencia,
  criarCents,
  criarCompetencia,
  gerarParcelas,
  type PlanoParcelamento,
} from "@/domain";
import type { BancoDeDados } from "./client";
import { CadastroRepositoryDrizzle } from "./repositories/cadastro.repository";
import { CompraRepositoryDrizzle } from "./repositories/compra.repository";
import { deCompetencia } from "./repositories/mapeadores";
import { movimento } from "./schema";

/**
 * Seed sintético.
 *
 * **Todo dado aqui é inventado** (AD-009). Nenhum valor, nome ou descrição
 * real da família aparece neste arquivo — o repositório pode virar público e
 * dado financeiro doméstico em git é irreversível. Pessoas são "Pessoa A" e
 * "Pessoa B", cartões são cores, categorias são numeradas, e os valores vêm
 * de um PRNG com semente fixa ou foram escolhidos por propriedade
 * matemática, não por realismo.
 *
 * Determinismo: mesma semente, mesmos dados. Os identificadores continuam
 * sendo UUID gerado pelo banco; o que se repete é o conteúdo.
 */

export const SEMENTE_PADRAO = 424242;

/** mulberry32: PRNG de 32 bits, determinístico e sem dependência externa. */
export function criarPrng(semente: number): () => number {
  let estado = semente >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function inteiroEntre(prng: () => number, minimo: number, maximo: number): number {
  return minimo + Math.floor(prng() * (maximo - minimo + 1));
}

function escolher<T>(prng: () => number, opcoes: ReadonlyArray<T>): T {
  const escolhido = opcoes[inteiroEntre(prng, 0, opcoes.length - 1)];
  if (!escolhido) {
    throw new Error("lista de opções vazia");
  }
  return escolhido;
}

function cents(valor: number): Cents {
  const resultado = criarCents(valor);
  if (!resultado.ok) {
    throw new Error(`valor de seed inválido: ${resultado.error.code}`);
  }
  return resultado.value;
}

function competencia(texto: string): Competencia {
  const resultado = criarCompetencia(texto);
  if (!resultado.ok) {
    throw new Error(`competência de seed inválida: ${texto}`);
  }
  return resultado.value;
}

function plano(entrada: Parameters<typeof gerarParcelas>[0]): PlanoParcelamento {
  const resultado = gerarParcelas(entrada);
  if (!resultado.ok) {
    throw new Error(`plano de seed inválido: ${resultado.error.code}`);
  }
  return resultado.value;
}

const CATEGORIAS = [
  "Categoria Um",
  "Categoria Dois",
  "Categoria Três",
  "Categoria Quatro",
  "Categoria Cinco",
] as const;

const DESCRICOES_AVULSAS = [
  "Lançamento avulso A",
  "Lançamento avulso B",
  "Lançamento avulso C",
  "Lançamento avulso D",
] as const;

const COMPETENCIAS = ["2026-03", "2026-04", "2026-05"] as const;

export interface ResultadoSeed {
  readonly usuarios: number;
  readonly meiosDePagamento: number;
  readonly categorias: number;
  readonly compras: number;
  readonly movimentos: number;
}

/**
 * Popula um banco vazio. Inclui de propósito uma compra **já em andamento**
 * (`8/10`), para que o caso do AD-005 exista em qualquer ambiente de
 * desenvolvimento sem ninguém precisar montá-lo à mão.
 */
export async function semear(
  db: BancoDeDados,
  semente: number = SEMENTE_PADRAO,
): Promise<ResultadoSeed> {
  const prng = criarPrng(semente);
  const cadastros = new CadastroRepositoryDrizzle(db);
  const compras = new CompraRepositoryDrizzle(db);

  const pessoaA = await cadastros.criarUsuario({ nome: "Pessoa A", email: "pessoa-a@example.com" });
  const pessoaB = await cadastros.criarUsuario({ nome: "Pessoa B", email: "pessoa-b@example.com" });
  const pessoas = [pessoaA, pessoaB];

  const cartaoRoxo = await cadastros.criarMeioDePagamento({
    nome: "Cartão Roxo",
    tipo: "CARTAO_CREDITO",
    arquivadoEm: null,
    diaFechamento: 25,
    diaVencimento: 5,
    fechamentoVaiParaFaturaSeguinte: true,
  });
  const cartaoAzul = await cadastros.criarMeioDePagamento({
    nome: "Cartão Azul",
    tipo: "CARTAO_CREDITO",
    arquivadoEm: null,
    diaFechamento: 10,
    diaVencimento: 20,
    fechamentoVaiParaFaturaSeguinte: true,
  });
  const contaCorrente = await cadastros.criarMeioDePagamento({
    nome: "Conta Corrente",
    tipo: "CONTA_CORRENTE",
    arquivadoEm: null,
  });
  const rotulo = await cadastros.criarMeioDePagamento({
    nome: "Rótulo Um",
    tipo: "ROTULO",
    arquivadoEm: null,
  });
  /** Cartão arquivado com parcela em aberto: acontece na vida real. */
  const cartaoEncerrado = await cadastros.criarMeioDePagamento({
    nome: "Cartão Encerrado",
    tipo: "CARTAO_CREDITO",
    arquivadoEm: "2026-01-10T12:00:00.000Z",
    diaFechamento: 15,
    diaVencimento: 25,
    fechamentoVaiParaFaturaSeguinte: true,
  });

  const categorias = [];
  for (const nome of CATEGORIAS) {
    categorias.push(await cadastros.criarCategoria({ nome, arquivadaEm: null }));
  }
  const categoriaArquivada = await cadastros.criarCategoria({
    nome: "Categoria Seis",
    arquivadaEm: "2026-02-01T12:00:00.000Z",
  });

  const primeiraCategoria = categorias[0];
  const segundaCategoria = categorias[1];
  if (!primeiraCategoria || !segundaCategoria) {
    throw new Error("seed sem categorias");
  }

  /** Caso do resíduo: 100000 em 3x vira 33334 / 33333 / 33333 (PARC-01, AC 1). */
  const compraDoResiduo = await compras.salvarComParcelas({
    idempotencyKey: "seed-compra-residuo",
    dados: {
      descricao: "Compra parcelada A",
      modo: "TOTAL",
      politicaResiduo: "PRIMEIRAS",
      competenciaCompra: competencia("2026-03"),
      qtdParcelas: 3,
      parcelaInicial: 1,
      categoriaId: primeiraCategoria.id,
      usuarioId: pessoaA.id,
      meioPagamentoId: cartaoRoxo.id,
      dataEvento: "2026-03-04",
    },
    plano: plano({
      modo: "TOTAL",
      valorEntrada: cents(100000),
      qtdParcelas: 3,
      competenciaCompra: competencia("2026-03"),
      parcelaInicial: 1,
      politicaResiduo: "PRIMEIRAS",
    }),
  });
  if (!compraDoResiduo.ok) {
    throw new Error(`seed falhou na compra A: ${compraDoResiduo.error.code}`);
  }

  /** Compra já em andamento: 8 de 10, três parcelas restantes (AD-005). */
  const compraEmAndamento = await compras.salvarComParcelas({
    idempotencyKey: "seed-compra-em-andamento",
    dados: {
      descricao: "Compra parcelada B",
      modo: "VALOR_PARCELA",
      politicaResiduo: "PRIMEIRAS",
      competenciaCompra: competencia("2025-08"),
      qtdParcelas: 10,
      parcelaInicial: 8,
      categoriaId: segundaCategoria.id,
      usuarioId: pessoaB.id,
      meioPagamentoId: cartaoEncerrado.id,
      dataEvento: "2025-08-19",
    },
    plano: plano({
      modo: "VALOR_PARCELA",
      valorEntrada: cents(8400),
      qtdParcelas: 10,
      competenciaCompra: competencia("2025-08"),
      parcelaInicial: 8,
      politicaResiduo: "PRIMEIRAS",
    }),
  });
  if (!compraEmAndamento.ok) {
    throw new Error(`seed falhou na compra B: ${compraEmAndamento.error.code}`);
  }

  const meiosAvulsos = [contaCorrente, cartaoAzul, rotulo];
  let movimentosAvulsos = 0;
  for (const comp of COMPETENCIAS) {
    for (let i = 0; i < 4; i += 1) {
      const pessoa = escolher(prng, pessoas);
      const meio = escolher(prng, meiosAvulsos);
      const categoria = escolher(prng, [...categorias, categoriaArquivada]);
      const dia = inteiroEntre(prng, 1, 28);
      await db.insert(movimento).values({
        natureza: "DESPESA",
        origem: "AVULSO",
        descricao: `${escolher(prng, DESCRICOES_AVULSAS)} ${comp}`,
        competencia: deCompetencia(competencia(comp)),
        dataEvento: `${comp}-${String(dia).padStart(2, "0")}`,
        valorCentavos: inteiroEntre(prng, 1123, 47891),
        pagoEm: prng() < 0.5 ? `${comp}-${String(dia).padStart(2, "0")}` : null,
        categoriaId: categoria.id,
        usuarioId: pessoa.id,
        meioPagamentoId: meio.id,
      });
      movimentosAvulsos += 1;
    }

    await db.insert(movimento).values({
      natureza: "RECEITA",
      origem: "AVULSO",
      descricao: `Entrada ${comp}`,
      competencia: deCompetencia(competencia(comp)),
      dataEvento: `${comp}-05`,
      valorCentavos: inteiroEntre(prng, 500123, 899987),
      pagoEm: `${comp}-05`,
      usuarioId: pessoaA.id,
      meioPagamentoId: contaCorrente.id,
    });
    await db.insert(movimento).values({
      natureza: "INVESTIMENTO",
      origem: "AVULSO",
      descricao: `Aporte ${comp}`,
      competencia: deCompetencia(competencia(comp)),
      dataEvento: `${comp}-07`,
      valorCentavos: inteiroEntre(prng, 10111, 39887),
      pagoEm: `${comp}-07`,
      usuarioId: pessoaB.id,
      meioPagamentoId: contaCorrente.id,
    });
    movimentosAvulsos += 2;
  }

  return {
    usuarios: 2,
    meiosDePagamento: 5,
    categorias: CATEGORIAS.length + 1,
    compras: 2,
    movimentos:
      movimentosAvulsos +
      compraDoResiduo.value.parcelas.length +
      compraEmAndamento.value.parcelas.length,
  };
}
