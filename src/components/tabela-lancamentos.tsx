import type { LancamentoDoMes } from "@/application/mes/obter-visao-mensal/handler";
import type { Natureza, Origem } from "@/domain";
import { formatarBRL, formatarData } from "@/lib/formatar";

/**
 * Os lançamentos do mês, segmentados nos três blocos da planilha: Fixos,
 * Cartão de Crédito e Gastos do Mês (UI-01, AC 5). Os três aparecem sempre,
 * mesmo vazios, porque é assim que a aba do mês se parece e é o que permite
 * ler a ausência de um bloco como ausência, não como esquecimento.
 *
 * **Uma única árvore de DOM para as duas larguras.** A tabela vira cartões
 * empilhados por CSS (`block` abaixo de `md`, `table-*` a partir dele), em vez
 * de duas listas renderizadas em paralelo com uma escondida. Conteúdo
 * duplicado no DOM quebra leitor de tela e busca de página.
 *
 * Em 400 pixels nada força largura: sem `min-width`, sem coluna fixa, e
 * **sem `overflow-x: hidden`** — esconder a barra faria a medição do e2e
 * passar sem significar nada (UI-03, AC 9).
 */

interface Bloco {
  readonly id: string;
  readonly titulo: string;
  readonly origem: Origem;
}

/** A ordem é a da planilha, e o usuário lê de cima para baixo esperando-a. */
const BLOCOS: ReadonlyArray<Bloco> = [
  { id: "fixos", titulo: "Fixos", origem: "RECORRENCIA" },
  { id: "cartao", titulo: "Cartão de Crédito", origem: "PARCELA" },
  { id: "avulsos", titulo: "Gastos do Mês", origem: "AVULSO" },
];

const CELULA = "block md:table-cell md:px-3 md:py-2 md:align-top";
const CABECALHO = "md:px-3 md:py-2 text-left text-xs font-semibold uppercase tracking-wide";

export function TabelaLancamentos({
  lancamentos,
}: {
  readonly lancamentos: ReadonlyArray<LancamentoDoMes>;
}) {
  if (lancamentos.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
        Nenhum lançamento neste mês ainda. Cadastre uma compra parcelada abaixo: as parcelas dos
        meses seguintes aparecem sozinhas, sem você precisar criar nada.
      </p>
    );
  }

  const despesas = lancamentos.filter((item) => item.lancamento.natureza === "DESPESA");
  const outros = lancamentos.filter((item) => item.lancamento.natureza !== "DESPESA");

  return (
    <div className="flex flex-col gap-6">
      {BLOCOS.map((bloco) => (
        <BlocoDeLancamentos
          key={bloco.origem}
          id={bloco.id}
          titulo={bloco.titulo}
          itens={despesas.filter((item) => item.lancamento.origem === bloco.origem)}
        />
      ))}
      {outros.length === 0 ? null : (
        <BlocoDeLancamentos id="outros" titulo="Entradas e investimentos" itens={outros} />
      )}
    </div>
  );
}

function BlocoDeLancamentos({
  id,
  titulo,
  itens,
}: {
  /** Identificador sem espaço: `aria-labelledby` é uma lista de ids. */
  readonly id: string;
  readonly titulo: string;
  readonly itens: ReadonlyArray<LancamentoDoMes>;
}) {
  return (
    <section aria-labelledby={`bloco-${id}`} className="flex flex-col gap-2">
      <h3 id={`bloco-${id}`} className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {titulo}
      </h3>
      {itens.length === 0 ? (
        <p className="text-sm text-zinc-700 dark:text-zinc-300">Nenhum lançamento neste bloco.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{titulo}</caption>
          <thead className="hidden md:table-header-group">
            <tr className="border-b border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
              <th scope="col" className={CABECALHO}>
                Descrição
              </th>
              <th scope="col" className={CABECALHO}>
                Parcela
              </th>
              <th scope="col" className={CABECALHO}>
                Data
              </th>
              <th scope="col" className={CABECALHO}>
                Situação
              </th>
              <th scope="col" className={`${CABECALHO} md:text-right`}>
                Valor
              </th>
            </tr>
          </thead>
          <tbody className="block md:table-row-group">
            {itens.map(({ lancamento, parcela }) => (
              <tr
                key={lancamento.id}
                className="mb-2 block rounded-md border border-zinc-200 p-3 md:mb-0 md:table-row md:rounded-none md:border-0 md:border-b md:p-0 dark:border-zinc-800"
              >
                <td className={`${CELULA} font-medium text-zinc-900 dark:text-zinc-50`}>
                  {lancamento.descricao}
                </td>
                <td className={`${CELULA} text-zinc-700 dark:text-zinc-300`}>
                  {parcela === null ? (
                    <span className="md:sr-only">—</span>
                  ) : (
                    <>
                      {parcela.numero}/{parcela.total}{" "}
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {parcela.restantes === 0
                          ? "(última)"
                          : `(faltam ${parcela.restantes} depois desta)`}
                      </span>
                    </>
                  )}
                </td>
                <td className={`${CELULA} text-zinc-700 dark:text-zinc-300`}>
                  {formatarData(lancamento.dataEvento)}
                </td>
                <td className={`${CELULA} text-zinc-700 dark:text-zinc-300`}>
                  {lancamento.pagoEm === null ? "Previsto" : "Pago"}
                </td>
                <td
                  className={`${CELULA} font-medium text-zinc-900 md:text-right dark:text-zinc-50`}
                >
                  {formatarBRL(lancamento.valor)}
                  <span className="sr-only"> {rotuloDaNatureza(lancamento.natureza)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function rotuloDaNatureza(natureza: Natureza): string {
  if (natureza === "RECEITA") {
    return "de entrada";
  }
  return natureza === "INVESTIMENTO" ? "de investimento" : "de despesa";
}
