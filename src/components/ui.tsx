import type { ComponentPropsWithoutRef, ReactNode } from "react";

/**
 * Primitivas visuais, escritas contra as specs de componente do `DESIGN.md`.
 * Existem para que a escala de raios seja regra e não intenção: se cada tela
 * escolher o próprio arredondamento, a identidade some em duas semanas.
 *
 * **Hoje nenhuma delas tem chamador** — as telas ainda estilizam à mão. Elas
 * ficam porque são a referência escrita do sistema; quando a próxima tela
 * nascer, ela nasce daqui em vez de reinventar o botão.
 *
 * Nenhuma delas é cliente. Motion e GSAP entram nos componentes que precisam,
 * não aqui: obrigar toda a UI a virar Client Component por causa de um botão
 * seria caro à toa.
 */

type Tom = "primario" | "secundario" | "terciario";

const TOM: Record<Tom, string> = {
  // `button-primary`: o azul da marca com texto branco. Mede 5,75:1. É a
  // única cor de ação do sistema, e por isso aparece uma ou duas vezes por
  // tela — não uma vez por bloco.
  primario: "bg-primary text-on-primary hover:bg-primary-ativo",
  // `button-secondary-light`: cinza de elevação, sem borda. Mesma geometria de
  // pílula, voltagem zero.
  secundario: "bg-surface-strong text-ink hover:bg-line",
  // `button-tertiary-text`: link em forma de botão, sem preenchimento.
  terciario: "text-primary-texto hover:underline",
};

/**
 * `height: 44px` não é arredondamento de layout: é o piso de alvo de toque que
 * o documento declara atingir em AAA. Descer daqui reprova no celular.
 */
const BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-pill px-5 text-[16px] font-semibold " +
  "transition-[transform,background-color,color] duration-200 " +
  // Feedback tátil: o botão afunda sob o dedo. Só transform, nunca layout.
  "active:scale-[0.97] disabled:pointer-events-none disabled:bg-primary-inativo";

export function Botao({
  tom = "primario",
  className = "",
  ...resto
}: ComponentPropsWithoutRef<"button"> & { readonly tom?: Tom }) {
  return <button className={`${BASE} ${TOM[tom]} ${className}`} {...resto} />;
}

/**
 * `badge-pill`. Cinza de elevação com tinta por cima, **nunca** azul: selo não
 * é ação, e pintá-lo com a cor de ação ensina o olho a ignorar o botão de
 * verdade. Quando um selo precisa gritar, quem grita é a semântica de valor,
 * em texto.
 */
export function Chip({
  children,
  tom = "neutro",
}: {
  readonly children: ReactNode;
  readonly tom?: "neutro" | "positivo" | "negativo";
}) {
  const cor =
    tom === "positivo" ? "text-positivo" : tom === "negativo" ? "text-negativo" : "text-ink";

  return (
    <span
      className={`inline-flex w-fit items-center rounded-pill bg-surface-strong px-3 py-1 text-[12px] font-semibold ${cor}`}
    >
      {children}
    </span>
  );
}

/**
 * `feature-card`. Chapado, com hairline de 1px — e não com sombra. O sistema
 * tem **um** nível de sombra, reservado para estado levantado; sobre canvas
 * branco quem separa o cartão do fundo é a borda.
 */
export function Painel({
  children,
  className = "",
  grande = false,
  ...resto
}: ComponentPropsWithoutRef<"section"> & {
  readonly grande?: boolean;
}) {
  return (
    <section
      className={`rounded-xl border border-line bg-surface ${grande ? "p-6 sm:p-8" : "p-5"} ${className}`}
      {...resto}
    >
      {children}
    </section>
  );
}
