"use client";

import { XIcon } from "@phosphor-icons/react";
import { createContext, useContext, useEffect, useId, useRef, useState } from "react";

/**
 * O cadastro num diálogo modal, aberto por um botão no topo da área.
 *
 * **O elemento é o `<dialog>` nativo, e isso é a decisão.** Um painel feito à
 * mão precisaria de armadilha de foco, `Escape`, devolução do foco à origem,
 * inércia do resto da página e `aria-modal` — cinco comportamentos, cada um com
 * seu jeito de dar errado. `showModal()` entrega os cinco. A alternativa não
 * seria mais simples, seria a mesma coisa pior implementada.
 *
 * **Em tela estreita ele ocupa tudo.** Os formulários são longos, e o de compra
 * tem a prévia de parcelas. Um painel centralizado num celular com o teclado
 * aberto deixaria pouco mais de 200px úteis.
 *
 * **O conteúdo nunca é desmontado.** `<dialog>` fechado já não renderiza nada
 * na tela, e manter os filhos montados preserva o que foi digitado quando a
 * pessoa fecha sem querer e reabre. Desmontar apagaria o formulário inteiro.
 *
 * O `fechar` chega aos formulários por contexto, e não por prop: eles são
 * filhos vindos de um componente de servidor, e função não atravessa essa
 * fronteira. `useFecharDialogo` devolve um no-op fora de um diálogo, então o
 * mesmo formulário continua servindo numa página comum.
 */

const ContextoDoDialogo = createContext<(() => void) | null>(null);

/** Fecha o diálogo que envolve este componente. No-op fora de um. */
export function useFecharDialogo(): () => void {
  return useContext(ContextoDoDialogo) ?? (() => undefined);
}

export function DialogoDeCadastro({
  rotuloDoBotao,
  titulo,
  children,
}: {
  readonly rotuloDoBotao: string;
  readonly titulo: string;
  readonly children: React.ReactNode;
}) {
  const id = useId();
  const dialogo = useRef<HTMLDialogElement>(null);
  const [aberto, setAberto] = useState(false);

  function abrir(): void {
    dialogo.current?.showModal();
    setAberto(true);
  }

  function fechar(): void {
    dialogo.current?.close();
  }

  /*
   * O estado acompanha o elemento, e não o contrário. `Escape` fecha o
   * `<dialog>` sem passar pelo nosso código; sem ouvir `close`, o React
   * continuaria achando que está aberto.
   */
  useEffect(() => {
    const elemento = dialogo.current;
    if (!elemento) {
      return;
    }
    const aoFechar = () => setAberto(false);
    elemento.addEventListener("close", aoFechar);
    return () => elemento.removeEventListener("close", aoFechar);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        className="inline-flex min-h-11 w-fit items-center justify-center rounded-pill bg-primary px-6 text-[15px] font-semibold text-on-primary transition-[transform,background-color] duration-200 hover:bg-primary-ativo active:scale-[0.97]"
      >
        {rotuloDoBotao}
      </button>

      {/* biome-ignore lint/a11y/useKeyWithClickEvents: o alvo do clique é o
          backdrop, que não é foco de teclado; `Escape` já fecha pelo nativo. */}
      <dialog
        ref={dialogo}
        aria-labelledby={`${id}-titulo`}
        /* Clique no backdrop fecha. O evento chega no próprio `<dialog>`
           quando cai fora do conteúdo, que é o que distingue um do outro. */
        onClick={(evento) => {
          if (evento.target === dialogo.current) {
            fechar();
          }
        }}
        className="m-auto w-full max-w-[42rem] rounded-none border border-line bg-canvas p-0 text-ink backdrop:bg-[color-mix(in_oklab,var(--color-ink)_45%,transparent)] sm:rounded-xl max-sm:h-dvh max-sm:max-h-none max-sm:max-w-none"
      >
        <div className="flex max-h-[85dvh] flex-col gap-4 overflow-y-auto p-5 max-sm:max-h-dvh sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id={`${id}-titulo`} className="text-[22px]">
              {titulo}
            </h2>
            <button
              type="button"
              onClick={fechar}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-pill text-ink-muted transition-colors duration-200 hover:bg-surface-strong hover:text-ink"
            >
              <XIcon size={20} aria-hidden="true" />
              <span className="sr-only">Fechar</span>
            </button>
          </div>

          <ContextoDoDialogo value={fechar}>{children}</ContextoDoDialogo>
        </div>
      </dialog>
    </>
  );
}
