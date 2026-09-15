import { ArrowRightIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { competenciasDoAno, obterVisaoAnual } from "@/application/ano/obter-visao-anual/handler";
import { obterVisaoMensal } from "@/application/mes/obter-visao-mensal/handler";
import {
  MESES_DE_PROJECAO,
  materializarRecorrencias,
} from "@/application/recorrencias/materializar/handler";
import { BarraDeComposicao } from "@/components/barra-de-composicao";
import { GradeDeMeses } from "@/components/grade-de-meses";
import { composicaoDeBlocos, dataParaCompetencia } from "@/domain";
import { criarRepositorios } from "@/infrastructure/container";
import { db } from "@/infrastructure/db/client";
import { RecorrenciaRepositoryDrizzle } from "@/infrastructure/db/repositories/recorrencia.repository";
import { formatarCompetencia, nomeDoMes } from "@/lib/formatar";
import { sessaoDaUI } from "./sessao";

/**
 * A home: o ano inteiro, e o caminho mais curto para um mês.
 *
 * **A raiz deixou de redirecionar** (HOME-01, AC 1). Ela redirecionava para a
 * competência corrente, o que dava o mês de graça e não dava lugar nenhum onde
 * o ano existisse. O cartão de destaque devolve o clique que o redirect dava:
 * o destino mais provável continua a um toque, e agora os outros onze também.
 *
 * **A home não tem navegação lateral.** A nav vive em `[competencia]/layout`,
 * dentro do mês. Num launcher a página é a navegação, e repetir a barra ao lado
 * diria a mesma coisa duas vezes.
 *
 * **Materializa recorrências, pela mesma razão que as outras duas páginas do
 * mês.** Se a home lesse sem materializar, abri-la antes da Visão geral daria
 * dois totais diferentes para o mesmo mês — e qual dos dois você veria
 * dependeria de qual aba abriu primeiro. A escrita é idempotente e a janela é
 * fechada (AD-008).
 *
 * O ano vem da URL, não de estado de cliente: a página continua Server
 * Component, o ano é compartilhável e abre em nova aba.
 */

const FUSO = "America/Sao_Paulo";

export const dynamic = "force-dynamic";

/** Ano de quatro dígitos ou nada. Lixo na URL cai no ano corrente (HOME-01, AC 4). */
function anoPedido(bruto: string | string[] | undefined, padrao: number): number {
  if (typeof bruto !== "string" || !/^\d{4}$/.test(bruto)) {
    return padrao;
  }
  return Number(bruto);
}

export default async function Home({ searchParams }: PageProps<"/">) {
  await sessaoDaUI();

  const { ano: anoBruto } = await searchParams;
  const corrente = dataParaCompetencia(new Date().toISOString(), FUSO);
  if (!corrente.ok) {
    throw new Error("não foi possível resolver a competência corrente");
  }
  const competenciaCorrente = corrente.value;
  const anoCorrente = Number(competenciaCorrente.slice(0, 4));
  const ano = anoPedido(anoBruto, anoCorrente);

  const repositorios = criarRepositorios();
  await materializarRecorrencias(
    { recorrencias: new RecorrenciaRepositoryDrizzle(db()), movimentos: repositorios.movimentos },
    competenciaCorrente,
    MESES_DE_PROJECAO,
  );

  const [visaoDoMes, visaoDoAno] = await Promise.all([
    obterVisaoMensal(repositorios, competenciaCorrente),
    obterVisaoAnual(repositorios, ano),
  ]);

  const doMes = composicaoDeBlocos({
    fixos: visaoDoMes.competenciaView.fixos,
    cartao: visaoDoMes.competenciaView.cartao,
    avulsos: visaoDoMes.competenciaView.avulsos,
  });

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="titulo-ano" className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* O ano é o assunto da página, então é ele que carrega o h1. O nome
              do app já está na pílula do cabeçalho; repeti-lo aqui gastaria a
              linha mais visível da tela com algo que ninguém está procurando. */}
          <h1 id="titulo-ano" className="tabular text-[44px] leading-none sm:text-[56px]">
            {ano}
          </h1>
          <nav aria-label="Navegação entre anos" className="flex items-center gap-1">
            <SetaDeAno ano={ano - 1} rotulo={`Ir para ${ano - 1}`} direcao="anterior" />
            <SetaDeAno ano={ano + 1} rotulo={`Ir para ${ano + 1}`} direcao="proximo" />
          </nav>
        </div>

        <Link
          href={`/${competenciaCorrente}`}
          className="group flex flex-wrap items-center justify-between gap-4 rounded-xl bg-inverso px-7 py-6 text-on-inverso transition-shadow duration-200 hover:shadow-lift"
        >
          <span className="flex flex-col gap-1">
            <span className="text-[28px] leading-none sm:text-[34px]">
              {nomeDoMes(competenciaCorrente)}
            </span>
            <span className="text-[15px] text-on-inverso-suave">continuar de onde você parou</span>
          </span>
          <ArrowRightIcon
            size={24}
            aria-hidden="true"
            className="transition-transform duration-200 group-hover:translate-x-1"
          />
          <span className="sr-only">{formatarCompetencia(competenciaCorrente)}</span>
        </Link>

        <GradeDeMeses
          competencias={competenciasDoAno(ano)}
          competenciaCorrente={competenciaCorrente}
        />
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="titulo-composicao-mes" className="flex flex-col gap-5">
          <h2 id="titulo-composicao-mes" className="text-[20px]">
            Saídas de {nomeDoMes(competenciaCorrente)}
          </h2>
          <BarraDeComposicao
            titulo={`Saídas de ${formatarCompetencia(competenciaCorrente)}, por tipo de compromisso`}
            fatias={doMes}
          />
        </section>

        <section aria-labelledby="titulo-composicao-ano" className="flex flex-col gap-5">
          <h2 id="titulo-composicao-ano" className="text-[20px]">
            Saídas de {ano}
          </h2>
          <BarraDeComposicao
            titulo={`Saídas de ${ano}, por tipo de compromisso`}
            fatias={composicaoDeBlocos(visaoDoAno.totais)}
          />
        </section>
      </div>
    </div>
  );
}

function SetaDeAno({
  ano,
  rotulo,
  direcao,
}: {
  readonly ano: number;
  readonly rotulo: string;
  readonly direcao: "anterior" | "proximo";
}) {
  const Icone = direcao === "anterior" ? CaretLeftIcon : CaretRightIcon;
  return (
    <Link
      href={`/?ano=${ano}`}
      aria-label={rotulo}
      className="flex size-11 items-center justify-center rounded-pill border border-line text-ink-muted transition-colors duration-200 hover:border-line-strong hover:text-ink"
    >
      <Icone size={18} weight="bold" aria-hidden="true" />
    </Link>
  );
}
