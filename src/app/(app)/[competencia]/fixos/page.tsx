import { notFound } from "next/navigation";
import { criarCategoria } from "@/app/actions/categorias";
import { criarMeioDePagamento } from "@/app/actions/meios-de-pagamento";
import {
  criarRecorrencia,
  encerrarRecorrencia,
  registrarNovaVigencia,
} from "@/app/actions/recorrencias";
import { FormRecorrencia } from "@/components/form-recorrencia";
import { ListaDeFixos } from "@/components/lista-de-fixos";
import { criarCompetencia, versaoVigente } from "@/domain";
import { criarRepositorios } from "@/infrastructure/container";
import { db } from "@/infrastructure/db/client";
import { RecorrenciaRepositoryDrizzle } from "@/infrastructure/db/repositories/recorrencia.repository";
import { formatarBRL, formatarCompetencia } from "@/lib/formatar";
import { sessaoDaUI } from "../../sessao";

/**
 * Os gastos fixos e as receitas recorrentes.
 *
 * A área existe separada de Lançamentos porque recorrência tem ciclo de vida:
 * criar, reajustar, encerrar. Isso não cabe dentro do formulário de compra como
 * coube o cadastro de categoria, que é só um nome.
 *
 * **O valor exibido é o vigente na competência aberta**, não o mais recente.
 * Abrir março depois de reajustar em outubro precisa mostrar o que valia em
 * março — é a razão de existir versionamento, e mostrar o valor de hoje aqui
 * desmentiria a lista de lançamentos logo ao lado.
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

  const nomePorCategoria = new Map(categorias.map((c) => [c.id, c.nome]));
  const nomePorMeio = new Map(meios.map((m) => [m.id, m.nome]));

  const itens = todas.map(({ recorrencia, versoes }) => {
    const vigente = versaoVigente(versoes, resultado.value);
    return {
      id: recorrencia.id,
      descricao: recorrencia.descricao,
      natureza: recorrencia.natureza,
      /* `null` quando a competência aberta é anterior a toda vigência: a
         recorrência existe, mas ainda não vale neste mês. */
      valorVigente: vigente === null ? null : formatarBRL(vigente.valorPrevisto),
      diaVencimento: recorrencia.diaVencimento,
      categoria:
        recorrencia.categoriaId === null
          ? null
          : (nomePorCategoria.get(recorrencia.categoriaId) ?? "Categoria removida"),
      meio: nomePorMeio.get(recorrencia.meioPagamentoId) ?? "Meio arquivado",
      inicio: formatarCompetencia(recorrencia.competenciaInicio),
      fim:
        recorrencia.competenciaFim === null
          ? null
          : formatarCompetencia(recorrencia.competenciaFim),
      encerrada: recorrencia.encerradaEm !== null,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] leading-[1.1] sm:text-[34px]">Fixos</h1>
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
      />

      <FormRecorrencia
        competencia={resultado.value}
        meios={meios.map((m) => ({ id: m.id, nome: m.nome }))}
        categorias={categorias.map((c) => ({ id: c.id, nome: c.nome }))}
        usuarios={usuarios.map((u) => ({ id: u.id, nome: u.nome }))}
        criar={criarRecorrencia}
        criarCategoria={criarCategoria}
        criarMeioDePagamento={criarMeioDePagamento}
      />
    </div>
  );
}
