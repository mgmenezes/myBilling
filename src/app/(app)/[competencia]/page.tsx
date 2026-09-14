import { notFound } from "next/navigation";
import { criarCompra } from "@/app/actions/compras";
import { obterVisaoMensal } from "@/application/mes/obter-visao-mensal/handler";
import { FormCompra } from "@/components/form-compra";
import { SeletorCompetencia } from "@/components/seletor-competencia";
import { TabelaLancamentos } from "@/components/tabela-lancamentos";
import { type Cents, criarCompetencia } from "@/domain";
import { criarRepositorios } from "@/infrastructure/container";
import { formatarBRL, formatarCompetencia } from "@/lib/formatar";
import { sessaoDaUI } from "../sessao";

/**
 * A página do mês.
 *
 * O que ela garante, e que nenhuma outra tela pode desfazer: **os dois eixos
 * ficam em blocos separados, cada um com o seu selo, e nada aqui os soma nem
 * os subtrai** (MOV-03). Total de Gastos mede competência — o mês em que o
 * gasto foi assumido. Saídas mede caixa — o mês em que o dinheiro se moveu.
 * Eles divergem de verdade, e o usuário precisa entender por quê em vez de
 * achar que é defeito. Por isso a divergência aparece rotulada, e não
 * calculada: nenhuma subtração entre os dois existe nesta página.
 *
 * Carregamento e erro vivem em `loading.tsx` e `error.tsx`, ao lado
 * (UI-02, AC 7 e AC 8). Competência malformada na URL vira página de não
 * encontrado, sem erro não tratado (UI-02, AC 3).
 *
 * `requireSession` de novo, por baixo de `sessaoDaUI`: o layout já resolveu a
 * sessão, e mesmo assim a página resolve outra vez. Uma rota nunca deve
 * depender do guarda de outro arquivo.
 */

export const dynamic = "force-dynamic";

export default async function PaginaDoMes({ params }: PageProps<"/[competencia]">) {
  await sessaoDaUI();

  const { competencia } = await params;
  const resultado = criarCompetencia(competencia);
  if (!resultado.ok) {
    notFound();
  }

  const repositorios = criarRepositorios();
  const [visao, meios, categorias, usuarios] = await Promise.all([
    obterVisaoMensal(repositorios, resultado.value),
    repositorios.cadastros.listarMeiosDePagamentoDisponiveis(),
    repositorios.cadastros.listarCategoriasDisponiveis(),
    repositorios.cadastros.listarUsuarios(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <SeletorCompetencia competencia={resultado.value} />

      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {formatarCompetencia(resultado.value)}
      </h1>

      {/* Os dois eixos, lado a lado mas nunca no mesmo card (MOV-03). */}
      <div className="grid gap-4 md:grid-cols-2">
        <BlocoDeEixo
          id="eixo-competencia"
          titulo="Total de Gastos"
          selo="Eixo competência"
          valor={visao.competenciaView.totalGastos}
          explicacao="O que foi assumido neste mês, pago ou não."
          linhas={[
            { rotulo: "Fixos", valor: visao.competenciaView.fixos },
            { rotulo: "Cartão de Crédito", valor: visao.competenciaView.cartao },
            { rotulo: "Gastos do Mês", valor: visao.competenciaView.avulsos },
            { rotulo: "Ainda não pago", valor: visao.competenciaView.pendente },
            { rotulo: "Entradas", valor: visao.competenciaView.entradas },
            { rotulo: "Investimentos", valor: visao.competenciaView.investimentos },
            { rotulo: "Saldo de competência", valor: visao.competenciaView.saldo },
          ]}
        />
        <BlocoDeEixo
          id="eixo-caixa"
          titulo="Saídas"
          selo="Eixo caixa"
          valor={visao.caixaView.saidas}
          explicacao="O que de fato saiu da conta neste mês."
          linhas={[
            { rotulo: "Entradas recebidas", valor: visao.caixaView.entradasRecebidas },
            { rotulo: "Investimentos realizados", valor: visao.caixaView.investimentosRealizados },
            { rotulo: "Saldo de caixa", valor: visao.caixaView.saldo },
          ]}
        />
      </div>

      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        Os dois blocos acima medem coisas diferentes e divergir entre eles é normal: a fatura paga
        neste mês contém compras de meses anteriores. O myBilling não soma nem subtrai um do outro.
      </p>

      <section aria-labelledby="titulo-lancamentos" className="flex flex-col gap-4">
        <h2
          id="titulo-lancamentos"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Lançamentos do mês
        </h2>
        <TabelaLancamentos lancamentos={visao.lancamentos} />
      </section>

      <section aria-labelledby="titulo-futuro" className="flex flex-col gap-2">
        <h2 id="titulo-futuro" className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Já comprometido nos próximos meses
        </h2>
        <ul className="flex flex-col gap-1">
          {visao.futuro.map((mes) => (
            <li
              key={mes.competencia}
              className="flex flex-wrap justify-between gap-2 text-sm text-zinc-900 dark:text-zinc-50"
            >
              <span>{formatarCompetencia(mes.competencia)}</span>
              <span className="font-medium">{formatarBRL(mes.comprometido)}</span>
            </li>
          ))}
        </ul>
      </section>

      <FormCompra
        competencia={resultado.value}
        meios={meios.map((meio) => ({ id: meio.id, nome: meio.nome }))}
        categorias={categorias.map((categoria) => ({ id: categoria.id, nome: categoria.nome }))}
        usuarios={usuarios.map((usuario) => ({ id: usuario.id, nome: usuario.nome }))}
        enviar={criarCompra}
      />
    </div>
  );
}

function BlocoDeEixo({
  id,
  titulo,
  selo,
  valor,
  explicacao,
  linhas,
}: {
  readonly id: string;
  readonly titulo: string;
  readonly selo: string;
  readonly valor: Cents;
  readonly explicacao: string;
  readonly linhas: ReadonlyArray<{ readonly rotulo: string; readonly valor: Cents }>;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-2 rounded-md border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <p className="w-fit rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
        {selo}
      </p>
      <h2 id={id} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {titulo}
      </h2>
      <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{formatarBRL(valor)}</p>
      <p className="text-sm text-zinc-700 dark:text-zinc-300">{explicacao}</p>
      <dl className="flex flex-col gap-1">
        {linhas.map((linha) => (
          <div key={linha.rotulo} className="flex flex-wrap justify-between gap-2 text-sm">
            <dt className="text-zinc-700 dark:text-zinc-300">{linha.rotulo}</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-50">
              {formatarBRL(linha.valor)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
