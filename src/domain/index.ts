/**
 * API pública do núcleo de domínio.
 *
 * Cada símbolo é listado por nome: não há `export *` de arquivo interno.
 * O que não aparece aqui — `ultimoDiaDoMes`, os índices de competência, os
 * auxiliares de data do ciclo — é detalhe de implementação e não deve ser
 * importado de fora de `src/domain`.
 */

export type { CicloFatura } from "./cartao/ciclo-fatura";
export { diaEfetivo, resolverCicloFatura } from "./cartao/ciclo-fatura";
export { geraFatura, podeReceberNovaCompra } from "./cartao/regras-cartao";
export type { BlocoDoMes } from "./mes/bloco-do-lancamento";
export { blocoDoLancamento } from "./mes/bloco-do-lancamento";
export type { ErroCancelamentoProibido } from "./mes/cancelamento-permitido";
export { cancelamentoPermitido } from "./mes/cancelamento-permitido";
export type { ComprometimentoFuturo } from "./mes/projecao";
export { projetarProximosMeses } from "./mes/projecao";
export type { ResumoDoMes } from "./mes/resumo-mensal";
export { resumoMensal } from "./mes/resumo-mensal";
export type { Porcentagem, ResumoCategoria, ResumoPessoa } from "./mes/resumo-por-categoria";
export { CEM_PORCENTO, resumoPorCategoria, resumoPorPessoa } from "./mes/resumo-por-categoria";
export type {
  AvaliacaoCategoria,
  AvaliacaoOrcamento,
  LimiteCategoria,
} from "./orcamento/avaliar-orcamento";
export { avaliarOrcamento } from "./orcamento/avaliar-orcamento";
export { gerarParcelas } from "./parcelamento/gerar-parcelas";
export { MAX_PARCELAS, ratearParcelas } from "./parcelamento/ratear-parcelas";
export type {
  AlteracoesCompra,
  CompraExistente,
  ParcelaPaga,
  PlanoRegeneracao,
} from "./parcelamento/regenerar-parcelas";
export { regenerarParcelas } from "./parcelamento/regenerar-parcelas";
export type { PeriodoRecorrencia } from "./recorrencia/janela-materializacao";
export { janelaMaterializacao } from "./recorrencia/janela-materializacao";
export type { OcorrenciaMaterializada } from "./recorrencia/ocorrencia-protegida";
export { ocorrenciaProtegida } from "./recorrencia/ocorrencia-protegida";
export type { OcorrenciaRecorrencia, ValorEfetivo } from "./recorrencia/valor-efetivo";
export { confirmarValorReal, resolverValorEfetivo } from "./recorrencia/valor-efetivo";
export type { VersaoRecorrencia } from "./recorrencia/versao-vigente";
export { versaoVigente } from "./recorrencia/versao-vigente";
export type { Competencia } from "./shared/competencia";
export {
  addMeses,
  compararCompetencias,
  criarCompetencia,
  dataParaCompetencia,
  diffMeses,
  rangeCompetencias,
} from "./shared/competencia";
export type { Cents } from "./shared/money";
export { criarCents, multiplicar, parseBRL, somar, subtrair, ZERO_CENTS } from "./shared/money";
export type { CodigoErro, DomainError, Result } from "./shared/result";
export { err, isErr, isOk, ok } from "./shared/result";
export type {
  Cartao,
  Categoria,
  EntradaCompra,
  Lancamento,
  MeioPagamento,
  MeioPagamentoBase,
  MeioSemFatura,
  Natureza,
  Origem,
  Parcela,
  PlanoParcelamento,
  PoliticaResiduo,
  Recorrencia,
  ResumoMensal,
  TipoMeio,
} from "./tipos";
