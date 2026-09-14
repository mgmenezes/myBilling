import { notFound } from "next/navigation";
import { SeletorCompetencia } from "@/components/seletor-competencia";
import { criarCompetencia } from "@/domain";
import { formatarCompetencia } from "@/lib/formatar";
import { sessaoDaUI } from "../sessao";

/**
 * Página de um mês. Aqui ela só prova a rota: o resumo mensal de verdade é a
 * Fase 7. O que já vale é a fronteira — competência malformada na URL vira
 * página de não encontrado, sem erro não tratado (UI-02, AC 3).
 *
 * `requireSession` de novo, por baixo de `sessaoDaUI`: o layout já resolveu a
 * sessão, e mesmo assim a página resolve outra vez. Uma rota nunca deve
 * depender do guarda de outro arquivo.
 */
export default async function PaginaDoMes({ params }: PageProps<"/[competencia]">) {
  await sessaoDaUI();

  const { competencia } = await params;
  const resultado = criarCompetencia(competencia);
  if (!resultado.ok) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <SeletorCompetencia competencia={resultado.value} />

      <section aria-labelledby="titulo-do-mes" className="flex flex-col gap-2">
        <h1 id="titulo-do-mes" className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {formatarCompetencia(resultado.value)}
        </h1>
        <p className="rounded-md border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
          Nenhum lançamento neste mês ainda. Navegue entre os meses pelo seletor acima: nenhuma
          estrutura precisa ser criada antes.
        </p>
      </section>
    </div>
  );
}
