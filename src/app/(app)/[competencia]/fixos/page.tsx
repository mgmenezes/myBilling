import { notFound } from "next/navigation";
import { criarCategoria } from "@/app/actions/categorias";
import { criarMeioDePagamento } from "@/app/actions/meios-de-pagamento";
import {
  criarRecorrencia,
  editarRecorrencia,
  encerrarRecorrencia,
  registrarNovaVigencia,
} from "@/app/actions/recorrencias";
import { valorNoMesExibido } from "@/application/recorrencias/editar/handler";
import { obterTodoMes } from "@/application/recorrencias/obter-todo-mes/handler";
import type { ItemDeFixo } from "@/components/tabela-de-fixos";
import { TodoMes } from "@/components/todo-mes";
import {
  compararCompetencias,
  corDaCategoria,
  criarCompetencia,
  type FixoDoMes,
  versaoVigente,
} from "@/domain";
import { criarRepositorios } from "@/infrastructure/container";
import { db } from "@/infrastructure/db/client";
import { RecorrenciaRepositoryDrizzle } from "@/infrastructure/db/repositories/recorrencia.repository";
import { formatarBRL, formatarCompetencia, nomeDoMes } from "@/lib/formatar";
import { sessaoDaUI } from "../../sessao";

/**
 * O que se repete todo mês: gastos fixos e receitas recorrentes, uma linha por
 * fixo, com o fixo aberto num painel ao lado (FIXCOL-01 a 09, AD-021).
 *
 * **A área se chama "Todo mês", e o bloco da lista continua se chamando
 * "Fixos".** Não é inconsistência: o bloco reúne despesa recorrente, e esta
 * área administra também a receita recorrente, cuja ocorrência aparece em
 * "Entradas". Os dois nomes descrevem conjuntos diferentes.
 *
 * A área existe separada de Lançamentos porque recorrência tem ciclo de vida:
 * criar, reajustar, encerrar. Isso não cabe dentro do formulário de compra como
 * coube o cadastro de categoria, que é só um nome.
 *
 * **O valor da linha e os totais são os da ocorrência do mês aberto**
 * (`movimento`), e não os da vigência: a conta confirmada diferente aparece com
 * o número que o mês de fato tem, e o total de saídas é o do bloco "Fixos" de
 * Lançamentos (FIXCOL-02 e 03, AD-003). Por isso a leitura materializa antes de
 * ler, como as outras telas do mês (`obterTodoMes`). As vigências não somam:
 * aparecem só no histórico do fixo aberto.
 *
 * O formulário de edição recebe o valor por `valorNoMesExibido`, a mesma
 * função com que o caso de uso decide se o valor mudou. Calculado de outro
 * jeito, salvar sem mexer registraria uma vigência (EDF-03 AC 3). É a previsão
 * vigente, e não o confirmado.
 *
 * O fixo aberto chega em `?fixo=`, lido aqui: a tela cliente não precisa de
 * `useSearchParams` nem de `Suspense`, e a página já é dinâmica.
 */

export const dynamic = "force-dynamic";

export default async function PaginaDeFixos({
  params,
  searchParams,
}: PageProps<"/[competencia]/fixos">) {
  await sessaoDaUI();

  const { competencia } = await params;
  const resultado = criarCompetencia(competencia);
  if (!resultado.ok) {
    notFound();
  }
  const mes = resultado.value;
  const { fixo } = await searchParams;

  const repositorios = criarRepositorios();
  const [todoMes, meios, categorias, usuarios] = await Promise.all([
    obterTodoMes(
      { recorrencias: new RecorrenciaRepositoryDrizzle(db()), movimentos: repositorios.movimentos },
      mes,
    ),
    repositorios.cadastros.listarMeiosDePagamentoDisponiveis(),
    repositorios.cadastros.listarCategoriasDisponiveis(),
    repositorios.cadastros.listarUsuarios(),
  ]);

  /* O nome e a cor saem da mesma categoria: a que não está entre as
     disponíveis vira "Categoria removida", na neutra (COR-02, AC 5). */
  const categoriaPorId = new Map(categorias.map((c) => [c.id, c]));
  const nomePorMeio = new Map(meios.map((m) => [m.id, m.nome]));
  const nomePorUsuario = new Map(usuarios.map((u) => [u.id, u.nome]));

  /* As mesmas listas no cadastro e na edição. `geraFatura` restringe o
     destino quando a natureza é receita. */
  const opcoesDeMeio = meios.map((m) => ({
    id: m.id,
    nome: m.nome,
    geraFatura: m.tipo === "CARTAO_CREDITO",
  }));
  const opcoesDeCategoria = categorias.map((c) => ({ id: c.id, nome: c.nome }));
  const opcoesDeUsuario = usuarios.map((u) => ({ id: u.id, nome: u.nome }));

  /** "Receita" em toda entrada (TRC-01); nas saídas, a categoria com a cor dela. */
  function categoriaDoFixo(
    recorrencia: FixoDoMes["recorrencia"],
  ): Pick<ItemDeFixo, "categoria" | "corDaCategoria"> {
    if (recorrencia.natureza !== "DESPESA") {
      return { categoria: "Receita", corDaCategoria: null };
    }
    if (recorrencia.categoriaId === null) {
      return { categoria: "Sem categoria", corDaCategoria: null };
    }
    const categoria = categoriaPorId.get(recorrencia.categoriaId);
    return categoria === undefined
      ? { categoria: "Categoria removida", corDaCategoria: null }
      : { categoria: categoria.nome, corDaCategoria: corDaCategoria(categoria) };
  }

  function paraItem({
    recorrencia,
    versoes,
    valorDoMes,
    previstoDoMes,
    confirmado,
  }: FixoDoMes): ItemDeFixo {
    const vigente = versaoVigente(versoes, mes);
    return {
      id: recorrencia.id,
      descricao: recorrencia.descricao,
      natureza: recorrencia.natureza,
      diaVencimento: recorrencia.diaVencimento,
      ...categoriaDoFixo(recorrencia),
      meio: nomePorMeio.get(recorrencia.meioPagamentoId) ?? "Meio arquivado",
      pessoa: nomePorUsuario.get(recorrencia.usuarioId) ?? "Pessoa removida",
      valorDoMes: valorDoMes === null ? null : formatarBRL(valorDoMes),
      previstoDoMes: previstoDoMes === null ? null : formatarBRL(previstoDoMes),
      confirmado,
      inicio: formatarCompetencia(recorrencia.competenciaInicio),
      comecaDepois: compararCompetencias(recorrencia.competenciaInicio, mes) > 0,
      fim:
        recorrencia.competenciaFim === null
          ? null
          : formatarCompetencia(recorrencia.competenciaFim),
      encerrada: recorrencia.encerradaEm !== null,
      /* O histórico que a página lia e jogava fora: da vigência mais antiga
         para a mais nova, com a do mês marcada (FIXCOL-04, AC 4). */
      historico: [...versoes]
        .sort((a, b) => compararCompetencias(a.vigenteDesde, b.vigenteDesde))
        .map((versao) => ({
          desde: formatarCompetencia(versao.vigenteDesde),
          valor: formatarBRL(versao.valorPrevisto),
          valeNoMes: versao.vigenteDesde === vigente?.vigenteDesde,
        })),
      competenciaInicio: recorrencia.competenciaInicio,
      competenciaFim: recorrencia.competenciaFim,
      meioPagamentoId: recorrencia.meioPagamentoId,
      categoriaId: recorrencia.categoriaId,
      usuarioId: recorrencia.usuarioId,
      valorNoMesCentavos: valorNoMesExibido(versoes, mes),
    };
  }

  return (
    <TodoMes
      competencia={mes}
      rotuloDaCompetencia={formatarCompetencia(mes)}
      nomeDoMes={nomeDoMes(mes)}
      entradas={todoMes.entradas.map(paraItem)}
      saidas={todoMes.saidas.map(paraItem)}
      totalEntradas={formatarBRL(todoMes.totalEntradas)}
      totalSaidas={formatarBRL(todoMes.totalSaidas)}
      fixoInicial={typeof fixo === "string" ? fixo : null}
      formulario={{
        meios: opcoesDeMeio,
        categorias: opcoesDeCategoria,
        usuarios: opcoesDeUsuario,
        criar: criarRecorrencia,
        editar: editarRecorrencia,
        criarCategoria,
        criarMeioDePagamento,
      }}
      registrarVigencia={registrarNovaVigencia}
      encerrar={encerrarRecorrencia}
    />
  );
}
