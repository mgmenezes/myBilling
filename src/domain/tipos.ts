import type { Competencia } from "./shared/competencia";
import type { Cents } from "./shared/money";

/**
 * Tipos de domínio. Todos imutáveis, sem decorator e sem nenhum tipo do
 * ORM: a camada de infraestrutura mapeia linha do banco para estes tipos,
 * nunca o contrário (AD-006).
 *
 * Todo campo monetário é `Cents` — nunca `number` cru (AD-001).
 */

export type Natureza = "RECEITA" | "DESPESA" | "INVESTIMENTO";
export type Origem = "AVULSO" | "PARCELA" | "RECORRENCIA";
export type TipoMeio = "CONTA_CORRENTE" | "CARTAO_CREDITO" | "ROTULO";
export type PoliticaResiduo = "PRIMEIRAS" | "ULTIMAS";

export interface Categoria {
  readonly id: string;
  readonly nome: string;
  /** Arquivar remove a categoria dos formulários sem apagar histórico. */
  readonly arquivadaEm: string | null;
}

export interface MeioPagamentoBase {
  readonly id: string;
  readonly nome: string;
  readonly tipo: TipoMeio;
  readonly arquivadoEm: string | null;
}

/** Conta corrente e rótulo não têm ciclo de fatura (CART-02, AC 5). */
export interface MeioSemFatura extends MeioPagamentoBase {
  readonly tipo: "CONTA_CORRENTE" | "ROTULO";
}

/**
 * Cartão de crédito exige fechamento e vencimento — a exigência é do tipo,
 * não de uma validação em runtime (CART-02, CART-03).
 */
export interface Cartao extends MeioPagamentoBase {
  readonly tipo: "CARTAO_CREDITO";
  readonly diaFechamento: number;
  readonly diaVencimento: number;
  /** Compra no próprio dia do fechamento entra na fatura seguinte (CART-02, AC 2). */
  readonly fechamentoVaiParaFaturaSeguinte: boolean;
}

export type MeioPagamento = MeioSemFatura | Cartao;

/**
 * Um plano de geração, nunca uma linha somável (AD-003). Nenhuma coluna daqui
 * entra em `SUM`: quem soma são as ocorrências materializadas em `movimento`.
 *
 * O valor **não** mora aqui — mora nas versões, porque ele muda com o tempo e o
 * que foi planejado em março continua sendo informação depois que mudou em
 * outubro.
 */
export interface Recorrencia {
  readonly id: string;
  readonly descricao: string;
  readonly natureza: Natureza;
  readonly categoriaId: string | null;
  readonly usuarioId: string;
  readonly meioPagamentoId: string;
  readonly competenciaInicio: Competencia;
  /** Última competência em que vale. `null` = sem fim. */
  readonly competenciaFim: Competencia | null;
  readonly diaVencimento: number;
  /** Instante em que foi encerrada. Auditoria: não entra no cálculo da janela. */
  readonly encerradaEm: string | null;
}

export interface Lancamento {
  readonly id: string;
  readonly natureza: Natureza;
  readonly origem: Origem;
  readonly descricao: string;
  readonly competencia: Competencia;
  readonly dataEvento: string;
  readonly valor: Cents;
  readonly valorPrevisto: Cents | null;
  /** `null` = previsto; preenchido = realizado. */
  readonly pagoEm: string | null;
  readonly categoriaId: string | null;
  readonly usuarioId: string;
  readonly meioPagamentoId: string;
  readonly compraId: string | null;
  readonly numeroParcela: number | null;
  readonly canceladoEm: string | null;
}

export interface EntradaCompra {
  readonly modo: "TOTAL" | "VALOR_PARCELA";
  readonly valorEntrada: Cents;
  /** 1..120 */
  readonly qtdParcelas: number;
  /** Competência da parcela 1, mesmo quando a compra já está em andamento. */
  readonly competenciaCompra: Competencia;
  /** 1 por padrão; 8 no caso "8/10". */
  readonly parcelaInicial: number;
  readonly politicaResiduo: PoliticaResiduo;
}

export interface Parcela {
  readonly numero: number;
  readonly valor: Cents;
  readonly competencia: Competencia;
}

export interface PlanoParcelamento {
  readonly valorTotal: Cents;
  readonly parcelas: ReadonlyArray<Parcela>;
  /** Soma das parcelas anteriores a `parcelaInicial` (AD-005). */
  readonly valorAmortizadoAnterior: Cents;
}

/**
 * Três objetos aninhados, nunca somados entre si (MOV-03). Somar
 * competência com caixa passa a exigir código que atravessa a fronteira de
 * objeto — o que aparece em code review.
 */
export interface ResumoMensal {
  readonly competenciaView: {
    readonly totalGastos: Cents;
    readonly fixos: Cents;
    readonly cartao: Cents;
    readonly avulsos: Cents;
    readonly entradas: Cents;
    readonly investimentos: Cents;
    readonly pendente: Cents;
    readonly saldo: Cents;
  };
  readonly caixaView: {
    readonly saidas: Cents;
    readonly entradasRecebidas: Cents;
    readonly investimentosRealizados: Cents;
    readonly saldo: Cents;
  };
  readonly futuro: ReadonlyArray<{
    readonly competencia: Competencia;
    readonly comprometido: Cents;
  }>;
}
