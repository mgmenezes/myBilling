/**
 * Result<T, E> — o domínio nunca lança (AD-006). Toda operação que pode
 * falhar devolve este tipo em vez de exceção.
 *
 * Este arquivo não contém nenhuma mensagem de usuário: código de erro é
 * dado, mensagem em pt-BR é apresentação e vive em src/lib/erros.ts.
 */

export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function isOk<T, E>(resultado: Result<T, E>): resultado is Result<T, E> & { ok: true } {
  return resultado.ok === true;
}

export function isErr<T, E>(resultado: Result<T, E>): resultado is Result<T, E> & { ok: false } {
  return resultado.ok === false;
}

/**
 * Catálogo fechado de códigos de erro do domínio. União de literais — nunca
 * `string` aberto, para que um código inventado não passe no typecheck.
 */
export type CodigoErro =
  | "PARCELA_INFERIOR_A_UM_CENTAVO"
  | "QTD_PARCELAS_INVALIDA"
  | "VALOR_NAO_POSITIVO"
  | "PARCELA_INICIAL_INVALIDA"
  | "MEIO_PAGAMENTO_ARQUIVADO"
  | "CONSERVACAO_VIOLADA"
  | "COMPETENCIA_INVALIDA";

export type DomainError = {
  readonly code: CodigoErro;
  readonly detalhes?: Record<string, unknown>;
};
