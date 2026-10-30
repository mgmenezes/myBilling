import { notFound } from "next/navigation";
import { criarCategoria } from "@/app/actions/categorias";
import { criarMeioDePagamento } from "@/app/actions/meios-de-pagamento";
import {
  criarRecorrencia,
  editarRecorrencia,
  encerrarRecorrencia,
  registrarNovaVigencia,
} from "@/app/actions/recorrencias";
import { valorNoMesExibido } from "@/application/recorrencias/editar/handler";
import { DialogoDeCadastro } from "@/components/dialogo-de-cadastro";
import { FormRecorrencia } from "@/components/form-recorrencia";
import { ListaDeFixos } from "@/components/lista-de-fixos";
import { corDaCategoria, criarCompetencia, valeNaCompetencia, versaoVigente } from "@/domain";
import { criarRepositorios } from "@/infrastructure/container";
import { db } from "@/infrastructure/db/client";
import { RecorrenciaRepositoryDrizzle } from "@/infrastructure/db/repositories/recorrencia.repository";
import { formatarBRL, formatarCompetencia } from "@/lib/formatar";
import { sessaoDaUI } from "../../sessao";

/**
 * O que se repete todo mês: gastos fixos e receitas recorrentes.
 *
 * **A área se chama "Todo mês", e o bloco da lista continua se chamando
 * "Fixos".** Não é inconsistência: o bloco reúne despesa recorrente, e esta
 * área administra também a receita recorrente, cuja ocorrência aparece em
 * "Entradas". Os dois nomes descrevem conjuntos diferentes.
 *
 * A área existe separada de Lançamentos porque recorrência tem ciclo de vida:
 * criar, reajustar, encerrar. Isso não cabe dentro do formulário de compra como
 * coube o cadastro de categoria, que é só um nome.
 *
 * **O valor exibido é o vigente na competência aberta**, não o mais recente.
 * Abrir março depois de reajustar em outubro precisa mostrar o que valia em
 * março — é a razão de existir versionamento, e mostrar o valor de hoje aqui
 * desmentiria a lista de lançamentos logo ao lado.
 *
 * O formulário de edição recebe o valor por `valorNoMesExibido`, a mesma
 * função com que o caso de uso decide se o valor mudou. Calculado de outro
 * jeito, salvar sem mexer registraria uma vigência (EDF-03 AC 3).
 */

export const dynamic = "force-dynamic";

export default async function PaginaDeFixos({ params }: PageProps<"/[competencia]/fixos">) {
  await sessaoDaUI();

  const { competencia } = await params;
  const resultado = criarCompetencia(competencia);
  if (!resultado.ok) {
    notFound();
  }

  const repositorios = criarRepositorios();
  const [todas, meios, categorias, usuarios] = await Promise.all([
    new RecorrenciaRepositoryDrizzle(db()).listarComVersoes(),
    repositorios.cadastros.listarMeiosDePagamentoDisponiveis(),
    repositorios.cadastros.listarCategoriasDisponiveis(),
    repositorios.cadastros.listarUsuarios(),
  ]);

  /* O nome e a cor saem da mesma categoria: a que não está entre as
     disponíveis vira "Categoria removida", na neutra (COR-02, AC 5). */
  const categoriaPorId = new Map(categorias.map((c) => [c.id, c]));
  const nomePorMeio = new Map(meios.map((m) => [m.id, m.nome]));

  /* As mesmas listas no cadastro e na edição. `geraFatura` restringe o
     destino quando a natureza é receita. */
  const opcoesDeMeio = meios.map((m) => ({
    id: m.id,
    nome: m.nome,
    geraFatura: m.tipo === "CARTAO_CREDITO",
  }));
  const opcoesDeCategoria = categorias.map((c) => ({ id: c.id, nome: c.nome }));
  const opcoesDeUsuario = usuarios.map((u) => ({ id: u.id, nome: u.nome }));

  /*
   * A lista é do **mês aberto**, então ela mostra o que vale nele. Um fixo
   * encerrado em agosto some de setembro em diante e continua visível em
   * agosto, que ele de fato compôs — esconder lá seria mentir sobre o mês
   * (FIXO-07). A mesma regra que a materialização usa para não criar
   * ocorrência, com teste de concordância entre as duas.
   */
  const itens = todas
    .filter(({ recorrencia }) =>
      valeNaCompetencia(
        { inicio: recorrencia.competenciaInicio, fim: recorrencia.competenciaFim },
        resultado.value,
      ),
    )
    .map(({ recorrencia, versoes }) => {
      const vigente = versaoVigente(versoes, resultado.value);
      const categoria =
        recorrencia.categoriaId === null ? undefined : categoriaPorId.get(recorrencia.categoriaId);
      return {
        id: recorrencia.id,
        descricao: recorrencia.descricao,
        natureza: recorrencia.natureza,
        /* `null` quando a competência aberta é anterior a toda vigência: a
         recorrência existe, mas ainda não vale neste mês. */
        valorVigente: vigente === null ? null : formatarBRL(vigente.valorPrevisto),
        diaVencimento: recorrencia.diaVencimento,
        categoria:
          recorrencia.categoriaId === null ? null : (categoria?.nome ?? "Categoria removida"),
        corDaCategoria: categoria === undefined ? null : corDaCategoria(categoria),
        meio: nomePorMeio.get(recorrencia.meioPagamentoId) ?? "Meio arquivado",
        inicio: formatarCompetencia(recorrencia.competenciaInicio),
        fim:
          recorrencia.competenciaFim === null
            ? null
            : formatarCompetencia(recorrencia.competenciaFim),
        encerrada: recorrencia.encerradaEm !== null,
        competenciaInicio: recorrencia.competenciaInicio,
        competenciaFim: recorrencia.competenciaFim,
        meioPagamentoId: recorrencia.meioPagamentoId,
        categoriaId: recorrencia.categoriaId,
        usuarioId: recorrencia.usuarioId,
        valorNoMesCentavos: valorNoMesExibido(versoes, resultado.value),
      };
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-[28px] leading-[1.1] sm:text-[34px]">Todo mês</h1>
        {/* Mesmo gesto da área de Lançamentos: a lista só cresce, e o
            formulário no rodapé ficava cada vez mais longe (AD-014). */}
        <DialogoDeCadastro rotuloDoBotao="+ Novo fixo" titulo="Novo gasto fixo ou entrada">
          <FormRecorrencia
            competencia={resultado.value}
            meios={opcoesDeMeio}
            categorias={opcoesDeCategoria}
            usuarios={opcoesDeUsuario}
            criar={criarRecorrencia}
            criarCategoria={criarCategoria}
            criarMeioDePagamento={criarMeioDePagamento}
          />
        </DialogoDeCadastro>
      </div>

      <div className="flex flex-col gap-2">
        <p className="max-w-[62ch] text-[15px] leading-relaxed text-ink-muted">
          Água, luz, internet, salário. Cadastre uma vez e eles aparecem em todo mês, inclusive nos
          que ainda não chegaram. Quando o valor mudar, registre a partir de qual mês vale — os
          anteriores continuam mostrando o que você tinha planejado.
        </p>
      </div>

      <ListaDeFixos
        competencia={resultado.value}
        rotuloDaCompetencia={formatarCompetencia(resultado.value)}
        itens={itens}
        registrarVigencia={registrarNovaVigencia}
        encerrar={encerrarRecorrencia}
        edicao={{
          meios: opcoesDeMeio,
          categorias: opcoesDeCategoria,
          usuarios: opcoesDeUsuario,
          editar: editarRecorrencia,
          criarCategoria,
          criarMeioDePagamento,
        }}
      />
    </div>
  );
}
