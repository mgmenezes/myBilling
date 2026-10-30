import { InfoIcon, MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";
import Form from "next/form";
import { notFound } from "next/navigation";
import { SEM_CATEGORIA } from "@/application/mes/filtrar-lancamentos";
import { obterVisaoMensal } from "@/application/mes/obter-visao-mensal/handler";
import { ultimosLancamentos } from "@/application/mes/ultimos-lancamentos";
import {
  MESES_DE_PROJECAO,
  materializarRecorrencias,
} from "@/application/recorrencias/materializar/handler";
import { GraficoCategorias } from "@/components/grafico-categorias";
import { HorizonteFuturo } from "@/components/horizonte-futuro";
import { AlternadorDeVisao, GradeDeIndicadores, type Visao } from "@/components/painel-indicadores";
import { TransicaoMes } from "@/components/transicao-mes";
import { UltimosLancamentos } from "@/components/ultimos-lancamentos";
import {
  corDaCategoria,
  criarCompetencia,
  dataPadraoDoLancamento,
  resumoPorCategoria,
} from "@/domain";
import { criarRepositorios } from "@/infrastructure/container";
import { db } from "@/infrastructure/db/client";
import { RecorrenciaRepositoryDrizzle } from "@/infrastructure/db/repositories/recorrencia.repository";
import { formatarCompetencia } from "@/lib/formatar";
import { hojeEm } from "@/lib/relogio";
import { sessaoDaUI } from "../sessao";
import { CadastroDeLancamento } from "./cadastro-de-lancamento";

/**
 * Visão geral do mês.
 *
 * O jargão contábil saiu da tela. "Eixo competência" virou **Planejamento**,
 * "eixo caixa" virou **Movimentações**, e só uma visão aparece por vez. Essa
 * restrição é o que preserva `MOV-03` por construção: não existindo composição
 * que exiba os dois eixos juntos, não existe composição que os some.
 *
 * A explicação da diferença entre os dois continua disponível, mas sob
 * demanda, num `<details>`. Ela precisa ser lida uma vez, não todo dia.
 *
 * `resumoPorCategoria` já existia no domínio, testado e sem nenhum chamador.
 * O gráfico de categorias não exigiu backend novo: só faltava chamá-lo.
 *
 * **O horizonte futuro fica fora do `TransicaoMes` de propósito.** Ele é a
 * única árvore com GSAP da página, e o `TransicaoMes` é Motion: fora de as
 * duas disputarem os mesmos frames, o `transform` que o Motion mantém no
 * ancestral desloca toda medida de posição do ScrollTrigger, e o gatilho da
 * revelação nunca casa com a posição real da seção.
 *
 * **Duas colunas à direita do menu** (TRES-02). No centro, o mês: o título,
 * os quatro cards e, lado a lado quando cabem, as categorias e os próximos
 * meses. À direita, a coluna de ação: o cadastro aberto, a busca e os últimos
 * lançamentos, para lançar, achar e conferir sem trocar de tela (TRES-03 a
 * TRES-05). O cadastro é o mesmo do diálogo de Lançamentos.
 *
 * **O Motion embrulha o cabeçalho, os cards e as categorias, e nada mais.**
 * Os próximos meses têm GSAP, pela nota acima. O cadastro é formulário, e o
 * `TransicaoMes` troca a árvore inteira com movimento reduzido.
 *
 * A importação da planilha abria daqui, ao lado do título (IMP-08, AC 1). Ela
 * mudou para o pé do menu lateral, que está em toda tela (TRES-02, AC 6).
 */

export const dynamic = "force-dynamic";

export default async function PainelDoMes({ params, searchParams }: PageProps<"/[competencia]">) {
  await sessaoDaUI();

  const { competencia } = await params;
  const { visao: visaoBruta } = await searchParams;
  const resultado = criarCompetencia(competencia);
  if (!resultado.ok) {
    notFound();
  }

  const visao: Visao = visaoBruta === "movimentacoes" ? "movimentacoes" : "planejamento";

  /*
   * A competência corrente, que é outra coisa que a competência aberta. O
   * indicador do não pago precisa dela para apontar para o estado que o mês
   * tem: num mês passado o não pago é vencido, e um link fixo em `PENDENTE`
   * abriria a lista vazia com o cartão mostrando um número.
   */
  const hoje = hojeEm();
  const corrente = criarCompetencia(hoje.slice(0, 7));
  if (!corrente.ok) {
    throw new Error("não foi possível resolver a competência corrente");
  }

  const repositorios = criarRepositorios();
  /*
   * As ocorrências de recorrência da janela são garantidas **antes** da
   * leitura. É um GET que escreve, e a decisão está registrada na spec: a
   * alternativa, materializar só na criação, deixaria buraco em todo mês fora
   * da janela daquele momento. A repetição é inofensiva — quem garante é a
   * restrição única `(recorrência, competência)`, não uma consulta prévia.
   */
  await materializarRecorrencias(
    { recorrencias: new RecorrenciaRepositoryDrizzle(db()), movimentos: repositorios.movimentos },
    resultado.value,
    MESES_DE_PROJECAO,
  );
  const visaoMensal = await obterVisaoMensal(repositorios, resultado.value);

  const categorias = resumoPorCategoria(
    visaoMensal.lancamentos.map((item) => item.lancamento),
    resultado.value,
    visaoMensal.competenciaView.totalGastos,
  );

  const [categoriasDisponiveis, todasAsCategorias, meios, usuarios] = await Promise.all([
    repositorios.cadastros.listarCategoriasDisponiveis(),
    repositorios.cadastros.listarTodasAsCategorias(),
    repositorios.cadastros.listarMeiosDePagamentoDisponiveis(),
    repositorios.cadastros.listarUsuarios(),
  ]);
  /* O nome e a cor da barra saem da mesma categoria. A que não está entre as
     disponíveis vira "Categoria removida", na barra neutra (COR-02, AC 5). */
  const categoriaPorId = new Map(categoriasDisponiveis.map((c) => [c.id, c]));
  /* As do cadastro, com a cor em uso, como em Lançamentos. */
  const opcoesDeCategoria = categoriasDisponiveis.map((c) => ({
    id: c.id,
    nome: c.nome,
    cor: corDaCategoria(c),
  }));
  /* A pill dos últimos lançamentos: a arquivada aparece pelo nome, na
     neutra, como no seletor da linha de Lançamentos (COR-02, AC 5). */
  const categoriasDaLinha = new Map(
    todasAsCategorias.map((c) => [
      c.id,
      { nome: c.nome, cor: categoriaPorId.has(c.id) ? corDaCategoria(c) : null },
    ]),
  );

  return (
    <div className="flex flex-1 flex-col xl:flex-row">
      {/* O centro: o mês. Sem largura máxima: a sobra do monitor grande vira
          coluna, e não linha mais comprida (TRES-02, AC 1). */}
      <div className="@container min-w-0 flex-1">
        <TransicaoMes competencia={resultado.value}>
          <div className="flex flex-col gap-4 border-b border-line px-4 py-6 sm:px-8">
            <h1 className="text-[28px] leading-[1.1] sm:text-[34px]">
              {formatarCompetencia(resultado.value)}
            </h1>

            <div className="flex flex-wrap items-center gap-3">
              <AlternadorDeVisao competencia={resultado.value} visao={visao} />

              <details className="group">
                <summary className="flex min-h-11 list-none items-center gap-1.5 rounded-pill px-3 text-[14px] text-ink-muted hover:text-ink">
                  <InfoIcon size={16} weight="bold" aria-hidden="true" />
                  Qual é a diferença
                </summary>
                <p className="mt-3 max-w-[62ch] rounded-lg bg-surface-soft p-4 text-[15px] leading-relaxed text-ink-muted">
                  <strong className="font-medium text-ink">Planejamento</strong> mede o que foi
                  assumido neste mês, pago ou não.{" "}
                  <strong className="font-medium text-ink">Movimentações</strong> mede o que de fato
                  saiu ou entrou na conta. Os dois divergem de propósito: a fatura paga neste mês
                  contém compras de meses anteriores. O myBilling nunca soma nem subtrai um do
                  outro.
                </p>
              </details>
            </div>
          </div>

          <div className="border-b border-line px-4 py-6 sm:px-8">
            <GradeDeIndicadores
              competencia={resultado.value}
              competenciaCorrente={corrente.value}
              visao={visao}
              planejamento={{
                entradas: visaoMensal.competenciaView.entradas,
                totalGastos: visaoMensal.competenciaView.totalGastos,
                pendente: visaoMensal.competenciaView.pendente,
                saldo: visaoMensal.competenciaView.saldo,
              }}
              movimentacoes={{
                entradasRecebidas: visaoMensal.caixaView.entradasRecebidas,
                saidas: visaoMensal.caixaView.saidas,
                saldo: visaoMensal.caixaView.saldo,
              }}
            />
          </div>
        </TransicaoMes>

        {/* Lado a lado quando o centro tem largura para os dois (TRES-02, AC 2). */}
        <div className="grid @3xl:grid-cols-[3fr_2fr]">
          <div className="min-w-0 px-4 py-6 sm:px-8">
            <TransicaoMes competencia={resultado.value}>
              <section aria-labelledby="titulo-categorias" className="flex flex-col gap-5">
                <h2 id="titulo-categorias" className="text-[20px]">
                  Gastos por categoria
                </h2>
                <GraficoCategorias
                  titulo="Gastos por categoria, ordenados do maior para o menor"
                  competencia={resultado.value}
                  fatias={categorias.map((resumo) => {
                    const categoria =
                      resumo.categoriaId === null
                        ? undefined
                        : categoriaPorId.get(resumo.categoriaId);
                    return {
                      id: resumo.categoriaId ?? SEM_CATEGORIA,
                      nome:
                        resumo.categoriaId === null
                          ? "Sem categoria"
                          : (categoria?.nome ?? "Categoria removida"),
                      valor: resumo.gasto,
                      percentual: resumo.percentualDistribuicao,
                      cor: categoria === undefined ? null : corDaCategoria(categoria),
                    };
                  })}
                />
              </section>
            </TransicaoMes>
          </div>

          {/* Fora da árvore do Motion: veja a nota no topo do arquivo. */}
          <section
            aria-labelledby="titulo-futuro"
            className="flex min-w-0 flex-col gap-3 border-t border-line px-4 py-6 sm:px-8 @3xl:border-t-0 @3xl:border-l"
          >
            <h2 id="titulo-futuro" className="text-[20px]">
              Próximos meses
            </h2>
            <HorizonteFuturo
              meses={visaoMensal.futuro.map((mes) => ({
                competencia: mes.competencia,
                rotulo: formatarCompetencia(mes.competencia),
                comprometido: mes.comprometido,
                saldo: mes.saldo,
              }))}
            />
          </section>
        </div>
      </div>

      {/* A coluna de ação: lançar, buscar e conferir, sem sair da Visão geral.
          Ao lado do centro a partir de 1.280 px, abaixo dele antes disso
          (TRES-02, ACs 1 e 5). Fora do Motion: formulário dentro dele pode ser
          reconstruído na hidratação com movimento reduzido. */}
      <div className="flex flex-col border-t border-line xl:w-96 xl:shrink-0 xl:border-t-0 xl:border-l">
        <section
          aria-labelledby="titulo-novo-lancamento"
          className="flex flex-col gap-4 border-b border-line px-4 py-6 sm:px-6"
        >
          <h2 id="titulo-novo-lancamento" className="text-[17px]">
            Novo lançamento
          </h2>
          <CadastroDeLancamento
            competencia={resultado.value}
            dataPadrao={dataPadraoDoLancamento(resultado.value, hoje)}
            meios={meios}
            categorias={opcoesDeCategoria}
            usuarios={usuarios.map((u) => ({ id: u.id, nome: u.nome }))}
          />
        </section>

        {/* GET para Lançamentos, com o filtro `busca` que a lista já entende.
            Vazia, a lista abre sem filtro (TRES-04). */}
        <Form
          action={`/${resultado.value}/lancamentos`}
          role="search"
          aria-label="Buscar lançamento"
          className="relative border-b border-line px-4 py-4 sm:px-6"
        >
          <label htmlFor="busca-da-visao-geral" className="sr-only">
            Buscar lançamento
          </label>
          <input
            id="busca-da-visao-geral"
            type="search"
            name="busca"
            placeholder="Buscar lançamento"
            className="min-h-11 w-full rounded-pill border border-transparent bg-surface-strong py-2 pr-4 pl-12 text-[15px] text-ink placeholder:text-ink-muted"
          />
          <button
            type="submit"
            aria-label="Buscar"
            className="absolute top-1/2 left-4 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-pill text-ink-muted hover:text-ink sm:left-6"
          >
            <MagnifyingGlassIcon size={18} weight="bold" aria-hidden="true" />
          </button>
        </Form>

        <div className="px-4 py-6 sm:px-6">
          <UltimosLancamentos
            competencia={resultado.value}
            itens={ultimosLancamentos(visaoMensal.lancamentos, hoje)}
            categorias={categoriasDaLinha}
          />
        </div>
      </div>
    </div>
  );
}
