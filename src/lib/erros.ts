import type { CodigoErroAplicacao } from "@/application/compras/criar-compra-parcelada/handler";
import type { CodigoErroImportacao } from "@/application/importacao/prever-importacao/handler";
import type { CodigoErroCancelamento } from "@/application/mes/cancelar-lancamento/handler";
import type { CodigoErroConfirmacao } from "@/application/mes/confirmar-valor/handler";
import type { CodigoErroAvulso } from "@/application/mes/criar-lancamento-avulso/handler";
import type { CodigoErroPagamento } from "@/application/mes/marcar-pagamento/handler";
import type { CodigoErroTrocaDeCategoria } from "@/application/mes/trocar-categoria/handler";
import type { CodigoErroRecorrencia } from "@/application/recorrencias/criar-recorrencia/handler";
import type { CodigoErroEdicaoFixo } from "@/application/recorrencias/editar/handler";
import type { CodigoErroVersao } from "@/application/recorrencias/registrar-versao/handler";

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

/**
 * Códigos dos cadastros, que não passam por caso de uso: a action da tela de
 * Categorias decide sozinha que um nome já está ocupado.
 */
export type CodigoErroCadastro = "CATEGORIA_JA_EXISTE";

export type CodigoErroExibivel =
  | CodigoErroAplicacao
  | CodigoErroAvulso
  | CodigoErroCancelamento
  | CodigoErroPagamento
  | CodigoErroConfirmacao
  | CodigoErroRecorrencia
  | CodigoErroVersao
  | CodigoErroEdicaoFixo
  | CodigoErroTrocaDeCategoria
  | CodigoErroImportacao
  | CodigoErroCadastro
  | CodigoErroDeBorda;

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
  LANCAMENTO_NAO_CANCELAVEL:
    "Só lançamento avulso pode ser excluído. Parcela faz parte de uma compra, e gasto fixo se encerra na área Todo mês.",
  /* Sem "recarregue a página": a mensagem diz o que aconteceu, e a própria
     revalidação da action já traz a lista nova. */
  LANCAMENTO_NAO_ENCONTRADO: "Esse lançamento não existe mais.",
  PERIODO_INVALIDO: "O mês de fim não pode ser anterior ao de início.",
  RECORRENCIA_NAO_ENCONTRADA: "Esse gasto fixo não existe mais.",
  CATEGORIA_NAO_ENCONTRADA: "Escolha uma categoria válida.",
  /* Também quando a outra está arquivada: o nome dela continua ocupado. */
  CATEGORIA_JA_EXISTE: "Já existe outra categoria com esse nome.",
  // SPEC_DEVIATION: a mensagem entrou com o código, em T1, e não em T5.
  // Reason: todo `CodigoErro` do domínio é exibível, e o código sem mensagem não compila.
  CATEGORIA_EM_RECEITA: "Entrada não tem categoria.",
  LANCAMENTO_NAO_CONFIRMAVEL: "Só gasto fixo tem valor a confirmar.",
  PLANILHA_ARQUIVO_INVALIDO:
    "Este arquivo não parece uma aba da planilha exportada em CSV. No Google Sheets: Arquivo → Fazer download → Valores separados por vírgula (.csv).",
  /* `{bloco}` é composto pela action a partir de `detalhes.bloco`. */
  PLANILHA_BLOCO_AUSENTE:
    "O arquivo não tem o bloco “{bloco}”. Exporte a aba de um mês da planilha.",
  /* `{competencia}` é composto pela action, por extenso, a partir de `detalhes.esperada`. */
  IMPORTACAO_FORA_DE_ORDEM: "As abas entram em sequência. A próxima é {competencia}.",
  IMPORTACAO_BANCO_NAO_VAZIO:
    "Já existem lançamentos no app. Rode o script de limpeza antes da primeira importação.",
  IMPORTACAO_PENDENCIA_ABERTA: "Ainda há meio de pagamento ou entrada sem decisão.",
  IMPORTACAO_DIVERGENCIA_NAO_CONFIRMADA:
    "Há totais que não batem. Confirme que entendeu a diferença antes de importar.",
  VALIDACAO: "Confira os campos destacados.",
  NAO_AUTENTICADO: "Sua sessão terminou. Entre de novo para continuar.",
  ACESSO_NEGADO: "Este e-mail não tem acesso ao myBilling.",
  ERRO_INESPERADO: "Não foi possível concluir a operação. Tente de novo.",
};

/**
 * Na edição do fixo, `PERIODO_INVALIDO` nasce também do "Vale a partir de"
 * (EDF-03 AC 5), e a frase do fim não serviria ali.
 */
export const MENSAGEM_VIGENCIA_ANTES_DO_INICIO =
  "O valor novo não pode valer antes do mês de início.";

/**
 * Na tela de Categorias, `CATEGORIA_NAO_ENCONTRADA` não nasce de uma escolha
 * num seletor, e sim de um id que não está mais no banco. "Escolha uma
 * categoria válida" não faria sentido numa linha sem seletor.
 */
export const MENSAGEM_CATEGORIA_INEXISTENTE = "Essa categoria não existe mais.";

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
  CATEGORIA_NAO_ENCONTRADA: "categoriaId",
  CATEGORIA_JA_EXISTE: "nome",
  COMPETENCIA_INVALIDA: "competenciaInicial",
  PERIODO_INVALIDO: "competenciaFim",
};

export function mensagemDoErro(code: CodigoErroExibivel): string {
  return MENSAGENS[code];
}

/**
 * Monta o envelope de erro. Quando o código tem campo correspondente, o erro
 * já sai endereçado ao campo, e o formulário o exibe ali em vez de num alerta
 * genérico solto no topo. `campo` substitui o do código quando o mesmo código
 * nasce de campos diferentes, como `PERIODO_INVALIDO` na edição do fixo.
 */
export function erroDeAction(
  code: CodigoErroExibivel,
  mensagem: string = mensagemDoErro(code),
  campo: string | undefined = CAMPO_DO_ERRO[code],
): ResultadoAction<never> {
  return {
    ok: false,
    erro: campo ? { code, mensagem, campos: { [campo]: mensagem } } : { code, mensagem },
  };
}
