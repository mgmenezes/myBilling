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
export { gerarParcelas } from "./parcelamento/gerar-parcelas";
export { MAX_PARCELAS, ratearParcelas } from "./parcelamento/ratear-parcelas";
export type {
  AlteracoesCompra,
  CompraExistente,
  ParcelaPaga,
  PlanoRegeneracao,
} from "./parcelamento/regenerar-parcelas";
export { regenerarParcelas } from "./parcelamento/regenerar-parcelas";
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
  ResumoMensal,
  TipoMeio,
} from "./tipos";
