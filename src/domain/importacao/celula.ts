import { MAX_PARCELAS } from "../parcelamento/ratear-parcelas";
import { type Cents, parseBRL } from "../shared/money";
import { err, ok, type Result } from "../shared/result";

/** Por que uma linha de bloco não virou lançamento. Aparece na conferência. */
export type MotivoNaoLida =
  | "VALOR_VAZIO"
  | "VALOR_ZERO"
  | "VALOR_INVALIDO"
  | "PARCELA_INVALIDA"
  | "NOME_VAZIO";

/** `7/10` da coluna Parcelas: a parcela 7 de uma compra em 10. */
export interface ParcelaDaLinha {
  readonly numero: number;
  readonly total: number;
}

/**
 * A chave com que nomes se comparam: entre linhas da mesma aba, entre abas,
 * com o "Tipo" lembrado e com a categoria existente. Uma regra só, para que
 * `"Internet "` e `"internet"` nunca sejam duas coisas num lugar e uma no outro.
 */
export function normalizarNome(texto: string): string {
  return texto.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

/** `R$` e todo espaço, inclusive o não separável (U+00A0), que `\s` inclui. */
const DECORACAO_DO_VALOR = /R\$|\s/g;

/** O formato que `parseBRL` aceita, com todos os dígitos iguais a zero. */
const ZERO_BRL = /^(?:0{1,3}(?:\.000)+|0+)(?:,0{1,2})?$/;

/**
 * `"R$ 1.234,56"` → 123456. A célula perde `R$` e os espaços e o resto vai
 * para `parseBRL`, que converte sem passar por ponto flutuante (AD-001).
 * O zero é separado do inválido porque a conferência diz coisas diferentes
 * sobre os dois (IMP-01 AC 18).
 */
export function valorDaCelula(texto: string): Result<Cents, MotivoNaoLida> {
  const limpo = texto.replace(DECORACAO_DO_VALOR, "");
  if (limpo === "") {
    return err("VALOR_VAZIO");
  }
  if (ZERO_BRL.test(limpo)) {
    return err("VALOR_ZERO");
  }
  const valor = parseBRL(limpo);
  return valor.ok ? valor : err("VALOR_INVALIDO");
}

const REGEX_PARCELA = /^\s*(\d+)\/(\d+)\s*$/;

/** `"7/10"` → `{ numero: 7, total: 10 }`, com `1 ≤ n ≤ t ≤ 120` (IMP-01 AC 11). */
export function parcelaDaCelula(texto: string): Result<ParcelaDaLinha, MotivoNaoLida> {
  const partes = REGEX_PARCELA.exec(texto);
  if (partes === null) {
    return err("PARCELA_INVALIDA");
  }
  // A regex só deixa passar dígitos: os dois grupos existem e são inteiros.
  const numero = Number(partes[1]);
  const total = Number(partes[2]);
  if (numero < 1 || numero > total || total > MAX_PARCELAS) {
    return err("PARCELA_INVALIDA");
  }
  return ok({ numero, total });
}
