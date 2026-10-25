import type { Cents } from "../shared/money";
import { normalizarNome } from "./celula";

/** Recorrência que vale em M − 1, com o valor que ela tem em M. */
export interface RecorrenciaVigente {
  readonly id: string;
  readonly descricao: string;
  readonly meioPagamentoId: string;
  readonly valorEmM: Cents;
}

export interface LinhaDeRecorrencia {
  readonly bloco: "FIXOS" | "ENTRADAS";
  readonly posicao: number;
  readonly nome: string;
  /** `null` em entrada: ela é reconhecida só pelo nome (IMP-07 AC 2). */
  readonly meioPagamentoId: string | null;
  /** `null` quando o valor da linha é ilegível (linha não lida). */
  readonly valor: Cents | null;
}

/** A linha que chega a um destino com valor: só `PRESENTE_SEM_VALOR` fica sem. */
type ComValor<L extends LinhaDeRecorrencia> = L & { readonly valor: Cents };

/**
 * Genérico na linha para que quem chama receba de volta, em cada destino, a
 * mesma linha que passou, com o que mais ela carregar.
 */
export type DestinoDeRecorrencia<L extends LinhaDeRecorrencia = LinhaDeRecorrencia> =
  | { readonly tipo: "NOVA"; readonly linha: ComValor<L> }
  | { readonly tipo: "INALTERADA"; readonly linha: ComValor<L>; readonly recorrenciaId: string }
  | {
      readonly tipo: "REAJUSTE";
      readonly linha: ComValor<L>;
      readonly recorrenciaId: string;
      readonly de: Cents;
      readonly para: Cents;
    }
  | { readonly tipo: "PRESENTE_SEM_VALOR"; readonly linha: L; readonly recorrenciaId: string };

export interface RecorrenciasReconhecidas<L extends LinhaDeRecorrencia = LinhaDeRecorrencia> {
  /** Linha com valor `null` e sem par não entra. */
  readonly destinos: ReadonlyArray<DestinoDeRecorrencia<L>>;
  readonly encerrar: ReadonlyArray<RecorrenciaVigente>;
}

function temValor<L extends LinhaDeRecorrencia>(linha: L): linha is ComValor<L> {
  return linha.valor !== null;
}

/**
 * Pareia cada linha da aba M com uma recorrência vigente em M − 1 pela chave
 * nome normalizado + meio, ou só pelo nome quando a linha não tem meio. As
 * linhas são percorridas na ordem da aba e as vigentes na ordem recebida, e
 * cada vigente pareia uma vez: a segunda linha com a mesma chave é nova
 * (IMP-07 AC 12). Vigente sem par vai para `encerrar` (AC 5).
 *
 * Linha reconhecida com valor ilegível conta como presente e mantém o valor
 * vigente (AC 6): encerrar por causa de uma célula vazia apagaria os meses
 * seguintes de um gasto que continua.
 */
export function reconhecerRecorrencias<L extends LinhaDeRecorrencia>(
  linhas: ReadonlyArray<L>,
  vigentes: ReadonlyArray<RecorrenciaVigente>,
): RecorrenciasReconhecidas<L> {
  const pareadas = new Set<RecorrenciaVigente>();
  const destinos: DestinoDeRecorrencia<L>[] = [];

  for (const linha of linhas) {
    const chave = normalizarNome(linha.nome);
    const par = vigentes.find(
      (candidata) =>
        !pareadas.has(candidata) &&
        normalizarNome(candidata.descricao) === chave &&
        (linha.meioPagamentoId === null || candidata.meioPagamentoId === linha.meioPagamentoId),
    );
    if (par === undefined) {
      if (temValor(linha)) {
        destinos.push({ tipo: "NOVA", linha });
      }
      continue;
    }
    pareadas.add(par);
    if (!temValor(linha)) {
      destinos.push({ tipo: "PRESENTE_SEM_VALOR", linha, recorrenciaId: par.id });
    } else if (linha.valor === par.valorEmM) {
      destinos.push({ tipo: "INALTERADA", linha, recorrenciaId: par.id });
    } else {
      destinos.push({
        tipo: "REAJUSTE",
        linha,
        recorrenciaId: par.id,
        de: par.valorEmM,
        para: linha.valor,
      });
    }
  }

  return { destinos, encerrar: vigentes.filter((vigente) => !pareadas.has(vigente)) };
}
