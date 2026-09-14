import { z } from "zod";
import { criarCents, criarCompetencia, MAX_PARCELAS } from "@/domain";

/**
 * Schema de entrada da compra parcelada, **compartilhado entre cliente e
 * servidor** (AUTH-02, AC 4). O formulário valida com ele antes de enviar e a
 * Server Action revalida com ele depois de receber — mesmo arquivo, mesmas
 * regras, nenhuma chance de divergirem.
 *
 * Por isso este arquivo só importa `zod` e `@/domain`: nada de infraestrutura,
 * nada de `next/*`, nada de módulo do Node. Um import de servidor aqui
 * quebraria o bundle do cliente, e o teste ao lado falha antes disso.
 *
 * O que ele valida é **formato**: tipo, faixa e forma. A regra financeira
 * continua sendo do domínio — `parcelaInicial <= qtdParcelas`, rateio e
 * conservação são decididos por `gerarParcelas`, não redigitados aqui.
 */

/** `'2026-03'`. O formato válido é o do domínio, não uma regex redigitada. */
const competencia = z
  .string()
  .refine((texto) => criarCompetencia(texto).ok, "Informe a competência no formato AAAA-MM.");

/** Inteiro em centavos, no mínimo 1 (AD-001, PARC-05 AC 7). */
const centavos = z
  .number("Informe o valor.")
  .refine((valor) => criarCents(valor).ok, "O valor precisa ser maior que zero.");

const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data no formato AAAA-MM-DD.");

export const entradaCompraSchema = z.object({
  /** Gerada ao **abrir** o formulário, não ao submeter (PARC-05, AC 9). */
  idempotencyKey: z.uuid("Chave de idempotência ausente ou inválida."),
  descricao: z.string().trim().min(1, "Descreva a compra.").max(120, "Descrição longa demais."),
  modo: z.enum(["TOTAL", "VALOR_PARCELA"], "Escolha entre valor total e valor da parcela."),
  /** No modo `VALOR_PARCELA` é o valor de **uma** parcela (PARC-04, AC 4). */
  valorCentavos: centavos,
  qtdParcelas: z
    .int("Informe a quantidade de parcelas.")
    .min(1, "A compra precisa ter ao menos 1 parcela.")
    .max(MAX_PARCELAS, `A compra pode ter no máximo ${MAX_PARCELAS} parcelas.`),
  /** 1 por padrão; 8 no caso `8/10` (AD-005). */
  parcelaInicial: z.int("Informe a parcela inicial.").min(1, "A parcela inicial começa em 1."),
  /** Competência da **parcela inicial**, que é o mês que o usuário está vendo. */
  competenciaInicial: competencia,
  politicaResiduo: z.enum(["PRIMEIRAS", "ULTIMAS"], "Escolha a política de resíduo."),
  categoriaId: z.uuid("Categoria inválida.").nullable(),
  usuarioId: z.uuid("Escolha de quem é a compra."),
  meioPagamentoId: z.uuid("Escolha o meio de pagamento."),
  dataEvento: dataISO,
});

export type EntradaCompraValidada = z.infer<typeof entradaCompraSchema>;
