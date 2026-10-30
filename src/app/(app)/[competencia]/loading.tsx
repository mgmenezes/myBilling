/**
 * Estado de carregamento do mês (UI-02, AC 7).
 *
 * O esqueleto tem a forma da Visão geral que vai chegar (REDE-03, AC 5): no
 * centro, o título, os quatro cards e as duas seções, lado a lado quando cabem;
 * à direita, a coluna de ação, com o cadastro e os últimos lançamentos. São
 * nove blocos, os mesmos nove da página. Um spinner genérico no lugar disso
 * diria apenas "espere"; isto diz "o mês está vindo, e ele se parece com isto",
 * e a página não salta quando o conteúdo real substitui.
 *
 * O seletor de competência não entra: ele é do layout, que já está na tela.
 *
 * A pulsação é CSS puro. Motion aqui carregaria a biblioteca no caminho
 * crítico de uma tela que dura menos de um segundo.
 */
function Bloco({ className }: { readonly className: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface-strong ${className}`} />;
}

export default function CarregandoMes() {
  return (
    <div role="status" aria-live="polite" className="flex flex-1 flex-col xl:flex-row">
      <span className="sr-only">Carregando o mês</span>

      <div className="@container flex min-w-0 flex-1 flex-col gap-6 px-4 py-6 sm:px-8">
        <Bloco className="h-10 w-full max-w-64" />

        <div className="grid gap-3 @xl:grid-cols-2 @3xl:grid-cols-4">
          <Bloco className="h-[104px]" />
          <Bloco className="h-[104px]" />
          <Bloco className="h-[104px]" />
          <Bloco className="h-[104px]" />
        </div>

        <div className="grid gap-6 @3xl:grid-cols-[3fr_2fr]">
          <Bloco className="h-64" />
          <Bloco className="h-64" />
        </div>
      </div>

      <div className="flex flex-col gap-6 border-t border-line px-4 py-6 sm:px-6 xl:w-96 xl:shrink-0 xl:border-t-0 xl:border-l">
        <Bloco className="h-96" />
        <Bloco className="h-64" />
      </div>
    </div>
  );
}
