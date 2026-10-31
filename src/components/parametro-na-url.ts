"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";

/**
 * Põe ou tira um parâmetro do endereço, sem mexer nos outros, sem entrada nova
 * no histórico e sem rolar a página (CADCOL-11, ACs 1 e 4).
 *
 * **Pelo roteador do Next, e não por `history.replaceState`**, como o `?fixo=`
 * de Todo mês (`todo-mes.tsx`, `mudarEndereco`). O `replaceState` muda o
 * endereço sem que o Next desenhe a página dele e deixa uma rolagem até o alto
 * pendente, que a próxima página relida executa: a confirmação de salvar saía
 * da janela. Pelo `router.replace(…, { scroll: false })`, a navegação lê no
 * servidor a página do endereço novo e não rola.
 *
 * **A comparação é com o último valor pedido**, e não com `window.location`.
 * Pelo roteador, a barra só muda quando o servidor responde, uns 100 ms depois;
 * comparar com ela errava quem fechava logo depois de abrir, ou reabria logo
 * depois de fechar (L-058). Vale o último pedido, porque o Next descarta a
 * navegação pendente quando chega outra. Começa com o valor da carga, mesmo
 * fora da lista: é o que está no endereço, e fechar ou abrir o cadastro o tira.
 *
 * É a mesma regra de Todo mês, num hook que as duas abas de Cadastros dividem;
 * Todo mês continua com a cópia dele até a peça comum às três telas (spec,
 * "Componente da coluna").
 */
export function useParametroNaUrl(
  nome: string,
  inicial: string | null,
): (valor: string | null) => void {
  const router = useRouter();
  const pedido = useRef<string | null>(inicial);

  return useCallback(
    (valor: string | null) => {
      if (valor === pedido.current) {
        return;
      }
      pedido.current = valor;
      const parametros = new URLSearchParams(window.location.search);
      if (valor === null) {
        parametros.delete(nome);
      } else {
        parametros.set(nome, valor);
      }
      const busca = parametros.toString();
      router.replace(busca === "" ? window.location.pathname : `?${busca}`, { scroll: false });
    },
    [nome, router],
  );
}
