"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import type { excluirCompraDestaParcela as excluirAction } from "@/app/actions/compras";
import type { ExclusaoDaParcela } from "@/application/mes/obter-visao-mensal/handler";
import { useAvisos } from "./avisos";
import { BASE } from "./botao-excluir";
import { useFecharMenu } from "./menu-da-linha";
import { avisoDaExclusao, toastDaExclusao } from "./texto-da-exclusao";

/**
 * Excluir uma compra parcelada desta parcela em diante, dentro do menu "⋯" da
 * linha da parcela (EXC-01, EXC-02).
 *
 * "Excluir" mostra o aviso do que sai, sem excluir nada; "Excluir desta em
 * diante" grava; "Cancelar" fecha o menu pelo mesmo caminho do `Escape`
 * (`useFecharMenu`, do `MenuDaLinha`). Os números do aviso vêm da carga da página; o
 * toast usa o que o servidor de fato excluiu, que pode ser outro se uma outra
 * aba mexeu na compra no meio do caminho.
 *
 * **"Excluir" e "Cancelar" são o mesmo botão.** Ele fica na mesma posição da
 * árvore e só troca de texto, então o elemento focado não sai do DOM no
 * primeiro toque. Desmontar o botão com foco dispara `focusout` sem destino, e
 * o menu entenderia que o foco saiu dele e fecharia. De quebra, um toque duplo
 * sem querer cai em "Cancelar", e não no botão que apaga.
 *
 * Sem estado otimista, como o `BotaoExcluir`: a linha só sai quando a
 * revalidação confirma.
 */
export function ExcluirParcelas({
  lancamentoId,
  descricao,
  exclusao,
  excluir,
}: {
  readonly lancamentoId: string;
  readonly descricao: string;
  readonly exclusao: ExclusaoDaParcela;
  readonly excluir: typeof excluirAction;
}) {
  const [avisando, setAvisando] = useState(false);
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();
  const { avisar } = useAvisos();
  const fechar = useFecharMenu();
  const principal = useRef<HTMLButtonElement>(null);
  const idDoAviso = useId();

  /* No Safari o toque não dá foco ao botão: o foco vai para "Cancelar" aqui (EXC-02, AC 7). */
  useEffect(() => {
    if (avisando) {
      principal.current?.focus();
    }
  }, [avisando]);

  function confirmar() {
    iniciar(async () => {
      const resposta = await excluir({ lancamentoId });
      if (resposta.ok) {
        avisar(toastDaExclusao(resposta.data.parcelasExcluidas));
      } else {
        setErro(resposta.erro.mensagem);
      }
    });
  }

  return (
    <span
      className={`flex flex-col items-start gap-2 ${avisando ? "w-64 max-w-[calc(100vw-3rem)] p-1" : ""}`}
    >
      {avisando ? (
        <span id={idDoAviso} className="text-[13px] text-ink">
          {avisoDaExclusao(descricao, exclusao)}
        </span>
      ) : null}
      <span className="flex flex-wrap items-center gap-2">
        {avisando && exclusao.tipo === "PLANO" ? (
          <button
            type="button"
            disabled={pendente}
            onClick={confirmar}
            className={`${BASE} border border-negativo font-semibold text-negativo`}
          >
            Excluir desta em diante
          </button>
        ) : null}
        <button
          ref={principal}
          type="button"
          aria-describedby={avisando ? idDoAviso : undefined}
          onClick={() => {
            if (avisando) {
              fechar();
              return;
            }
            setErro("");
            setAvisando(true);
          }}
          className={`${BASE} border border-line text-ink-muted hover:border-line-strong hover:text-ink`}
        >
          {avisando ? "Cancelar" : "Excluir"}
          {/* A vírgula pelo mesmo motivo do `BotaoExcluir`: sem ela o nome
              repetiria a descrição impressa na linha. */}
          {avisando ? null : <span className="sr-only">, {descricao}</span>}
        </button>
      </span>
      {erro === "" ? null : (
        <span role="alert" className="text-[13px] font-medium text-negativo">
          {erro}
        </span>
      )}
    </span>
  );
}
