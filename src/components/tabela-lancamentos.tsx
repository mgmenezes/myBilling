import type { cancelarLancamento as cancelarAction } from "@/app/actions/lancamentos";
import type {
  alternarPagamento as alternarPagamentoAction,
  confirmarValorDaOcorrencia as confirmarValorAction,
} from "@/app/actions/pagamentos";
import { situacaoDe } from "@/application/mes/filtrar-lancamentos";
import type { LancamentoDoMes } from "@/application/mes/obter-visao-mensal/handler";
import { type BlocoDoMes, type Competencia, type Natureza, resolverValorEfetivo } from "@/domain";
import { formatarBRL, formatarData } from "@/lib/formatar";
import { BotaoAbrirCadastro } from "./botao-abrir-cadastro";
import { BotaoExcluir } from "./botao-excluir";
import { BotaoPago } from "./botao-pago";
import { Chip } from "./ui";
import { ValorConfirmavel } from "./valor-confirmavel";

/**
 * Os lançamentos do mês, segmentados em quatro blocos: Entradas, Fixos, Cartão
 * de Crédito e Gastos do Mês (UI-01 AC 5, ENTR-02). Os quatro aparecem sempre,
 * mesmo vazios, porque é assim que a aba do mês se parece e é o que permite
 * ler a ausência de um bloco como ausência, não como esquecimento.
 *
 * **Entradas vem primeiro, e passou a aparecer sempre.** Antes ela só existia
 * quando tinha conteúdo, enquanto os três blocos de despesa apareciam vazios —
 * então o dinheiro que entra era o único que sumia da tela quando faltava, e
 * num mês sem receita nem o convite para cadastrar aparecia. O nome perdeu "e
 * investimentos" porque investimento não tem porta de entrada em formulário
 * nenhum do app.
 *
 * **A tabela não decide o bloco.** Ela lê `item.bloco`, carimbado por
 * `obterVisaoMensal` com a mesma função que o painel usa para somar. Ela nunca
 * recebe o conjunto de cartões, então classificar diferente do painel não é
 * apenas improvável: é impossível de escrever.
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
 * **O terceiro estado vem ao lado do selo, e não dentro dele.** O selo é um
 * toggle de duas posições: pago e não pago. Vencido não é uma terceira posição
 * desse toggle — é uma leitura do calendário sobre o não pago, e escrevê-la no
 * rótulo do botão diria que existe um terceiro clique. Ele entra como selo
 * próprio, com a palavra escrita, pelo mesmo princípio do `BotaoPago`: o
 * estado está no texto, e a cor só repete o que o texto já disse.
 *
 * **O vazio do mês oferece a saída, e não só a notícia.** O texto mandava
 * cadastrar "abaixo", e o cadastro subiu para o topo no AD-014: a frase passou
 * a apontar para um lugar onde não há nada. Em vez de corrigir a direção, o
 * estado vazio passa a carregar o próprio controle — ele aciona o diálogo que
 * já está montado, de modo que a posição do cadastro deixa de ser uma
 * informação que o texto precisa acertar (VAZIO-01, ACs 1 e 4).
 *
 * **A coluna "Parcela" só existe no bloco de compra parcelada.** Fora dele ela
 * era uma coluna permanentemente vazia, e coluna vazia não é neutra: ela
 * empurra descrição e valor para as pontas opostas da tela e obriga o olho a
 * atravessar um vão sem informação. No lugar dela entra a categoria, que é o
 * dado que faltava para saber o que foi cada gasto sem abrir nada.
 */

interface BlocoDeDespesa {
  readonly id: string;
  readonly titulo: string;
  readonly bloco: BlocoDoMes;
}

/**
 * A ordem da planilha, com Entradas antes de tudo: dinheiro entra antes de
 * sair, e é o primeiro número que a pessoa procura ao abrir o mês.
 *
 * "Fixos" continua sendo o nome do bloco de despesa recorrente, ainda que a
 * área que o administra tenha passado a se chamar "Todo mês". Os dois já eram
 * coisas diferentes: aquela área administra também a receita recorrente, cuja
 * ocorrência aparece em Entradas e nunca aqui.
 */
const BLOCOS_DE_DESPESA: ReadonlyArray<BlocoDeDespesa> = [
  { id: "fixos", titulo: "Fixos", bloco: "FIXOS" },
  { id: "cartao", titulo: "Cartão de Crédito", bloco: "CARTAO" },
  { id: "avulsos", titulo: "Gastos do Mês", bloco: "AVULSOS" },
];

const CELULA = "block md:table-cell md:px-4 md:py-3.5 md:align-top";
const CABECALHO = "md:px-4 md:pb-2 text-left text-[13px] font-medium text-ink-muted";

export function TabelaLancamentos({
  lancamentos,
  categorias,
  competenciaCorrente,
  alternarPagamento,
  confirmarValor,
  excluir,
}: {
  readonly lancamentos: ReadonlyArray<LancamentoDoMes>;
  /** Id para nome. O lançamento só carrega o id; o nome vive no cadastro. */
  readonly categorias: ReadonlyMap<string, string>;
  /**
   * O mês de hoje, e não o mês aberto. É o argumento que decide se um não pago
   * está vencido, e é obrigatório de propósito: um padrão silencioso aqui
   * devolveria o defeito que VENC-01 veio corrigir.
   */
  readonly competenciaCorrente: Competencia;
  /** A action chega por prop: a tabela não conhece infraestrutura nenhuma. */
  readonly alternarPagamento: typeof alternarPagamentoAction;
  readonly confirmarValor: typeof confirmarValorAction;
  /** Só a linha avulsa a exibe; parcela e ocorrência não são canceláveis. */
  readonly excluir: typeof cancelarAction;
}) {
  if (lancamentos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-line px-6 py-12 text-center">
        <p className="text-[15px] text-ink-muted">
          Nenhum lançamento neste mês ainda. Cadastre o primeiro: um gasto avulso, uma entrada, ou
          uma compra parcelada cujas parcelas dos meses seguintes aparecem sozinhas.
        </p>
        <BotaoAbrirCadastro rotulo="+ Cadastrar o primeiro lançamento" />
      </div>
    );
  }

  const despesas = lancamentos.filter((item) => item.lancamento.natureza === "DESPESA");
  const entradas = lancamentos.filter((item) => item.lancamento.natureza !== "DESPESA");

  return (
    <div className="flex flex-col gap-7">
      <BlocoDeLancamentos
        id="entradas"
        titulo="Entradas"
        categorias={categorias}
        competenciaCorrente={competenciaCorrente}
        alternarPagamento={alternarPagamento}
        confirmarValor={confirmarValor}
        excluir={excluir}
        comParcela={false}
        itens={entradas}
      />
      {BLOCOS_DE_DESPESA.map((bloco) => (
        <BlocoDeLancamentos
          key={bloco.bloco}
          id={bloco.id}
          titulo={bloco.titulo}
          categorias={categorias}
          competenciaCorrente={competenciaCorrente}
          alternarPagamento={alternarPagamento}
          confirmarValor={confirmarValor}
          excluir={excluir}
          /* Só a compra parcelada tem parcela; nos outros a coluna seria um vão. */
          comParcela={bloco.bloco === "CARTAO"}
          itens={despesas.filter((item) => item.bloco === bloco.bloco)}
        />
      ))}
    </div>
  );
}

function BlocoDeLancamentos({
  id,
  titulo,
  itens,
  categorias,
  competenciaCorrente,
  comParcela,
  alternarPagamento,
  confirmarValor,
  excluir,
}: {
  /** Identificador sem espaço: `aria-labelledby` é uma lista de ids. */
  readonly id: string;
  readonly titulo: string;
  readonly itens: ReadonlyArray<LancamentoDoMes>;
  readonly categorias: ReadonlyMap<string, string>;
  readonly competenciaCorrente: Competencia;
  readonly comParcela: boolean;
  readonly alternarPagamento: typeof alternarPagamentoAction;
  readonly confirmarValor: typeof confirmarValorAction;
  readonly excluir: typeof cancelarAction;
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
            {itens.map((item) => {
              const { lancamento, parcela } = item;
              return (
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
                    {/*
                    Excluir mora ao lado do selo, e não numa coluna própria.
                    Coluna própria ficaria vazia em toda linha de parcela e de
                    gasto fixo — que são a maioria —, e coluna permanentemente
                    vazia empurra descrição e valor para as pontas da tela, que
                    é a dívida de interface que a pílula de categoria veio
                    reduzir.
                  */}
                    <span className="flex flex-wrap items-center gap-2">
                      <BotaoPago
                        lancamentoId={lancamento.id}
                        descricao={lancamento.descricao}
                        pago={lancamento.pagoEm !== null}
                        alternar={alternarPagamento}
                      />
                      {situacaoDe(item, competenciaCorrente) === "VENCIDO" ? (
                        <Chip tom="negativo">Vencido</Chip>
                      ) : null}
                      {/* Parcela quebraria a soma da compra; ocorrência renasce
                        na materialização seguinte. Nem uma nem outra oferece. */}
                      {lancamento.origem === "AVULSO" ? (
                        <BotaoExcluir
                          lancamentoId={lancamento.id}
                          descricao={lancamento.descricao}
                          excluir={excluir}
                        />
                      ) : null}
                    </span>
                  </td>
                  <td
                    className={`${CELULA} tabular whitespace-nowrap md:text-right ${corDaNatureza(lancamento.natureza)}`}
                  >
                    {/*
                    Ocorrência de gasto fixo tem valor confirmável; parcela e
                    avulso não. `resolverValorEfetivo` ganha aqui o chamador que
                    faltava desde a fase 3 do MVP — este é o caminho de leitura,
                    que é onde ela pertence: decidir o que exibir e dizer se
                    houve sobrescrita. A adaptação `valor !== previsto` existe
                    porque a materialização grava os dois iguais; é o mesmo
                    critério que `ocorrenciaProtegida` usa.
                  */}
                    {lancamento.origem === "RECORRENCIA" && lancamento.valorPrevisto !== null ? (
                      <ValorConfirmavel
                        /* O sinal vem junto, e não some por a célula ter virado
                         controle: sem ele a linha de fixo seria a única da
                         tabela a depender só da cor para dizer o que é. */
                        sinal={lancamento.natureza === "RECEITA" ? "+" : "−"}
                        lancamentoId={lancamento.id}
                        descricao={lancamento.descricao}
                        valorFormatado={formatarBRL(
                          resolverValorEfetivo(
                            lancamento.valorPrevisto,
                            lancamento.valor === lancamento.valorPrevisto ? null : lancamento.valor,
                          ).valorEfetivo,
                        )}
                        previstoFormatado={formatarBRL(lancamento.valorPrevisto)}
                        confirmado={
                          resolverValorEfetivo(
                            lancamento.valorPrevisto,
                            lancamento.valor === lancamento.valorPrevisto ? null : lancamento.valor,
                          ).sobrescritaManualmente
                        }
                        confirmar={confirmarValor}
                      />
                    ) : (
                      <>
                        {/*
                        O sinal repete em forma o que a cor diz, para a linha não
                        depender de matiz. O rótulo completo vai só para leitor
                        de tela: na coluna ele seria ruído.
                      */}
                        {lancamento.natureza === "INVESTIMENTO" ? null : (
                          <span aria-hidden="true">
                            {lancamento.natureza === "RECEITA" ? "+" : "−"}
                          </span>
                        )}
                        {formatarBRL(lancamento.valor)}
                        <span className="sr-only"> {rotuloDaNatureza(lancamento.natureza)}</span>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
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
