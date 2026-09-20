import { notFound } from "next/navigation";
import { NavegacaoPrincipal } from "@/components/navegacao-principal";
import { SeletorCompetencia } from "@/components/seletor-competencia";
import { criarCompetencia } from "@/domain";
import { hojeEm } from "@/lib/relogio";

/**
 * Moldura das áreas do mês: navegação e seletor de período.
 *
 * **A competência vive na rota**, não em estado global. Trocar de área é um
 * link, não uma sincronização, e abrir em nova aba funciona. É também o que
 * garante que o mês selecionado atravesse as áreas sem código nenhum.
 *
 * A validação da competência acontece aqui, uma vez, em vez de repetida em
 * cada página filha.
 *
 * O padding inferior no celular reserva espaço para a barra de navegação
 * fixa, que de outro modo cobriria o último lançamento da lista.
 */
export default async function LayoutDoMes({ children, params }: LayoutProps<"/[competencia]">) {
  const { competencia } = await params;
  const resultado = criarCompetencia(competencia);
  if (!resultado.ok) {
    notFound();
  }

  /* O mês de hoje, no fuso da casa, resolvido por requisição. O seletor
     precisa dele para saber para onde o atalho leva e quando ele não leva a
     lugar nenhum. */
  const corrente = criarCompetencia(hojeEm().slice(0, 7));
  if (!corrente.ok) {
    throw new Error("não foi possível resolver a competência corrente");
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row md:gap-8">
      <div className="md:w-52 md:shrink-0">
        <NavegacaoPrincipal competencia={resultado.value} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-6 pb-24 md:pb-0">
        <SeletorCompetencia competencia={resultado.value} competenciaCorrente={corrente.value} />
        {children}
      </div>
    </div>
  );
}
