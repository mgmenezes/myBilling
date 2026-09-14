import type {
  MovimentoRepository,
  OcorrenciaParaMaterializar,
  RecorrenciaRepository,
} from "@/application/ports/repositories";
import {
  addMeses,
  type Competencia,
  diaEfetivo,
  janelaMaterializacao,
  versaoVigente,
} from "@/domain";

/**
 * Garante que as ocorrências das recorrências existam na janela visível.
 *
 * **Este caso de uso não decide nada por conta própria.** Quais competências
 * vêm de `janelaMaterializacao`, qual valor vem de `versaoVigente`, e qual dia
 * vem de `diaEfetivo`. Ele pergunta às três e grava o que elas responderem. Foi
 * de propósito: cada regra que ele reimplementasse aqui viraria uma segunda
 * definição, e a primeira divergência apareceria como valor errado no mês.
 *
 * **Roda durante a leitura de uma página**, o que é um GET que escreve — a
 * decisão está registrada na spec, com a razão. A alternativa, materializar só
 * na criação, deixaria buraco em todo mês fora da janela daquele momento. A
 * segurança vem da restrição única `(recorrência, competência)` no banco, e não
 * de consultar antes de inserir: consultar-e-inserir perderia a corrida entre
 * dois carregamentos simultâneos.
 *
 * Devolve quantas ocorrências foram criadas de fato — zero na esmagadora
 * maioria das aberturas de mês, que é o comportamento esperado.
 */

export interface DependenciasMaterializar {
  readonly recorrencias: RecorrenciaRepository;
  readonly movimentos: MovimentoRepository;
}

export async function materializarRecorrencias(
  deps: DependenciasMaterializar,
  competencia: Competencia,
  meses: number,
): Promise<number> {
  const ate = addMeses(competencia, meses);
  const todas = await deps.recorrencias.listarComVersoes();

  const aCriar: OcorrenciaParaMaterializar[] = [];
  for (const { recorrencia, versoes } of todas) {
    const competencias = janelaMaterializacao(
      { inicio: recorrencia.competenciaInicio, fim: recorrencia.competenciaFim },
      competencia,
      ate,
    );

    for (const comp of competencias) {
      const vigente = versaoVigente(versoes, comp);
      if (vigente === null) {
        // Competência dentro do período mas anterior a toda vigência. Não é
        // erro: é uma recorrência cujo histórico de valor começa depois.
        continue;
      }
      aCriar.push({
        recorrenciaId: recorrencia.id,
        natureza: recorrencia.natureza,
        descricao: recorrencia.descricao,
        competencia: comp,
        dataEvento: dataDeVencimento(comp, recorrencia.diaVencimento),
        valorPrevisto: vigente.valorPrevisto,
        categoriaId: recorrencia.categoriaId,
        usuarioId: recorrencia.usuarioId,
        meioPagamentoId: recorrencia.meioPagamentoId,
      });
    }
  }

  /*
   * Um lote só para todas as recorrências da janela. Uma ida ao banco por
   * ocorrência multiplicaria por vinte o custo de abrir um mês (AD-008).
   */
  return deps.movimentos.materializarOcorrencias(aCriar);
}

/**
 * O dia de vencimento aplicado à competência, reduzido ao último dia do mês
 * quando ele não existe (FIXO-01, AC 5). Vencimento dia 31 em fevereiro é 28 —
 * e `diaEfetivo` já resolvia isso para o ciclo de fatura.
 */
function dataDeVencimento(competencia: Competencia, diaVencimento: number): string {
  const ano = Number.parseInt(competencia.slice(0, 4), 10);
  const mes = Number.parseInt(competencia.slice(5, 7), 10);
  const dia = diaEfetivo(diaVencimento, ano, mes);
  return `${competencia}-${String(dia).padStart(2, "0")}`;
}
