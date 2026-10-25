import { z } from "zod";
import { criarCompetencia } from "@/domain";

/**
 * Payload da prévia e da gravação da planilha (design, "Schema").
 *
 * O navegador nunca envia o plano: envia o texto do arquivo, a competência
 * confirmada e as decisões do passo 2. O servidor revalida este formato e lê o
 * conteúdo de novo com as funções do domínio (IMP-06 AC 6). Por isso este
 * arquivo só importa `zod` e `@/domain`, como `compra.schema.ts`: o passo 1
 * pode reaproveitá-lo no cliente sem arrastar nada de servidor.
 *
 * As decisões chegam como registros simples, que é o que atravessa a rede. A
 * action as converte em `Map` antes de chamar o caso de uso.
 */

/** 1 MB, em caracteres. Uma aba real tem cerca de 15 KB; o limite só barra arquivo errado. */
export const MAX_CONTEUDO_PLANILHA = 1_048_576;

const MENSAGEM_ARQUIVO = "Escolha a aba exportada em .csv.";

const competencia = z
  .string("Escolha o mês e o ano.")
  .refine((texto) => criarCompetencia(texto).ok, "Escolha o mês e o ano.");

const decisaoDeEntrada = z.object({
  classe: z.enum(["FIXA", "AVULSA"], "Escolha entre fixa e avulsa."),
  contaId: z.uuid("Escolha a conta em que o dinheiro cai."),
});

export const entradaPreviaImportacaoSchema = z.object({
  nomeArquivo: z
    .string(MENSAGEM_ARQUIVO)
    .min(1, MENSAGEM_ARQUIVO)
    .max(255, MENSAGEM_ARQUIVO)
    .regex(/\.csv$/i, MENSAGEM_ARQUIVO),
  conteudo: z
    .string(MENSAGEM_ARQUIVO)
    .min(1, MENSAGEM_ARQUIVO)
    .max(MAX_CONTEUDO_PLANILHA, "O arquivo passa de 1 MB."),
  competencia,
  decisoes: z.object({
    /** "Tipo" normalizado → meio de pagamento. */
    meios: z.record(z.string(), z.uuid("Escolha o meio de pagamento.")),
    /** Nome normalizado da entrada → classe e conta. */
    entradas: z.record(z.string(), decisaoDeEntrada),
  }),
});

export const entradaGravacaoImportacaoSchema = entradaPreviaImportacaoSchema.extend({
  confirmouDivergencia: z.boolean("Confirme se entendeu a diferença."),
});

export type EntradaPreviaImportacaoValidada = z.infer<typeof entradaPreviaImportacaoSchema>;
export type EntradaGravacaoImportacaoValidada = z.infer<typeof entradaGravacaoImportacaoSchema>;
