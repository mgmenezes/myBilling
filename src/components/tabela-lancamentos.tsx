import type { alternarPagamento as alternarPagamentoAction } from "@/app/actions/pagamentos";
import type { LancamentoDoMes } from "@/application/mes/obter-visao-mensal/handler";
import type { Natureza, Origem } from "@/domain";
import { formatarBRL, formatarData } from "@/lib/formatar";
import { BotaoPago } from "./botao-pago";
import { Chip } from "./ui";

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
 * não separa verde de vermelho continua lendo a diferença. **O selo é também o
 * botão** que alterna o pagamento — é o único ponto cliente desta árvore, e
 * está isolado em `BotaoPago` para a tabela continuar no servidor.
 *
 * **A coluna "Parcela" só existe no bloco de compra parcelada.** Fora dele ela
 * era uma coluna permanentemente vazia, e coluna vazia não é neutra: ela
 * empurra descrição e valor para as pontas opostas da tela e obriga o olho a
 * atravessar um vão sem informação. No lugar dela entra a categoria, que é o
 * dado que faltava para saber o que foi cada gasto sem abrir nada.
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
  categorias,
  alternarPagamento,
}: {
  readonly lancamentos: ReadonlyArray<LancamentoDoMes>;
  /** Id para nome. O lançamento só carrega o id; o nome vive no cadastro. */
  readonly categorias: ReadonlyMap<string, string>;
  /** A action chega por prop: a tabela não conhece infraestrutura nenhuma. */
  readonly alternarPagamento: typeof alternarPagamentoAction;
}) {
  if (lancamentos.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-[15px] text-ink-muted">
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
          categorias={categorias}
          alternarPagamento={alternarPagamento}
          /* Só a compra parcelada tem parcela; nos outros a coluna seria um vão. */
          comParcela={bloco.origem === "PARCELA"}
          itens={despesas.filter((item) => item.lancamento.origem === bloco.origem)}
        />
      ))}
      {outros.length === 0 ? null : (
        <BlocoDeLancamentos
          id="outros"
          titulo="Entradas e investimentos"
          categorias={categorias}
          alternarPagamento={alternarPagamento}
          comParcela={false}
          itens={outros}
        />
      )}
    </div>
  );
}

function BlocoDeLancamentos({
  id,
  titulo,
  itens,
  categorias,
  comParcela,
  alternarPagamento,
}: {
  /** Identificador sem espaço: `aria-labelledby` é uma lista de ids. */
  readonly id: string;
  readonly titulo: string;
  readonly itens: ReadonlyArray<LancamentoDoMes>;
  readonly categorias: ReadonlyMap<string, string>;
  readonly comParcela: boolean;
  readonly alternarPagamento: typeof alternarPagamentoAction;
}) {
  return (
    <section aria-labelledby={`bloco-${id}`} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-3">
        <h3 id={`bloco-${id}`} className="text-[17px] font-medium tracking-[-0.01em]">
          {titulo}
        </h3>
        {itens.length === 0 ? null : (
          <span className="text-[14px] text-ink-muted">
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
                Categoria
              </th>
              {comParcela ? (
                <th scope="col" className={CABECALHO}>
                  Parcela
                </th>
              ) : null}
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
                className="mb-3 block rounded-xl border border-line bg-surface p-4 md:mb-0 md:table-row md:rounded-none md:border-0 md:bg-transparent md:p-0 md:[&:not(:last-child)>td]:border-b md:[&:not(:last-child)>td]:border-line"
              >
                <td className={`${CELULA} font-medium`}>{lancamento.descricao}</td>
                <td className={CELULA}>
                  {lancamento.categoriaId === null ? (
                    <span className="text-[14px] text-ink-soft">Sem categoria</span>
                  ) : (
                    <Chip>{categorias.get(lancamento.categoriaId) ?? "Categoria removida"}</Chip>
                  )}
                </td>
                {comParcela ? (
                  <td className={`${CELULA} text-ink-muted`}>
                    {parcela === null ? (
                      <span className="sr-only">sem parcelamento</span>
                    ) : (
                      <>
                        <span className="tabular">
                          {parcela.numero}/{parcela.total}
                        </span>{" "}
                        {parcela.restantes === 0
                          ? "(última)"
                          : `(faltam ${parcela.restantes} depois desta)`}
                      </>
                    )}
                  </td>
                ) : null}
                <td className={`${CELULA} tabular text-ink-muted`}>
                  {formatarData(lancamento.dataEvento)}
                </td>
                <td className={CELULA}>
                  <BotaoPago
                    lancamentoId={lancamento.id}
                    descricao={lancamento.descricao}
                    pago={lancamento.pagoEm !== null}
                    alternar={alternarPagamento}
                  />
                </td>
                <td
                  className={`${CELULA} tabular whitespace-nowrap md:text-right ${corDaNatureza(lancamento.natureza)}`}
                >
                  {/*
                    O sinal repete em forma o que a cor diz, para a linha não
                    depender de matiz. O rótulo completo continua indo só para
                    leitor de tela: na coluna ele seria ruído, e o sinal já
                    carrega a distinção visual.
                  */}
                  {lancamento.natureza === "INVESTIMENTO" ? null : (
                    <span aria-hidden="true">{lancamento.natureza === "RECEITA" ? "+" : "−"}</span>
                  )}
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

/**
 * A semântica de valor do sistema, em cor de texto e nunca em preenchimento.
 * Investimento fica neutro de propósito: ele não é nem entrada nem saída da
 * casa, é dinheiro que mudou de lugar, e pintá-lo de verde ou de vermelho
 * afirmaria uma coisa que o app não sabe.
 */
function corDaNatureza(natureza: Natureza): string {
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
