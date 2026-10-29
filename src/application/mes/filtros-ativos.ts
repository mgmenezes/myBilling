import type { Natureza } from "@/domain";
import { type FiltroDeLancamentos, SEM_CATEGORIA, type Situacao } from "./filtrar-lancamentos";

/**
 * Os filtros ativos com o nome que a pessoa lê, para a barra compacta da
 * lista (LST-03, AC 4). Cada um leva o parâmetro da URL que o tira.
 *
 * **A busca fica de fora.** Ela já está no campo da própria barra, e um chip
 * a mais com o mesmo termo seria o mesmo filtro mostrado duas vezes.
 *
 * O id que não está mais no cadastro aparece mesmo assim, com um nome
 * genérico: um filtro que a pessoa não vê é um filtro que ela não consegue
 * tirar.
 */

export interface FiltroAtivo {
  /** O parâmetro da URL. */
  readonly chave: string;
  readonly rotulo: string;
}

const SITUACAO: Record<Situacao, string> = {
  PENDENTE: "Pendente",
  PAGO: "Pago",
  VENCIDO: "Vencido",
};

const NATUREZA: Record<Natureza, string> = {
  DESPESA: "Despesa",
  RECEITA: "Receita",
  INVESTIMENTO: "Investimento",
};

export function filtrosAtivos(
  filtro: FiltroDeLancamentos,
  nomes: {
    readonly categorias: ReadonlyMap<string, string>;
    readonly meios: ReadonlyMap<string, string>;
    readonly usuarios: ReadonlyMap<string, string>;
  },
): ReadonlyArray<FiltroAtivo> {
  const ativos: FiltroAtivo[] = [];
  if (filtro.categoriaId !== undefined) {
    ativos.push({
      chave: "categoriaId",
      rotulo:
        filtro.categoriaId === SEM_CATEGORIA
          ? "Sem categoria"
          : (nomes.categorias.get(filtro.categoriaId) ?? "Categoria removida"),
    });
  }
  if (filtro.meioPagamentoId !== undefined) {
    ativos.push({
      chave: "meioPagamentoId",
      rotulo: nomes.meios.get(filtro.meioPagamentoId) ?? "Meio removido",
    });
  }
  if (filtro.usuarioId !== undefined) {
    ativos.push({
      chave: "usuarioId",
      rotulo: nomes.usuarios.get(filtro.usuarioId) ?? "Pessoa removida",
    });
  }
  if (filtro.situacao !== undefined) {
    ativos.push({ chave: "situacao", rotulo: SITUACAO[filtro.situacao] });
  }
  if (filtro.natureza !== undefined) {
    ativos.push({ chave: "natureza", rotulo: NATUREZA[filtro.natureza] });
  }
  return ativos;
}
