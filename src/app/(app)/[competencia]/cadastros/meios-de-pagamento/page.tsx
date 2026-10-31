import { notFound } from "next/navigation";
import { criarMeioDePagamento, editarMeioDePagamento } from "@/app/actions/meios-de-pagamento";
import { obterUsoNoMes } from "@/application/cadastros/obter-uso-no-mes/handler";
import { CadastroDeMeios } from "@/components/cadastro-de-meios";
import type { ItemDeMeio } from "@/components/tabela-de-meios";
import { criarCompetencia, SEM_USO } from "@/domain";
import { criarRepositorios } from "@/infrastructure/container";
import { db } from "@/infrastructure/db/client";
import { RecorrenciaRepositoryDrizzle } from "@/infrastructure/db/repositories/recorrencia.repository";
import { formatarCompetencia, nomeDoMes } from "@/lib/formatar";
import { sessaoDaUI } from "../../../sessao";

/**
 * A aba Meios de pagamento de Cadastros: uma linha por meio, com o tipo, os
 * dias do cartão e o uso no mês aberto, e o meio aberto num painel (CADCOL-06
 * a 08, AD-022).
 *
 * O mesmo esqueleto da aba Categorias:
 * - **o uso no mês sai de `obterUsoNoMes`**, que materializa as ocorrências
 *   dos fixos antes de contar, com a mesma janela de Lançamentos (CADCOL-03,
 *   AC 5); a página não cria ocorrência de novo;
 * - **ordem alfabética pela regra do português**, e não pela do banco, que põe
 *   "conta Azul" depois de "Rótulo Âmbar" (CADCOL-06, AC 2);
 * - **só os disponíveis**: o arquivado não aparece, e arquivar ainda não tem
 *   tela. O meio aberto chega em `?meio=`, lido aqui.
 */

export const dynamic = "force-dynamic";

const ORDEM_ALFABETICA = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

export default async function PaginaDeMeiosDePagamento({
  params,
  searchParams,
}: PageProps<"/[competencia]/cadastros/meios-de-pagamento">) {
  await sessaoDaUI();

  const { competencia } = await params;
  const resultado = criarCompetencia(competencia);
  if (!resultado.ok) {
    notFound();
  }
  const mes = resultado.value;
  const { meio } = await searchParams;

  const repositorios = criarRepositorios();
  const [disponiveis, uso] = await Promise.all([
    repositorios.cadastros.listarMeiosDePagamentoDisponiveis(),
    obterUsoNoMes(
      { recorrencias: new RecorrenciaRepositoryDrizzle(db()), movimentos: repositorios.movimentos },
      mes,
    ),
  ]);

  const meios: ItemDeMeio[] = [...disponiveis]
    .sort((a, b) => ORDEM_ALFABETICA.compare(a.nome, b.nome))
    .map((disponivel) => {
      const { fixos, lancamentos } = uso.porMeio.get(disponivel.id) ?? SEM_USO;
      const cartao = disponivel.tipo === "CARTAO_CREDITO";
      return {
        id: disponivel.id,
        nome: disponivel.nome,
        tipo: disponivel.tipo,
        diaFechamento: cartao ? disponivel.diaFechamento : null,
        diaVencimento: cartao ? disponivel.diaVencimento : null,
        fixos,
        lancamentos,
      };
    });

  return (
    <CadastroDeMeios
      competencia={mes}
      rotuloDaCompetencia={formatarCompetencia(mes)}
      nomeDoMes={nomeDoMes(mes)}
      meios={meios}
      meioInicial={typeof meio === "string" ? meio : null}
      criarMeioDePagamento={criarMeioDePagamento}
      editar={editarMeioDePagamento}
    />
  );
}
