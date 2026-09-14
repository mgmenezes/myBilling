import type { Usuario } from "@/application/ports/repositories";
import {
  type Cartao,
  type Categoria,
  type Cents,
  type Competencia,
  criarCents,
  criarCompetencia,
  type Lancamento,
  type MeioPagamento,
  ZERO_CENTS,
} from "@/domain";
import type { categoria, meioPagamento, movimento } from "../schema";

/**
 * Mapeamento linha do banco → tipo de domínio. **É aqui que a fronteira é
 * mantida** (AD-006): nenhum tipo do Drizzle sai deste módulo. Os tipos
 * `Linha*` abaixo são internos à infraestrutura e não aparecem em nenhuma
 * assinatura de port.
 *
 * Dinheiro sobe como inteiro em centavos, sem nunca passar por divisão
 * (AD-001). Competência sobe como `'YYYY-MM'`, a partir do `date` fixado no
 * dia 1 (AD-002).
 */

export type LinhaMovimento = typeof movimento.$inferSelect;
export type LinhaCategoria = typeof categoria.$inferSelect;
export type LinhaMeioPagamento = typeof meioPagamento.$inferSelect;

/** Linha que não satisfaz o contrato do domínio é corrupção, não caso de uso. */
export class DadoInvalidoNoBanco extends Error {
  constructor(campo: string, valor: unknown, motivo: string) {
    super(`coluna ${campo} com valor inválido (${motivo}): ${String(valor)}`);
    this.name = "DadoInvalidoNoBanco";
  }
}

export function paraCents(valor: number, campo: string): Cents {
  const resultado = criarCents(valor);
  if (!resultado.ok) {
    throw new DadoInvalidoNoBanco(campo, valor, resultado.error.code);
  }
  return resultado.value;
}

/**
 * Como `paraCents`, mas aceita zero. `criarCents` recusa zero de propósito
 * (valor de compra zero é erro); já `valor_amortizado_anterior_centavos` é
 * zero em toda compra que começa na parcela 1, e isso é o caso normal.
 */
export function paraCentsOuZero(valor: number, campo: string): Cents {
  if (valor === 0) {
    return ZERO_CENTS;
  }
  return paraCents(valor, campo);
}

/** `'2026-03-01'` → `'2026-03'`. O `CHECK` do banco garante o dia 1. */
export function paraCompetencia(data: string, campo: string): Competencia {
  const resultado = criarCompetencia(data.slice(0, 7));
  if (!resultado.ok) {
    throw new DadoInvalidoNoBanco(campo, data, resultado.error.code);
  }
  return resultado.value;
}

/** `'2026-03'` → `'2026-03-01'`, a forma que o `CHECK` do banco aceita. */
export function deCompetencia(competencia: Competencia): string {
  return `${competencia}-01`;
}

function paraInstante(valor: Date | null): string | null {
  return valor === null ? null : valor.toISOString();
}

export function paraLancamento(linha: LinhaMovimento): Lancamento {
  return {
    id: linha.id,
    natureza: linha.natureza,
    origem: linha.origem,
    descricao: linha.descricao,
    competencia: paraCompetencia(linha.competencia, "movimento.competencia"),
    dataEvento: linha.dataEvento,
    valor: paraCents(linha.valorCentavos, "movimento.valor_centavos"),
    valorPrevisto:
      linha.valorPrevistoCentavos === null
        ? null
        : paraCents(linha.valorPrevistoCentavos, "movimento.valor_previsto_centavos"),
    pagoEm: linha.pagoEm,
    categoriaId: linha.categoriaId,
    usuarioId: linha.usuarioId,
    meioPagamentoId: linha.meioPagamentoId,
    compraId: linha.compraId,
    numeroParcela: linha.numeroParcela,
    canceladoEm: paraInstante(linha.canceladoEm),
  };
}

export function paraCategoria(linha: LinhaCategoria): Categoria {
  return {
    id: linha.id,
    nome: linha.nome,
    arquivadaEm: paraInstante(linha.arquivadaEm),
  };
}

/**
 * O `CHECK` `meio_pagamento_cartao_tem_ciclo` garante que um cartão sempre
 * tem fechamento e vencimento — é o que permite devolver a união do domínio
 * sem validação em runtime redundante. Se o banco mentir, é corrupção.
 */
export function paraMeioPagamento(linha: LinhaMeioPagamento): MeioPagamento {
  const arquivadoEm = paraInstante(linha.arquivadoEm);
  if (linha.tipo === "CARTAO_CREDITO") {
    if (linha.diaFechamento === null || linha.diaVencimento === null) {
      throw new DadoInvalidoNoBanco("meio_pagamento.dia_fechamento", linha.id, "cartão sem ciclo");
    }
    const cartao: Cartao = {
      id: linha.id,
      nome: linha.nome,
      tipo: "CARTAO_CREDITO",
      arquivadoEm,
      diaFechamento: linha.diaFechamento,
      diaVencimento: linha.diaVencimento,
      fechamentoVaiParaFaturaSeguinte: linha.fechamentoVaiParaFaturaSeguinte,
    };
    return cartao;
  }
  return { id: linha.id, nome: linha.nome, tipo: linha.tipo, arquivadoEm };
}

export function paraUsuario(linha: { id: string; nome: string; email: string }): Usuario {
  return { id: linha.id, nome: linha.nome, email: linha.email };
}
