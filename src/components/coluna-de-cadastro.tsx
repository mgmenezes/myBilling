"use client";

import { XIcon } from "@phosphor-icons/react";
import { type ReactNode, useEffect, useRef } from "react";

/**
 * A grade das abas de Cadastros: o cabeçalho, o painel do item aberto e a
 * lista (CADCOL-09; CADCOL-04, AC 15; CADCOL-10, ACs 2 e 3).
 *
 * **Um painel só, que muda de lugar por CSS**, como o de Todo mês e o cartão
 * de filtros de Lançamentos. Abaixo de 1.536 px a tela é uma coluna de até
 * 1.024 px, e o painel vem entre o cabeçalho e a lista, só enquanto algo está
 * aberto (ACs 5 e 6). Sem nada aberto, o bloco vazio, com o título e a dica,
 * fica no DOM e só aparece a partir de 1.536 px (AC 3).
 *
 * **A grade é desta fatia, e não a de Todo mês.** `TodoMes` desenha a mesma
 * forma presa ao estado dele; extrair uma peça comum às três telas é a dívida
 * que a spec registra (Assumptions, "Componente da coluna").
 *
 * **O título é do conteúdo.** Cada conteúdo desenha o seu `TituloDoPainel`,
 * e assim a pill otimista da categoria mora no componente que grava a cor e o
 * nome, sem estado erguido. A coluna só sabe achá-lo para dar o foco.
 *
 * **O foco.** Quando `focarTitulo` muda, o título do painel recebe o foco e,
 * abaixo de 1.536 px, entra na janela (CADCOL-10, ACs 2 e 5): o painel vem
 * antes da lista no DOM, e sem isso quem usa teclado não chegaria a ele. A
 * carga com o item no endereço passa 0 e não rouba o foco (CADCOL-11, AC 2). O
 * botão de envio que se desabilita enquanto grava perde o foco para o `body`;
 * a guarda de Todo mês o devolve ao título, sem rolar, para o `Escape`
 * continuar alcançando o painel e a mensagem junto do botão continuar à vista.
 */

/** O título do painel, pela marca que `TituloDoPainel` põe nele. */
function tituloDe(painel: HTMLElement | null): HTMLElement | null {
  return painel?.querySelector<HTMLElement>("[data-titulo-do-painel]") ?? null;
}

/** O título do conteúdo do painel: o alvo do foco ao abrir. */
export function TituloDoPainel({ children }: { readonly children: ReactNode }) {
  return (
    <h2
      data-titulo-do-painel=""
      tabIndex={-1}
      /* O respiro à direita é o do "Fechar", que fica no canto. */
      className="pr-12 text-[22px] leading-[1.2] tracking-[-0.01em]"
    >
      {children}
    </h2>
  );
}

export function ColunaDeCadastro({
  cabecalho,
  lista,
  idDoPainel,
  rotuloDoPainel,
  aberto,
  vazio,
  focarTitulo,
  aoFechar,
}: {
  readonly cabecalho: ReactNode;
  readonly lista: ReactNode;
  /** `painel-da-categoria` ou `painel-do-meio`: o botão de cada linha aponta para ele. */
  readonly idDoPainel: string;
  /** "Painel da categoria" ou "Painel do meio de pagamento". */
  readonly rotuloDoPainel: string;
  /** O conteúdo do painel; `null` quando nada está aberto. */
  readonly aberto: ReactNode | null;
  readonly vazio: { readonly titulo: string; readonly texto: string };
  /** Muda a cada abertura feita pela pessoa; 0 enquanto nenhuma foi feita. */
  readonly focarTitulo: number;
  readonly aoFechar: () => void;
}) {
  const painel = useRef<HTMLElement>(null);

  /* Vale também quando o painel nasce junto com o pedido: o efeito roda
     depois de ele estar no DOM. */
  useEffect(() => {
    if (focarTitulo !== 0) {
      tituloDe(painel.current)?.focus();
    }
  }, [focarTitulo]);

  return (
    <div className="mx-auto grid w-full max-w-conteudo gap-6 px-4 py-8 sm:px-6 sm:py-10">
      {cabecalho}

      <div className={aberto === null ? "hidden 2xl:block" : "min-w-0"}>
        {aberto === null ? (
          <div className="flex flex-col gap-2">
            <h2 className="text-[22px] leading-[1.2] tracking-[-0.01em]">{vazio.titulo}</h2>
            <p className="text-[15px] text-ink-muted">{vazio.texto}</p>
          </div>
        ) : (
          <aside
            ref={painel}
            id={idDoPainel}
            aria-label={rotuloDoPainel}
            onKeyDown={(evento) => {
              if (evento.key === "Escape") {
                aoFechar();
              }
            }}
            onBlur={(evento) => {
              /* Sem destino e com o botão desabilitado: é o navegador tirando
                 o foco de quem passou a gravar, e não a pessoa saindo. */
              if (
                evento.relatedTarget === null &&
                evento.target instanceof HTMLButtonElement &&
                evento.target.disabled
              ) {
                tituloDe(painel.current)?.focus({ preventScroll: true });
              }
            }}
            className="relative flex flex-col gap-5 rounded-xl border border-line bg-surface p-5"
          >
            {aberto}
            <button
              type="button"
              aria-label="Fechar"
              onClick={aoFechar}
              className="absolute top-3 right-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-pill text-ink-muted transition-colors duration-200 hover:bg-surface-strong hover:text-ink"
            >
              <XIcon size={20} aria-hidden="true" />
            </button>
          </aside>
        )}
      </div>

      <div className="min-w-0">{lista}</div>
    </div>
  );
}
