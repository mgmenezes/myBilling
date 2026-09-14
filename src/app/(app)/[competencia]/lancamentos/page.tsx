import { notFound } from "next/navigation";
import { criarCategoria } from "@/app/actions/categorias";
import { criarCompra } from "@/app/actions/compras";
import { criarMeioDePagamento } from "@/app/actions/meios-de-pagamento";
import { alternarPagamento } from "@/app/actions/pagamentos";
import {
  contarFiltrosAtivos,
  type FiltroDeLancamentos,
  filtrarLancamentos,
  type Situacao,
} from "@/application/mes/filtrar-lancamentos";
import { obterVisaoMensal } from "@/application/mes/obter-visao-mensal/handler";
import {
  MESES_DE_PROJECAO,
  materializarRecorrencias,
} from "@/application/recorrencias/materializar/handler";
import { FiltrosDeLancamentos } from "@/components/filtros-de-lancamentos";
import { FormCompra } from "@/components/form-compra";
import { TabelaLancamentos } from "@/components/tabela-lancamentos";
import { type Cents, criarCompetencia, type Natureza, somar, ZERO_CENTS } from "@/domain";
import { criarRepositorios } from "@/infrastructure/container";
import { db } from "@/infrastructure/db/client";
import { RecorrenciaRepositoryDrizzle } from "@/infrastructure/db/repositories/recorrencia.repository";
import { formatarBRL } from "@/lib/formatar";
import { sessaoDaUI } from "../../sessao";

/**
 * Lançamentos do mês, com busca e filtros.
 *
 * O filtro vem da URL e é aplicado no servidor pela **mesma** função que o
 * indicador do painel usa para montar o link. É isso que garante que a soma
 * dos lançamentos listados bata com o número que foi clicado lá.
 *
 * O cadastro de compra parcelada mora aqui, e não no painel: quem abre a visão
 * geral quer entender o mês, não preencher formulário. Quem abre Lançamentos
 * está no modo de manutenção.
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
  const [visao, meios, categorias, usuarios] = await Promise.all([
    obterVisaoMensal(repositorios, resultado.value),
    repositorios.cadastros.listarMeiosDePagamentoDisponiveis(),
    repositorios.cadastros.listarCategoriasDisponiveis(),
    repositorios.cadastros.listarUsuarios(),
  ]);

  const visiveis = filtrarLancamentos(visao.lancamentos, filtro, resultado.value);
  const total = visiveis.reduce<Cents>(
    (acumulado, item) => somar(acumulado, item.lancamento.valor),
    ZERO_CENTS,
  );
  const temFiltro = contarFiltrosAtivos(filtro) > 0;
  /* O lançamento carrega só o id da categoria; o nome vive no cadastro, e é
     aqui que os dois se encontram — uma vez, e não por linha da tabela. */
  const nomePorCategoria = new Map(categorias.map((c) => [c.id, c.nome]));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] leading-[1.1] sm:text-[34px]">Lançamentos</h1>

      <FiltrosDeLancamentos
        categorias={categorias.map((c) => ({ id: c.id, nome: c.nome }))}
        meios={meios.map((m) => ({ id: m.id, nome: m.nome }))}
        usuarios={usuarios.map((u) => ({ id: u.id, nome: u.nome }))}
        totalVisivel={formatarBRL(total)}
        quantidadeVisivel={visiveis.length}
      />

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
          alternarPagamento={alternarPagamento}
        />
      )}

      <FormCompra
        competencia={resultado.value}
        meios={meios.map((meio) => ({ id: meio.id, nome: meio.nome }))}
        categorias={categorias.map((categoria) => ({ id: categoria.id, nome: categoria.nome }))}
        usuarios={usuarios.map((usuario) => ({ id: usuario.id, nome: usuario.nome }))}
        enviar={criarCompra}
        criarCategoria={criarCategoria}
        criarMeioDePagamento={criarMeioDePagamento}
      />
    </div>
  );
}
