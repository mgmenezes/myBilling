import { WarningIcon } from "@phosphor-icons/react/dist/ssr";
import { formatarBRL, formatarPercentual } from "@/lib/formatar";

/**
 * Gastos por categoria, em barras horizontais ordenadas por valor.
 *
 * **Uma cor só para todas as barras.** A pergunta aqui é de magnitude de uma
 * única medida, não de identidade entre séries: toda barra mede gasto. Quem
 * identifica a categoria é o rótulo ao lado, não o matiz. Vinte cores seria o
 * anti-padrão clássico deste gráfico, indistinguível para quem não separa
 * cores e desnecessário para quem separa.
 *
 * O laranja fica **reservado** para sinalizar estouro de orçamento, e vem
 * acompanhado de ícone e texto: cor nunca carrega significado sozinha.
 *
 * A barra tem extremidade arredondada de 4px ancorada na linha de base, e o
 * trilho é recessivo. Sem grade, sem eixo numérico: o valor está impresso na
 * própria linha, que é mais direto que obrigar o olho a medir contra uma régua.
 *
 * Acessibilidade: os números estão no texto, não só na geometria. Quem usa
 * leitor de tela recebe categoria, valor e porcentagem em sequência, sem
 * depender de `title` nem de hover.
 */

export interface FatiaDeCategoria {
  readonly id: string;
  readonly nome: string;
  readonly valor: number;
  /** Centésimos de ponto percentual: 2183 é 21,83%. */
  readonly percentual: number;
  /** Preenchido apenas quando existe limite cadastrado para o mês. */
  readonly limite?: number | null;
}

export function GraficoCategorias({
  fatias,
  titulo,
}: {
  readonly fatias: ReadonlyArray<FatiaDeCategoria>;
  readonly titulo: string;
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
            <li key={fatia.id} className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="flex items-center gap-1.5 text-[15px]">
                  {fatia.nome}
                  {estourou ? (
                    <span className="flex items-center gap-1 text-[13px] font-semibold text-negativo">
                      <WarningIcon size={14} weight="fill" aria-hidden="true" />
                      acima do limite
                    </span>
                  ) : null}
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="tabular text-[15px]">{formatarBRL(fatia.valor)}</span>
                  <span className="tabular text-[13px] text-ink-muted">
                    {formatarPercentual(fatia.percentual)}
                  </span>
                </span>
              </div>

              {/*
                O trilho existe para dar referência de escala à barra curta.
                Ele é recessivo o bastante para não competir com o dado.

                **A barra do estouro não muda de cor.** A semântica negativa do
                sistema é cor de texto e nunca preenchimento, e o azul de ação
                seria pior ainda: quatro barras de azul gastariam a única cor
                que significa "aja aqui". Quem sinaliza o estouro é o par ícone
                mais texto acima, que também funciona sem enxergar matiz.
              */}
              <div className="h-2.5 w-full overflow-hidden rounded-pill bg-grafico-trilho">
                <div
                  className="h-full rounded-pill bg-grafico-barra"
                  style={{ width: `${largura}%` }}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
