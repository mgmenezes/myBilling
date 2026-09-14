import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { Cents } from "@/domain";
import { formatarBRL } from "@/lib/formatar";

/**
 * O alternador e os quatro indicadores do painel.
 *
 * **Uma visão por vez.** Planejamento mostra o que foi assumido no mês;
 * Movimentações mostra o que saiu da conta. Nunca os dois juntos, e é essa
 * restrição que preserva `MOV-03` por construção: não existindo composição que
 * exiba os dois eixos, não existe composição que os some.
 *
 * O alternador é um par de **links**, não um controle com estado local. A visão
 * vive na URL, então ela é compartilhável, sobrevive ao recarregar e o servidor
 * já entrega o conteúdo certo. O design previa `radiogroup`; link é mais simples
 * e não depende de JavaScript para funcionar.
 *
 * Cada indicador também é link, levando à lista já filtrada. A soma dos
 * lançamentos que aparecem lá tem que bater com o número daqui (DASH-04).
 */

export type Visao = "planejamento" | "movimentacoes";

/**
 * `'entrada'` e `'saida'` pintam o valor com a semântica de cor do sistema.
 * `'neutro'` é o padrão e vale para tudo que não é fluxo realizado — "ainda
 * não pago" é obrigação pendente, não dinheiro que saiu, e pintá-lo de
 * vermelho deixaria três dos quatro cartões vermelhos, o que esvazia a cor.
 */
type Sinal = "entrada" | "saida" | "neutro";

interface Indicador {
  readonly chave: string;
  readonly rotulo: string;
  readonly valor: Cents;
  readonly filtro: string;
  readonly sinal?: Sinal;
  readonly enfase?: boolean;
}

export function AlternadorDeVisao({
  competencia,
  visao,
}: {
  readonly competencia: string;
  readonly visao: Visao;
}) {
  const opcoes = [
    { chave: "planejamento" as const, rotulo: "Planejamento" },
    { chave: "movimentacoes" as const, rotulo: "Movimentações" },
  ];

  return (
    /* <nav> e não <div role="group">: são dois links que mudam a URL, o que é
       navegação de fato. O rótulo distingue este do menu principal. */
    <nav aria-label="Visão do mês" className="inline-flex w-fit rounded-pill bg-surface-strong p-1">
      {opcoes.map((opcao) => {
        const ativa = visao === opcao.chave;
        return (
          <Link
            key={opcao.chave}
            href={
              opcao.chave === "planejamento"
                ? `/${competencia}`
                : `/${competencia}?visao=movimentacoes`
            }
            aria-current={ativa ? "true" : undefined}
            className={`min-h-11 rounded-pill px-4 py-2 text-[15px] transition-colors duration-200 ${
              ativa
                ? "bg-inverso font-semibold text-on-inverso"
                : "font-normal text-ink-muted hover:text-ink"
            }`}
          >
            {opcao.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}

export function GradeDeIndicadores({
  competencia,
  visao,
  planejamento,
  movimentacoes,
}: {
  readonly competencia: string;
  readonly visao: Visao;
  readonly planejamento: {
    readonly entradas: Cents;
    readonly totalGastos: Cents;
    readonly pendente: Cents;
    readonly saldo: Cents;
  };
  readonly movimentacoes: {
    readonly entradasRecebidas: Cents;
    readonly saidas: Cents;
    readonly saldo: Cents;
  };
}) {
  const indicadores: ReadonlyArray<Indicador> =
    visao === "planejamento"
      ? [
          {
            chave: "receitas",
            rotulo: "Receitas do mês",
            valor: planejamento.entradas,
            filtro: "natureza=RECEITA",
            sinal: "entrada",
          },
          {
            chave: "despesas",
            rotulo: "Despesas do mês",
            valor: planejamento.totalGastos,
            filtro: "natureza=DESPESA",
            sinal: "saida",
          },
          {
            chave: "pendente",
            rotulo: "Ainda não pago",
            valor: planejamento.pendente,
            filtro: "natureza=DESPESA&situacao=PENDENTE",
          },
          {
            chave: "saldo",
            rotulo: "Saldo previsto",
            valor: planejamento.saldo,
            filtro: "",
            enfase: true,
          },
        ]
      : [
          {
            chave: "recebido",
            rotulo: "Recebido",
            valor: movimentacoes.entradasRecebidas,
            filtro: "natureza=RECEITA&situacao=PAGO",
            sinal: "entrada",
          },
          {
            chave: "saiu",
            rotulo: "Saiu da conta",
            valor: movimentacoes.saidas,
            filtro: "natureza=DESPESA&situacao=PAGO",
            sinal: "saida",
          },
          {
            chave: "pendente",
            rotulo: "Ainda não saiu",
            valor: planejamento.pendente,
            filtro: "natureza=DESPESA&situacao=PENDENTE",
          },
          {
            chave: "saldo",
            rotulo: "Saldo do período",
            valor: movimentacoes.saldo,
            filtro: "",
            enfase: true,
          },
        ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {indicadores.map((indicador) => {
        const sinal = indicador.sinal ?? "neutro";
        /*
         * A cor do valor. Ela nunca anda sozinha: o rótulo acima já diz
         * "Receitas" ou "Despesas", e o `+` / `−` à esquerda repete a
         * informação em forma. Quem não separa matiz continua lendo o cartão.
         *
         * Dentro do cartão invertido não entra semântica: a inversão já é o
         * destaque, e o verde e o vermelho do tema claro foram medidos contra
         * o canvas claro, não contra a superfície escura.
         */
        const corDoValor = indicador.enfase
          ? "text-on-inverso"
          : sinal === "entrada"
            ? "text-positivo"
            : sinal === "saida"
              ? "text-negativo"
              : "text-ink";

        const conteudo = (
          <>
            <span
              className={`text-[14px] ${indicador.enfase ? "text-on-inverso-suave" : "text-ink-muted"}`}
            >
              {indicador.rotulo}
            </span>
            <span
              /*
                20px nos quatro, e não 26px com um de 30px como no sistema
                anterior. Dois motivos, e o segundo é o que manda: a mono
                desenha bem mais larga no mesmo corpo e os tamanhos antigos
                quebravam o valor em duas linhas; e o cartão de ênfase deste
                sistema se destaca **pela inversão**, não por corpo maior —
                "visual inversion signals 'highlighted choice' without colored
                ribbons". Aumentar a fonte lá seria dizer a mesma coisa duas
                vezes e estourar a caixa.
              */
              className={`tabular whitespace-nowrap text-[20px] ${corDoValor}`}
            >
              {sinal === "neutro" ? null : (
                <span aria-hidden="true">{sinal === "entrada" ? "+" : "−"}</span>
              )}
              {formatarBRL(indicador.valor)}
            </span>
          </>
        );

        /*
         * Cartão chapado com hairline, e não cartão com sombra: sobre canvas
         * branco é a borda que separa, e o sistema guarda a sombra única para
         * estado levantado. O de ênfase é a inversão do documento — destaque
         * sem fita colorida.
         */
        const classe = `flex min-h-[104px] flex-col justify-between gap-2 rounded-xl p-4 transition-colors duration-200 ${
          indicador.enfase
            ? "bg-inverso text-on-inverso"
            : "border border-line bg-surface hover:bg-surface-soft"
        }`;

        if (indicador.filtro === "") {
          return (
            <div key={indicador.chave} className={classe}>
              {conteudo}
            </div>
          );
        }

        return (
          <Link
            key={indicador.chave}
            href={`/${competencia}/lancamentos?${indicador.filtro}`}
            className={`${classe} group`}
          >
            {conteudo}
            <span className="flex items-center gap-1 text-[13px] text-ink-muted">
              Ver lançamentos
              <ArrowRightIcon
                size={13}
                weight="bold"
                aria-hidden="true"
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
