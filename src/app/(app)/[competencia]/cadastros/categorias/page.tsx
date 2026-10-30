import { renomearCategoria, trocarCorDaCategoria } from "@/app/actions/categorias";
import { ListaDeCategorias } from "@/components/lista-de-categorias";
import { criarRepositorios } from "@/infrastructure/container";
import { sessaoDaUI } from "../../../sessao";

/**
 * A tela de Categorias, na área Cadastros (COR-04).
 *
 * **Dentro de `[competencia]`**, embora categoria não tenha mês: assim a tela
 * herda a navegação e o seletor de mês do layout, e quem sai dela volta para o
 * mês que estava vendo. A competência já foi validada pelo layout, e nada aqui
 * depende dela.
 *
 * **Ordem alfabética pela regra do português**, e não pela do banco. O
 * `ORDER BY nome` segue a collation do Postgres, que pode pôr "Água" depois de
 * "Zebra" e um nome em minúscula depois de todos os de maiúscula. Aqui a ordem
 * é a que a pessoa espera ler (COR-04, AC 2).
 *
 * Só as disponíveis: a arquivada não aparece em formulário nenhum, e
 * arquivar ainda não tem tela.
 */

export const dynamic = "force-dynamic";

const ORDEM_ALFABETICA = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

export default async function PaginaDeCategorias() {
  await sessaoDaUI();

  const disponiveis = await criarRepositorios().cadastros.listarCategoriasDisponiveis();
  const categorias = [...disponiveis]
    .sort((a, b) => ORDEM_ALFABETICA.compare(a.nome, b.nome))
    .map(({ id, nome, cor }) => ({ id, nome, cor }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] leading-[1.1] sm:text-[34px]">Categorias</h1>

      <p className="max-w-[62ch] text-[15px] leading-relaxed text-ink-muted">
        A cor de cada categoria aparece em “Todo mês”, em Lançamentos e no gráfico da Visão geral.
        Quem não escolhe fica com uma cor automática, tirada do nome. O nome vai sempre ao lado da
        cor: ela ajuda a reconhecer, e o nome identifica.
      </p>

      <ListaDeCategorias
        categorias={categorias}
        trocarCor={trocarCorDaCategoria}
        renomear={renomearCategoria}
      />
    </div>
  );
}
