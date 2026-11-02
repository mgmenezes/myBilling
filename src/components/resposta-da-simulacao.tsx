import { MAX_PARCELAS, type Simulacao } from "@/domain";
import { formatarBRL, formatarCompetencia, nomeDoMes } from "@/lib/formatar";
import { apresentarSaldo } from "./apresentar-saldo";

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
 * As linhas usam `apresentarSaldo`, a mesma apresentação de "Próximos meses":
 * mesmas palavras, mesmas cores. Um componente só, dois lugares: a tela
 * Simular e o cadastro de compra (SIM-05).
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

/** "abril", ou "janeiro de 2027" quando o ano não é o do mês aberto. */
function mesNoVeredito(competencia: string, competenciaAberta: string): string {
  const nome = nomeDoMes(competencia).toLowerCase();
  return competencia.slice(0, 4) === competenciaAberta.slice(0, 4)
    ? nome
    : `${nome} de ${competencia.slice(0, 4)}`;
}

/** "abril", "abril e maio", "março, abril e maio". */
function listarMeses(meses: ReadonlyArray<string>): string {
  if (meses.length <= 1) {
    return meses.join("");
  }
  return `${meses.slice(0, -1).join(", ")} e ${meses[meses.length - 1]}`;
}

function iniciarComMaiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function textoDoVeredito({
  simulacao,
  qtdParcelas,
  menorQueCabe,
  competenciaAberta,
}: RespostaDaSimulacaoProps): string {
  const nome = (competencia: string) => mesNoVeredito(competencia, competenciaAberta);
  if (simulacao.cabe) {
    const jaFaltavam = simulacao.linhas.filter((linha) => linha.jaFaltava);
    if (jaFaltavam.length === 0) {
      return "Cabe. Nenhum mês fica no vermelho.";
    }
    const verbo = jaFaltavam.length === 1 ? "estava" : "estavam";
    const meses = listarMeses(jaFaltavam.map((linha) => nome(linha.competencia)));
    return `Cabe. ${iniciarComMaiuscula(meses)} já ${verbo} no vermelho antes desta compra.`;
  }
  const derrubados = simulacao.linhas.filter((linha) => !linha.jaFaltava && linha.saldoDepois < 0);
  const verbo = derrubados.length === 1 ? "fica" : "ficam";
  const meses = listarMeses(derrubados.map((linha) => nome(linha.competencia)));
  const saida =
    menorQueCabe === null
      ? `Não cabe em nenhum parcelamento até ${MAX_PARCELAS}x.`
      : `Em ${menorQueCabe}x cabe.`;
  return `Em ${qtdParcelas}x não cabe: ${meses} ${verbo} no vermelho. ${saida}`;
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
  return (
    <section aria-label="Resposta da simulação" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p
          className={`text-[17px] font-semibold ${simulacao.cabe ? "text-positivo" : "text-negativo"}`}
        >
          {textoDoVeredito(props)}
        </p>
        {simulacao.parcelasForaDoHorizonte > 0 ? (
          <p className="text-[14px] text-ink-muted">
            Enxergo até {formatarCompetencia(simulacao.enxergaAte)}.
          </p>
        ) : null}
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
