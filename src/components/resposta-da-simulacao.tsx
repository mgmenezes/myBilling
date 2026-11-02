import type { Simulacao } from "@/domain";
import { formatarBRL, formatarCompetencia } from "@/lib/formatar";
import { apresentarSaldo } from "./apresentar-saldo";
import { textoDoVeredito, textoEnxergaAte } from "./texto-do-veredito";

export { textoDoVeredito } from "./texto-do-veredito";

/**
 * A resposta de "Dá pra comprar?" (SIM-02, ACs 3 e 5 a 9): o veredito em cima,
 * uma linha por mês embaixo.
 *
 * O veredito são frases do dono, literais. Ele culpa a compra só pelo mês que
 * ela derruba: o mês que já faltava aparece na linha como "já estava no
 * vermelho" e, quando é o único vermelho, a frase diz que cabe e que ele já
 * estava assim antes. "Enxergo até" sai em frase própria quando a compra passa
 * do horizonte, porque é outra informação: não é sobre caber, é sobre até onde
 * o app viu.
 *
 * As frases vivem em `texto-do-veredito.ts`, sem React, porque a landing roda
 * a mesma resposta (JANO-03). As linhas usam `apresentarSaldo`, a mesma
 * apresentação de "Próximos meses": mesmas palavras, mesmas cores. Um
 * componente só, dois lugares: a tela Simular e o cadastro de compra (SIM-05).
 */

export interface RespostaDaSimulacaoProps {
  readonly simulacao: Simulacao;
  /** O número de parcelas pedido: o `n` do "Em 10x não cabe". */
  readonly qtdParcelas: number;
  /** O menor parcelamento que cabe, ou `null` quando nenhum cabe. */
  readonly menorQueCabe: number | null;
  /** O mês aberto: os meses de outro ano saem com "de <ano>". */
  readonly competenciaAberta: string;
}

function Saldo({ rotulo, saldo }: { readonly rotulo: string; readonly saldo: number }) {
  const apresentado = apresentarSaldo(saldo as Parameters<typeof apresentarSaldo>[0]);
  return (
    <div className="flex min-w-0 flex-col gap-0.5 text-right">
      <dt className="text-[13px] text-ink-muted">{rotulo}</dt>
      <dd className="flex flex-col whitespace-nowrap text-[15px]">
        <span className="text-ink-muted">{apresentado.rotulo}</span>{" "}
        <span className={`tabular ${apresentado.classe}`}>{apresentado.valor}</span>
      </dd>
    </div>
  );
}

export function RespostaDaSimulacao(props: RespostaDaSimulacaoProps) {
  const { simulacao } = props;
  const enxergaAte = textoEnxergaAte(simulacao);
  return (
    <section aria-label="Resposta da simulação" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p
          className={`text-[17px] font-semibold ${simulacao.cabe ? "text-positivo" : "text-negativo"}`}
        >
          {textoDoVeredito(props)}
        </p>
        {enxergaAte === null ? null : <p className="text-[14px] text-ink-muted">{enxergaAte}</p>}
      </div>
      <ul className="flex flex-col">
        {simulacao.linhas.map((linha) => (
          <li
            key={linha.competencia}
            className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line py-3 last:border-b-0"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-semibold">
                {formatarCompetencia(linha.competencia)}
              </span>
              <span className="text-[13px] text-ink-muted">
                Parcela <span className="tabular">{formatarBRL(linha.parcela)}</span>
                {linha.jaFaltava ? " · já estava no vermelho" : null}
              </span>
            </div>
            <dl className="flex gap-6">
              <Saldo rotulo="Antes" saldo={linha.saldoAntes} />
              <Saldo rotulo="Depois" saldo={linha.saldoDepois} />
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}
