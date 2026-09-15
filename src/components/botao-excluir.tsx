"use client";

import { useState, useTransition } from "react";
import type { cancelarLancamento as cancelarAction } from "@/app/actions/lancamentos";

/**
 * Excluir um lançamento avulso, em dois toques na própria linha.
 *
 * **Dois toques, e não um modal.** Modal exigiria foco gerenciado, tecla de
 * escape, retorno do foco à origem e uma camada acima da tabela — e devolveria
 * menos do que custa para uma ação que apaga uma linha de gasto. Dois toques
 * dão a mesma proteção contra o clique errado, sem tirar a pessoa do lugar.
 *
 * **O estado de confirmação tem texto, não só cor.** "Excluir" vira "Confirmar?"
 * e o nome acessível muda junto. Quem não separa matiz continua sabendo que o
 * próximo toque apaga.
 *
 * **Sem estado otimista**, ao contrário do `BotaoPago`. Marcar pago é
 * reversível com um clique; excluir some com a linha, e mostrar o
 * desaparecimento antes de o servidor confirmar deixaria a pessoa achando que
 * apagou algo que ainda está lá se a gravação falhar.
 *
 * `Escape` desiste da confirmação. Perder o foco também: uma linha que ficou
 * armada enquanto a pessoa foi olhar outra coisa é uma armadilha.
 */

const BASE =
  "inline-flex w-fit items-center rounded-pill px-2.5 py-0.5 text-[13px] " +
  "transition-[background-color,border-color,opacity] duration-200 " +
  "disabled:cursor-progress disabled:opacity-60";

export function BotaoExcluir({
  lancamentoId,
  descricao,
  excluir,
}: {
  readonly lancamentoId: string;
  /** Só para o nome acessível: senão todos os botões da tabela se chamariam "Excluir". */
  readonly descricao: string;
  readonly excluir: typeof cancelarAction;
}) {
  const [armado, setArmado] = useState(false);
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();

  function acionar() {
    if (!armado) {
      setArmado(true);
      setErro("");
      return;
    }
    iniciar(async () => {
      const resposta = await excluir(lancamentoId);
      if (!resposta.ok) {
        setErro(resposta.erro.mensagem);
        setArmado(false);
      }
      /* No sucesso não há o que fazer: a revalidação remove a linha inteira. */
    });
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pendente}
        onClick={acionar}
        onKeyDown={(evento) => {
          if (evento.key === "Escape" && armado) {
            evento.preventDefault();
            setArmado(false);
          }
        }}
        onBlur={() => setArmado(false)}
        className={`${BASE} ${
          armado
            ? "border border-negativo font-semibold text-negativo"
            : "border border-line text-ink-muted hover:border-line-strong hover:text-ink"
        }`}
      >
        {armado ? "Confirmar?" : "Excluir"}
        {/*
          A vírgula inicial não é estética: sem ela o texto sr-only fica
          idêntico à descrição impressa na célula ao lado, e toda busca por
          descrição na tabela passa a achar dois nós. É o mesmo formato do
          `BotaoPago`, e lido em voz alta sai "Excluir, Almoço".
        */}
        <span className="sr-only">{armado ? `, excluir ${descricao}` : `, ${descricao}`}</span>
      </button>
      {erro === "" ? null : (
        <span role="alert" className="text-[13px] font-medium text-negativo">
          {erro}
        </span>
      )}
    </span>
  );
}
