/**
 * Estado de carregamento do mês (UI-02, AC 7).
 *
 * O esqueleto tem a forma do conteúdo que vai chegar: o seletor, os dois
 * painéis com a proporção 3 para 2, e a lista. Um spinner genérico no lugar
 * disso diria apenas "espere"; isto diz "o mês está vindo, e ele se parece
 * com isto", e a página não salta quando o conteúdo real substitui.
 *
 * A pulsação é CSS puro. Motion aqui carregaria a biblioteca no caminho
 * crítico de uma tela que dura menos de um segundo.
 */
function Bloco({ className }: { readonly className: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface-strong ${className}`} />;
}

export default function CarregandoMes() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-8">
      <span className="sr-only">Carregando o mês</span>

      <Bloco className="h-[68px] w-full rounded-pill sm:max-w-md" />

      <div className="grid gap-4 lg:grid-cols-5">
        <Bloco className="h-64 rounded-xl lg:col-span-3" />
        <Bloco className="h-64 rounded-xl lg:col-span-2" />
      </div>

      <div className="flex flex-col gap-3">
        <Bloco className="h-6 w-44" />
        <Bloco className="h-14 w-full" />
        <Bloco className="h-14 w-full" />
        <Bloco className="h-14 w-full" />
      </div>
    </div>
  );
}
