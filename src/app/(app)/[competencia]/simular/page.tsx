import { notFound } from "next/navigation";
import { criarCategoria } from "@/app/actions/categorias";
import { criarCompra } from "@/app/actions/compras";
import { criarMeioDePagamento } from "@/app/actions/meios-de-pagamento";
import { obterHorizonteDeSaldos } from "@/application/mes/obter-horizonte-de-saldos/handler";
import {
  MESES_DE_PROJECAO,
  materializarRecorrencias,
} from "@/application/recorrencias/materializar/handler";
import { AreaEstreita } from "@/components/area-estreita";
import { Simulador } from "@/components/simulador";
import { criarCompetencia } from "@/domain";
import { criarRepositorios } from "@/infrastructure/container";
import { db } from "@/infrastructure/db/client";
import { RecorrenciaRepositoryDrizzle } from "@/infrastructure/db/repositories/recorrencia.repository";
import { hojeEm } from "@/lib/relogio";
import { sessaoDaUI } from "../../sessao";

/**
 * "Dá pra comprar?" (SIM-02): a tela que responde a pergunta da loja.
 *
 * A página só lê: materializa as recorrências da janela, como as demais telas
 * do mês, lê os treze saldos de C a C + 12 e entrega ao simulador, que faz a
 * conta no cliente a cada tecla. O único caminho de escrita é "Lançar esta
 * compra", que é o `criarCompra` de sempre.
 *
 * Mora na mesma moldura estreita das áreas que não desenham grade própria
 * (TRES-01, AC 8): no celular, os campos e o veredito cabem sem rolar; no
 * computador, a largura de leitura.
 */

export const dynamic = "force-dynamic";

export default async function PaginaDeSimular({ params }: PageProps<"/[competencia]/simular">) {
  await sessaoDaUI();

  const { competencia } = await params;
  const resultado = criarCompetencia(competencia);
  if (!resultado.ok) {
    notFound();
  }

  const repositorios = criarRepositorios();
  /* As ocorrências da janela existem antes da leitura, senão o saldo de um
     mês que ninguém abriu sairia sem as contas fixas (HORIZ-01, AC 1). */
  await materializarRecorrencias(
    { recorrencias: new RecorrenciaRepositoryDrizzle(db()), movimentos: repositorios.movimentos },
    resultado.value,
    MESES_DE_PROJECAO,
  );

  const [horizonte, meios, categorias, usuarios] = await Promise.all([
    obterHorizonteDeSaldos(repositorios, resultado.value),
    repositorios.cadastros.listarMeiosDePagamentoDisponiveis(),
    repositorios.cadastros.listarCategoriasDisponiveis(),
    repositorios.cadastros.listarUsuarios(),
  ]);

  return (
    <AreaEstreita>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] leading-[1.1] sm:text-[34px]">Dá pra comprar?</h1>
          <p className="text-[15px] text-ink-muted">
            Informe a compra e veja quanto vai sobrar em cada mês, antes e depois dela.
          </p>
        </div>
        <Simulador
          competencia={resultado.value}
          hoje={hojeEm()}
          horizonte={horizonte}
          meios={meios.map((m) => ({ id: m.id, nome: m.nome }))}
          categorias={categorias.map((c) => ({ id: c.id, nome: c.nome }))}
          usuarios={usuarios.map((u) => ({ id: u.id, nome: u.nome }))}
          enviar={criarCompra}
          criarCategoria={criarCategoria}
          criarMeioDePagamento={criarMeioDePagamento}
        />
      </div>
    </AreaEstreita>
  );
}
