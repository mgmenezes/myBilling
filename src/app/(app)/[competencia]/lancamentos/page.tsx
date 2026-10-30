import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { criarCategoria } from "@/app/actions/categorias";
import { criarCompra } from "@/app/actions/compras";
import {
  cancelarLancamento,
  criarLancamentoAvulso,
  trocarCategoria,
} from "@/app/actions/lancamentos";
import { criarMeioDePagamento } from "@/app/actions/meios-de-pagamento";
import { alternarPagamento, confirmarValorDaOcorrencia } from "@/app/actions/pagamentos";
import {
  contarFiltrosAtivos,
  type FiltroDeLancamentos,
  filtrarLancamentos,
  type Situacao,
} from "@/application/mes/filtrar-lancamentos";
import { filtrosAtivos } from "@/application/mes/filtros-ativos";
import { obterVisaoMensal } from "@/application/mes/obter-visao-mensal/handler";
import { totaisPorCategoria } from "@/application/mes/totais-por-categoria";
import {
  MESES_DE_PROJECAO,
  materializarRecorrencias,
} from "@/application/recorrencias/materializar/handler";
import { BarraDeFiltrosCompacta } from "@/components/barra-de-filtros-compacta";
import { DialogoDeCadastro } from "@/components/dialogo-de-cadastro";
import { FiltrosDeLancamentos } from "@/components/filtros-de-lancamentos";
import { FormCompra } from "@/components/form-compra";
import { FormLancamentoAvulso } from "@/components/form-lancamento-avulso";
import { SeletorDeFormulario } from "@/components/seletor-de-formulario";
import { TabelaLancamentos } from "@/components/tabela-lancamentos";
import {
  type Cents,
  corDaCategoria,
  criarCompetencia,
  dataPadraoDoLancamento,
  type Natureza,
  somar,
  ZERO_CENTS,
} from "@/domain";
import { criarRepositorios } from "@/infrastructure/container";
import { db } from "@/infrastructure/db/client";
import { RecorrenciaRepositoryDrizzle } from "@/infrastructure/db/repositories/recorrencia.repository";
import { COOKIE_BLOCOS_RECOLHIDOS, lerBlocosRecolhidos } from "@/lib/blocos-recolhidos";
import { formatarBRL } from "@/lib/formatar";
import { hojeEm } from "@/lib/relogio";
import { sessaoDaUI } from "../../sessao";

/**
 * Lançamentos do mês, com busca e filtros.
 *
 * O filtro vem da URL e é aplicado no servidor pela **mesma** função que o
 * indicador do painel usa para montar o link. É isso que garante que a soma
 * dos lançamentos listados bata com o número que foi clicado lá.
 *
 * O cadastro mora aqui, e não no painel: quem abre a visão geral quer entender
 * o mês, não preencher formulário. Quem abre Lançamentos está no modo de
 * manutenção.
 *
 * **O cadastro abre num diálogo, a partir de um botão no topo.** Ele ficava no
 * rodapé, e com oito ou dez gastos fixos na lista cadastrar algo exigia rolar
 * tudo. O `<dialog>` nativo resolve sem inverter a ordem da página, que é o
 * outro caminho possível — e que trocaria um incômodo raro, cadastrar, por um
 * frequente, ler o mês.
 *
 * Dentro do diálogo, um alternador entre os dois formulários. Empilhá-los
 * obrigaria a rolar por um que a pessoa não quer para alcançar o que quer.
 */

export const dynamic = "force-dynamic";

function texto(valor: string | string[] | undefined): string | undefined {
  if (typeof valor !== "string" || valor.trim() === "") {
    return undefined;
  }
  return valor;
}

export default async function PaginaDeLancamentos({
  params,
  searchParams,
}: PageProps<"/[competencia]/lancamentos">) {
  await sessaoDaUI();

  const { competencia } = await params;
  const query = await searchParams;
  const resultado = criarCompetencia(competencia);
  if (!resultado.ok) {
    notFound();
  }

  /*
   * A competência **corrente**, que é outra coisa que a competência aberta.
   *
   * "Vencido" é não pago de competência anterior à de hoje. Comparar com o
   * segmento de rota nunca dá vencido, porque todo lançamento listado é
   * exatamente daquela competência — o defeito nunca esteve em `situacaoDe`,
   * esteve no argumento que ela recebia (VENC-01, AC 5).
   *
   * Sai de `hojeEm()`, que resolve o dia no fuso da casa, e o mês é o prefixo
   * `'YYYY-MM'` desse dia: comparação textual, sem objeto de data (AD-002).
   * Resolvida por requisição, e não em tempo de build, porque a página é
   * `force-dynamic` — o mês vira sozinho à meia-noite do dia 1.
   */
  const hoje = hojeEm();
  const corrente = criarCompetencia(hoje.slice(0, 7));
  if (!corrente.ok) {
    /* Falha visível. Cair para a competência aberta classificaria tudo como
       pendente em silêncio, que é precisamente o defeito de origem. */
    throw new Error("não foi possível resolver a competência corrente");
  }

  const situacaoBruta = texto(query.situacao);
  const naturezaBruta = texto(query.natureza);

  const filtro: FiltroDeLancamentos = {
    busca: texto(query.busca),
    categoriaId: texto(query.categoriaId),
    meioPagamentoId: texto(query.meioPagamentoId),
    usuarioId: texto(query.usuarioId),
    situacao:
      situacaoBruta === "PENDENTE" || situacaoBruta === "PAGO" || situacaoBruta === "VENCIDO"
        ? (situacaoBruta as Situacao)
        : undefined,
    natureza:
      naturezaBruta === "DESPESA" || naturezaBruta === "RECEITA" || naturezaBruta === "INVESTIMENTO"
        ? (naturezaBruta as Natureza)
        : undefined,
  };

  const repositorios = criarRepositorios();
  /* Mesma materialização do painel: as duas páginas mostram o mês, e abrir uma
   * ou outra primeiro não pode mudar o que existe. */
  await materializarRecorrencias(
    { recorrencias: new RecorrenciaRepositoryDrizzle(db()), movimentos: repositorios.movimentos },
    resultado.value,
    MESES_DE_PROJECAO,
  );
  const [visao, meios, categorias, todasAsCategorias, usuarios] = await Promise.all([
    obterVisaoMensal(repositorios, resultado.value),
    repositorios.cadastros.listarMeiosDePagamentoDisponiveis(),
    repositorios.cadastros.listarCategoriasDisponiveis(),
    repositorios.cadastros.listarTodasAsCategorias(),
    repositorios.cadastros.listarUsuarios(),
  ]);

  const visiveis = filtrarLancamentos(visao.lancamentos, filtro, corrente.value);
  const total = visiveis.reduce<Cents>(
    (acumulado, item) => somar(acumulado, item.lancamento.valor),
    ZERO_CENTS,
  );
  const temFiltro = contarFiltrosAtivos(filtro) > 0;
  /* O lançamento carrega só o id da categoria; o nome vive no cadastro, e é
     aqui que os dois se encontram — uma vez, e não por linha da tabela. Todas,
     arquivadas inclusive: o gasto que ainda tem uma arquivada a vê pelo nome no
     seletor, que só oferece as ativas (TRC-02, AC 3). */
  const nomePorCategoria = new Map(todasAsCategorias.map((c) => [c.id, c.nome]));
  /* Os chips somam o mês inteiro, e não o que sobrou do filtro: o total de
     cada categoria é o de "Gastos por categoria" na Visão geral, e não muda
     quando outro filtro entra (LST-01, AC 2). Cada um leva a cor em uso da
     categoria, das mesmas categorias de onde sai o nome (COR-03, AC 4). */
  const gastoPorCategoria = totaisPorCategoria(
    visao.lancamentos,
    resultado.value,
    visao.competenciaView.totalGastos,
    new Map(todasAsCategorias.map((c) => [c.id, c])),
  );
  /* Montadas uma vez: os dois formulários do alternador e o seletor de cada
     linha recebem as mesmas. A cor em uso vai junto, para o seletor da linha
     (COR-03, AC 2); os formulários a ignoram. */
  const opcoesDeCategoria = categorias.map((c) => ({
    id: c.id,
    nome: c.nome,
    cor: corDaCategoria(c),
  }));
  const opcoesDeUsuario = usuarios.map((u) => ({ id: u.id, nome: u.nome }));
  /* Hoje, se hoje for deste mês; senão o dia 1 (CAD-04, AC 10). Resolvido aqui
     porque quem conhece o relógio é a borda, e no fuso da casa — nunca o da
     máquina, que às 21h de 31/03 já está em abril. */
  const dataPadrao = dataPadraoDoLancamento(resultado.value, hoje);
  /* Lido aqui, e não no navegador: o bloco que a pessoa recolheu já sai
     fechado no HTML, sem abrir e fechar diante dela (LST-02, AC 4). */
  const recolhidos = lerBlocosRecolhidos((await cookies()).get(COOKIE_BLOCOS_RECOLHIDOS)?.value);
  /* Os filtros da URL com o nome que a barra compacta mostra (LST-03, AC 4).
     O nome da categoria sai do mesmo mapa da tabela, arquivadas inclusive. */
  const ativos = filtrosAtivos(filtro, {
    categorias: nomePorCategoria,
    meios: new Map(meios.map((m) => [m.id, m.nome])),
    usuarios: new Map(usuarios.map((u) => [u.id, u.nome])),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[28px] leading-[1.1] sm:text-[34px]">Lançamentos</h1>
        <DialogoDeCadastro rotuloDoBotao="+ Novo lançamento" titulo="Novo lançamento">
          <SeletorDeFormulario
            rotuloDoGrupo="Tipo de lançamento a cadastrar"
            abas={[
              {
                id: "avulso",
                rotulo: "Avulso",
                conteudo: (
                  <FormLancamentoAvulso
                    competencia={resultado.value}
                    dataPadrao={dataPadrao}
                    /* `geraFatura` decide o padrão da caixa "já saiu da conta". */
                    meios={meios.map((meio) => ({
                      id: meio.id,
                      nome: meio.nome,
                      geraFatura: meio.tipo === "CARTAO_CREDITO",
                    }))}
                    categorias={opcoesDeCategoria}
                    usuarios={opcoesDeUsuario}
                    enviar={criarLancamentoAvulso}
                    criarCategoria={criarCategoria}
                    criarMeioDePagamento={criarMeioDePagamento}
                  />
                ),
              },
              {
                id: "parcelado",
                rotulo: "Parcelado",
                conteudo: (
                  <FormCompra
                    competencia={resultado.value}
                    dataPadrao={dataPadrao}
                    meios={meios.map((meio) => ({ id: meio.id, nome: meio.nome }))}
                    categorias={opcoesDeCategoria}
                    usuarios={opcoesDeUsuario}
                    enviar={criarCompra}
                    criarCategoria={criarCategoria}
                    criarMeioDePagamento={criarMeioDePagamento}
                  />
                ),
              },
            ]}
          />
        </DialogoDeCadastro>
      </div>

      {/* O id é o que a barra compacta observa e para onde "Filtros" leva. */}
      <div id="cartao-de-filtros">
        <FiltrosDeLancamentos
          categorias={gastoPorCategoria}
          meios={meios.map((m) => ({ id: m.id, nome: m.nome }))}
          usuarios={usuarios.map((u) => ({ id: u.id, nome: u.nome }))}
          totalVisivel={formatarBRL(total)}
          quantidadeVisivel={visiveis.length}
        />
      </div>
      <BarraDeFiltrosCompacta alvo="cartao-de-filtros" ativos={ativos} />

      {/*
        Distinguir "mês sem lançamento" de "nenhum resultado para este filtro"
        (LANC-03). São situações diferentes e a saída de cada uma é diferente:
        uma pede cadastro, a outra pede limpar filtro.
      */}
      {visao.lancamentos.length > 0 && visiveis.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-[15px] text-ink-muted">
          Nenhum lançamento corresponde aos filtros aplicados. O mês tem {visao.lancamentos.length}{" "}
          lançamentos no total.
        </p>
      ) : (
        <TabelaLancamentos
          lancamentos={temFiltro ? visiveis : visao.lancamentos}
          categorias={nomePorCategoria}
          opcoesDeCategoria={opcoesDeCategoria}
          competenciaCorrente={corrente.value}
          alternarPagamento={alternarPagamento}
          confirmarValor={confirmarValorDaOcorrencia}
          excluir={cancelarLancamento}
          trocarCategoria={trocarCategoria}
          recolhidos={recolhidos}
        />
      )}
    </div>
  );
}
