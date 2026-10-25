import { type Cents, ZERO_CENTS } from "../shared/money";
import { type DomainError, err, ok, type Result } from "../shared/result";
import { type MotivoNaoLida, type ParcelaDaLinha, parcelaDaCelula, valorDaCelula } from "./celula";
import type { Grade } from "./csv";

export type Bloco = "FIXOS" | "CARTAO" | "GASTOS" | "ENTRADAS";

export interface LinhaLida {
  readonly bloco: Bloco;
  /** 0-based dentro do bloco, contando só as linhas não vazias. */
  readonly posicao: number;
  /** Nome, "Tipo" e categoria como estão na célula, sem trim. */
  readonly nome: string;
  readonly tipo: string;
  readonly categoria: string;
  readonly valor: Cents;
}

export interface LinhaDeCartao extends LinhaLida {
  readonly bloco: "CARTAO";
  readonly parcela: ParcelaDaLinha;
}

export interface LinhaNaoLida {
  readonly bloco: Bloco;
  readonly posicao: number;
  readonly nome: string;
  readonly tipo: string;
  readonly motivo: MotivoNaoLida;
}

export interface AbaLida {
  readonly fixos: ReadonlyArray<LinhaLida>;
  readonly cartao: ReadonlyArray<LinhaDeCartao>;
  readonly gastos: ReadonlyArray<LinhaLida>;
  /** "Tipo" e categoria vazios: o bloco Entradas só tem nome e valor. */
  readonly entradas: ReadonlyArray<LinhaLida>;
  readonly naoLidas: ReadonlyArray<LinhaNaoLida>;
  readonly totais: Readonly<Record<Bloco | "SAIDAS", Cents | null>>;
  readonly categoriasDaTabela: ReadonlyArray<string>;
}

/** Títulos dos blocos, na ordem em que a ausência é informada (IMP-01 AC 3). */
export const TITULOS: Readonly<Record<Bloco, string>> = {
  FIXOS: "Fixos",
  CARTAO: "Cartão de Crédito",
  GASTOS: "Gastos do Mês",
  ENTRADAS: "Entradas",
};

const TITULO_SAIDAS = "Saídas";
const TITULO_CATEGORIAS = "Gastos do mês por categoria:";
const FIM_DAS_CATEGORIAS = "Gastos por tipo de pagamento";
const ROTULO_TOTAL_FIXOS = "Total de Fixos:";
const ROTULO_TOTAL_CARTAO = "Total de Cartão de Crédito";
const ROTULO_TOTAL_GASTOS = "Total de Gastos do Mês:";
const ROTULO_TOTAL = "Total:";

/**
 * Coluna de cada campo, contada a partir da coluna do título, como no
 * cabeçalho da linha logo abaixo dele (context.md, "Layout"). O nome fica na
 * própria coluna do título. Nenhuma coluna é fixa: a aba inteira pode andar
 * para o lado (IMP-01 AC 5).
 */
interface Colunas {
  readonly valor: number;
  readonly parcela?: number;
  readonly tipo?: number;
  readonly categoria?: number;
}

const COLUNAS: Readonly<Record<Bloco, Colunas>> = {
  FIXOS: { tipo: 4, categoria: 5, valor: 6 },
  CARTAO: { parcela: 1, tipo: 4, categoria: 5, valor: 6 },
  GASTOS: { tipo: 2, categoria: 3, valor: 4 },
  ENTRADAS: { valor: 1 },
};

/** O valor dos totais fica na mesma linha do rótulo, a esta distância dele. */
const COLUNA_DO_TOTAL = { FIXOS: 4, GASTOS: 3, ENTRADAS: 1 } as const;

interface Posicao {
  readonly linha: number;
  readonly coluna: number;
}

/** Célula fora da grade é vazia: o fim do arquivo não tem valor nenhum. */
function celula(grade: Grade, linha: number, coluna: number): string {
  return grade[linha]?.[coluna] ?? "";
}

/**
 * Primeira célula com o texto, sem os espaços das pontas (IMP-01 AC 4),
 * procurada coluna a coluna da esquerda para a direita. Saídas, à direita dos
 * blocos, resume o mês com rótulos próprios; procurar da esquerda garante que o
 * título do bloco vence qualquer homônimo que apareça ali.
 */
function localizar(grade: Grade, texto: string): Posicao | null {
  const largura = Math.max(...grade.map((linha) => linha.length));
  for (let coluna = 0; coluna < largura; coluna += 1) {
    const linha = grade.findIndex((_, indice) => celula(grade, indice, coluna).trim() === texto);
    if (linha !== -1) {
      return { linha, coluna };
    }
  }
  return null;
}

/** Linha, a partir de `desde`, em que a coluna tem o rótulo; o fim da grade quando não tem. */
function linhaDoRotulo(grade: Grade, coluna: number, desde: number, rotulo: string): number {
  for (let linha = desde; linha < grade.length; linha += 1) {
    if (celula(grade, linha, coluna).trim() === rotulo) {
      return linha;
    }
  }
  return grade.length;
}

/** `null` quando o total não pode ser lido (IMP-05 AC 3); o zero é um total como outro. */
function total(grade: Grade, linha: number, coluna: number): Cents | null {
  const valor = valorDaCelula(celula(grade, linha, coluna));
  if (valor.ok) {
    return valor.value;
  }
  return valor.error === "VALOR_ZERO" ? ZERO_CENTS : null;
}

interface LinhaBruta {
  readonly posicao: number;
  readonly nome: string;
  readonly tipo: string;
  readonly categoria: string;
  readonly valor: string;
  readonly parcela: string;
}

/**
 * Linhas não vazias do bloco, de `inicio` a `fim` exclusive. Linha sem nome e
 * sem valor é vazia mesmo com outra célula preenchida, como o "Tipo" que sobra
 * de uma lista suspensa (IMP-01 AC 8): ela some sem aviso e não conta posição.
 */
function linhasDoBloco(
  grade: Grade,
  titulo: Posicao,
  colunas: Colunas,
  inicio: number,
  fim: number,
): LinhaBruta[] {
  const campo = (linha: number, deslocamento: number | undefined): string =>
    deslocamento === undefined ? "" : celula(grade, linha, titulo.coluna + deslocamento);
  const linhas: LinhaBruta[] = [];
  for (let linha = inicio; linha < fim; linha += 1) {
    const nome = celula(grade, linha, titulo.coluna);
    const valor = campo(linha, colunas.valor);
    if (nome.trim() === "" && valor.trim() === "") {
      continue;
    }
    linhas.push({
      posicao: linhas.length,
      nome,
      tipo: campo(linha, colunas.tipo),
      categoria: campo(linha, colunas.categoria),
      valor,
      parcela: campo(linha, colunas.parcela),
    });
  }
  return linhas;
}

function valorDaLinha(linha: LinhaBruta): Result<Cents, MotivoNaoLida> {
  return linha.nome.trim() === "" ? err("NOME_VAZIO") : valorDaCelula(linha.valor);
}

function naoLida(bloco: Bloco, linha: LinhaBruta, motivo: MotivoNaoLida): LinhaNaoLida {
  return { bloco, posicao: linha.posicao, nome: linha.nome, tipo: linha.tipo, motivo };
}

function lerSemParcela(
  bloco: Exclude<Bloco, "CARTAO">,
  brutas: ReadonlyArray<LinhaBruta>,
  naoLidas: LinhaNaoLida[],
): LinhaLida[] {
  const lidas: LinhaLida[] = [];
  for (const bruta of brutas) {
    const valor = valorDaLinha(bruta);
    if (!valor.ok) {
      naoLidas.push(naoLida(bloco, bruta, valor.error));
      continue;
    }
    const { posicao, nome, tipo, categoria } = bruta;
    lidas.push({ bloco, posicao, nome, tipo, categoria, valor: valor.value });
  }
  return lidas;
}

function lerCartao(brutas: ReadonlyArray<LinhaBruta>, naoLidas: LinhaNaoLida[]): LinhaDeCartao[] {
  const lidas: LinhaDeCartao[] = [];
  for (const bruta of brutas) {
    const valor = valorDaLinha(bruta);
    if (!valor.ok) {
      naoLidas.push(naoLida("CARTAO", bruta, valor.error));
      continue;
    }
    const parcela = parcelaDaCelula(bruta.parcela);
    if (!parcela.ok) {
      naoLidas.push(naoLida("CARTAO", bruta, parcela.error));
      continue;
    }
    const { posicao, nome, tipo, categoria } = bruta;
    lidas.push({
      bloco: "CARTAO",
      posicao,
      nome,
      tipo,
      categoria,
      valor: valor.value,
      parcela: parcela.value,
    });
  }
  return lidas;
}

/** Nomes da coluna Categoria da tabela, pulando as células vazias (IMP-01 AC 14 e 15). */
function lerCategorias(grade: Grade): string[] {
  const titulo = localizar(grade, TITULO_CATEGORIAS);
  if (titulo === null) {
    return [];
  }
  const inicio = titulo.linha + 2;
  const fim = linhaDoRotulo(grade, titulo.coluna, inicio, FIM_DAS_CATEGORIAS);
  const nomes: string[] = [];
  for (let linha = inicio; linha < fim; linha += 1) {
    const nome = celula(grade, linha, titulo.coluna);
    if (nome.trim() !== "") {
      nomes.push(nome);
    }
  }
  return nomes;
}

function totalDeSaidas(grade: Grade): Cents | null {
  const titulo = localizar(grade, TITULO_SAIDAS);
  if (titulo === null) {
    return null;
  }
  const linha = linhaDoRotulo(grade, titulo.coluna, titulo.linha + 1, ROTULO_TOTAL);
  return total(grade, linha, titulo.coluna + COLUNA_DO_TOTAL.ENTRADAS);
}

function blocoAusente(bloco: Bloco): Result<never, DomainError> {
  return err({ code: "PLANILHA_BLOCO_AUSENTE", detalhes: { bloco: TITULOS[bloco] } });
}

/**
 * Lê a aba mensal: os quatro blocos lado a lado, os totais da própria planilha
 * e os nomes da tabela de categorias. Tudo o mais — A1, a linha 2, Saídas
 * exceto o total, Investimentos, Gastos por tipo de pagamento — é ignorado
 * (IMP-01 AC 16).
 *
 * Cada bloco é achado pelo título; Fixos, Cartão de Crédito e Gastos do Mês
 * têm cabeçalho na linha seguinte, Entradas não (AC 7). Fixos termina no
 * `Total de Cartão de Crédito` (AC 6), Entradas no `Total:`, e os outros dois
 * no fim do arquivo.
 */
export function lerAba(grade: Grade): Result<AbaLida, DomainError> {
  // CSV salvo de novo com ponto e vírgula vira uma coluna só: é o arquivo que
  // está errado, não um bloco que falta (AC 17).
  if (!grade.some((linha) => linha.length > 1)) {
    return err({ code: "PLANILHA_ARQUIVO_INVALIDO" });
  }
  const fixos = localizar(grade, TITULOS.FIXOS);
  if (fixos === null) {
    return blocoAusente("FIXOS");
  }
  const cartao = localizar(grade, TITULOS.CARTAO);
  if (cartao === null) {
    return blocoAusente("CARTAO");
  }
  const gastos = localizar(grade, TITULOS.GASTOS);
  if (gastos === null) {
    return blocoAusente("GASTOS");
  }
  const entradas = localizar(grade, TITULOS.ENTRADAS);
  if (entradas === null) {
    return blocoAusente("ENTRADAS");
  }

  const fimDosFixos = linhaDoRotulo(grade, fixos.coluna, fixos.linha + 2, ROTULO_TOTAL_CARTAO);
  const fimDasEntradas = linhaDoRotulo(grade, entradas.coluna, entradas.linha + 1, ROTULO_TOTAL);

  const naoLidas: LinhaNaoLida[] = [];
  const linhasDe = (titulo: Posicao, bloco: Bloco, inicio: number, fim: number) =>
    linhasDoBloco(grade, titulo, COLUNAS[bloco], inicio, fim);
  const lidasDosFixos = lerSemParcela(
    "FIXOS",
    linhasDe(fixos, "FIXOS", fixos.linha + 2, fimDosFixos),
    naoLidas,
  );
  const lidasDoCartao = lerCartao(
    linhasDe(cartao, "CARTAO", cartao.linha + 2, grade.length),
    naoLidas,
  );
  const lidasDosGastos = lerSemParcela(
    "GASTOS",
    linhasDe(gastos, "GASTOS", gastos.linha + 2, grade.length),
    naoLidas,
  );
  const lidasDasEntradas = lerSemParcela(
    "ENTRADAS",
    linhasDe(entradas, "ENTRADAS", entradas.linha + 1, fimDasEntradas),
    naoLidas,
  );

  return ok({
    fixos: lidasDosFixos,
    cartao: lidasDoCartao,
    gastos: lidasDosGastos,
    entradas: lidasDasEntradas,
    naoLidas,
    totais: {
      FIXOS: total(
        grade,
        linhaDoRotulo(grade, fixos.coluna, 0, ROTULO_TOTAL_FIXOS),
        fixos.coluna + COLUNA_DO_TOTAL.FIXOS,
      ),
      CARTAO: total(grade, fimDosFixos, fixos.coluna + COLUNA_DO_TOTAL.FIXOS),
      GASTOS: total(
        grade,
        linhaDoRotulo(grade, gastos.coluna, 0, ROTULO_TOTAL_GASTOS),
        gastos.coluna + COLUNA_DO_TOTAL.GASTOS,
      ),
      ENTRADAS: total(grade, fimDasEntradas, entradas.coluna + COLUNA_DO_TOTAL.ENTRADAS),
      SAIDAS: totalDeSaidas(grade),
    },
    categoriasDaTabela: lerCategorias(grade),
  });
}
