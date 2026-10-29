import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Os filtros da lista vivem na URL. Este hook é o acesso a ela que o cartão
 * de filtros e a barra compacta compartilham (LST-03): os dois leem e gravam
 * os mesmos parâmetros, e não existe um segundo estado de filtro.
 *
 * **A busca espera 250ms antes de navegar**: sem isso, cada tecla vira uma
 * navegação e o campo perde o foco no meio da digitação. O `useState` existe
 * só para o campo não perder caractere enquanto a espera corre.
 *
 * **O campo segue a URL quando ela muda por fora.** Com dois campos de busca
 * na página, o que não foi digitado ficaria com o termo antigo e o regravaria
 * 250ms depois, desfazendo a busca do outro. A escrita do próprio campo, ao
 * chegar, não conta como mudança de fora: a pessoa pode já ter digitado mais.
 */
export function useFiltrosNaUrl() {
  const router = useRouter();
  const parametros = useSearchParams();

  const buscaNaUrl = parametros.get("busca") ?? "";
  const [busca, setBusca] = useState(buscaNaUrl);
  /** O último termo que esta busca gravou, ou que ela já acompanhou. */
  const escrita = useRef(buscaNaUrl);

  useEffect(() => {
    if (buscaNaUrl !== escrita.current) {
      escrita.current = buscaNaUrl;
      setBusca(buscaNaUrl);
    }
  }, [buscaNaUrl]);

  function navegarCom(mudancas: Record<string, string>) {
    const proximos = new URLSearchParams(parametros.toString());
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor === "") {
        proximos.delete(chave);
      } else {
        proximos.set(chave, valor);
      }
    }
    const query = proximos.toString();
    router.replace(query === "" ? "?" : `?${query}`, { scroll: false });
  }

  // Debounce: navegar a cada tecla tiraria o foco do campo no meio da palavra.
  useEffect(() => {
    if (busca === buscaNaUrl) {
      return;
    }
    const temporizador = setTimeout(() => {
      escrita.current = busca;
      const proximos = new URLSearchParams(parametros.toString());
      if (busca === "") {
        proximos.delete("busca");
      } else {
        proximos.set("busca", busca);
      }
      const query = proximos.toString();
      router.replace(query === "" ? "?" : `?${query}`, { scroll: false });
    }, 250);
    return () => clearTimeout(temporizador);
  }, [busca, buscaNaUrl, parametros, router]);

  function limparTudo() {
    setBusca("");
    router.replace("?", { scroll: false });
  }

  return { parametros, busca, setBusca, navegarCom, limparTudo };
}
