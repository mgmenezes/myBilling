import { sessaoDaUI } from "./sessao";

/**
 * Shell do grupo autenticado. A sessão é resolvida aqui, na primeira
 * instrução, mesmo havendo middleware: duas camadas, porque middleware
 * sozinho já falhou publicamente em frameworks deste tipo (AUTH-01, AC 3).
 *
 * Sem largura fixa e sem tabela no nível do shell: em 400 pixels o cabeçalho
 * quebra em linhas e a página não rola na horizontal (UI-03, AC 9).
 */
export default async function LayoutDoApp({ children }: LayoutProps<"/">) {
  const usuario = await sessaoDaUI();

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <p className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            myBilling
          </p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{usuario.nome}</p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
