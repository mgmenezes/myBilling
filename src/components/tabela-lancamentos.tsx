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
 * **sem `overflow-x: hidden`**, porque esconder a barra faria a medição do e2e
 * passar sem significar nada (UI-03, AC 9).
 *
 * Pago e previsto se distinguem por preenchimento do selo, não por cor. Quem
 * não separa verde de vermelho continua lendo a diferença.
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

const CELULA = "block md:table-cell md:px-4 md:py-3.5 md:align-top";
const CABECALHO = "md:px-4 md:pb-2 text-left text-[13px] font-medium text-ink-muted";

export function TabelaLancamentos({
  lancamentos,
}: {
  readonly lancamentos: ReadonlyArray<LancamentoDoMes>;
}) {
  if (lancamentos.length === 0) {
    return (
      <p className="rounded-panel border border-dashed border-line px-6 py-12 text-center text-[15px] text-ink-muted">
        Nenhum lançamento neste mês ainda. Cadastre uma compra parcelada abaixo: as parcelas dos
        meses seguintes aparecem sozinhas, sem você precisar criar nada.
      </p>
    );
  }

  const despesas = lancamentos.filter((item) => item.lancamento.natureza === "DESPESA");
  const outros = lancamentos.filter((item) => item.lancamento.natureza !== "DESPESA");

  return (
    <div className="flex flex-col gap-7">
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
    <section aria-labelledby={`bloco-${id}`} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-3">
        <h3 id={`bloco-${id}`} className="text-[17px] font-medium tracking-[-0.01em]">
          {titulo}
        </h3>
        {itens.length === 0 ? null : (
          <span className="tabular text-[14px] text-ink-muted">
            {itens.length === 1 ? "1 lançamento" : `${itens.length} lançamentos`}
          </span>
        )}
      </div>

      {itens.length === 0 ? (
        <p className="text-[15px] text-ink-muted">Nenhum lançamento neste bloco.</p>
      ) : (
        <table className="w-full border-collapse text-[15px]">
          <caption className="sr-only">{titulo}</caption>
          <thead className="hidden md:table-header-group">
            <tr>
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
                /*
                 * Uma régua só, entre as linhas, nunca acima e abaixo de cada
                 * uma. Régua dupla em toda linha é o que faz uma tabela
                 * parecer exportação de planilha.
                 */
                className="mb-3 block rounded-card bg-surface p-4 shadow-lift md:mb-0 md:table-row md:rounded-none md:bg-transparent md:p-0 md:shadow-none md:[&:not(:last-child)>td]:border-b md:[&:not(:last-child)>td]:border-line"
              >
                <td className={`${CELULA} font-medium`}>{lancamento.descricao}</td>
                <td className={`${CELULA} tabular text-ink-muted`}>
                  {parcela === null ? (
                    <span className="sr-only">sem parcelamento</span>
                  ) : (
                    <>
                      {parcela.numero}/{parcela.total}{" "}
                      <span className="text-ink-muted">
                        {parcela.restantes === 0
                          ? "(última)"
                          : `(faltam ${parcela.restantes} depois desta)`}
                      </span>
                    </>
                  )}
                </td>
                <td className={`${CELULA} tabular text-ink-muted`}>
                  {formatarData(lancamento.dataEvento)}
                </td>
                <td className={CELULA}>
                  <span
                    className={`inline-flex w-fit items-center rounded-chip px-2.5 py-0.5 text-[13px] font-medium ${
                      lancamento.pagoEm === null
                        ? "border border-line text-ink-muted"
                        : "bg-ink text-canvas"
                    }`}
                  >
                    {lancamento.pagoEm === null ? "Previsto" : "Pago"}
                  </span>
                </td>
                <td className={`${CELULA} tabular font-medium md:text-right`}>
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
