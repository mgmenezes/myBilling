"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useLayoutEffect, useState } from "react";

/**
 * Escolha de tema: sistema, claro ou escuro.
 *
 * **Por que três opções e não um interruptor.** Um botão que só alterna entre
 * claro e escuro sequestra a preferência: quem configurou o sistema para virar
 * escuro à noite perde isso para sempre no primeiro clique. "Sistema" é o
 * estado inicial e continua alcançável — é ele que devolve o controle ao
 * sistema operacional.
 *
 * **Por que os três estados ficam visíveis.** Um controle que esconde o estado
 * atual obriga a pessoa a clicar para descobrir onde está. São três botões,
 * cabem em 108 pixels, e o selecionado é marcado por fundo, peso e um ícone
 * preenchido — nunca só por cor (mesma regra da navegação principal).
 *
 * **Nada de paleta aqui.** O componente escreve um atributo e só: `data-tema`
 * no `<html>`. Quem traduz isso em cor é o `color-scheme` do `globals.css`, e
 * é por isso que barra de rolagem, `<select>` e `<input type=date>` — que
 * nenhuma classe utilitária alcança — trocam de tema junto.
 *
 * A ausência do atributo é o estado "sistema". Ela é significativa: sem
 * atributo, o `color-scheme: light dark` do `:root` deixa o sistema
 * operacional decidir, inclusive para quem está sem JavaScript.
 */

export const CHAVE_TEMA = "mybilling:tema";

export type Tema = "sistema" | "claro" | "escuro";

const OPCOES = [
  { valor: "sistema", rotulo: "Tema do sistema", Icone: MonitorIcon },
  { valor: "claro", rotulo: "Tema claro", Icone: SunIcon },
  { valor: "escuro", rotulo: "Tema escuro", Icone: MoonIcon },
] as const satisfies ReadonlyArray<{ valor: Tema; rotulo: string; Icone: typeof SunIcon }>;

/**
 * Script inline do `<head>`. Roda durante o parse do HTML, antes da primeira
 * pintura: sem ele, quem escolheu claro veria um lampejo escuro em todo
 * carregamento. `try/catch` porque `localStorage` lança em janela anônima com
 * cookies bloqueados, e um tema é motivo ruim para derrubar a página.
 */
export const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem(${JSON.stringify(CHAVE_TEMA)});if(t==="claro"||t==="escuro")document.documentElement.setAttribute("data-tema",t)}catch(e){}})()`;

function aplicar(tema: Tema): void {
  if (tema === "sistema") {
    document.documentElement.removeAttribute("data-tema");
    return;
  }
  document.documentElement.setAttribute("data-tema", tema);
}

function lerArmazenado(): Tema {
  try {
    const bruto = localStorage.getItem(CHAVE_TEMA);
    return bruto === "claro" || bruto === "escuro" ? bruto : "sistema";
  } catch {
    return "sistema";
  }
}

export function AlternadorDeTema() {
  // O servidor não tem como saber a escolha, então o primeiro render é sempre
  // "sistema" — igual no servidor e no cliente, sem erro de hidratação.
  const [tema, setTema] = useState<Tema>("sistema");

  /*
   * `useLayoutEffect`, e não `useEffect`: ele roda antes da pintura, então o
   * botão nunca aparece marcando a opção errada. Reaplicar o atributo aqui
   * também cobre o remount do Strict Mode em desenvolvimento, que zera os
   * atributos do `<html>` que não vêm do JSX e apagaria o que o script inline
   * escreveu.
   */
  useLayoutEffect(() => {
    const armazenado = lerArmazenado();
    setTema(armazenado);
    aplicar(armazenado);
  }, []);

  function escolher(novo: Tema): void {
    setTema(novo);
    aplicar(novo);
    try {
      if (novo === "sistema") {
        localStorage.removeItem(CHAVE_TEMA);
      } else {
        localStorage.setItem(CHAVE_TEMA, novo);
      }
    } catch {
      // Sem persistência a escolha vale só para esta aba. É degradação
      // aceitável; travar a troca de tema não é.
    }
  }

  return (
    <fieldset className="flex items-center gap-0.5 rounded-pill bg-surface-strong p-0.5">
      <legend className="sr-only">Tema da interface</legend>
      {OPCOES.map(({ valor, rotulo, Icone }) => {
        const ativo = tema === valor;
        return (
          <label key={valor}>
            <input
              type="radio"
              name="tema"
              value={valor}
              checked={ativo}
              onChange={() => escolher(valor)}
              className="peer sr-only"
            />
            <span className="sr-only">{rotulo}</span>
            {/*
              O anel de foco vem do `peer`, e não do `:focus-visible` global:
              o input real está em `sr-only` e é ele que recebe o foco.
            */}
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-pill text-ink-muted transition-colors duration-200 peer-checked:bg-inverso peer-checked:text-on-inverso peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary hover:text-ink"
            >
              <Icone size={17} weight={ativo ? "fill" : "regular"} />
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
