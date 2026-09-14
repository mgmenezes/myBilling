import {
  addMeses,
  type Competencia,
  criarCents,
  criarCompetencia,
  type DomainError,
  err,
  gerarParcelas,
  ok,
  type PlanoParcelamento,
  type PoliticaResiduo,
  type Result,
} from "@/domain";

/**
 * Entrada validada → plano de parcelas. **Uma função, dois consumidores**: o
 * preview do formulário e a gravação da Server Action.
 *
 * É o ponto do sistema onde preview e persistência não têm como divergir. Um
 * preview calculado por conta própria no cliente é pior do que não ter
 * preview: o usuário confere o centavo residual na tela, aprova, e grava outro
 * número.
 *
 * Pura e sem I/O: o formulário a chama a cada tecla.
 */

export interface DadosDoPlano {
  readonly modo: "TOTAL" | "VALOR_PARCELA";
  /** Valor total ou valor de uma parcela, conforme `modo` (PARC-04, AC 4). */
  readonly valorCentavos: number;
  readonly qtdParcelas: number;
  /** 1 por padrão; 8 no caso `8/10` (AD-005). */
  readonly parcelaInicial: number;
  /** Competência da **parcela inicial**: o mês que o usuário está vendo. */
  readonly competenciaInicial: string;
  readonly politicaResiduo: PoliticaResiduo;
}

export interface PlanoDaCompra {
  /** Competência da parcela **1**, que é a que o plano guarda (AD-005). */
  readonly competenciaCompra: Competencia;
  readonly plano: PlanoParcelamento;
}

export function planoDaCompra(dados: DadosDoPlano): Result<PlanoDaCompra, DomainError> {
  // Guarda de forma, não de regra: o formulário chama esta função a cada
  // tecla, e um campo em branco chega aqui como `NaN`. `NaN < 1` é falso, de
  // modo que a comparação do domínio o deixaria passar e a competência sairia
  // como `NaN-NaN`. A regra financeira continua sendo do domínio.
  if (!Number.isInteger(dados.qtdParcelas)) {
    return err<DomainError>({
      code: "QTD_PARCELAS_INVALIDA",
      detalhes: { qtdParcelas: dados.qtdParcelas },
    });
  }
  if (!Number.isInteger(dados.parcelaInicial)) {
    return err<DomainError>({
      code: "PARCELA_INICIAL_INVALIDA",
      detalhes: { parcelaInicial: dados.parcelaInicial },
    });
  }

  const competenciaInicial = criarCompetencia(dados.competenciaInicial);
  if (!competenciaInicial.ok) {
    return err(competenciaInicial.error);
  }

  const valorEntrada = criarCents(dados.valorCentavos);
  if (!valorEntrada.ok) {
    return err(valorEntrada.error);
  }

  // O domínio conta as competências a partir da parcela 1; o formulário fala
  // da parcela que está sendo lançada. Numa compra 8/10 que cai em 2026-03, a
  // parcela 1 é 2025-08 — e continua sem gerar lançamento lá (AD-005).
  const competenciaCompra = addMeses(competenciaInicial.value, -(dados.parcelaInicial - 1));

  const plano = gerarParcelas({
    modo: dados.modo,
    valorEntrada: valorEntrada.value,
    qtdParcelas: dados.qtdParcelas,
    competenciaCompra,
    parcelaInicial: dados.parcelaInicial,
    politicaResiduo: dados.politicaResiduo,
  });
  if (!plano.ok) {
    return err(plano.error);
  }
  return ok({ competenciaCompra, plano: plano.value });
}
