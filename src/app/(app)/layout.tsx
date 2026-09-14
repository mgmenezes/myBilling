import { WalletIcon } from "@phosphor-icons/react/dist/ssr";
import { AlternadorDeTema } from "@/components/alternador-de-tema";
import { sessaoDaUI } from "./sessao";

/**
 * Shell do grupo autenticado. A sessão é resolvida aqui, na primeira
 * instrução, mesmo havendo proxy: duas camadas, porque proxy sozinho já
 * falhou publicamente em frameworks deste tipo (AUTH-01, AC 3).
 *
 * A navegação é um pill flutuante que não encosta no topo. O respiro acima
 * dela é o que faz a página parecer papel apoiado sobre a mesa em vez de
 * conteúdo grudado na borda do navegador.
 *
 * Em 400 pixels o cabeçalho quebra em linhas e a página não rola na
 * horizontal (UI-03, AC 9). Sem `overflow-x: hidden` em lugar nenhum:
 * esconder a barra faria a medição passar sem significar nada.
 */
export default async function LayoutDoApp({ children }: LayoutProps<"/">) {
  const usuario = await sessaoDaUI();

  return (
    <div className="flex min-h-full flex-col">
      <header className="px-4 pt-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-conteudo flex-wrap items-center justify-between gap-3 rounded-pill border border-line bg-surface px-5 py-3 sm:px-7">
          <p className="flex items-center gap-2 text-[17px] font-medium tracking-[-0.02em]">
            <WalletIcon size={22} weight="fill" aria-hidden="true" className="text-primary-texto" />
            myBilling
          </p>
          <div className="flex items-center gap-3">
            <AlternadorDeTema />
            <p className="text-[15px] text-ink-muted">{usuario.nome}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-conteudo flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
