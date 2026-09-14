import {
  addMeses,
  type Cents,
  type Competencia,
  criarCents,
  criarCompetencia,
  diaEfetivo,
  diffMeses,
  gerarParcelas,
  janelaMaterializacao,
  type PlanoParcelamento,
  versaoVigente,
} from "@/domain";
import type { BancoDeDados } from "./client";
import { CadastroRepositoryDrizzle } from "./repositories/cadastro.repository";
import { CompraRepositoryDrizzle } from "./repositories/compra.repository";
import { deCompetencia } from "./repositories/mapeadores";
import { movimento, recorrencia, recorrenciaVersao } from "./schema";

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
 * Determinismo: mesma semente e mesma base, mesmos dados. Os identificadores
 * continuam sendo UUID gerado pelo banco; o que se repete é o conteúdo.
 *
 * **Por que existe uma competência-base.** Antes, os meses eram literais
 * (`2026-03`, `04`, `05`), e o seed envelhecia: passados três meses, o mês
 * corrente abria vazio e o app parecia quebrado sem estar. A base é um
 * parâmetro, o padrão é fixo para os testes terem alvo estável, e quem sabe
 * que dia é hoje é a CLI — não este módulo, e muito menos o domínio (AD-002).
 *
 * Nenhuma linha é criada antes da base: competência e data de evento são
 * derivadas dela. O que **não** sai da base é o `pagoEm`: quem decide isso é a
 * competência corrente, um segundo parâmetro — um mês que ainda não chegou não
 * pode ter conta paga, e um mês que já passou quase não tem conta em aberto.
 */

export const SEMENTE_PADRAO = 424242;

/** Base dos testes. A CLI passa a sua, derivada do relógio. */
export const COMPETENCIA_BASE_PADRAO = "2026-03";

/**
 * Quantos meses de lançamentos avulsos nascem a partir da base.
 *
 * Seis é o menor número que dá panorama completo: com a base dois meses
 * antes do mês corrente, sobram passado para comparar, o mês em si, e os três
 * meses à frente que a régua de comprometimento futuro projeta.
 */
export const MESES_DE_AVULSOS = 6;

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

function dia(comp: Competencia, numero: number): string {
  return `${comp}-${String(numero).padStart(2, "0")}`;
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
  "Lançamento avulso E",
  "Lançamento avulso F",
] as const;

/**
 * As recorrências do ambiente de desenvolvimento.
 *
 * Elas existem para o bloco "Fixos" da lista parar de estar permanentemente
 * vazio, e para exercitar os dois casos que a fatia precisa cobrir: **valor que
 * muda** (a conta de luz ganha uma segunda vigência no meio da cobertura) e
 * **receita recorrente** (salário, que é o que faz "Receitas do mês" deixar de
 * ser avulso inventado).
 *
 * `versoes` é uma lista de `[deslocamento em meses a partir da base, valor]`.
 * Deslocamento e não competência literal: o seed inteiro é ancorado no relógio,
 * e uma vigência escrita à mão envelheceria junto.
 */
const RECORRENCIAS = [
  {
    descricao: "Conta fixa A",
    natureza: "DESPESA",
    diaVencimento: 10,
    indiceCategoria: 0,
    versoes: [[0, 18734]],
  },
  {
    descricao: "Conta fixa B",
    natureza: "DESPESA",
    diaVencimento: 20,
    /* Duas vigências: o valor sobe a partir do terceiro mês da cobertura. É o
     * caso que distingue um cadastro de recorrência que funciona de um que
     * reescreve o passado. */
    indiceCategoria: 1,
    versoes: [
      [0, 12456],
      [3, 16789],
    ],
  },
  {
    descricao: "Serviço fixo C",
    natureza: "DESPESA",
    diaVencimento: 28,
    indiceCategoria: 2,
    versoes: [[0, 9900]],
  },
  {
    descricao: "Entrada recorrente A",
    natureza: "RECEITA",
    diaVencimento: 5,
    indiceCategoria: null,
    versoes: [[0, 412345]],
  },
  {
    descricao: "Entrada recorrente B",
    natureza: "RECEITA",
    diaVencimento: 6,
    indiceCategoria: null,
    versoes: [[0, 318976]],
  },
] as const;

/** Despesas avulsas por mês. Oito basta para o gráfico de categorias ter forma. */
const AVULSOS_POR_MES = 8;

/**
 * Chance de uma despesa já estar quitada, dada a distância em meses até o mês
 * corrente (negativa no passado, zero no mês corrente, positiva no futuro).
 *
 * Não é enfeite. É o que faz o indicador "ainda não pago" existir no mês
 * corrente, o eixo Movimentações ter número nos meses que já passaram, e a
 * régua de comprometimento futuro — que só soma despesa em aberto — mostrar
 * valor em vez de zero. Mês que ainda não chegou nunca tem conta paga.
 */
function chanceDeEstarPago(distancia: number): number {
  if (distancia < 0) {
    return 0.94;
  }
  if (distancia === 0) {
    return 0.62;
  }
  return 0;
}

export interface ResultadoSeed {
  readonly recorrencias: number;
  readonly competenciaBase: string;
  readonly usuarios: number;
  readonly meiosDePagamento: number;
  readonly categorias: number;
  readonly compras: number;
  readonly movimentos: number;
}

/**
 * Popula um banco vazio. Inclui de propósito uma compra **já em andamento**
 * (`8/10`), para que o caso do AD-005 exista em qualquer ambiente de
 * desenvolvimento sem ninguém precisar montá-lo à mão, e uma compra longa
 * (12x), para que a régua de comprometimento futuro tenha o que mostrar em
 * todos os meses projetados.
 */
export async function semear(
  db: BancoDeDados,
  semente: number = SEMENTE_PADRAO,
  competenciaBase: string = COMPETENCIA_BASE_PADRAO,
  competenciaCorrente: string = competenciaBase,
): Promise<ResultadoSeed> {
  const base = competencia(competenciaBase);
  const corrente = competencia(competenciaCorrente);
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
  /**
   * Cartão arquivado com parcela em aberto: acontece na vida real. A data de
   * arquivamento é anterior à base, senão o cartão apareceria ativo no mês
   * mais antigo que o seed cria.
   */
  const cartaoEncerrado = await cadastros.criarMeioDePagamento({
    nome: "Cartão Encerrado",
    tipo: "CARTAO_CREDITO",
    arquivadoEm: `${addMeses(base, -2)}-10T12:00:00.000Z`,
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
    arquivadaEm: `${addMeses(base, -1)}-01T12:00:00.000Z`,
  });

  const primeiraCategoria = categorias[0];
  const segundaCategoria = categorias[1];
  const terceiraCategoria = categorias[2];
  if (!primeiraCategoria || !segundaCategoria || !terceiraCategoria) {
    throw new Error("seed sem categorias");
  }

  /** Caso do resíduo: 100000 em 3x vira 33334 / 33333 / 33333 (PARC-01, AC 1). */
  const compraDoResiduo = await compras.salvarComParcelas({
    idempotencyKey: "seed-compra-residuo",
    dados: {
      descricao: "Compra parcelada A",
      modo: "TOTAL",
      politicaResiduo: "PRIMEIRAS",
      competenciaCompra: base,
      qtdParcelas: 3,
      parcelaInicial: 1,
      categoriaId: primeiraCategoria.id,
      usuarioId: pessoaA.id,
      meioPagamentoId: cartaoRoxo.id,
      dataEvento: dia(base, 4),
    },
    plano: plano({
      modo: "TOTAL",
      valorEntrada: cents(100000),
      qtdParcelas: 3,
      competenciaCompra: base,
      parcelaInicial: 1,
      politicaResiduo: "PRIMEIRAS",
    }),
  });
  if (!compraDoResiduo.ok) {
    throw new Error(`seed falhou na compra A: ${compraDoResiduo.error.code}`);
  }

  /**
   * Compra já em andamento: 8 de 10, três parcelas restantes (AD-005). A
   * compra aconteceu sete meses antes da base, e é isso que faz a oitava
   * parcela cair exatamente na base.
   */
  const compraEmAndamento = await compras.salvarComParcelas({
    idempotencyKey: "seed-compra-em-andamento",
    dados: {
      descricao: "Compra parcelada B",
      modo: "VALOR_PARCELA",
      politicaResiduo: "PRIMEIRAS",
      competenciaCompra: addMeses(base, -7),
      qtdParcelas: 10,
      parcelaInicial: 8,
      categoriaId: segundaCategoria.id,
      usuarioId: pessoaB.id,
      meioPagamentoId: cartaoEncerrado.id,
      dataEvento: dia(addMeses(base, -7), 19),
    },
    plano: plano({
      modo: "VALOR_PARCELA",
      valorEntrada: cents(8400),
      qtdParcelas: 10,
      competenciaCompra: addMeses(base, -7),
      parcelaInicial: 8,
      politicaResiduo: "PRIMEIRAS",
    }),
  });
  if (!compraEmAndamento.ok) {
    throw new Error(`seed falhou na compra B: ${compraEmAndamento.error.code}`);
  }

  /**
   * Compra longa. Ela existe para a régua de comprometimento futuro não
   * depender de acaso: doze parcelas a partir da base cobrem qualquer mês
   * que a projeção alcance.
   */
  const compraLonga = await compras.salvarComParcelas({
    idempotencyKey: "seed-compra-longa",
    dados: {
      descricao: "Compra parcelada C",
      modo: "TOTAL",
      politicaResiduo: "PRIMEIRAS",
      competenciaCompra: base,
      qtdParcelas: 12,
      parcelaInicial: 1,
      categoriaId: terceiraCategoria.id,
      usuarioId: pessoaA.id,
      meioPagamentoId: cartaoAzul.id,
      dataEvento: dia(base, 12),
    },
    plano: plano({
      modo: "TOTAL",
      valorEntrada: cents(287654),
      qtdParcelas: 12,
      competenciaCompra: base,
      parcelaInicial: 1,
      politicaResiduo: "PRIMEIRAS",
    }),
  });
  if (!compraLonga.ok) {
    throw new Error(`seed falhou na compra C: ${compraLonga.error.code}`);
  }

  /*
   * As recorrências e as ocorrências delas.
   *
   * A materialização aqui usa **as mesmas funções puras** que o caso de uso vai
   * usar (`janelaMaterializacao` e `versaoVigente`), e não uma segunda versão
   * da regra escrita à mão. Duas implementações do mesmo cálculo divergiriam, e
   * o seed é o primeiro lugar onde a divergência apareceria como dado errado.
   *
   * Nenhuma ocorrência nasce paga, nem quando a competência já passou: pagar é
   * gesto do usuário, e um ambiente de desenvolvimento onde tudo já veio pago
   * esconderia justamente o botão que acabou de ser construído.
   */
  const ultimaCoberta = addMeses(base, MESES_DE_AVULSOS - 1);
  let ocorrenciasDeRecorrencia = 0;

  for (const modelo of RECORRENCIAS) {
    const categoriaDaRecorrencia =
      modelo.indiceCategoria === null ? null : (categorias[modelo.indiceCategoria]?.id ?? null);
    const pessoa =
      modelo.natureza === "RECEITA" && modelo.descricao.endsWith("B") ? pessoaB : pessoaA;

    const [linha] = await db
      .insert(recorrencia)
      .values({
        descricao: modelo.descricao,
        natureza: modelo.natureza,
        categoriaId: categoriaDaRecorrencia,
        usuarioId: pessoa.id,
        meioPagamentoId: contaCorrente.id,
        competenciaInicio: deCompetencia(base),
        competenciaFim: null,
        diaVencimento: modelo.diaVencimento,
        encerradaEm: null,
      })
      .returning();
    if (!linha) {
      throw new Error(`insert de recorrencia não retornou linha: ${modelo.descricao}`);
    }

    const versoes = modelo.versoes.map(([deslocamento, valor]) => ({
      vigenteDesde: addMeses(base, deslocamento),
      valorPrevisto: cents(valor),
    }));
    for (const versao of versoes) {
      await db.insert(recorrenciaVersao).values({
        recorrenciaId: linha.id,
        vigenteDesde: deCompetencia(versao.vigenteDesde),
        valorPrevistoCentavos: versao.valorPrevisto,
      });
    }

    const competencias = janelaMaterializacao(
      { inicio: base, fim: null, encerradaDesde: null },
      base,
      ultimaCoberta,
    );
    for (const comp of competencias) {
      const vigente = versaoVigente(versoes, comp);
      if (vigente === null) {
        continue;
      }
      const ano = Number.parseInt(comp.slice(0, 4), 10);
      const mes = Number.parseInt(comp.slice(5, 7), 10);
      await db.insert(movimento).values({
        natureza: modelo.natureza,
        origem: "RECORRENCIA",
        descricao: modelo.descricao,
        competencia: deCompetencia(comp),
        dataEvento: dia(comp, diaEfetivo(modelo.diaVencimento, ano, mes)),
        valorCentavos: vigente.valorPrevisto,
        valorPrevistoCentavos: vigente.valorPrevisto,
        pagoEm: null,
        categoriaId: categoriaDaRecorrencia,
        usuarioId: pessoa.id,
        meioPagamentoId: contaCorrente.id,
        recorrenciaId: linha.id,
      });
      ocorrenciasDeRecorrencia += 1;
    }
  }

  const meiosAvulsos = [contaCorrente, cartaoAzul, rotulo];
  let movimentosAvulsos = 0;

  for (let k = 0; k < MESES_DE_AVULSOS; k += 1) {
    const comp = addMeses(base, k);

    for (let i = 0; i < AVULSOS_POR_MES; i += 1) {
      const pessoa = escolher(prng, pessoas);
      const meio = escolher(prng, meiosAvulsos);
      const categoria = escolher(prng, [...categorias, categoriaArquivada]);
      const diaDoEvento = dia(comp, inteiroEntre(prng, 1, 28));
      await db.insert(movimento).values({
        natureza: "DESPESA",
        origem: "AVULSO",
        descricao: `${escolher(prng, DESCRICOES_AVULSAS)} ${comp}`,
        competencia: deCompetencia(comp),
        dataEvento: diaDoEvento,
        valorCentavos: inteiroEntre(prng, 1123, 47891),
        pagoEm: prng() < chanceDeEstarPago(diffMeses(corrente, comp)) ? diaDoEvento : null,
        categoriaId: categoria.id,
        usuarioId: pessoa.id,
        meioPagamentoId: meio.id,
      });
      movimentosAvulsos += 1;
    }

    /* Duas entradas por mês: a casa é de duas pessoas, e o eixo caixa fica
     * sem sentido se só uma delas recebe. */
    const jaAconteceu = diffMeses(corrente, comp) <= 0;
    for (const [indice, pessoa] of pessoas.entries()) {
      const diaDaEntrada = dia(comp, 5 + indice);
      await db.insert(movimento).values({
        natureza: "RECEITA",
        origem: "AVULSO",
        descricao: `Entrada ${indice + 1} ${comp}`,
        competencia: deCompetencia(comp),
        dataEvento: diaDaEntrada,
        valorCentavos: inteiroEntre(prng, 289123, 561987),
        pagoEm: jaAconteceu ? diaDaEntrada : null,
        usuarioId: pessoa.id,
        meioPagamentoId: contaCorrente.id,
      });
      movimentosAvulsos += 1;
    }

    const diaDoAporte = dia(comp, 7);
    await db.insert(movimento).values({
      natureza: "INVESTIMENTO",
      origem: "AVULSO",
      descricao: `Aporte ${comp}`,
      competencia: deCompetencia(comp),
      dataEvento: diaDoAporte,
      valorCentavos: inteiroEntre(prng, 10111, 39887),
      pagoEm: jaAconteceu ? diaDoAporte : null,
      usuarioId: pessoaB.id,
      meioPagamentoId: contaCorrente.id,
    });
    movimentosAvulsos += 1;
  }

  return {
    competenciaBase: base,
    usuarios: 2,
    meiosDePagamento: 5,
    categorias: CATEGORIAS.length + 1,
    compras: 3,
    recorrencias: RECORRENCIAS.length,
    movimentos:
      movimentosAvulsos +
      compraDoResiduo.value.parcelas.length +
      compraEmAndamento.value.parcelas.length +
      compraLonga.value.parcelas.length +
      ocorrenciasDeRecorrencia,
  };
}
