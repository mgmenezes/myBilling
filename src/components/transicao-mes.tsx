"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useRef } from "react";

/**
 * Entrada direcional do conteúdo do mês.
 *
 * O que a animação comunica, em uma frase: **se você voltou ou avançou no
 * tempo.** Sem ela, trocar de mês é um pisca de conteúdo e a pessoa perde a
 * noção de direção depois de dois cliques seguidos.
 *
 * A direção sai de comparar a competência nova com a anterior. `'YYYY-MM'`
 * ordena lexicograficamente igual à ordem cronológica, então a comparação de
 * string é exata aqui, sem precisar converter para data.
 *
 * Folha de cliente isolada: o conteúdo chega pronto do servidor como
 * `children` e esta camada só o envolve. **Nenhum GSAP nesta árvore**: as
 * duas bibliotecas brigam pelos mesmos frames.
 *
 * Só `transform` e `opacity` animam. Nada de `left` ou `width`, que forçam
 * layout a cada frame e travam no celular.
 *
 * **Por que existe um invólucro com `overflow-x: clip`.** Translação para a
 * direita cria área rolável: durante a entrada de um mês seguinte, os 28
 * pixels de deslocamento apareciam como barra de rolagem horizontal em tela de
 * 400 pixels — e o `UI-03, AC 9` media justamente isso, falhando de forma
 * intermitente conforme pegasse a animação no meio. (Para a esquerda o
 * navegador não cria área rolável, então só um dos sentidos falhava.)
 *
 * O `clip` é `x` apenas, e vale só para a árvore que anima. Não é o
 * `overflow-x: hidden` de página inteira que o layout do app proíbe: aquele
 * esconderia transbordo de layout de verdade e faria a medição passar sem
 * significar nada. Este recorta o transform de uma animação, que não é
 * conteúdo. `clip` e não `hidden` porque `hidden` num eixo transforma o outro
 * em contêiner de rolagem e mataria qualquer `position: sticky` aqui dentro.
 */
export function TransicaoMes({
  competencia,
  children,
}: {
  readonly competencia: string;
  readonly children: ReactNode;
}) {
  const anterior = useRef(competencia);
  const reduzir = useReducedMotion();

  const avancou = competencia >= anterior.current;
  anterior.current = competencia;

  if (reduzir) {
    return <div>{children}</div>;
  }

  return (
    <div className="overflow-x-clip">
      <motion.div
        key={competencia}
        initial={{ opacity: 0, x: avancou ? 28 : -28 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}
