import type { Cents } from "../shared/money";
import { normalizarNome, type ParcelaDaLinha } from "./celula";

/** Até R$ 1,00 de diferença a parcela ainda é a mesma compra (IMP-07 AC 8). */
export const TOLERANCIA_DE_RECONHECIMENTO = 100;

/** Compra parcelada que tem parcela na competência M. */
export interface CompraEmCurso {
  readonly compraId: string;
  readonly descricao: string;
  readonly meioPagamentoId: string;
  readonly qtdParcelas: number;
  /** Número da parcela que cai em M. */
  readonly numeroEmM: number;
  readonly valorEmM: Cents;
}

export interface LinhaDeCompra {
  readonly posicao: number;
  readonly nome: string;
  readonly meioPagamentoId: string;
  readonly parcela: ParcelaDaLinha;
  readonly valor: Cents;
}

/** Genérico na linha pelo mesmo motivo de `DestinoDeRecorrencia`. */
export type DestinoDeCompra<L extends LinhaDeCompra = LinhaDeCompra> =
  | { readonly tipo: "COMPRA_NOVA"; readonly linha: L }
  | { readonly tipo: "CONTINUA"; readonly linha: L; readonly compraId: string }
  | {
      readonly tipo: "CONTINUA_COM_NOVO_VALOR";
      readonly linha: L;
      readonly compraId: string;
      readonly de: Cents;
      readonly para: Cents;
    };

export interface ComprasReconhecidas<L extends LinhaDeCompra = LinhaDeCompra> {
  readonly destinos: ReadonlyArray<DestinoDeCompra<L>>;
  readonly naoAparecem: ReadonlyArray<CompraEmCurso>;
}

/**
 * Reconhece a linha `n/t` da aba M como continuação de uma compra pela
 * sequência: mesmo nome normalizado, mesmo meio, `qtdParcelas = t`, a parcela
 * `n` em M e valor a até `TOLERANCIA_DE_RECONHECIMENTO` centavos (IMP-07 AC 7
 * e 8). Entre as candidatas ainda livres vence a de valor mais próximo, e no
 * empate a primeira recebida; cada compra é reconhecida por uma linha só
 * (AC 9). Compra que nenhuma linha reconhece não aparece nesta aba (AC 11).
 */
export function reconhecerCompras<L extends LinhaDeCompra>(
  linhas: ReadonlyArray<L>,
  emCurso: ReadonlyArray<CompraEmCurso>,
): ComprasReconhecidas<L> {
  const reconhecidas = new Set<CompraEmCurso>();
  const destinos: DestinoDeCompra<L>[] = [];

  for (const linha of linhas) {
    const chave = normalizarNome(linha.nome);
    const distancia = (compra: CompraEmCurso): number => Math.abs(linha.valor - compra.valorEmM);
    const candidatas = emCurso.filter(
      (compra) =>
        !reconhecidas.has(compra) &&
        normalizarNome(compra.descricao) === chave &&
        compra.meioPagamentoId === linha.meioPagamentoId &&
        compra.qtdParcelas === linha.parcela.total &&
        compra.numeroEmM === linha.parcela.numero &&
        distancia(compra) <= TOLERANCIA_DE_RECONHECIMENTO,
    );
    // `<` estrito: no empate de distância, a primeira recebida continua escolhida.
    const escolhida = candidatas.reduce<CompraEmCurso | undefined>(
      (melhor, compra) =>
        melhor === undefined || distancia(compra) < distancia(melhor) ? compra : melhor,
      undefined,
    );

    if (escolhida === undefined) {
      destinos.push({ tipo: "COMPRA_NOVA", linha });
      continue;
    }
    reconhecidas.add(escolhida);
    if (linha.valor === escolhida.valorEmM) {
      destinos.push({ tipo: "CONTINUA", linha, compraId: escolhida.compraId });
    } else {
      destinos.push({
        tipo: "CONTINUA_COM_NOVO_VALOR",
        linha,
        compraId: escolhida.compraId,
        de: escolhida.valorEmM,
        para: linha.valor,
      });
    }
  }

  return { destinos, naoAparecem: emCurso.filter((compra) => !reconhecidas.has(compra)) };
}
