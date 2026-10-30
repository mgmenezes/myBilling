import { importarPlanilha, previaDaPlanilha } from "@/app/actions/importacao";
import { criarMeioDePagamento } from "@/app/actions/meios-de-pagamento";
import { ProvedorDeAvisos } from "@/components/avisos";
import { DialogoImportacao } from "@/components/importacao/dialogo-importacao";
import { MenuLateral } from "@/components/menu-lateral";
import { addMeses } from "@/domain";
import { criarRepositorios } from "@/infrastructure/container";
import { db } from "@/infrastructure/db/client";
import { ImportacaoRepositoryDrizzle } from "@/infrastructure/db/repositories/importacao.repository";
import { descreverMeio } from "@/lib/formatar";
import { sessaoDaUI } from "./sessao";

/**
 * Shell do grupo autenticado. A sessão é resolvida aqui, na primeira
 * instrução, mesmo havendo proxy: duas camadas, porque proxy sozinho já
 * falhou publicamente em frameworks deste tipo (AUTH-01, AC 3).
 *
 * **O menu fica encostado na borda esquerda, e o `<main>` ocupa o resto**
 * (TRES-01). A pílula flutuante e o `<main>` de 1.024 px saíram: num monitor
 * grande eles deixavam mais da metade da tela vazia. Cada tela decide a
 * própria largura; as que ainda não foram redesenhadas usam a `AreaEstreita`.
 *
 * **A importação abre do pé do menu, em qualquer tela** (TRES-01, ACs 5 e 6).
 * Ela saiu do título da Visão geral, e com ela as duas consultas que o diálogo
 * pede: os meios sem fatura, para "Cai em", e a última competência importada,
 * para o mês esperado. O diálogo recebe quem está logado, porque tudo entra em
 * nome dessa pessoa.
 *
 * Em 400 pixels o menu vira a barra do topo, que quebra em linhas, e a página
 * não rola na horizontal (UI-03, AC 9; TRES-01, AC 10). Sem `overflow-x:
 * hidden` em lugar nenhum: esconder a barra faria a medição passar sem
 * significar nada.
 *
 * Os avisos em toast moram aqui, uma vez para o app inteiro: quem avisa só
 * chama `useAvisos()`, e o layout continua sendo de servidor.
 */
export default async function LayoutDoApp({ children }: LayoutProps<"/">) {
  const usuario = await sessaoDaUI();

  const [meios, ultimaImportada] = await Promise.all([
    criarRepositorios().cadastros.listarMeiosDePagamentoDisponiveis(),
    new ImportacaoRepositoryDrizzle(db()).ultimaCompetenciaImportada(),
  ]);

  return (
    <ProvedorDeAvisos>
      <div className="flex min-h-dvh flex-col md:flex-row">
        <MenuLateral
          nomeDaPessoa={usuario.nome}
          importar={
            <DialogoImportacao
              nomeDaPessoa={usuario.nome}
              competenciaEsperada={ultimaImportada === null ? null : addMeses(ultimaImportada, 1)}
              /* "Cai em" lista só meio sem fatura (AD-015). */
              meios={meios.map((meio) => ({
                id: meio.id,
                nome: meio.nome,
                geraFatura: meio.tipo === "CARTAO_CREDITO",
                detalhe: descreverMeio(meio),
              }))}
              previaDaPlanilha={previaDaPlanilha}
              importarPlanilha={importarPlanilha}
              criarMeioDePagamento={criarMeioDePagamento}
            />
          }
        />

        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </ProvedorDeAvisos>
  );
}
