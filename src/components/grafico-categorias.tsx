import { WarningIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { Competencia, CorDeCategoria } from "@/domain";
import { formatarBRL, formatarPercentual } from "@/lib/formatar";
import { CLASSES_DA_COR } from "./cor-de-categoria";

/**
 * Gastos por categoria, em barras horizontais ordenadas por valor.
 *
 * **Cada barra tem a cor da categoria dela** (COR-03, AC 5), a mesma da pill
 * de "Todo mês", do seletor e do chip de Lançamentos: é o que liga a linha da
 * lista à barra daqui. A pergunta continua sendo de magnitude, e quem
 * identifica a categoria continua sendo o rótulo ao lado. A cor só ajuda a
 * reconhecer. A paleta é fechada e medida, e os limites estão em
 * `docs/design.md`, "Cor por categoria". "Sem categoria" e "Categoria
 * removida" chegam com `cor` nula e ficam na barra neutra.
 *
 * O estouro de orçamento é sinalizado por ícone e texto, e não pela cor da
 * barra: cor nunca carrega significado sozinha.
 *
 * A barra tem extremidade arredondada de 4px ancorada na linha de base, e o
 * trilho é recessivo. Sem grade, sem eixo numérico: o valor está impresso na
 * própria linha, que é mais direto que obrigar o olho a medir contra uma régua.
 *
 * Acessibilidade: os números estão no texto, não só na geometria. Quem usa
 * leitor de tela recebe categoria, valor e porcentagem em sequência, sem
 * depender de `title` nem de hover.
 *
 * **Cada barra é link para os lançamentos que a formam** (LST-04): a lista do
 * mesmo mês, filtrada pelo `categoriaId` da fatia, que para o grupo sem
 * categoria é `sem-categoria`. O link envolve a linha inteira, e o texto dela
 * (nome, valor e porcentagem) é o nome acessível, então o leitor de tela diz
 * aonde ele leva. O texto continua na cor de texto: o azul de ação em cada
 * categoria gastaria a única cor que significa "aja aqui".
 */

export interface FatiaDeCategoria {
  readonly id: string;
  readonly nome: string;
  readonly valor: number;
  /** Centésimos de ponto percentual: 2183 é 21,83%. */
  readonly percentual: number;
  /** Preenchido apenas quando existe limite cadastrado para o mês. */
  readonly limite?: number | null;
  /** A cor em uso da categoria; `null` em "Sem categoria" e "Categoria removida". */
  readonly cor: CorDeCategoria | null;
}

export function GraficoCategorias({
  fatias,
  titulo,
  competencia,
}: {
  readonly fatias: ReadonlyArray<FatiaDeCategoria>;
  readonly titulo: string;
  /** O mês aberto: o link leva à lista dele, e não à de outro. */
  readonly competencia: Competencia;
}) {
  if (fatias.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line px-5 py-10 text-center text-[15px] text-ink-muted">
        Nenhuma despesa categorizada neste mês. O gráfico aparece assim que houver lançamentos com
        categoria.
      </p>
    );
  }

  const ordenadas = [...fatias].sort((a, b) => b.valor - a.valor);
  const maior = ordenadas[0]?.valor ?? 0;

  return (
    <div>
      <ol aria-label={titulo} className="flex flex-col gap-3">
        {ordenadas.map((fatia) => {
          const largura = maior === 0 ? 0 : Math.max((fatia.valor / maior) * 100, 1.5);
          const estourou =
            fatia.limite !== undefined && fatia.limite !== null && fatia.valor > fatia.limite;

          return (
            <li key={fatia.id}>
              <Link
                href={`/${competencia}/lancamentos?categoriaId=${encodeURIComponent(fatia.id)}`}
                className="-mx-2 flex flex-col gap-1.5 rounded-lg px-2 py-1.5 transition-colors duration-200 hover:bg-surface-soft"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="flex items-center gap-1.5 text-[15px]">
                    {fatia.nome}
                    {estourou ? (
                      <span className="flex items-center gap-1 text-[13px] font-semibold text-negativo">
                        <WarningIcon size={14} weight="fill" aria-hidden="true" />
                        acima do limite
                      </span>
                    ) : null}
                  </span>{" "}
                  <span className="flex items-baseline gap-2">
                    <span className="tabular text-[15px]">{formatarBRL(fatia.valor)}</span>{" "}
                    <span className="tabular text-[13px] text-ink-muted">
                      {formatarPercentual(fatia.percentual)}
                    </span>
                  </span>
                </div>

                {/*
                O trilho existe para dar referência de escala à barra curta.
                Ele é recessivo o bastante para não competir com o dado.

                **A barra do estouro não muda de cor.** Ela fica na cor da
                categoria: a cor é identidade, não semântica, e a semântica
                negativa do sistema é cor de texto, nunca preenchimento. Quem
                sinaliza o estouro é o par ícone mais texto acima, que também
                funciona sem enxergar matiz.
              */}
                <div className="h-2.5 w-full overflow-hidden rounded-pill bg-grafico-trilho">
                  <div
                    className={`h-full rounded-pill ${
                      fatia.cor === null ? "bg-grafico-barra" : CLASSES_DA_COR[fatia.cor].barra
                    }`}
                    style={{ width: `${largura}%` }}
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
