import type { ComponentProps } from "react";
import { criarCategoria } from "@/app/actions/categorias";
import { criarCompra } from "@/app/actions/compras";
import { criarLancamentoAvulso } from "@/app/actions/lancamentos";
import { criarMeioDePagamento } from "@/app/actions/meios-de-pagamento";
import { FormCompra } from "@/components/form-compra";
import { FormLancamentoAvulso } from "@/components/form-lancamento-avulso";
import { SeletorDeFormulario } from "@/components/seletor-de-formulario";
import type { Competencia, MeioPagamento } from "@/domain";

type PropsDoAvulso = ComponentProps<typeof FormLancamentoAvulso>;

/**
 * O cadastro de lançamento: as abas Avulso e Parcelado, com as server actions
 * que gravam cada um.
 *
 * **Um cadastro só, em dois lugares.** Lançamentos o abre num diálogo, pelo
 * botão "+ Novo lançamento". A Visão geral o mostra aberto na coluna de ação,
 * para lançar sem sair dela (TRES-03, AC 1). As duas telas recebem as mesmas
 * regras, os mesmos padrões e as mesmas mensagens porque montam este mesmo
 * componente.
 *
 * Mora na camada `app`, e não em `components`, porque importa as server
 * actions, como as páginas fazem.
 */
export function CadastroDeLancamento({
  competencia,
  dataPadrao,
  meios,
  categorias,
  usuarios,
}: {
  readonly competencia: Competencia;
  readonly dataPadrao: string;
  readonly meios: ReadonlyArray<MeioPagamento>;
  readonly categorias: PropsDoAvulso["categorias"];
  readonly usuarios: PropsDoAvulso["usuarios"];
}) {
  return (
    <SeletorDeFormulario
      rotuloDoGrupo="Tipo de lançamento a cadastrar"
      abas={[
        {
          id: "avulso",
          rotulo: "Avulso",
          conteudo: (
            <FormLancamentoAvulso
              competencia={competencia}
              dataPadrao={dataPadrao}
              /* `geraFatura` decide o padrão da caixa "já saiu da conta". */
              meios={meios.map((meio) => ({
                id: meio.id,
                nome: meio.nome,
                geraFatura: meio.tipo === "CARTAO_CREDITO",
              }))}
              categorias={categorias}
              usuarios={usuarios}
              enviar={criarLancamentoAvulso}
              criarCategoria={criarCategoria}
              criarMeioDePagamento={criarMeioDePagamento}
            />
          ),
        },
        {
          id: "parcelado",
          rotulo: "Parcelado",
          conteudo: (
            <FormCompra
              competencia={competencia}
              dataPadrao={dataPadrao}
              meios={meios.map((meio) => ({ id: meio.id, nome: meio.nome }))}
              categorias={categorias}
              usuarios={usuarios}
              enviar={criarCompra}
              criarCategoria={criarCategoria}
              criarMeioDePagamento={criarMeioDePagamento}
            />
          ),
        },
      ]}
    />
  );
}
