"use server";

import { revalidatePath } from "next/cache";
import {
  type CodigoErroEdicaoDeMeio,
  editarMeioDePagamento as editarUso,
} from "@/application/cadastros/editar-meio-de-pagamento/handler";
import {
  entradaEdicaoDoMeioSchema,
  entradaMeioPagamentoSchema,
} from "@/application/schemas/meio-pagamento.schema";
import { ErroDeSessao, requireSession } from "@/infrastructure/auth/sessao";
import { db } from "@/infrastructure/db/client";
import { CadastroRepositoryDrizzle } from "@/infrastructure/db/repositories/cadastro.repository";
import {
  erroDeAction,
  MENSAGEM_MEIO_INEXISTENTE,
  mensagemDoErro,
  type ResultadoAction,
} from "@/lib/erros";

/**
 * Server Action de meios de pagamento.
 *
 * Vale aqui a mesma disciplina de `compras.ts` e `categorias.ts`:
 * `requireSession()` na primeira instrução mesmo havendo proxy, payload
 * revalidado no servidor com o mesmo schema que o formulário usou, e **nada
 * lança para o cliente**.
 *
 * Como categoria, meio de pagamento **não tem competência**: criar um aqui o
 * torna disponível em todo mês, passado e futuro.
 */

export interface MeioPagamentoGravado {
  readonly id: string;
  readonly nome: string;
  /**
   * Se ele vai gerar fatura. O formulário de lançamento avulso usa isto para
   * propor a marca de "já saiu da conta" no meio recém-criado, sem esperar o
   * `revalidatePath` trazer a lista nova do servidor.
   */
  readonly geraFatura: boolean;
}

export async function criarMeioDePagamento(
  payload: unknown,
): Promise<ResultadoAction<MeioPagamentoGravado>> {
  const sessao = await requireSession().catch(apenasErroDeSessao);
  if (sessao instanceof ErroDeSessao) {
    return erroDeAction(sessao.codigo);
  }

  const validado = entradaMeioPagamentoSchema.safeParse(payload);
  if (!validado.success) {
    const issue = validado.error.issues[0];
    const mensagem = issue?.message ?? mensagemDoErro("VALIDACAO");
    const campo = issue?.path.join(".") ?? "nome";
    return { ok: false, erro: { code: "VALIDACAO", mensagem, campos: { [campo]: mensagem } } };
  }

  try {
    const cadastros = new CadastroRepositoryDrizzle(db());
    const dados = validado.data;

    /*
     * Nome repetido vira **erro**, e não reaproveitamento silencioso como em
     * categoria. A diferença é a quantidade de dado: uma categoria é só o
     * nome, então devolver a existente não descarta nada. Um cartão carrega
     * dias de ciclo — devolver outro jogaria fora o que a pessoa acabou de
     * digitar sem dizer que jogou.
     */
    const existente = await cadastros.buscarMeioDePagamentoAtivoPorNome(dados.nome);
    if (existente !== null) {
      const mensagem = "Já existe um meio de pagamento com esse nome.";
      return { ok: false, erro: { code: "VALIDACAO", mensagem, campos: { nome: mensagem } } };
    }

    const criado = await cadastros.criarMeioDePagamento(
      dados.tipo === "CARTAO_CREDITO"
        ? {
            nome: dados.nome,
            tipo: "CARTAO_CREDITO",
            arquivadoEm: null,
            diaFechamento: dados.diaFechamento,
            diaVencimento: dados.diaVencimento,
            /*
             * Fixo em `true`, que é o padrão do banco: compra feita no dia do
             * fechamento entra na fatura seguinte (CART-02, AC 2). Não é
             * campo do formulário por decisão de produto — a alocação de
             * fatura ainda não tem tela, então seria um botão cujo efeito
             * ninguém consegue observar.
             */
            fechamentoVaiParaFaturaSeguinte: true,
          }
        : { nome: dados.nome, tipo: dados.tipo, arquivadoEm: null },
    );

    revalidarTelasDoMeio();
    return {
      ok: true,
      data: { id: criado.id, nome: criado.nome, geraFatura: criado.tipo === "CARTAO_CREDITO" },
    };
  } catch (erro) {
    return falhaInesperada("criar meio de pagamento", erro);
  }
}

export interface MeioPagamentoEditado {
  readonly id: string;
  readonly nome: string;
  /** `false` quando nada mudou: nada foi gravado, e não há o que avisar. */
  readonly alterado: boolean;
}

/**
 * Renomeia o meio e corrige os dias do cartão, pela tela de Cadastros
 * (CADCOL-07). As regras são do caso de uso: o meio arquivado é inexistente, o
 * ciclo acompanha o tipo, o nome é único entre os ativos e nada mudou não grava.
 * Aqui ficam a borda e a mensagem de cada recusa.
 *
 * Revalida só quando algo foi gravado: sem mudança, nenhuma tela tem o que
 * atualizar (CADCOL-07, AC 9).
 */
export async function editarMeioDePagamento(
  payload: unknown,
): Promise<ResultadoAction<MeioPagamentoEditado>> {
  const sessao = await requireSession().catch(apenasErroDeSessao);
  if (sessao instanceof ErroDeSessao) {
    return erroDeAction(sessao.codigo);
  }

  const validado = entradaEdicaoDoMeioSchema.safeParse(payload);
  if (!validado.success) {
    return erroDeValidacao(validado.error.issues);
  }

  try {
    const resultado = await editarUso(
      { meios: new CadastroRepositoryDrizzle(db()) },
      validado.data,
    );
    if (!resultado.ok) {
      return recusaDaEdicao(resultado.error.code);
    }

    const { meio, alterado } = resultado.value;
    if (alterado) {
      revalidarTelasDoMeio();
    }
    return { ok: true, data: { id: meio.id, nome: meio.nome, alterado } };
  } catch (erro) {
    return falhaInesperada("editar meio de pagamento", erro);
  }
}

/**
 * O meio aparece no diálogo de importação, que mora no layout de `(app)`, e na
 * Visão geral, em Lançamentos, em Todo mês e em Cadastros, em todo mês. Só o
 * layout raiz alcança o layout de `(app)`: o tipo `"layout"` invalida o layout,
 * os aninhados e todas as páginas debaixo dele (CADCOL-07, AC 14).
 */
function revalidarTelasDoMeio(): void {
  revalidatePath("/", "layout");
}

function recusaDaEdicao(code: CodigoErroEdicaoDeMeio): ResultadoAction<never> {
  if (code === "MEIO_PAGAMENTO_NAO_ENCONTRADO") {
    return erroDeAction(code, MENSAGEM_MEIO_INEXISTENTE);
  }
  return erroDeAction(code);
}

/** Cada campo recusado com a primeira mensagem dele, para o painel mostrar onde. */
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
