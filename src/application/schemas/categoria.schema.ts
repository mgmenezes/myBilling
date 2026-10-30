import { z } from "zod";
import { CORES_DE_CATEGORIA } from "@/domain";
import { criarNomeSchema } from "./nome";

/**
 * Schema de entrada da criação de categoria, **compartilhado entre cliente e
 * servidor** (AUTH-02, AC 4). O formulário valida com ele antes de enviar e a
 * Server Action revalida com ele depois de receber — mesmo arquivo, mesmas
 * regras, nenhuma chance de divergirem.
 *
 * Por isso este arquivo só importa `zod` e o domínio, que é puro: nada de
 * infraestrutura, nada de `next/*`, nada de módulo do Node.
 */

/** 60 caracteres cabem em qualquer rótulo da interface sem quebrar layout. */
export const MAX_NOME_CATEGORIA = 60;

export const nomeCategoriaSchema = criarNomeSchema(
  MAX_NOME_CATEGORIA,
  "Informe o nome da categoria.",
);

export const entradaCategoriaSchema = z.object({
  nome: nomeCategoriaSchema,
});

export type EntradaCategoriaValidada = z.infer<typeof entradaCategoriaSchema>;

/**
 * A troca de cor na tela de Categorias (COR-04, ACs 4 e 5). A cor é uma das
 * dez da paleta, pelo nome, ou `null`, que apaga a escolha e devolve a
 * categoria à automática. **Ausente é payload inválido**: um seletor que
 * esquecesse o campo não pode apagar a cor de ninguém.
 *
 * Estrito, como os dois abaixo: um campo a mais que o servidor ignorasse
 * calado daria a impressão de ter mudado outra coisa.
 */
export const entradaCorDaCategoriaSchema = z.strictObject({
  categoriaId: z.uuid("Categoria inválida."),
  cor: z.enum(CORES_DE_CATEGORIA, "Escolha uma das cores da paleta.").nullable(),
});

export type EntradaCorDaCategoriaValidada = z.infer<typeof entradaCorDaCategoriaSchema>;

/** Renomear (COR-04, AC 6): o nome passa pela mesma normalização do cadastro. */
export const entradaRenomearCategoriaSchema = z.strictObject({
  categoriaId: z.uuid("Categoria inválida."),
  nome: nomeCategoriaSchema,
});

export type EntradaRenomearCategoriaValidada = z.infer<typeof entradaRenomearCategoriaSchema>;
