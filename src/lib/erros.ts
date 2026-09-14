import type { CodigoErroAplicacao } from "@/application/compras/criar-compra-parcelada/handler";

/**
 * A fronteira entre código de erro e texto de usuário.
 *
 * O domínio devolve `CodigoErro`, uma união fechada sem mensagem: código é
 * dado, mensagem é apresentação. Este arquivo é o único lugar onde a mensagem
 * em pt-BR existe, e é por isso que trocar o texto não encosta em regra
 * financeira nenhuma.
 *
 * **Nenhuma mensagem daqui carrega detalhe interno.** Stack trace, SQL e nome
 * de restrição ficam no log do servidor; o navegador recebe o identificador de
 * correlação e mais nada (UI-02, AC 8).
 */

/** Códigos que só existem na borda: validação, sessão e falha não prevista. */
export type CodigoErroDeBorda =
  | "VALIDACAO"
  | "NAO_AUTENTICADO"
  | "ACESSO_NEGADO"
  | "ERRO_INESPERADO";

export type CodigoErroExibivel = CodigoErroAplicacao | CodigoErroDeBorda;

/** Contrato uniforme de toda Server Action. Ela **nunca lança para o cliente**. */
export type ResultadoAction<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly erro: {
        readonly code: string;
        readonly mensagem: string;
        readonly campos?: Record<string, string>;
      };
    };

const MENSAGENS: Record<CodigoErroExibivel, string> = {
  PARCELA_INFERIOR_A_UM_CENTAVO: "O valor é pequeno demais para esse número de parcelas.",
  QTD_PARCELAS_INVALIDA: "A quantidade de parcelas precisa estar entre 1 e 120.",
  VALOR_NAO_POSITIVO: "Informe um valor maior que zero.",
  PARCELA_INICIAL_INVALIDA: "A parcela inicial não pode ser maior que a quantidade de parcelas.",
  MEIO_PAGAMENTO_ARQUIVADO: "Esse meio de pagamento está arquivado e não recebe compra nova.",
  MEIO_PAGAMENTO_NAO_ENCONTRADO: "Escolha um meio de pagamento válido.",
  CONSERVACAO_VIOLADA: "A soma das parcelas não fechou com o total. Nada foi gravado.",
  COMPETENCIA_INVALIDA: "Informe a competência no formato AAAA-MM.",
  VALIDACAO: "Confira os campos destacados.",
  NAO_AUTENTICADO: "Sua sessão terminou. Entre de novo para continuar.",
  ACESSO_NEGADO: "Este e-mail não tem acesso ao myBilling.",
  ERRO_INESPERADO: "Não foi possível concluir a operação. Tente de novo.",
};

/**
 * Em qual campo do formulário cada erro aparece. O que não está aqui é erro
 * do formulário inteiro, não de um campo (design: "formulário preservado").
 */
const CAMPO_DO_ERRO: Partial<Record<CodigoErroExibivel, string>> = {
  VALOR_NAO_POSITIVO: "valorCentavos",
  PARCELA_INFERIOR_A_UM_CENTAVO: "valorCentavos",
  QTD_PARCELAS_INVALIDA: "qtdParcelas",
  PARCELA_INICIAL_INVALIDA: "parcelaInicial",
  MEIO_PAGAMENTO_ARQUIVADO: "meioPagamentoId",
  MEIO_PAGAMENTO_NAO_ENCONTRADO: "meioPagamentoId",
  COMPETENCIA_INVALIDA: "competenciaInicial",
};

export function mensagemDoErro(code: CodigoErroExibivel): string {
  return MENSAGENS[code];
}

/**
 * Monta o envelope de erro. Quando o código tem campo correspondente, o erro
 * já sai endereçado ao campo, e o formulário o exibe ali em vez de num alerta
 * genérico solto no topo.
 */
export function erroDeAction(
  code: CodigoErroExibivel,
  mensagem: string = mensagemDoErro(code),
): ResultadoAction<never> {
  const campo = CAMPO_DO_ERRO[code];
  return {
    ok: false,
    erro: campo ? { code, mensagem, campos: { [campo]: mensagem } } : { code, mensagem },
  };
}
