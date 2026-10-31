import Link from "next/link";
import type { ReactNode } from "react";

/**
 * O alto das abas de Cadastros: o título "Cadastros", com a ação da aba ao
 * lado ("+ Nova categoria" ou "+ Novo meio"), e as duas abas logo abaixo
 * (CADCOL-01).
 *
 * **As abas são links, e não um `tablist`:** cada uma é uma rota, e trocar de
 * aba troca de página, no mesmo mês. A aberta leva `aria-current="page"`.
 * Todo alvo tem 44 px de altura em qualquer ponteiro (CADCOL-10, AC 7).
 */

export type AbaDeCadastros = "categorias" | "meios";

const ABAS: ReadonlyArray<{
  readonly aba: AbaDeCadastros;
  readonly rotulo: string;
  readonly rota: string;
}> = [
  { aba: "categorias", rotulo: "Categorias", rota: "categorias" },
  { aba: "meios", rotulo: "Meios de pagamento", rota: "meios-de-pagamento" },
];

export function CabecalhoDeCadastros({
  competencia,
  aba,
  acao,
}: {
  /** O mês aberto, `'YYYY-MM'`. */
  readonly competencia: string;
  readonly aba: AbaDeCadastros;
  /** O botão "+ Nova…" da aba. */
  readonly acao: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-[28px] leading-[1.1] sm:text-[34px]">Cadastros</h1>
        {acao}
      </div>
      <nav aria-label="Cadastros" className="border-b border-line">
        <ul className="-mb-px flex flex-wrap gap-x-2">
          {ABAS.map((item) => {
            const aberta = item.aba === aba;
            return (
              <li key={item.aba}>
                <Link
                  href={`/${competencia}/cadastros/${item.rota}`}
                  aria-current={aberta ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center border-b-2 px-3 text-[15px] font-medium transition-colors duration-200 ${
                    aberta
                      ? "border-primary text-ink"
                      : "border-transparent text-ink-muted hover:text-ink"
                  }`}
                >
                  {item.rotulo}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
