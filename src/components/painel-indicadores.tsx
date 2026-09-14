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

interface Indicador {
  readonly chave: string;
  readonly rotulo: string;
  readonly valor: Cents;
  readonly filtro: string;
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
    <nav
      aria-label="Visão do mês"
      className="inline-flex w-fit rounded-chip bg-surface p-1 shadow-lift"
    >
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
            className={`min-h-11 rounded-chip px-4 py-2 text-[15px] transition-colors duration-200 ${
              ativa ? "bg-ink font-medium text-canvas" : "font-normal text-ink-muted hover:text-ink"
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
          },
          {
            chave: "despesas",
            rotulo: "Despesas do mês",
            valor: planejamento.totalGastos,
            filtro: "natureza=DESPESA",
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
          },
          {
            chave: "saiu",
            rotulo: "Saiu da conta",
            valor: movimentacoes.saidas,
            filtro: "natureza=DESPESA&situacao=PAGO",
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
        const conteudo = (
          <>
            <span className="text-[14px] text-ink-muted">{indicador.rotulo}</span>
            <span
              className={`tabular font-medium tracking-[-0.02em] ${
                indicador.enfase ? "text-[30px]" : "text-[26px]"
              }`}
            >
              {formatarBRL(indicador.valor)}
            </span>
          </>
        );

        const classe = `flex min-h-[104px] flex-col justify-between gap-2 rounded-card p-5 transition-colors duration-200 ${
          indicador.enfase ? "bg-ink text-canvas" : "bg-surface shadow-lift hover:bg-surface-strong"
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
