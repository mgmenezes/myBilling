"use client";

/**
 * O controle que um estado vazio oferece para abrir o cadastro.
 *
 * **Ele não monta um cadastro próprio: aciona o que já existe.** O cadastro é
 * um `<dialog>` montado uma vez só, no topo da área, com as duas abas dentro
 * (AD-014). Um segundo `DialogoDeCadastro` aqui duplicaria os dois formulários
 * na árvore, e cada campo homônimo passaria a existir quatro vezes — que é
 * exatamente o que quebrou seis e2e na transição para o diálogo.
 *
 * O gatilho é encontrado pelo contrato ARIA que ele já declara,
 * `aria-haspopup="dialog"`, e não por uma classe ou um id combinado à parte.
 * Há um só por página, e clicá-lo é o mesmo caminho que o dedo percorre: o
 * estado do diálogo continua saindo de quem o possui.
 *
 * É cliente porque `TabelaLancamentos` é servidor, e precisa continuar sendo:
 * marcar a tabela inteira com `"use client"` arrastaria formatação e
 * agrupamento para o navegador por causa de um botão.
 */
export function BotaoAbrirCadastro({ rotulo }: { readonly rotulo: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        document.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')?.click();
      }}
      className="inline-flex min-h-11 w-fit items-center justify-center rounded-pill bg-primary px-6 text-[15px] font-semibold text-on-primary transition-[transform,background-color] duration-200 hover:bg-primary-ativo active:scale-[0.97]"
    >
      {rotulo}
    </button>
  );
}
