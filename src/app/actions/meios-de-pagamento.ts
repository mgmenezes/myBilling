"use server";

import { revalidatePath } from "next/cache";
import { entradaMeioPagamentoSchema } from "@/application/schemas/meio-pagamento.schema";
import { ErroDeSessao, requireSession } from "@/infrastructure/auth/sessao";
import { db } from "@/infrastructure/db/client";
import { CadastroRepositoryDrizzle } from "@/infrastructure/db/repositories/cadastro.repository";
import { erroDeAction, mensagemDoErro, type ResultadoAction } from "@/lib/erros";

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

    revalidatePath("/[competencia]/lancamentos", "page");
    return { ok: true, data: { id: criado.id, nome: criado.nome } };
  } catch (erro) {
    const correlationId = crypto.randomUUID();
    console.error(`[${correlationId}] falha ao criar meio de pagamento`, erro);
    return erroDeAction(
      "ERRO_INESPERADO",
      `${mensagemDoErro("ERRO_INESPERADO")} (ref. ${correlationId})`,
    );
  }
}

function apenasErroDeSessao(erro: unknown): ErroDeSessao {
  if (erro instanceof ErroDeSessao) {
    return erro;
  }
  throw erro;
}
