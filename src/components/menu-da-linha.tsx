"use client";

import { DotsThreeIcon } from "@phosphor-icons/react";
import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * O menu "⋯" da linha de um lançamento (DENS-02; EXC-01).
 *
 * As ações saem da linha para a lista mostrar o que se lê: descrição, categoria,
 * data, situação e valor. O conteúdo é de quem monta o menu: o avulso passa o
 * `BotaoExcluir` de dois toques, a parcela passa o aviso de `ExcluirParcelas`.
 * O conteúdo recebe `fechar`, que fecha o menu e devolve o foco ao "⋯", pelo
 * mesmo caminho do `Escape` (EXC-02, AC 9). Fechado, o conteúdo sai da árvore:
 * reabrir o menu o monta do zero.
 *
 * **O painel abre dentro da própria célula,** sem portal. A confirmação do
 * excluir se desarma quando o foco sai dela, e as consultas da tela e dos
 * testes ficam presas à linha. Pelo mesmo motivo o painel não usa
 * `role="menu"`: "Excluir" continua sendo um botão, achado como sempre. O
 * padrão é o de mostrar e esconder (disclosure), com `aria-expanded`.
 *
 * Fecha com `Escape`, que devolve o foco ao "⋯", com um clique fora e quando o
 * foco sai do conjunto.
 *
 * 44 px no toque (TOQUE-01); 32 px com ponteiro fino, como o selo.
 */
export function MenuDaLinha({
  descricao,
  children,
}: {
  readonly descricao: string;
  readonly children: (fechar: () => void) => ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLSpanElement>(null);
  const gatilho = useRef<HTMLButtonElement>(null);
  const id = useId();

  const fechar = useCallback(() => {
    setAberto(false);
    gatilho.current?.focus();
  }, []);

  /*
   * Os ouvintes só existem com o menu aberto. `Escape` fecha e devolve o foco
   * ao "⋯"; o foco saindo do conjunto fecha; um toque fora fecha. São
   * registrados aqui, e não no JSX do `span`, que não é um controle.
   */
  useEffect(() => {
    const conjunto = raiz.current;
    if (!aberto || conjunto === null) {
      return;
    }
    function aoTeclar(evento: KeyboardEvent): void {
      if (evento.key === "Escape") {
        fechar();
      }
    }
    function aoPerderFoco(evento: FocusEvent): void {
      if (!conjunto?.contains(evento.relatedTarget as Node | null)) {
        setAberto(false);
      }
    }
    function aoTocarFora(evento: PointerEvent): void {
      if (!conjunto?.contains(evento.target as Node)) {
        setAberto(false);
      }
    }
    conjunto.addEventListener("keydown", aoTeclar);
    conjunto.addEventListener("focusout", aoPerderFoco);
    document.addEventListener("pointerdown", aoTocarFora);
    return () => {
      conjunto.removeEventListener("keydown", aoTeclar);
      conjunto.removeEventListener("focusout", aoPerderFoco);
      document.removeEventListener("pointerdown", aoTocarFora);
    };
  }, [aberto, fechar]);

  return (
    <span ref={raiz} className="relative inline-flex">
      <button
        ref={gatilho}
        type="button"
        aria-expanded={aberto}
        aria-controls={aberto ? id : undefined}
        onClick={() => setAberto((estava) => !estava)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-pill text-ink-muted transition-colors duration-200 hover:bg-surface-strong hover:text-ink md:pointer-fine:min-h-8 md:pointer-fine:min-w-8"
      >
        <DotsThreeIcon size={20} weight="bold" aria-hidden="true" />
        <span className="sr-only">Mais ações para {descricao}</span>
      </button>
      {aberto ? (
        <span
          id={id}
          className="absolute top-full right-0 z-20 mt-1 flex rounded-lg border border-line bg-surface p-1 shadow-lift"
        >
          {children(fechar)}
        </span>
      ) : null}
    </span>
  );
}
