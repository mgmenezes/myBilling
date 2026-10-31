"use client";

import { CaretDownIcon } from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";
import {
  type ChaveDeBloco,
  COOKIE_BLOCOS_RECOLHIDOS,
  lerBlocosRecolhidos,
} from "@/lib/blocos-recolhidos";

/**
 * Um bloco da lista de Lançamentos que recolhe pelo cabeçalho (LST-02).
 *
 * **Só o disclosure é cliente.** As linhas chegam prontas do servidor como
 * `children`, e este componente decide apenas se elas aparecem. A tabela
 * continua sendo de servidor, pelo mesmo motivo do `BotaoPago`.
 *
 * **O título é o botão**, dentro do `h3`, como no padrão de acordeão: o nome
 * do cabeçalho e o da região continuam sendo só o do bloco, e o resumo fica
 * ao lado, fora do botão, sempre visível, inclusive com o bloco fechado.
 *
 * As linhas recolhidas ficam no DOM com `hidden`, e não saem dele: é o que
 * mantém o alvo de `aria-controls` existindo.
 */

/** Um ano, em segundos. */
const UM_ANO = 60 * 60 * 24 * 365;

function valorDoCookie(): string | undefined {
  const prefixo = `${COOKIE_BLOCOS_RECOLHIDOS}=`;
  return document.cookie
    .split("; ")
    .find((par) => par.startsWith(prefixo))
    ?.slice(prefixo.length);
}

/**
 * Relê o cookie a cada clique, em vez de confiar no estado da página: cada
 * bloco é um componente próprio, e só o cookie sabe quais os outros fecharam.
 */
function gravar(chave: ChaveDeBloco, recolhido: boolean): void {
  const outros = lerBlocosRecolhidos(valorDoCookie()).filter((c) => c !== chave);
  const recolhidos = recolhido ? [...outros, chave] : outros;
  // biome-ignore lint/suspicious/noDocumentCookie: o cookie é lido pelo servidor antes de renderizar (LST-02, AC 4); a Cookie Store API não existe em todo navegador que o app atende.
  document.cookie = `${COOKIE_BLOCOS_RECOLHIDOS}=${recolhidos.join(",")}; path=/; max-age=${UM_ANO}; samesite=lax`;
}

export function BlocoRecolhivel({
  id,
  chave,
  titulo,
  resumo,
  recolhidoNoInicio,
  children,
}: {
  /** Identificador sem espaço: `aria-labelledby` é uma lista de ids. */
  readonly id: string;
  readonly chave: ChaveDeBloco;
  readonly titulo: string;
  /** "12 · R$ 1.200,00 · 8 a pagar", já formatado no servidor. */
  readonly resumo: string;
  /** Do cookie, lido pela página: o bloco fechado já sai fechado no HTML. */
  readonly recolhidoNoInicio: boolean;
  readonly children: ReactNode;
}) {
  const [recolhido, setRecolhido] = useState(recolhidoNoInicio);

  function alternar() {
    const proximo = !recolhido;
    setRecolhido(proximo);
    gravar(chave, proximo);
  }

  return (
    <section aria-labelledby={`bloco-${id}`} className="flex flex-col gap-3">
      {/* A partir de 1.536 px o título fica preso no alto enquanto as linhas do
          bloco passam (DENS-04). Abaixo disso a barra compacta ocupa o alto da
          tela. A `section` limita o quanto ele acompanha; a `div` das linhas
          não ganha nada, porque o HTML dela é lido como está (LST-02). */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 2xl:sticky 2xl:top-0 2xl:z-10 2xl:bg-canvas">
        <h3 id={`bloco-${id}`} className="text-[17px] font-medium tracking-[-0.01em]">
          <button
            type="button"
            aria-expanded={!recolhido}
            aria-controls={`linhas-${id}`}
            onClick={alternar}
            className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-pill px-2 transition-colors duration-200 hover:bg-surface-strong"
          >
            <CaretDownIcon
              size={16}
              weight="bold"
              aria-hidden="true"
              className={`text-ink-muted transition-transform duration-200 ${recolhido ? "-rotate-90" : ""}`}
            />
            {titulo}
          </button>
        </h3>
        <span className="text-[14px] text-ink-muted">{resumo}</span>
      </div>

      <div id={`linhas-${id}`} hidden={recolhido}>
        {children}
      </div>
    </section>
  );
}
