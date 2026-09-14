import type {
  CadastroRepository,
  CompraPersistida,
  CompraRepository,
} from "@/application/ports/repositories";
import type { EntradaCompraValidada } from "@/application/schemas/compra.schema";
import {
  addMeses,
  type Cents,
  type CodigoErro,
  type Competencia,
  criarCents,
  criarCompetencia,
  err,
  gerarParcelas,
  ok,
  podeReceberNovaCompra,
  type Result,
} from "@/domain";

/**
 * Cadastrar uma compra parcelada: valida o meio de pagamento, chama o domínio
 * para montar o plano e grava tudo numa transação só.
 *
 * **Nenhuma aritmética acontece aqui.** O rateio é de `gerarParcelas`, o
 * deslocamento de mês é de `addMeses` e a conservação é conferida pelo
 * repositório antes do commit. Este arquivo decide a ordem, não os números —
 * é o que mantém a dor central coberta por testes de milissegundos.
 */

/**
 * Códigos do domínio mais o que só a aplicação consegue perceber: um id de
 * meio de pagamento que não existe é erro de referência, não de regra
 * financeira, e por isso não pertence à união fechada do domínio.
 */
export type CodigoErroAplicacao = CodigoErro | "MEIO_PAGAMENTO_NAO_ENCONTRADO";

export interface ErroAplicacao {
  readonly code: CodigoErroAplicacao;
  readonly detalhes?: Record<string, unknown>;
}

export interface DependenciasCriarCompra {
  readonly compras: CompraRepository;
  readonly cadastros: CadastroRepository;
}

export interface CompraCriada {
  readonly compraId: string;
  readonly descricao: string;
  readonly valorTotal: Cents;
  readonly qtdParcelas: number;
  readonly parcelaInicial: number;
  readonly valorAmortizadoAnterior: Cents;
  readonly parcelas: ReadonlyArray<{
    readonly numero: number;
    readonly valor: Cents;
    readonly competencia: Competencia;
  }>;
  /** `true` quando a chave de idempotência já tinha sido usada (PARC-05, AC 9). */
  readonly jaExistia: boolean;
}

export async function criarCompraParcelada(
  deps: DependenciasCriarCompra,
  entrada: EntradaCompraValidada,
): Promise<Result<CompraCriada, ErroAplicacao>> {
  // Antes de qualquer trabalho: duplo-clique devolve a compra que já existe,
  // e o retry fica observacionalmente idêntico ao sucesso (PARC-05, AC 9).
  const jaGravada = await deps.compras.buscarPorIdempotencyKey(entrada.idempotencyKey);
  if (jaGravada) {
    return ok(paraCompraCriada(jaGravada, entrada.descricao, true));
  }

  const meio = await deps.cadastros.buscarMeioDePagamento(entrada.meioPagamentoId);
  if (!meio) {
    return err<ErroAplicacao>({
      code: "MEIO_PAGAMENTO_NAO_ENCONTRADO",
      detalhes: { meioPagamentoId: entrada.meioPagamentoId },
    });
  }
  const disponivel = podeReceberNovaCompra(meio);
  if (!disponivel.ok) {
    return err(disponivel.error);
  }

  const competenciaInicial = criarCompetencia(entrada.competenciaInicial);
  if (!competenciaInicial.ok) {
    return err(competenciaInicial.error);
  }

  const valorEntrada = criarCents(entrada.valorCentavos);
  if (!valorEntrada.ok) {
    return err(valorEntrada.error);
  }

  // O domínio conta as competências a partir da parcela 1; o formulário fala
  // da parcela que o usuário está lançando. A ponte entre as duas é `addMeses`
  // com deslocamento negativo — numa compra 8/10 que cai em 2026-03, a
  // parcela 1 é 2025-08 e nenhum lançamento é criado lá (AD-005).
  const competenciaCompra = addMeses(competenciaInicial.value, -(entrada.parcelaInicial - 1));

  const plano = gerarParcelas({
    modo: entrada.modo,
    valorEntrada: valorEntrada.value,
    qtdParcelas: entrada.qtdParcelas,
    competenciaCompra,
    parcelaInicial: entrada.parcelaInicial,
    politicaResiduo: entrada.politicaResiduo,
  });
  if (!plano.ok) {
    return err(plano.error);
  }

  const persistida = await deps.compras.salvarComParcelas({
    idempotencyKey: entrada.idempotencyKey,
    dados: {
      descricao: entrada.descricao,
      modo: entrada.modo,
      politicaResiduo: entrada.politicaResiduo,
      competenciaCompra,
      qtdParcelas: entrada.qtdParcelas,
      parcelaInicial: entrada.parcelaInicial,
      categoriaId: entrada.categoriaId,
      usuarioId: entrada.usuarioId,
      meioPagamentoId: entrada.meioPagamentoId,
      dataEvento: entrada.dataEvento,
    },
    plano: plano.value,
  });
  if (!persistida.ok) {
    return err(persistida.error);
  }

  return ok(paraCompraCriada(persistida.value, entrada.descricao, false));
}

/**
 * As parcelas devolvidas são as **gravadas**, lidas de volta do repositório —
 * não o plano em memória. `numeroParcela` é `not null` em toda linha de
 * origem `PARCELA` por `CHECK` no banco; o zero é só o piso do tipo.
 */
function paraCompraCriada(
  persistida: CompraPersistida,
  descricao: string,
  jaExistia: boolean,
): CompraCriada {
  return {
    compraId: persistida.id,
    descricao,
    valorTotal: persistida.valorTotal,
    qtdParcelas: persistida.qtdParcelas,
    parcelaInicial: persistida.parcelaInicial,
    valorAmortizadoAnterior: persistida.valorAmortizadoAnterior,
    parcelas: persistida.parcelas.map((parcela) => ({
      numero: parcela.numeroParcela ?? 0,
      valor: parcela.valor,
      competencia: parcela.competencia,
    })),
    jaExistia,
  };
}
