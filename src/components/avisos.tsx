"use client";

import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * O aviso do que acabou de acontecer, num toast que some sozinho.
 *
 * Nasceu para a troca de categoria na linha (TRC-04): a troca grava ao
 * escolher, sem formulário, e um fixo trocado num mês muda todos. Sem um aviso
 * o alcance seria invisível, e a confirmação não tem onde morar dentro de uma
 * célula de tabela.
 *
 * **Um provedor no layout, e não um toast por componente.** Quem avisa só
 * chama `avisar(texto)`. Um aviso por vez: o novo substitui o anterior e o
 * prazo recomeça dele, inclusive quando o texto é o mesmo, que é o caso de duas
 * trocas seguidas de gasto do mês.
 *
 * **A região `status` só existe enquanto há aviso.** Uma região sempre montada
 * e vazia seria a segunda `status` de toda página com formulário, e os e2e que
 * procuram a confirmação do cadastro por esse papel passariam a achar duas. Em
 * troca, quem fica sempre montado é o contêiner `aria-live`: região viva que
 * nasce já com o texto dentro é anunciada de forma irregular pelos leitores de
 * tela, e a inserção dentro de uma região que já existia é anunciada.
 *
 * **Visual.** Superfície invertida, que no sistema é o sinal de destaque sem
 * cor nova; raio de bloco de aviso (16px); e a única sombra do sistema, porque
 * ele flutua sobre a lista. No celular ocupa a largura menos o respiro de 16px
 * de cada lado e quebra linha, sem forçar largura nenhuma: a página não rola na
 * horizontal em 400 pixels (UI-03, AC 9). Não recebe clique: `pointer-events`
 * desligado deixa a linha embaixo dele tocável durante os 4 segundos.
 */

const DURACAO_MS = 4000;

interface Avisos {
  avisar(texto: string): void;
}

interface Aviso {
  /** Distingue dois avisos de mesmo texto: o segundo recomeça o prazo. */
  readonly id: number;
  readonly texto: string;
}

const ContextoDeAvisos = createContext<Avisos | null>(null);

export function ProvedorDeAvisos({ children }: { readonly children: ReactNode }) {
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const avisar = useCallback((texto: string) => {
    setAviso((anterior) => ({ id: (anterior?.id ?? 0) + 1, texto }));
  }, []);

  /* O prazo conta de cada aviso novo; trocar de aviso cancela o do anterior. */
  useEffect(() => {
    if (aviso === null) {
      return;
    }
    const prazo = setTimeout(() => setAviso(null), DURACAO_MS);
    return () => clearTimeout(prazo);
  }, [aviso]);

  const valor = useMemo<Avisos>(() => ({ avisar }), [avisar]);

  return (
    <ContextoDeAvisos value={valor}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center"
      >
        {aviso === null ? null : (
          <p
            key={aviso.id}
            role="status"
            className="max-w-[28rem] rounded-lg bg-inverso px-5 py-3 text-[15px] text-on-inverso shadow-lift transition-[opacity,translate] duration-200 starting:translate-y-2 starting:opacity-0"
          >
            {aviso.texto}
          </p>
        )}
      </div>
    </ContextoDeAvisos>
  );
}

export function useAvisos(): Avisos {
  const avisos = use(ContextoDeAvisos);
  if (avisos === null) {
    throw new Error("useAvisos precisa de um ProvedorDeAvisos acima dele.");
  }
  return avisos;
}
