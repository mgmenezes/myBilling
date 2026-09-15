import type { BlocoDoMes, FatiaDeComposicao } from "@/domain";
import { formatarBRL, formatarPercentual } from "@/lib/formatar";

/**
 * A composição das despesas entre Fixos, Cartão e Avulsos, em barra empilhada.
 *
 * **Barra, e não pizza.** A pergunta é parte-do-todo com três grupos fixos, e
 * nessa faixa a barra empilhada lê o percentual com precisão que o ângulo não
 * dá. A pizza do desenho original é hábito de planilha; ela só se defenderia se
 * a leitura fosse de relance e nada mais.
 *
 * **Uma cor em três passos, não três matizes.** Os blocos têm ordem natural —
 * fixo foi decidido meses atrás, cartão já foi gasto e vai cair na fatura,
 * avulso foi escolha deste mês. Isso é escala, não identidade, então a escala é
 * sequencial: quanto mais escuro, menos escolha. Três matizes seriam o
 * arco-íris que o sistema recusa, e o azul aqui queimaria a única cor que
 * significa "aja aqui" em três faixas decorativas.
 *
 * **Por isso nada aqui depende de enxergar a diferença entre os três tons.**
 * Nome, valor e percentual estão no texto, embaixo da barra, sempre — não em
 * `title`, não em hover, não em legenda que obriga a fazer a ponte pela cor.
 * Três passos de uma neutra são indistinguíveis para quem não separa
 * luminosidade, e a tabela abaixo da barra é o que torna isso irrelevante.
 *
 * O vão de 2px entre os segmentos é da própria superfície, e é o que impede as
 * três faixas de virarem uma mancha contínua.
 */

const NOME: Record<BlocoDoMes, string> = {
  FIXOS: "Fixos",
  CARTAO: "Cartão",
  AVULSOS: "Avulsos",
};

/** Do mais comprometido ao mais discricionário. A ordem vem do domínio. */
const TOM: Record<BlocoDoMes, string> = {
  FIXOS: "bg-grafico-passo-1",
  CARTAO: "bg-grafico-passo-2",
  AVULSOS: "bg-grafico-passo-3",
};

export function BarraDeComposicao({
  titulo,
  fatias,
}: {
  readonly titulo: string;
  readonly fatias: ReadonlyArray<FatiaDeComposicao>;
}) {
  const visiveis = fatias.filter((fatia) => fatia.total > 0);

  if (visiveis.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line px-5 py-8 text-center text-[15px] text-ink-muted">
        Nenhuma despesa neste período. A barra aparece assim que houver lançamentos.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div aria-hidden="true" className="flex h-3 gap-0.5 overflow-hidden rounded-pill">
        {visiveis.map((fatia) => (
          <span
            key={fatia.bloco}
            data-bloco={fatia.bloco}
            className={`${TOM[fatia.bloco]} first:rounded-l-pill last:rounded-r-pill`}
            style={{ width: `${fatia.percentual / 100}%` }}
          />
        ))}
      </div>

      <ul aria-label={titulo} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-8">
        {visiveis.map((fatia) => (
          <li key={fatia.bloco} className="flex items-baseline gap-2">
            {/* A placa repete o tom do segmento; quem carrega a identidade é o
                nome ao lado dela, nunca ela sozinha. */}
            <span
              aria-hidden="true"
              className={`${TOM[fatia.bloco]} size-2.5 shrink-0 self-center rounded-xs`}
            />
            <span className="text-[15px]">{NOME[fatia.bloco]}</span>
            <span className="tabular text-[15px]">{formatarBRL(fatia.total)}</span>
            <span className="tabular text-[13px] text-ink-muted">
              {formatarPercentual(fatia.percentual)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
