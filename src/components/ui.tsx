import type { ComponentPropsWithoutRef, ReactNode } from "react";

/**
 * Primitivas visuais. Existem para que a escala de raios seja regra e não
 * intenção: se cada tela escolher o próprio arredondamento, a identidade
 * some em duas semanas.
 *
 * Nenhuma delas é cliente. Motion e GSAP entram nos componentes que precisam,
 * não aqui: obrigar toda a UI a virar Client Component por causa de um botão
 * seria caro à toa.
 */

type Tom = "primario" | "secundario" | "fantasma";

const TOM: Record<Tom, string> = {
  // Tinta sobre creme. O texto é creme, não branco: branco puro sobre a tinta
  // quente vibra e cansa a leitura.
  primario: "bg-ink text-canvas hover:opacity-90",
  secundario: "bg-surface-strong text-ink border border-ink hover:bg-canvas",
  fantasma: "text-ink border border-line hover:border-line-strong hover:bg-surface",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-cta px-6 py-2.5 text-[15px] font-medium " +
  "transition-[transform,opacity,background-color,border-color] duration-200 " +
  // Feedback tátil: o botão afunda sob o dedo. Só transform, nunca layout.
  "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

export function Botao({
  tom = "primario",
  className = "",
  ...resto
}: ComponentPropsWithoutRef<"button"> & { readonly tom?: Tom }) {
  return <button className={`${BASE} ${TOM[tom]} ${className}`} {...resto} />;
}

/**
 * Selo de categoria. Pill completo, nunca o raio médio: é o contraste entre
 * `--r-chip` e `--r-cta` que dá ritmo à tela.
 */
export function Chip({
  children,
  destaque = false,
}: {
  readonly children: ReactNode;
  readonly destaque?: boolean;
}) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-chip px-3 py-1 text-[13px] font-medium ${
        destaque ? "bg-accent text-accent-contrast" : "border border-line bg-surface text-ink-muted"
      }`}
    >
      {children}
    </span>
  );
}

/**
 * Superfície elevada. `--r-panel` para os blocos grandes da tela do mês,
 * `--r-card` para os compactos.
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
      className={`bg-surface shadow-lift ${grande ? "rounded-panel p-6 sm:p-8" : "rounded-card p-5"} ${className}`}
      {...resto}
    >
      {children}
    </section>
  );
}
