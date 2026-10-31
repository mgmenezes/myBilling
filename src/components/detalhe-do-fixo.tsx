import { useId } from "react";
import { CategoriaDoFixo, type ItemDeFixo } from "./tabela-de-fixos";
import { Chip } from "./ui";

/**
 * O fixo aberto no painel: tudo dele, sem sair da lista (FIXCOL-04, ACs 2 a 6).
 *
 * **O valor grande é o do mês aberto**, o mesmo da linha, com a previsão ao
 * lado quando a conta chegou diferente. A previsão de cada época fica em
 * "Valor ao longo dos meses": as vigências que a página já lia e jogava fora
 * depois de achar a do mês.
 *
 * **"Encerrar" fica no pé, separado e em vermelho**, longe de "Mudar valor" e
 * "Editar", que são as ações de todo dia. O encerrado só oferece "Editar": é
 * por ele que se reabre, apagando o "Termina em".
 *
 * A categoria é a mesma peça da linha, e o meio troca de nome com a natureza,
 * como no formulário (AD-015).
 */

const ACAO =
  "min-h-11 rounded-pill bg-surface-strong px-4 text-[14px] font-semibold text-ink transition-colors duration-200 hover:bg-line md:pointer-fine:min-h-9";

export function DetalheDoFixo({
  item,
  rotuloDaCompetencia,
  nomeDoMes,
  aoMudarValor,
  aoEditar,
  aoEncerrar,
}: {
  readonly item: ItemDeFixo;
  /** "Março de 2026". */
  readonly rotuloDaCompetencia: string;
  /** "Março", para o selo "vale em Março". */
  readonly nomeDoMes: string;
  readonly aoMudarValor: () => void;
  readonly aoEditar: () => void;
  readonly aoEncerrar: () => void;
}) {
  const idDoHistorico = useId();
  const ehSaida = item.natureza === "DESPESA";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="tabular text-[30px] leading-[1.1] tracking-[-0.01em]">
          {item.valorDoMes ?? "—"}
        </p>
        <p className="text-[14px] text-ink-muted">
          {item.comecaDepois ? `Começa em ${item.inicio}` : `em ${rotuloDaCompetencia}`}
        </p>
        {item.confirmado ? (
          <p className="text-[13px] text-ink-muted">confirmado · previa {item.previstoDoMes}</p>
        ) : null}
      </div>

      {item.encerrada ? (
        <p className="rounded-lg bg-surface-soft p-3 text-[14px] text-ink">
          Encerrado: vale até {item.fim}. Para reabrir, use Editar e apague o “Termina em”.
        </p>
      ) : null}

      <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 text-[14px]">
        <dt className="text-ink-muted">Categoria</dt>
        <dd>
          <CategoriaDoFixo item={item} />
        </dd>
        <dt className="text-ink-muted">{ehSaida ? "Meio de pagamento" : "Onde o dinheiro cai"}</dt>
        <dd>{item.meio}</dd>
        <dt className="text-ink-muted">De quem é</dt>
        <dd>{item.pessoa}</dd>
        <dt className="text-ink-muted">{item.comecaDepois ? "Começa em" : "Começou em"}</dt>
        <dd>{item.inicio}</dd>
        <dt className="text-ink-muted">Termina em</dt>
        <dd>{item.fim ?? "Sem fim"}</dd>
      </dl>

      <section aria-labelledby={idDoHistorico} className="flex flex-col gap-2">
        <h3 id={idDoHistorico} className="text-[15px] font-medium">
          Valor ao longo dos meses
        </h3>
        <ol className="flex flex-col">
          {item.historico.map((vigencia) => (
            <li
              key={vigencia.desde}
              className="flex items-center justify-between gap-3 py-1.5 text-[14px] [&:not(:last-child)]:border-b [&:not(:last-child)]:border-line"
            >
              <span className="flex flex-wrap items-center gap-2">
                <span>desde {vigencia.desde}</span>
                {vigencia.valeNoMes ? <Chip>vale em {nomeDoMes}</Chip> : null}
              </span>
              <span className="tabular">{vigencia.valor}</span>
            </li>
          ))}
        </ol>
      </section>

      {item.encerrada ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={aoEditar} className={ACAO}>
            Editar
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={aoMudarValor} className={ACAO}>
              Mudar valor
            </button>
            <button type="button" onClick={aoEditar} className={ACAO}>
              Editar
            </button>
          </div>
          <div className="border-t border-line pt-4">
            <button
              type="button"
              onClick={aoEncerrar}
              className="min-h-11 rounded-pill px-4 text-[14px] font-semibold text-negativo transition-colors duration-200 hover:bg-surface-strong md:pointer-fine:min-h-9"
            >
              Encerrar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
