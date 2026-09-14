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
