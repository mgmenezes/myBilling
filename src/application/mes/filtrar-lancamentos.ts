import type { Competencia, Natureza } from "@/domain";
import type { LancamentoDoMes } from "./obter-visao-mensal/handler";

/**
 * Filtragem dos lançamentos do mês.
 *
 * **Existe em um único lugar de propósito.** O indicador do painel leva para a
 * lista com um filtro na URL, e a soma do que aparece lá precisa bater com o
 * número que foi clicado. Se o predicado do indicador e o da lista fossem duas
 * implementações, eles divergiriam na primeira mudança e o painel passaria a
 * prometer um total que a lista não confirma.
 *
 * Função pura sobre a lista que a página já carregou. Nenhuma consulta nova ao
 * banco: com algumas centenas de lançamentos por mês, filtrar em memória é
 * instantâneo e evita uma ida ao servidor a cada tecla digitada.
 */

export type Situacao = "PENDENTE" | "PAGO" | "VENCIDO";

/**
 * O `categoriaId` que pede os gastos sem categoria (LST-01, AC 9).
 *
 * Mora aqui, e só aqui: a Visão geral usa o mesmo valor como id da barra
 * "Sem categoria", a lista o grava na URL pelo chip, e este filtro o
 * reconhece. Três cópias da string divergiriam na primeira mudança, e o link
 * da Visão geral abriria a lista vazia.
 */
export const SEM_CATEGORIA = "sem-categoria";

export interface FiltroDeLancamentos {
  readonly busca?: string;
  readonly categoriaId?: string;
  readonly meioPagamentoId?: string;
  readonly usuarioId?: string;
  readonly situacao?: Situacao;
  readonly natureza?: Natureza;
}

/** Remove acento e caixa: buscar "agua" precisa achar "Água". */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Situação é **derivada**, nunca armazenada. Uma coluna de situação precisaria
 * de um processo que a mantivesse em dia com o calendário, e ficaria errada em
 * todo lançamento que vence sem ninguém abrir o app.
 */
export function situacaoDe(item: LancamentoDoMes, competenciaCorrente: Competencia): Situacao {
  if (item.lancamento.pagoEm !== null) {
    return "PAGO";
  }
  return item.lancamento.competencia < competenciaCorrente ? "VENCIDO" : "PENDENTE";
}

/**
 * `SEM_CATEGORIA` casa o gasto de categoria nula. A receita fica de fora: a
 * lista a mostra como "Receita", e não como "Sem categoria" (TRC-01), e o
 * chip de mesmo nome soma só despesa.
 */
function daCategoria(item: LancamentoDoMes, categoriaId: string): boolean {
  if (categoriaId === SEM_CATEGORIA) {
    return item.lancamento.categoriaId === null && item.lancamento.natureza !== "RECEITA";
  }
  return item.lancamento.categoriaId === categoriaId;
}

export function filtrarLancamentos(
  lancamentos: ReadonlyArray<LancamentoDoMes>,
  filtro: FiltroDeLancamentos,
  competenciaCorrente: Competencia,
): ReadonlyArray<LancamentoDoMes> {
  const busca = filtro.busca === undefined ? "" : normalizar(filtro.busca);

  return lancamentos.filter((item) => {
    if (busca !== "" && !normalizar(item.lancamento.descricao).includes(busca)) {
      return false;
    }
    if (filtro.natureza !== undefined && item.lancamento.natureza !== filtro.natureza) {
      return false;
    }
    if (filtro.categoriaId !== undefined && !daCategoria(item, filtro.categoriaId)) {
      return false;
    }
    if (
      filtro.meioPagamentoId !== undefined &&
      item.lancamento.meioPagamentoId !== filtro.meioPagamentoId
    ) {
      return false;
    }
    if (filtro.usuarioId !== undefined && item.lancamento.usuarioId !== filtro.usuarioId) {
      return false;
    }
    if (
      filtro.situacao !== undefined &&
      situacaoDe(item, competenciaCorrente) !== filtro.situacao
    ) {
      return false;
    }
    return true;
  });
}

/** Quantos filtros estão ativos. Zero significa lista inteira do mês. */
export function contarFiltrosAtivos(filtro: FiltroDeLancamentos): number {
  return [
    filtro.busca !== undefined && filtro.busca.trim() !== "",
    filtro.categoriaId !== undefined,
    filtro.meioPagamentoId !== undefined,
    filtro.usuarioId !== undefined,
    filtro.situacao !== undefined,
    filtro.natureza !== undefined,
  ].filter(Boolean).length;
}
