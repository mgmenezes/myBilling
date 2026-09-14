import { type DomainError, err, ok, type Result } from "./result";

/**
 * Dinheiro é inteiro em centavos (AD-001). A marca impede que um `number`
 * cru — que pode ter vindo de `JSON.parse` como IEEE-754 — seja usado onde
 * o domínio espera um valor monetário.
 */
export type Cents = number & { readonly __brand: "Cents" };

/**
 * Elemento neutro das operações. `criarCents` não o produz de propósito
 * (valor de compra zero é erro), mas `subtrair` e somatórios vazios sim.
 */
export const ZERO_CENTS = 0 as Cents;

/** Valida inteiro maior ou igual a 1 centavo (PARC-05, AC 7). */
export function criarCents(valor: number): Result<Cents, DomainError> {
  if (!Number.isInteger(valor) || valor < 1) {
    return err({ code: "VALOR_NAO_POSITIVO", detalhes: { valor } });
  }
  return ok(valor as Cents);
}

export function somar(a: Cents, b: Cents): Cents {
  return (a + b) as Cents;
}

export function subtrair(a: Cents, b: Cents): Cents {
  return (a - b) as Cents;
}

export function multiplicar(a: Cents, quantidade: number): Cents {
  return (a * quantidade) as Cents;
}

/**
 * Formato BRL aceito: dígitos com separador de milhar opcional em grupos de
 * três, e no máximo duas casas decimais após a vírgula.
 */
const REGEX_BRL = /^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/;

/**
 * `"1.234,56"` -> `123456`. A conversão é textual: os dígitos são
 * reagrupados como string e lidos uma única vez por `parseInt`. Nenhum
 * valor fracionário passa por `Number` em nenhum ponto (AD-001) — é o que
 * impede o erro clássico de `19,99` virar 1998 ao multiplicar o float por
 * cem e truncar.
 */
export function parseBRL(entrada: string): Result<Cents, DomainError> {
  if (!REGEX_BRL.test(entrada)) {
    return err({ code: "VALOR_NAO_POSITIVO", detalhes: { entrada } });
  }
  const semMilhar = entrada.replaceAll(".", "");
  const virgula = semMilhar.indexOf(",");
  const digitos =
    virgula === -1
      ? `${semMilhar}00`
      : `${semMilhar.slice(0, virgula)}${semMilhar.slice(virgula + 1).padEnd(2, "0")}`;
  return criarCents(Number.parseInt(digitos, 10));
}
