import type { Cents, Natureza } from "@/domain";
import { formatarBRL } from "@/lib/formatar";

/**
 * A semântica de valor do sistema, em cor de texto e nunca em preenchimento.
 * Investimento fica neutro de propósito: ele não é nem entrada nem saída da
 * casa, é dinheiro que mudou de lugar, e pintá-lo de verde ou de vermelho
 * afirmaria uma coisa que o app não sabe.
 *
 * Mora aqui, e não na tabela, porque a lista de Lançamentos e os últimos
 * lançamentos da Visão geral mostram o valor do mesmo jeito (TRES-05, AC 3).
 */
export function corDaNatureza(natureza: Natureza): string {
  if (natureza === "RECEITA") {
    return "text-positivo";
  }
  return natureza === "INVESTIMENTO" ? "text-ink" : "text-negativo";
}

function rotuloDaNatureza(natureza: Natureza): string {
  if (natureza === "RECEITA") {
    return "de entrada";
  }
  return natureza === "INVESTIMENTO" ? "de investimento" : "de despesa";
}

/**
 * O valor com o sinal e o rótulo só para leitor de tela. O sinal repete em
 * forma o que a cor diz, para a linha não depender de matiz; o rótulo
 * completo vai só para leitor de tela, porque na coluna ele seria ruído. A cor
 * fica com quem envolve, por `corDaNatureza`.
 */
export function ValorDaNatureza({
  natureza,
  valor,
}: {
  readonly natureza: Natureza;
  readonly valor: Cents;
}) {
  return (
    <>
      {natureza === "INVESTIMENTO" ? null : (
        <span aria-hidden="true">{natureza === "RECEITA" ? "+" : "−"}</span>
      )}
      {formatarBRL(valor)}
      <span className="sr-only"> {rotuloDaNatureza(natureza)}</span>
    </>
  );
}
