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
    <motion.div
      key={competencia}
      initial={{ opacity: 0, x: avancou ? 28 : -28 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
