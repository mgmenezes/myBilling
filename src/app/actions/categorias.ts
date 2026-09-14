"use server";

import { revalidatePath } from "next/cache";
import { entradaCategoriaSchema } from "@/application/schemas/categoria.schema";
import { ErroDeSessao, requireSession } from "@/infrastructure/auth/sessao";
import { db } from "@/infrastructure/db/client";
import { CadastroRepositoryDrizzle } from "@/infrastructure/db/repositories/cadastro.repository";
import { erroDeAction, mensagemDoErro, type ResultadoAction } from "@/lib/erros";

/**
 * Server Action de categorias.
 *
 * Vale aqui a mesma disciplina de `compras.ts`: `requireSession()` na primeira
 * instrução mesmo havendo proxy, payload revalidado no servidor com o mesmo
 * schema que o formulário usou, e **nada lança para o cliente** — todo caminho
 * sai no envelope `ResultadoAction`.
 *
 * **Categoria não tem competência** (veja o schema do banco). Criar uma aqui a
 * torna disponível em todo mês, passado e futuro, sem nenhum trabalho a mais.
 * É a diferença entre o app e a planilha, onde cada aba precisava da linha
 * nova digitada de novo.
 */

export interface CategoriaGravada {
  readonly id: string;
  readonly nome: string;
  /** `true` quando o nome já pertencia a uma categoria ativa. Nada foi criado. */
  readonly jaExistia: boolean;
  /** `true` quando o nome pertencia a uma categoria arquivada, que voltou. */
  readonly reativada: boolean;
}

export async function criarCategoria(payload: unknown): Promise<ResultadoAction<CategoriaGravada>> {
  const sessao = await requireSession().catch(apenasErroDeSessao);
  if (sessao instanceof ErroDeSessao) {
    return erroDeAction(sessao.codigo);
  }

  const validado = entradaCategoriaSchema.safeParse(payload);
  if (!validado.success) {
    const mensagem = validado.error.issues[0]?.message ?? mensagemDoErro("VALIDACAO");
    return {
      ok: false,
      erro: { code: "VALIDACAO", mensagem, campos: { nome: mensagem } },
    };
  }

  try {
    /*
     * A classe concreta, e não `criarRepositorios().cadastros`. A port
     * `CadastroRepository` declara só leitura, por decisão registrada no
     * próprio repositório: quem escreve cadastro é o seed e esta action, e
     * nenhum caso de uso de mês ou de compra precisa dessas operações. Subir
     * `criarCategoria` para a port daria a todos eles um poder que nenhum usa.
     */
    const cadastros = new CadastroRepositoryDrizzle(db());
    const { nome } = validado.data;

    /*
     * Três caminhos, e os dois primeiros existem para que nome repetido nunca
     * vire um beco sem saída.
     *
     * A busca ignora caixa porque o `UNIQUE` do Postgres não ignora: sem ela,
     * "Mercado" e "mercado" entrariam as duas. E ela enxerga categoria
     * arquivada porque o nome dela continua ocupando o `UNIQUE` — dizer "já
     * existe" apontando para algo fora de toda lista é o pior erro possível.
     */
    const existente = await cadastros.buscarCategoriaPorNome(nome);

    if (existente !== null && existente.arquivadaEm === null) {
      return sucesso({ id: existente.id, nome: existente.nome, jaExistia: true, reativada: false });
    }

    if (existente !== null) {
      const reativada = await cadastros.reativarCategoria(existente.id);
      return sucesso({ id: reativada.id, nome: reativada.nome, jaExistia: true, reativada: true });
    }

    const criada = await cadastros.criarCategoria({ nome, arquivadaEm: null });
    return sucesso({ id: criada.id, nome: criada.nome, jaExistia: false, reativada: false });
  } catch (erro) {
    // O identificador vai para o log do servidor junto do erro; para o
    // navegador vai só ele. Stack trace não atravessa (UI-02, AC 8).
    const correlationId = crypto.randomUUID();
    console.error(`[${correlationId}] falha ao criar categoria`, erro);
    return erroDeAction(
      "ERRO_INESPERADO",
      `${mensagemDoErro("ERRO_INESPERADO")} (ref. ${correlationId})`,
    );
  }
}

/**
 * A lista de categorias é renderizada no servidor e alimenta tanto o seletor
 * do formulário quanto o filtro da lista. Sem revalidar, a categoria nova só
 * apareceria depois de um recarregamento manual.
 */
function sucesso(data: CategoriaGravada): ResultadoAction<CategoriaGravada> {
  revalidatePath("/[competencia]/lancamentos", "page");
  return { ok: true, data };
}

function apenasErroDeSessao(erro: unknown): ErroDeSessao {
  if (erro instanceof ErroDeSessao) {
    return erro;
  }
  throw erro;
}
