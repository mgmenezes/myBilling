"use client";

import { useId, useOptimistic, useState, useTransition } from "react";
import type { trocarCategoria as trocarCategoriaAction } from "@/app/actions/lancamentos";
import type { AlcanceDaTroca, CorDeCategoria } from "@/domain";
import { useAvisos } from "./avisos";
import { CLASSES_DA_COR } from "./cor-de-categoria";

/**
 * A categoria de um gasto, trocada na própria linha (TRC-02).
 *
 * **Grava ao escolher**, sem botão de salvar e sem confirmação: escolher a
 * categoria anterior de novo desfaz a troca, então um passo a mais só custaria
 * um clique por categoria errada, que é o ajuste mais comum depois da
 * importação.
 *
 * **O alcance vai no toast**, porque é invisível na linha: trocar num mês um
 * fixo ou uma parcela muda todos os meses dele (TRC-04). O texto sai do
 * alcance que o servidor devolveu, e não de um palpite feito aqui sobre a
 * origem do lançamento.
 *
 * **Estado otimista**, pelo mesmo motivo do `BotaoPago`: a resposta é uma
 * revalidação de três rotas, e sem ele o seletor voltaria a mostrar a
 * categoria antiga até a lista chegar. Quando a gravação termina, o valor
 * volta à prop. Depois do sucesso ela já é a nova; depois de uma recusa ela
 * continua a anterior, e é assim que o seletor volta sozinho, com o motivo
 * escrito ao lado e nenhum toast (TRC-05, AC 1).
 *
 * **A gravada fora da lista vira uma opção a mais**, no fim. Uma categoria
 * arquivada não está entre as ativas, e sem essa opção o seletor diria "Sem
 * categoria" para um gasto que tem categoria (TRC-02, AC 3).
 *
 * **Largura fixa no computador** (LST-05, AC 5). Sem ela o `<select>` tem a
 * largura da opção mais longa, e era ele que empurrava a tabela do Cartão para
 * fora da margem. O nome que não cabe termina em reticências, e o nome inteiro
 * fica no `title`. A altura é de 36 px com ponteiro fino e de 44 px no toque
 * (LST-05, AC 4; UI-03).
 *
 * **No celular, a largura do cartão.** Só `max-w-full` não bastava: a tabela
 * mede a largura que o select pede, que é a da opção mais longa, e uma
 * categoria de nome comprido passava a lista da tela em 400 px (UI-03).
 * Com `w-full` a medida vem de fora, e a opção longa termina em reticências.
 *
 * **Na cor da categoria escolhida** (COR-03, ACs 2 e 3). O fundo e o texto
 * seguem a escolha otimista, então pintam na hora e voltam sozinhos à cor
 * anterior quando a gravação é recusada. "Sem categoria" e a gravada fora da
 * lista ficam na neutra. A classe `bg-cat-*-fundo` define só a cor de fundo e
 * compõe com o chevron, que é a imagem de fundo da regra global de `select`.
 * As `<option>` abertas continuam nativas, sem tinta.
 */

const AVISO: Record<AlcanceDaTroca, string> = {
  FIXO: "Categoria trocada em todos os meses deste fixo.",
  COMPRA: "Categoria trocada em todas as parcelas desta compra.",
  LANCAMENTO: "Categoria trocada.",
};

/** O valor da opção "Sem categoria": `<select>` não tem valor nulo. */
const SEM_CATEGORIA = "";

export interface SeletorDeCategoriaProps {
  readonly lancamentoId: string;
  /** Só para o nome acessível: senão todos os seletores da tabela se chamariam "Categoria". */
  readonly descricao: string;
  readonly categoriaId: string | null;
  /** As ativas, na ordem em que devem aparecer, com a cor em uso de cada uma. */
  readonly categorias: ReadonlyArray<{
    readonly id: string;
    readonly nome: string;
    readonly cor: CorDeCategoria;
  }>;
  /** O nome da gravada quando ela não está entre as ativas, se for conhecido. */
  readonly nomeDaGravada?: string;
  readonly trocarCategoria: typeof trocarCategoriaAction;
}

export function SeletorDeCategoria({
  lancamentoId,
  descricao,
  categoriaId,
  categorias,
  nomeDaGravada,
  trocarCategoria,
}: SeletorDeCategoriaProps) {
  const id = useId();
  const { avisar } = useAvisos();
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();
  const [escolhida, definirEscolhida] = useOptimistic(categoriaId ?? SEM_CATEGORIA);

  const gravadaForaDaLista =
    categoriaId !== null && !categorias.some((categoria) => categoria.id === categoriaId);
  const nomeDaGravadaForaDaLista = nomeDaGravada ?? "Categoria removida";
  /* A opção que o seletor mostra agora, a otimista inclusive. */
  const opcaoEscolhida = categorias.find((categoria) => categoria.id === escolhida);
  const nomeEscolhido =
    escolhida === SEM_CATEGORIA
      ? "Sem categoria"
      : (opcaoEscolhida?.nome ?? nomeDaGravadaForaDaLista);
  /* Fora das opções não há cor: "Sem categoria" e a arquivada ficam neutras. */
  const pintura =
    opcaoEscolhida === undefined
      ? "border-line bg-surface text-ink"
      : `border-transparent ${CLASSES_DA_COR[opcaoEscolhida.cor].pill}`;

  function escolher(valor: string) {
    setErro("");
    iniciar(async () => {
      definirEscolhida(valor);
      const resposta = await trocarCategoria({
        lancamentoId,
        categoriaId: valor === SEM_CATEGORIA ? null : valor,
      });
      if (!resposta.ok) {
        setErro(resposta.erro.mensagem);
        return;
      }
      avisar(AVISO[resposta.data.alcance]);
    });
  }

  return (
    <span className="inline-flex max-w-full flex-col items-start gap-1">
      <label htmlFor={id} className="sr-only">
        Categoria de {descricao}
      </label>
      <select
        id={id}
        value={escolhida}
        disabled={pendente}
        title={nomeEscolhido}
        onChange={(evento) => escolher(evento.target.value)}
        className={`min-h-11 w-full max-w-full truncate rounded-pill border px-3.5 text-[13px] transition-[border-color,opacity] duration-200 hover:border-line-strong disabled:cursor-progress disabled:opacity-60 md:w-44 pointer-fine:min-h-9 ${pintura}`}
      >
        <option value={SEM_CATEGORIA}>Sem categoria</option>
        {categorias.map((categoria) => (
          <option key={categoria.id} value={categoria.id}>
            {categoria.nome}
          </option>
        ))}
        {gravadaForaDaLista ? (
          <option value={categoriaId}>{nomeDaGravadaForaDaLista}</option>
        ) : null}
      </select>
      {erro === "" ? null : (
        <span role="alert" className="text-[13px] font-medium text-negativo">
          {erro}
        </span>
      )}
    </span>
  );
}
