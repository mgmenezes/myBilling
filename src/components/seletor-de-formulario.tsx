"use client";

import { useId, useState } from "react";

/**
 * Alternador entre os formulários de cadastro da página de Lançamentos.
 *
 * **As duas abas ficam montadas o tempo todo**, e a inativa é escondida com o
 * atributo `hidden`. Desmontar a inativa perderia o que já foi digitado nela, e
 * o caso real é comum: a pessoa começa a lançar um gasto avulso, percebe que
 * foi parcelado, troca de aba, e não pode encontrar o formulário vazio.
 *
 * Por isso também o estado **não** vai para a URL, ao contrário dos filtros da
 * lista. Filtro é algo que se compartilha e se volta; aba de formulário em
 * preenchimento não é — e uma navegação remontaria os dois formulários.
 *
 * O padrão de `tablist` é o do WAI-ARIA: as setas percorrem as abas, e só a
 * ativa fica no fluxo de tabulação, para que `Tab` leve ao conteúdo e não à
 * próxima aba.
 */

export interface Aba {
  readonly id: string;
  readonly rotulo: string;
  readonly conteudo: React.ReactNode;
}

export function SeletorDeFormulario({
  abas,
  rotuloDoGrupo,
}: {
  readonly abas: ReadonlyArray<Aba>;
  readonly rotuloDoGrupo: string;
}) {
  const prefixo = useId();
  const [ativa, setAtiva] = useState(abas[0]?.id ?? "");

  function mover(indiceAtual: number, passo: number): void {
    const proximo = abas[(indiceAtual + passo + abas.length) % abas.length];
    if (!proximo) {
      return;
    }
    setAtiva(proximo.id);
    document.getElementById(`${prefixo}-${proximo.id}`)?.focus();
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label={rotuloDoGrupo}
        className="flex gap-1 self-start rounded-pill bg-surface-strong p-1"
      >
        {abas.map((aba, indice) => {
          const selecionada = aba.id === ativa;
          return (
            <button
              key={aba.id}
              id={`${prefixo}-${aba.id}`}
              type="button"
              role="tab"
              aria-selected={selecionada}
              aria-controls={`${prefixo}-${aba.id}-painel`}
              /* Só a aba ativa é tabulável: `Tab` precisa levar ao formulário. */
              tabIndex={selecionada ? 0 : -1}
              onClick={() => setAtiva(aba.id)}
              onKeyDown={(evento) => {
                if (evento.key === "ArrowRight") {
                  evento.preventDefault();
                  mover(indice, 1);
                }
                if (evento.key === "ArrowLeft") {
                  evento.preventDefault();
                  mover(indice, -1);
                }
              }}
              className={`min-h-11 rounded-pill px-5 text-[15px] transition-colors duration-200 ${
                selecionada
                  ? "bg-surface font-semibold text-ink shadow-[0_0_0_1px_var(--color-line)]"
                  : "font-normal text-ink-muted hover:text-ink"
              }`}
            >
              {aba.rotulo}
            </button>
          );
        })}
      </div>

      {abas.map((aba) => (
        <div
          key={aba.id}
          id={`${prefixo}-${aba.id}-painel`}
          role="tabpanel"
          aria-labelledby={`${prefixo}-${aba.id}`}
          /* `hidden` em vez de desmontar: o que foi digitado na outra aba fica. */
          hidden={aba.id !== ativa}
        >
          {aba.conteudo}
        </div>
      ))}
    </div>
  );
}
