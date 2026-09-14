import { InfoIcon } from "@phosphor-icons/react/dist/ssr";
import { notFound } from "next/navigation";
import { obterVisaoMensal } from "@/application/mes/obter-visao-mensal/handler";
import { GraficoCategorias } from "@/components/grafico-categorias";
import { HorizonteFuturo } from "@/components/horizonte-futuro";
import { AlternadorDeVisao, GradeDeIndicadores, type Visao } from "@/components/painel-indicadores";
import { TransicaoMes } from "@/components/transicao-mes";
import { criarCompetencia, resumoPorCategoria } from "@/domain";
import { criarRepositorios } from "@/infrastructure/container";
import { formatarBRL, formatarCompetencia } from "@/lib/formatar";
import { sessaoDaUI } from "../sessao";

/**
 * Visão geral do mês.
 *
 * O jargão contábil saiu da tela. "Eixo competência" virou **Planejamento**,
 * "eixo caixa" virou **Movimentações**, e só uma visão aparece por vez. Essa
 * restrição é o que preserva `MOV-03` por construção: não existindo composição
 * que exiba os dois eixos juntos, não existe composição que os some.
 *
 * A explicação da diferença entre os dois continua disponível, mas sob
 * demanda, num `<details>`. Ela precisa ser lida uma vez, não todo dia.
 *
 * `resumoPorCategoria` já existia no domínio, testado e sem nenhum chamador.
 * O gráfico de categorias não exigiu backend novo: só faltava chamá-lo.
 *
 * **O horizonte futuro fica fora do `TransicaoMes` de propósito.** Ele é a
 * única árvore com GSAP da página, e o `TransicaoMes` é Motion: fora de as
 * duas disputarem os mesmos frames, o `transform` que o Motion mantém no
 * ancestral desloca toda medida de posição do ScrollTrigger, e o gatilho da
 * revelação nunca casa com a posição real da seção.
 */

export const dynamic = "force-dynamic";

export default async function PainelDoMes({ params, searchParams }: PageProps<"/[competencia]">) {
  await sessaoDaUI();

  const { competencia } = await params;
  const { visao: visaoBruta } = await searchParams;
  const resultado = criarCompetencia(competencia);
  if (!resultado.ok) {
    notFound();
  }

  const visao: Visao = visaoBruta === "movimentacoes" ? "movimentacoes" : "planejamento";

  const repositorios = criarRepositorios();
  const visaoMensal = await obterVisaoMensal(repositorios, resultado.value);

  const categorias = resumoPorCategoria(
    visaoMensal.lancamentos.map((item) => item.lancamento),
    resultado.value,
    visaoMensal.competenciaView.totalGastos,
  );

  const nomePorCategoria = new Map(
    (await repositorios.cadastros.listarCategoriasDisponiveis()).map((c) => [c.id, c.nome]),
  );

  return (
    <div className="flex flex-col gap-8">
      <TransicaoMes competencia={resultado.value}>
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <h1 className="text-[28px] leading-[1.1] sm:text-[34px]">
              {formatarCompetencia(resultado.value)}
            </h1>

            <div className="flex flex-wrap items-center gap-3">
              <AlternadorDeVisao competencia={resultado.value} visao={visao} />

              <details className="group">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-pill px-3 text-[14px] text-ink-muted hover:text-ink">
                  <InfoIcon size={16} weight="bold" aria-hidden="true" />
                  Qual é a diferença
                </summary>
                <p className="mt-3 max-w-[62ch] rounded-lg bg-surface-soft p-4 text-[15px] leading-relaxed text-ink-muted">
                  <strong className="font-medium text-ink">Planejamento</strong> mede o que foi
                  assumido neste mês, pago ou não.{" "}
                  <strong className="font-medium text-ink">Movimentações</strong> mede o que de fato
                  saiu ou entrou na conta. Os dois divergem de propósito: a fatura paga neste mês
                  contém compras de meses anteriores. O myBilling nunca soma nem subtrai um do
                  outro.
                </p>
              </details>
            </div>
          </div>

          <GradeDeIndicadores
            competencia={resultado.value}
            visao={visao}
            planejamento={{
              entradas: visaoMensal.competenciaView.entradas,
              totalGastos: visaoMensal.competenciaView.totalGastos,
              pendente: visaoMensal.competenciaView.pendente,
              saldo: visaoMensal.competenciaView.saldo,
            }}
            movimentacoes={{
              entradasRecebidas: visaoMensal.caixaView.entradasRecebidas,
              saidas: visaoMensal.caixaView.saidas,
              saldo: visaoMensal.caixaView.saldo,
            }}
          />

          <section aria-labelledby="titulo-categorias" className="flex flex-col gap-5">
            <h2 id="titulo-categorias" className="text-[20px]">
              Gastos por categoria
            </h2>
            <GraficoCategorias
              titulo="Gastos por categoria, ordenados do maior para o menor"
              fatias={categorias.map((categoria) => ({
                id: categoria.categoriaId ?? "sem-categoria",
                nome:
                  categoria.categoriaId === null
                    ? "Sem categoria"
                    : (nomePorCategoria.get(categoria.categoriaId) ?? "Categoria removida"),
                valor: categoria.gasto,
                percentual: categoria.percentualDistribuicao,
              }))}
            />
          </section>
        </div>
      </TransicaoMes>

      {/* Fora da árvore do Motion: veja a nota no topo do arquivo. */}
      <section aria-labelledby="titulo-futuro" className="flex flex-col gap-5">
        <h2 id="titulo-futuro" className="text-[20px]">
          Já comprometido nos próximos meses
        </h2>
        <HorizonteFuturo
          meses={visaoMensal.futuro.map((mes) => ({
            competencia: mes.competencia,
            rotulo: formatarCompetencia(mes.competencia),
            valor: formatarBRL(mes.comprometido),
          }))}
        />
      </section>
    </div>
  );
}
