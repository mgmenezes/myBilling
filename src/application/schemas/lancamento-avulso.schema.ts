import { z } from "zod";
import { criarCents, criarCompetencia } from "@/domain";

/**
 * Schema de entrada do lançamento avulso, **compartilhado entre cliente e
 * servidor** (AUTH-02, AC 4). O formulário valida com ele antes de enviar e a
 * Server Action revalida com ele depois de receber.
 *
 * Por isso este arquivo só importa `zod` e `@/domain`: nada de infraestrutura,
 * nada de `next/*`, nada de módulo do Node. O teste ao lado falha se um import
 * de servidor entrar aqui.
 *
 * **Não há chave de idempotência**, ao contrário de `compra.schema.ts`. Dois
 * Pix de R$ 50 no mesmo dia são dois Pix, e deduplicar impediria o caso
 * legítimo para prevenir um clique duplo que o estado do botão já evita.
 */

/** `'2026-03'`. O formato válido é o do domínio, não uma regex redigitada. */
const competencia = z
  .string()
  .refine((texto) => criarCompetencia(texto).ok, "Informe a competência no formato AAAA-MM.");

/**
 * Inteiro em centavos, no mínimo 1 (AD-001). `z.int()` já recusa o que passa do
 * inteiro seguro, e isso importa: a coluna é `bigint`, e um número acima de
 * 2^53 chegaria ao banco com precisão perdida — gravaria um valor que a pessoa
 * não digitou, em vez de recusar.
 */
const centavos = z
  .int("Informe o valor.")
  .refine((valor) => criarCents(valor).ok, "O valor precisa ser maior que zero.");

const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data no formato AAAA-MM-DD.");

export const entradaLancamentoAvulsoSchema = z.object({
  descricao: z.string().trim().min(1, "Descreva o lançamento.").max(120, "Descrição longa demais."),
  /**
   * Despesa e receita, e não investimento. Espelha `recorrencia.schema.ts`:
   * nenhum formulário do app oferece investimento, e abrir só aqui criaria um
   * dado que nenhuma outra tela sabe administrar.
   */
  natureza: z.enum(["DESPESA", "RECEITA"], "Escolha entre despesa e receita."),
  valorCentavos: centavos,
  competencia,
  dataEvento: dataISO,
  categoriaId: z.uuid("Categoria inválida.").nullable(),
  usuarioId: z.uuid("Escolha de quem é o lançamento."),
  meioPagamentoId: z.uuid("Escolha o meio de pagamento."),
  /**
   * Se o dinheiro já se moveu. O formulário propõe um padrão a partir do meio
   * escolhido — marcado quando ele não gera fatura —, e a pessoa pode trocar.
   * Quem transforma isto em `pagoEm` é o caso de uso, usando `dataEvento`.
   */
  jaPago: z.boolean(),
});

export type EntradaLancamentoAvulsoValidada = z.infer<typeof entradaLancamentoAvulsoSchema>;
