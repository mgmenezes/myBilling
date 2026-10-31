import { notFound } from "next/navigation";
import { criarCategoria, renomearCategoria, trocarCorDaCategoria } from "@/app/actions/categorias";
import { obterUsoNoMes } from "@/application/cadastros/obter-uso-no-mes/handler";
import { CadastroDeCategorias } from "@/components/cadastro-de-categorias";
import type { ItemDeCategoria } from "@/components/tabela-de-categorias";
import { criarCompetencia, SEM_USO } from "@/domain";
import { criarRepositorios } from "@/infrastructure/container";
import { db } from "@/infrastructure/db/client";
import { RecorrenciaRepositoryDrizzle } from "@/infrastructure/db/repositories/recorrencia.repository";
import { formatarCompetencia, nomeDoMes } from "@/lib/formatar";
import { sessaoDaUI } from "../../../sessao";

/**
 * A aba Categorias de Cadastros: uma linha por categoria, com a cor e o uso no
 * mês aberto, e a categoria aberta num painel (CADCOL-01 a 05, AD-022).
 *
 * **O uso no mês sai de `obterUsoNoMes`**, que materializa as ocorrências dos
 * fixos antes de contar, com a mesma janela de Lançamentos (CADCOL-03, AC 5):
 * abrir Cadastros primeiro num mês nunca aberto conta a ocorrência de cada
 * fixo, e "Ver em Lançamentos" mostra o mesmo número. A página não cria
 * ocorrência de novo; o caso de uso já cria.
 *
 * **Ordem alfabética pela regra do português**, e não pela do banco. O
 * `ORDER BY nome` segue a collation do Postgres, que pode pôr "Água" depois de
 * "Zebra" e um nome em minúscula depois de todos os de maiúscula (CADCOL-02,
 * AC 2).
 *
 * Só as disponíveis: a arquivada não aparece, e arquivar ainda não tem tela.
 * A categoria aberta chega em `?categoria=`, lida aqui: a tela cliente não
 * precisa de `useSearchParams` nem de `Suspense`, e a página já é dinâmica.
 */

export const dynamic = "force-dynamic";

const ORDEM_ALFABETICA = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

export default async function PaginaDeCategorias({
  params,
  searchParams,
}: PageProps<"/[competencia]/cadastros/categorias">) {
  await sessaoDaUI();

  const { competencia } = await params;
  const resultado = criarCompetencia(competencia);
  if (!resultado.ok) {
    notFound();
  }
  const mes = resultado.value;
  const { categoria } = await searchParams;

  const repositorios = criarRepositorios();
  const [disponiveis, uso] = await Promise.all([
    repositorios.cadastros.listarCategoriasDisponiveis(),
    obterUsoNoMes(
      { recorrencias: new RecorrenciaRepositoryDrizzle(db()), movimentos: repositorios.movimentos },
      mes,
    ),
  ]);

  const categorias: ItemDeCategoria[] = [...disponiveis]
    .sort((a, b) => ORDEM_ALFABETICA.compare(a.nome, b.nome))
    .map(({ id, nome, cor }) => {
      const { fixos, lancamentos } = uso.porCategoria.get(id) ?? SEM_USO;
      return { id, nome, cor, fixos, lancamentos };
    });

  return (
    <CadastroDeCategorias
      competencia={mes}
      rotuloDaCompetencia={formatarCompetencia(mes)}
      nomeDoMes={nomeDoMes(mes)}
      categorias={categorias}
      categoriaInicial={typeof categoria === "string" ? categoria : null}
      criarCategoria={criarCategoria}
      trocarCor={trocarCorDaCategoria}
      renomear={renomearCategoria}
    />
  );
}
