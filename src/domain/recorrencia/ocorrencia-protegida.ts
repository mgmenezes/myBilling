import type { Cents } from "../shared/money";

/** O recorte de uma ocorrência que interessa à decisão de protegê-la. */
export interface OcorrenciaMaterializada {
  readonly pagoEm: string | null;
  readonly valor: Cents;
  /** `null` em lançamento que não veio de recorrência. */
  readonly valorPrevisto: Cents | null;
}

/**
 * Uma ocorrência já materializada pode ser reescrita pela materialização?
 *
 * Não, quando alguém tocou nela. "Tocou" tem exatamente dois sinais: **estar
 * paga** ou **ter valor diferente do previsto** (FIXO-02, ACs 3 e 4).
 *
 * O erro aqui é assimétrico, e é por isso que o predicado erra para o lado
 * seguro: proteger demais deixa um valor desatualizado na tela, que a pessoa
 * vê e corrige; proteger de menos apaga o valor real que ela digitou, que ela
 * **não** vê — e descobre ao conferir o mês fechado contra a fatura.
 *
 * Confirmar exatamente o valor previsto é indistinguível de não ter
 * confirmado. Aceito: o número resultante é o mesmo, e a alternativa seria uma
 * coluna de "confirmado em" que existiria só para essa distinção.
 *
 * **Quem chama esta função.** Em produção, ninguém — a proteção acontece no
 * `WHERE` de um `UPDATE`, porque carregar todas as ocorrências para filtrá-las
 * em memória seria desperdício. Ela existe como **especificação executável**:
 * o repositório tem um teste de concordância que alimenta os mesmos casos nos
 * dois caminhos e exige o mesmo veredito. É esse teste que impede o SQL e esta
 * definição de divergirem em silêncio.
 */
export function ocorrenciaProtegida(ocorrencia: OcorrenciaMaterializada): boolean {
  if (ocorrencia.pagoEm !== null) {
    return true;
  }
  if (ocorrencia.valorPrevisto === null) {
    return false;
  }
  return ocorrencia.valor !== ocorrencia.valorPrevisto;
}
