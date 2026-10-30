import { normalizarNome } from "../importacao/celula";

/**
 * A cor de uma categoria (COR-01).
 *
 * **A cor é um nome, não um hex.** O banco guarda `verde`, `azul`…, e o hex
 * mora só nos tokens de `src/app/globals.css`. Remedir ou trocar um tom não
 * pede migração. A grafia é a do código, sem acento: é ela que vai para o
 * banco, para a classe CSS e para o `CHECK`.
 *
 * **Nula por padrão.** Quem cria categoria (o cadastro inline, a importação, o
 * seed) não escolhe cor, e quem exibe pede `corDaCategoria`, que devolve a
 * escolhida ou a automática.
 *
 * **A automática é derivada do nome, não da ordem.** A mesma categoria tem a
 * mesma cor no seed, no e2e e em produção, e "Categoria Um" e "categoria um "
 * não ficam com cores diferentes. O nome passa pela mesma normalização da
 * importação, mais a remoção de acentos.
 */

export const CORES_DE_CATEGORIA = [
  "vermelho",
  "laranja",
  "ambar",
  "verde",
  "verde-agua",
  "ciano",
  "azul",
  "roxo",
  "rosa",
  "marrom",
] as const;

export type CorDeCategoria = (typeof CORES_DE_CATEGORIA)[number];

export function ehCorDeCategoria(valor: string): valor is CorDeCategoria {
  return (CORES_DE_CATEGORIA as ReadonlyArray<string>).includes(valor);
}

/** Acentos decompostos por NFD: o "ê" vira "e" seguido do circunflexo combinante. */
const MARCA_COMBINANTE = /\p{M}/gu;

function chaveDoNome(nome: string): string {
  return normalizarNome(nome).normalize("NFD").replace(MARCA_COMBINANTE, "");
}

/**
 * Soma polinomial das unidades UTF-16 da chave, em inteiro de 32 bits sem
 * sinal, módulo 10. Determinística e sem estado. A chave vazia soma zero e cai
 * na primeira cor.
 */
export function corAutomatica(nome: string): CorDeCategoria {
  const chave = chaveDoNome(nome);
  let soma = 0;
  for (let posicao = 0; posicao < chave.length; posicao++) {
    soma = (Math.imul(soma, 31) + chave.charCodeAt(posicao)) >>> 0;
  }
  // O resto da divisão por 10 é um índice válido da lista de dez.
  return CORES_DE_CATEGORIA[soma % CORES_DE_CATEGORIA.length] as CorDeCategoria;
}

/** A cor em uso: a escolhida, ou a automática quando ninguém escolheu. */
export function corDaCategoria(categoria: {
  readonly nome: string;
  readonly cor: CorDeCategoria | null;
}): CorDeCategoria {
  return categoria.cor ?? corAutomatica(categoria.nome);
}
