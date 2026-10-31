import Link from "next/link";
import { useId } from "react";

/**
 * Onde o item aberto aparece no mês: quantos fixos e quantos lançamentos o
 * usam, e o link para Lançamentos filtrado por ele (CADCOL-04, ACs 11 e 12;
 * CADCOL-07, AC 13).
 *
 * Os números são os da linha da tabela, e o link é a prova deles: Lançamentos
 * do mês aberto, com o filtro do item, mostra o mesmo número de lançamentos
 * (CADCOL-03, AC 4). Quem usa monta o endereço, com `?categoriaId=` ou
 * `?meioPagamentoId=`, os parâmetros que a página de Lançamentos já lê.
 */
export function OndeAparece({
  genero,
  fixos,
  lancamentos,
  rotuloDaCompetencia,
  href,
}: {
  /** "ela" para a categoria, "ele" para o meio de pagamento. */
  readonly genero: "ela" | "ele";
  readonly fixos: number;
  readonly lancamentos: number;
  /** "Março de 2026". */
  readonly rotuloDaCompetencia: string;
  /** Lançamentos do mês aberto, filtrado pelo item. */
  readonly href: string;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h3 id={id} className="text-[17px] font-medium tracking-[-0.01em]">
        Onde {genero} aparece
      </h3>
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 text-[15px]">
        <dt className="text-ink-muted">Fixos em {rotuloDaCompetencia}</dt>
        <dd className="tabular text-right">{fixos}</dd>
        <dt className="text-ink-muted">Lançamentos em {rotuloDaCompetencia}</dt>
        <dd className="tabular text-right">{lancamentos}</dd>
      </dl>
      <Link
        href={href}
        className="inline-flex min-h-11 w-fit items-center rounded-pill bg-surface-strong px-5 text-[15px] font-semibold text-ink transition-colors duration-200 hover:bg-line"
      >
        Ver em Lançamentos
      </Link>
    </section>
  );
}
