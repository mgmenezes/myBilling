import { notFound } from "next/navigation";
import { criarCompra } from "@/app/actions/compras";
import { obterVisaoMensal } from "@/application/mes/obter-visao-mensal/handler";
import { FormCompra } from "@/components/form-compra";
import { HorizonteFuturo } from "@/components/horizonte-futuro";
import { SeletorCompetencia } from "@/components/seletor-competencia";
import { TabelaLancamentos } from "@/components/tabela-lancamentos";
import { TransicaoMes } from "@/components/transicao-mes";
import { Chip } from "@/components/ui";
import { type Cents, criarCompetencia } from "@/domain";
import { criarRepositorios } from "@/infrastructure/container";
import { formatarBRL, formatarCompetencia } from "@/lib/formatar";
import { sessaoDaUI } from "../sessao";

/**
 * A página do mês.
 *
 * O que ela garante, e que nenhuma outra tela pode desfazer: **os dois eixos
 * ficam em blocos separados, cada um com o seu selo, e nada aqui os soma nem
 * os subtrai** (MOV-03). Total de Gastos mede competência, o mês em que o
 * gasto foi assumido. Saídas mede caixa, o mês em que o dinheiro se moveu.
 * Eles divergem de verdade, e o usuário precisa entender por quê em vez de
 * achar que é defeito. Por isso a divergência aparece rotulada, e não
 * calculada: nenhuma subtração entre os dois existe nesta página.
 *
 * Os dois painéis não têm o mesmo peso visual. Competência ocupa mais espaço
 * porque é o eixo que responde a pergunta do dia a dia, "quanto eu gastei
 * neste mês". Caixa responde uma pergunta mais rara e fica menor. Dois cartões
 * idênticos lado a lado diriam que as duas perguntas têm a mesma frequência,
 * o que é falso.
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
    <div className="flex flex-col gap-8">
      <SeletorCompetencia competencia={resultado.value} />

      <TransicaoMes competencia={resultado.value}>
        <div className="flex flex-col gap-8">
          <h1 className="text-[30px] leading-[1.1] sm:text-[38px]">
            {formatarCompetencia(resultado.value)}
          </h1>

          {/* Os dois eixos, lado a lado mas nunca no mesmo card (MOV-03). */}
          <div className="grid gap-4 lg:grid-cols-5">
            <BlocoDeEixo
              id="eixo-competencia"
              titulo="Total de Gastos"
              selo="Eixo competência"
              valor={visao.competenciaView.totalGastos}
              explicacao="O que foi assumido neste mês, pago ou não."
              className="lg:col-span-3"
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
              className="lg:col-span-2"
              linhas={[
                { rotulo: "Entradas recebidas", valor: visao.caixaView.entradasRecebidas },
                {
                  rotulo: "Investimentos realizados",
                  valor: visao.caixaView.investimentosRealizados,
                },
                { rotulo: "Saldo de caixa", valor: visao.caixaView.saldo },
              ]}
            />
          </div>

          <p className="max-w-[68ch] text-[15px] leading-relaxed text-ink-muted">
            Os dois blocos acima medem coisas diferentes e divergir entre eles é normal: a fatura
            paga neste mês contém compras de meses anteriores. O myBilling não soma nem subtrai um
            do outro.
          </p>

          <section aria-labelledby="titulo-lancamentos" className="flex flex-col gap-5">
            <h2 id="titulo-lancamentos" className="text-[22px]">
              Lançamentos do mês
            </h2>
            <TabelaLancamentos lancamentos={visao.lancamentos} />
          </section>

          <section aria-labelledby="titulo-futuro" className="flex flex-col gap-5">
            <h2 id="titulo-futuro" className="text-[22px]">
              Já comprometido nos próximos meses
            </h2>
            <HorizonteFuturo
              meses={visao.futuro.map((mes) => ({
                competencia: mes.competencia,
                rotulo: formatarCompetencia(mes.competencia),
                valor: formatarBRL(mes.comprometido),
              }))}
            />
          </section>

          <FormCompra
            competencia={resultado.value}
            meios={meios.map((meio) => ({ id: meio.id, nome: meio.nome }))}
            categorias={categorias.map((categoria) => ({
              id: categoria.id,
              nome: categoria.nome,
            }))}
            usuarios={usuarios.map((usuario) => ({ id: usuario.id, nome: usuario.nome }))}
            enviar={criarCompra}
          />
        </div>
      </TransicaoMes>
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
  className = "",
}: {
  readonly id: string;
  readonly titulo: string;
  readonly selo: string;
  readonly valor: Cents;
  readonly explicacao: string;
  readonly className?: string;
  readonly linhas: ReadonlyArray<{ readonly rotulo: string; readonly valor: Cents }>;
}) {
  return (
    <section
      aria-labelledby={id}
      className={`flex flex-col gap-4 rounded-panel bg-surface p-6 shadow-lift sm:p-8 ${className}`}
    >
      <Chip>{selo}</Chip>

      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-[15px] font-medium tracking-normal text-ink-muted">
          {titulo}
        </h2>
        <p className="tabular text-[34px] leading-none font-medium tracking-[-0.02em] sm:text-[40px]">
          {formatarBRL(valor)}
        </p>
      </div>

      <p className="text-[15px] text-ink-muted">{explicacao}</p>

      {/*
        Uma linha divisória acima do grupo, nenhuma entre as linhas. Régua sob
        cada item é o padrão que faz qualquer lista parecer planilha exportada.
      */}
      <dl className="flex flex-col gap-2.5 border-t border-line pt-4">
        {linhas.map((linha) => (
          <div key={linha.rotulo} className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-[15px] text-ink-muted">{linha.rotulo}</dt>
            <dd className="tabular text-[15px] font-medium">{formatarBRL(linha.valor)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
