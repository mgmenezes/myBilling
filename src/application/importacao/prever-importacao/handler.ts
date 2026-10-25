import type {
  ImportacaoRepository,
  RepositoriosDaImportacao,
} from "@/application/ports/repositories";
import {
  type AbaLida,
  addMeses,
  type Competencia,
  type DecisoesDaImportacao,
  err,
  lerAba,
  lerCsv,
  ok,
  type PlanoDeImportacao,
  planejarImportacao,
  type Result,
} from "@/domain";
import { carregarEstadoParaImportacao } from "../carregar-estado";

/**
 * A prévia de uma aba (design, Decisão 2): o mesmo plano que a gravação vai
 * executar, calculado no servidor, **sem escrever nada**.
 *
 * A ordem é a do fluxo do design: primeiro a guarda de ordem e de banco vazio
 * (IMP-02 AC 4 a 6), depois a leitura do arquivo, o estado do banco e o plano.
 * As decisões do passo 2 se somam às lembradas, e a do passo 2 prevalece: as
 * lembradas não voltam a ser perguntadas (IMP-04 AC 5).
 *
 * A gravação chama esta mesma função dentro da transação, depois da trava.
 * É o que faz a prévia e a gravação não terem como divergir.
 */

export type CodigoErroImportacao =
  | "PLANILHA_ARQUIVO_INVALIDO"
  | "PLANILHA_BLOCO_AUSENTE"
  | "IMPORTACAO_FORA_DE_ORDEM"
  | "IMPORTACAO_BANCO_NAO_VAZIO"
  | "IMPORTACAO_PENDENCIA_ABERTA"
  | "IMPORTACAO_DIVERGENCIA_NAO_CONFIRMADA";

export interface ErroImportacao {
  readonly code: CodigoErroImportacao;
  readonly detalhes?: Record<string, unknown>;
}

export interface EntradaDaImportacao {
  readonly nomeArquivo: string;
  readonly conteudo: string;
  readonly competencia: Competencia;
  /** As do passo 2. As lembradas vêm do banco. */
  readonly decisoes: DecisoesDaImportacao;
}

export interface PreviaDaImportacao {
  readonly plano: PlanoDeImportacao;
  /** A seguinte à última importada; `null` antes da primeira importação. */
  readonly competenciaEsperada: Competencia | null;
}

export async function preverImportacao(
  repos: RepositoriosDaImportacao,
  entrada: EntradaDaImportacao,
): Promise<Result<PreviaDaImportacao, ErroImportacao>> {
  const ordem = await verificarOrdem(repos.importacoes, entrada.competencia);
  if (!ordem.ok) {
    return ordem;
  }

  const aba = lerPlanilha(entrada.conteudo);
  if (!aba.ok) {
    return aba;
  }

  const estado = await carregarEstadoParaImportacao(repos, entrada.competencia);
  const lembradas = await repos.importacoes.decisoesLembradas();
  const plano = planejarImportacao({
    aba: aba.value,
    estado,
    decisoes: {
      meios: new Map([...lembradas.meios, ...entrada.decisoes.meios]),
      entradas: new Map([...lembradas.entradas, ...entrada.decisoes.entradas]),
    },
  });

  return ok({ plano, competenciaEsperada: ordem.value });
}

/**
 * A primeira importação aceita qualquer mês, desde que o banco não tenha
 * lançamento, compra nem recorrência (IMP-02 AC 6); as seguintes, só o mês
 * seguinte ao último importado (AC 5). Devolve a competência esperada.
 */
async function verificarOrdem(
  importacoes: ImportacaoRepository,
  competencia: Competencia,
): Promise<Result<Competencia | null, ErroImportacao>> {
  const ultima = await importacoes.ultimaCompetenciaImportada();
  if (ultima === null) {
    if (await importacoes.haLancamentoCompraOuRecorrencia()) {
      return err({ code: "IMPORTACAO_BANCO_NAO_VAZIO" });
    }
    return ok(null);
  }
  const esperada = addMeses(ultima, 1);
  if (competencia !== esperada) {
    return err({ code: "IMPORTACAO_FORA_DE_ORDEM", detalhes: { esperada } });
  }
  return ok(esperada);
}

/**
 * `lerCsv` e `lerAba` só recusam com os dois códigos da planilha. A tradução
 * existe porque o tipo de erro do domínio é a união inteira de `CodigoErro`.
 */
function lerPlanilha(conteudo: string): Result<AbaLida, ErroImportacao> {
  const grade = lerCsv(conteudo);
  const aba = grade.ok ? lerAba(grade.value) : grade;
  if (aba.ok) {
    return aba;
  }
  if (aba.error.code === "PLANILHA_BLOCO_AUSENTE") {
    return err({ code: "PLANILHA_BLOCO_AUSENTE", detalhes: aba.error.detalhes });
  }
  return err({ code: "PLANILHA_ARQUIVO_INVALIDO" });
}
