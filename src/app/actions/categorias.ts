"use server";

import { revalidatePath } from "next/cache";
import {
  entradaCategoriaSchema,
  entradaCorDaCategoriaSchema,
  entradaRenomearCategoriaSchema,
} from "@/application/schemas/categoria.schema";
import { type CorDeCategoria, corDaCategoria } from "@/domain";
import { ErroDeSessao, requireSession } from "@/infrastructure/auth/sessao";
import { db } from "@/infrastructure/db/client";
import { CadastroRepositoryDrizzle } from "@/infrastructure/db/repositories/cadastro.repository";
import {
  erroDeAction,
  MENSAGEM_CATEGORIA_INEXISTENTE,
  mensagemDoErro,
  type ResultadoAction,
} from "@/lib/erros";

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

/** A categoria como a tela de Categorias a vê depois de gravar. */
export interface CategoriaAtualizada {
  readonly id: string;
  readonly nome: string;
  /** A escolhida, ou `null` quando a categoria está na automática. */
  readonly cor: CorDeCategoria | null;
}

export interface CategoriaRenomeada extends CategoriaAtualizada {
  /** `false` quando o nome novo era o atual: nada foi gravado, e não há o que avisar. */
  readonly renomeada: boolean;
}

/**
 * Troca a cor da categoria, ou apaga a escolha com `cor: null` (COR-04, ACs 4
 * e 5). Grava ao escolher, sem formulário: a tela manda a cor assim que a
 * pessoa toca na opção.
 */
export async function trocarCorDaCategoria(
  payload: unknown,
): Promise<ResultadoAction<CategoriaAtualizada>> {
  const sessao = await requireSession().catch(apenasErroDeSessao);
  if (sessao instanceof ErroDeSessao) {
    return erroDeAction(sessao.codigo);
  }

  const validado = entradaCorDaCategoriaSchema.safeParse(payload);
  if (!validado.success) {
    return erroDeValidacao(validado.error.issues);
  }

  try {
    const cadastros = new CadastroRepositoryDrizzle(db());
    const { categoriaId, cor } = validado.data;

    if ((await cadastros.buscarCategoria(categoriaId)) === null) {
      return categoriaInexistente();
    }

    const gravada = await cadastros.atualizarCategoria(categoriaId, { cor });
    revalidarTelasDaCategoria();
    return { ok: true, data: { id: gravada.id, nome: gravada.nome, cor: gravada.cor } };
  } catch (erro) {
    return falhaInesperada("trocar a cor da categoria", erro);
  }
}

/**
 * Renomeia a categoria (COR-04, ACs 6 e 7).
 *
 * **Renomear congela a cor.** A automática é derivada do nome, então trocar o
 * nome trocaria a cor junto, e a pessoa perderia de vista a categoria que
 * acabou de renomear. Por isso o nome novo é gravado com a cor que estava em
 * uso, `cor ?? corAutomatica(nomeAntigo)`, que é `corDaCategoria` da categoria
 * de antes, no mesmo `UPDATE`.
 *
 * **O nome de outra categoria é recusado**, ignorando a caixa, como no
 * cadastro inline, e também quando a outra está arquivada: o nome dela
 * continua ocupando o `UNIQUE`. Só a caixa mudando, na própria categoria, é
 * um nome novo, e grava: é assim que se corrige "mercado" para "Mercado".
 *
 * **O nome igual ao atual não grava** (Edge Case). Igual depois da mesma
 * normalização do cadastro, que só mexe em espaço. Sem esse atalho, salvar sem
 * mudar nada congelaria a cor automática como se fosse escolhida.
 */
export async function renomearCategoria(
  payload: unknown,
): Promise<ResultadoAction<CategoriaRenomeada>> {
  const sessao = await requireSession().catch(apenasErroDeSessao);
  if (sessao instanceof ErroDeSessao) {
    return erroDeAction(sessao.codigo);
  }

  const validado = entradaRenomearCategoriaSchema.safeParse(payload);
  if (!validado.success) {
    return erroDeValidacao(validado.error.issues);
  }

  try {
    const cadastros = new CadastroRepositoryDrizzle(db());
    const { categoriaId, nome } = validado.data;

    const atual = await cadastros.buscarCategoria(categoriaId);
    if (atual === null) {
      return categoriaInexistente();
    }

    if (nome === atual.nome) {
      return {
        ok: true,
        data: { id: atual.id, nome: atual.nome, cor: atual.cor, renomeada: false },
      };
    }

    const homonima = await cadastros.buscarCategoriaPorNome(nome);
    if (homonima !== null && homonima.id !== atual.id) {
      return erroDeAction("CATEGORIA_JA_EXISTE");
    }

    const gravada = await cadastros.atualizarCategoria(atual.id, {
      nome,
      cor: corDaCategoria(atual),
    });
    revalidarTelasDaCategoria();
    return {
      ok: true,
      data: { id: gravada.id, nome: gravada.nome, cor: gravada.cor, renomeada: true },
    };
  } catch (erro) {
    return falhaInesperada("renomear a categoria", erro);
  }
}

/**
 * A cor e o nome da categoria aparecem em "Todo mês", em Lançamentos, na
 * Visão geral e na própria tela de Categorias, e em todo mês. Por padrão de
 * rota, e não pelo mês aberto: a categoria não tem competência (COR-04, AC 9).
 */
function revalidarTelasDaCategoria(): void {
  revalidatePath("/[competencia]", "page");
  revalidatePath("/[competencia]/lancamentos", "page");
  revalidatePath("/[competencia]/fixos", "page");
  revalidatePath("/[competencia]/cadastros/categorias", "page");
}

function categoriaInexistente(): ResultadoAction<never> {
  return erroDeAction("CATEGORIA_NAO_ENCONTRADA", MENSAGEM_CATEGORIA_INEXISTENTE);
}

/** Cada campo recusado com a primeira mensagem dele, para a linha mostrar onde. */
function erroDeValidacao(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
): ResultadoAction<never> {
  const campos: Record<string, string> = {};
  for (const issue of issues) {
    campos[issue.path.join(".")] ??= issue.message;
  }
  return {
    ok: false,
    erro: { code: "VALIDACAO", mensagem: mensagemDoErro("VALIDACAO"), campos },
  };
}

/** O detalhe fica no log do servidor; o navegador recebe só a referência (UI-02, AC 8). */
function falhaInesperada(operacao: string, erro: unknown): ResultadoAction<never> {
  const correlationId = crypto.randomUUID();
  console.error(`[${correlationId}] falha ao ${operacao}`, erro);
  return erroDeAction(
    "ERRO_INESPERADO",
    `${mensagemDoErro("ERRO_INESPERADO")} (ref. ${correlationId})`,
  );
}

function apenasErroDeSessao(erro: unknown): ErroDeSessao {
  if (erro instanceof ErroDeSessao) {
    return erro;
  }
  throw erro;
}
