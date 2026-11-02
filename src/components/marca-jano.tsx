/**
 * O símbolo do Jano: dois arcos de costas, cada um com um ponto, as duas faces
 * do deus romano que olhava para o que passou e para o que vem (AD-026).
 *
 * O mesmo desenho do `#icone-jano` da landing e de `src/app/icon.svg`. Em
 * `currentColor`, para seguir a cor do texto em volta e o tema. Provisório
 * até o dono fechar a marca com um designer.
 */
export function MarcaJano({ tamanho = 24 }: { readonly tamanho?: number }) {
  return (
    <svg
      data-marca="jano"
      width={tamanho}
      height={tamanho}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
        <path d="M14 5a11 11 0 0 0 0 22" />
        <path d="M18 5a11 11 0 0 1 0 22" />
      </g>
      <circle cx={7.5} cy={13} r={1.6} fill="currentColor" />
      <circle cx={24.5} cy={13} r={1.6} fill="currentColor" />
    </svg>
  );
}
