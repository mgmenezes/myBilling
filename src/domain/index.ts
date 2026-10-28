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
export type { MotivoNaoLida, ParcelaDaLinha } from "./importacao/celula";
export { normalizarNome, parcelaDaCelula, valorDaCelula } from "./importacao/celula";
export type { MesEAnoDoArquivo } from "./importacao/competencia-do-arquivo";
export { competenciaDoNomeDoArquivo } from "./importacao/competencia-do-arquivo";
export type { Conferencia, ConferenciaDeBloco } from "./importacao/conferir-aba";
export { conferirAba } from "./importacao/conferir-aba";
export type { Grade } from "./importacao/csv";
export { lerCsv } from "./importacao/csv";
export type {
  AbaLida,
  Bloco,
  LinhaDeCartao,
  LinhaLida,
  LinhaNaoLida,
} from "./importacao/ler-aba";
export { lerAba, TITULOS } from "./importacao/ler-aba";
export type {
  ClasseEntrada,
  DecisaoDeEntrada,
  DecisoesDaImportacao,
  DestinoDaLinha,
  EstadoParaImportacao,
  LinhaDaPrevia,
  OperacoesDaImportacao,
  Pendencias,
  PlanoDeImportacao,
} from "./importacao/planejar-importacao";
export { planejarImportacao } from "./importacao/planejar-importacao";
export type {
  CompraEmCurso,
  ComprasReconhecidas,
  DestinoDeCompra,
  LinhaDeCompra,
} from "./importacao/reconhecer-compras";
export { reconhecerCompras, TOLERANCIA_DE_RECONHECIMENTO } from "./importacao/reconhecer-compras";
export type {
  DestinoDeRecorrencia,
  LinhaDeRecorrencia,
  RecorrenciasReconhecidas,
  RecorrenciaVigente,
} from "./importacao/reconhecer-recorrencias";
export { reconhecerRecorrencias } from "./importacao/reconhecer-recorrencias";
export type { BlocoDoMes } from "./mes/bloco-do-lancamento";
export { blocoDoLancamento } from "./mes/bloco-do-lancamento";
export type { ErroCancelamentoProibido } from "./mes/cancelamento-permitido";
export { cancelamentoPermitido } from "./mes/cancelamento-permitido";
export type { FatiaDeComposicao, TotaisPorBloco } from "./mes/composicao-de-blocos";
export { composicaoDeBlocos } from "./mes/composicao-de-blocos";
export { dataPadraoDoLancamento } from "./mes/data-padrao-do-lancamento";
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
export type {
  CompraParaReprecificar,
  ParcelaDaCompra,
  Reprecificacao,
} from "./parcelamento/reprecificar-parcelas";
export { reprecificarAPartirDe } from "./parcelamento/reprecificar-parcelas";
export { dataDeVencimento } from "./recorrencia/data-de-vencimento";
export type {
  CamposDaSerie,
  FixoAtual,
  FixoEditado,
  MudancaDoFim,
  PlanoDeEdicao,
} from "./recorrencia/edicao-do-fixo";
export { planejarEdicaoDoFixo } from "./recorrencia/edicao-do-fixo";
export type { PeriodoRecorrencia } from "./recorrencia/janela-materializacao";
export { janelaMaterializacao } from "./recorrencia/janela-materializacao";
export type { OcorrenciaMaterializada } from "./recorrencia/ocorrencia-protegida";
export { ocorrenciaProtegida } from "./recorrencia/ocorrencia-protegida";
export { valeNaCompetencia } from "./recorrencia/vale-na-competencia";
export type { OcorrenciaRecorrencia, ValorEfetivo } from "./recorrencia/valor-efetivo";
export { confirmarValorReal, resolverValorEfetivo } from "./recorrencia/valor-efetivo";
export type { VersaoRecorrencia } from "./recorrencia/versao-vigente";
export { versaoVigente } from "./recorrencia/versao-vigente";
export type { Competencia } from "./shared/competencia";
export {
  addMeses,
  compararCompetencias,
  competenciaDeAnoEMes,
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
