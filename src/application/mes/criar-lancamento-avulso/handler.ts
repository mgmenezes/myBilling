import type { CadastroRepository, MovimentoRepository } from "@/application/ports/repositories";
import type { EntradaLancamentoAvulsoValidada } from "@/application/schemas/lancamento-avulso.schema";
import { criarCents, criarCompetencia, err, type Lancamento, ok, type Result } from "@/domain";

/**
 * Registrar uma despesa avulsa ou uma receita à vista.
 *
 * O caso de uso faz três coisas que o repositório não faz.
 *
 * 1. **Recusa meio de pagamento inexistente ou arquivado.** O formulário só
 *    lista os disponíveis, mas entre abrir a tela e enviar alguém pode arquivar
 *    um cartão — e sem esta checagem o lançamento entraria num meio que não
 *    aparece em lista nenhuma.
 * 2. **Reconstrói os tipos do domínio** a partir do payload já validado pelo
 *    Zod. O schema garante formato; `criarCents` e `criarCompetencia` produzem
 *    os tipos branded, e o `Result` deles é conferido em vez de descartado com
 *    um cast.
 * 3. **Traduz `jaPago` em `pagoEm`.** São coisas diferentes: a pessoa marca uma
 *    caixa, e o razão guarda a data em que o dinheiro se moveu. A data é a do
 *    próprio evento — pedir uma segunda data para o mesmo instante seria campo
 *    que só existe para ser repetido (AVUL-02, AC 4).
 */

export type CodigoErroAvulso =
  | "MEIO_PAGAMENTO_NAO_ENCONTRADO"
  | "MEIO_PAGAMENTO_ARQUIVADO"
  | "VALOR_NAO_POSITIVO"
  | "COMPETENCIA_INVALIDA";

export interface DependenciasCriarAvulso {
  readonly movimentos: MovimentoRepository;
  readonly cadastros: CadastroRepository;
}

/**
 * O padrão da caixa "já saiu da conta", decidido pelo meio de pagamento.
 *
 * Dinheiro em conta corrente se move no ato do gesto; compra no cartão só sai
 * na fatura. Exportado porque o formulário precisa do **mesmo** critério para
 * propor a marca antes do envio — duas implementações divergiriam, e a tela
 * proporia uma coisa enquanto o servidor assumiria outra.
 */
export function jaPagoPorPadrao(meioGeraFatura: boolean): boolean {
  return !meioGeraFatura;
}

export async function criarLancamentoAvulso(
  deps: DependenciasCriarAvulso,
  entrada: EntradaLancamentoAvulsoValidada,
): Promise<Result<Lancamento, { readonly code: CodigoErroAvulso }>> {
  const meio = await deps.cadastros.buscarMeioDePagamento(entrada.meioPagamentoId);
  if (meio === null) {
    return err({ code: "MEIO_PAGAMENTO_NAO_ENCONTRADO" });
  }
  if (meio.arquivadoEm !== null) {
    return err({ code: "MEIO_PAGAMENTO_ARQUIVADO" });
  }

  const valor = criarCents(entrada.valorCentavos);
  if (!valor.ok) {
    return err({ code: "VALOR_NAO_POSITIVO" });
  }

  const competencia = criarCompetencia(entrada.competencia);
  if (!competencia.ok) {
    return err({ code: "COMPETENCIA_INVALIDA" });
  }

  const gravado = await deps.movimentos.criarAvulso({
    natureza: entrada.natureza,
    descricao: entrada.descricao,
    competencia: competencia.value,
    dataEvento: entrada.dataEvento,
    valor: valor.value,
    pagoEm: entrada.jaPago ? entrada.dataEvento : null,
    categoriaId: entrada.categoriaId,
    usuarioId: entrada.usuarioId,
    meioPagamentoId: entrada.meioPagamentoId,
  });
  return ok(gravado);
}
