import { type Competencia, compararCompetencias } from "../shared/competencia";
import type { Cents } from "../shared/money";

/**
 * Uma versão de valor de uma recorrência, vigente a partir de uma competência.
 *
 * O versionamento existe porque a conta de luz muda de valor, e porque o que
 * foi planejado em março continua sendo informação depois que o valor mudou em
 * outubro. Sem ele, corrigir o valor reescreveria o histórico.
 */
export interface VersaoRecorrencia {
  readonly vigenteDesde: Competencia;
  readonly valorPrevisto: Cents;
}

/**
 * A versão que vale para uma competência: a de **maior vigência que não seja
 * posterior** a ela (FIXO-03, AC 2).
 *
 * `null` quando nenhuma vigência alcança a competência — é o que impede uma
 * recorrência de existir antes de começar, e é um resultado legítimo, não um
 * erro.
 *
 * A comparação inclui a igualdade de propósito: o mês da própria vigência já
 * recebe a versão nova. Um `>` no lugar de `>=` aqui deixaria o mês da virada
 * com o valor antigo, e o defeito só apareceria quando alguém conferisse a
 * fatura daquele mês contra a tela.
 *
 * Não assume ordem na entrada: quem chama lê de um banco, e depender da
 * cláusula de ordenação de uma consulta remota seria um acoplamento invisível.
 */
export function versaoVigente(
  versoes: readonly VersaoRecorrencia[],
  competencia: Competencia,
): VersaoRecorrencia | null {
  let escolhida: VersaoRecorrencia | null = null;

  for (const versao of versoes) {
    if (compararCompetencias(versao.vigenteDesde, competencia) > 0) {
      continue;
    }
    if (
      escolhida === null ||
      compararCompetencias(versao.vigenteDesde, escolhida.vigenteDesde) > 0
    ) {
      escolhida = versao;
    }
  }

  return escolhida;
}
