import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type {
  CadastroRepository,
  EdicaoDeMeioRepository,
  Usuario,
} from "@/application/ports/repositories";
import type {
  Cartao,
  Categoria,
  CorDeCategoria,
  MeioPagamento,
  MeioSemFatura,
  MudancasDoMeio,
} from "@/domain";
import type { Executor } from "../client";
import { categoria, meioPagamento, usuario } from "../schema";
import { paraCategoria, paraMeioPagamento, paraUsuario } from "./mapeadores";

/**
 * Cadastros: usuários, meios de pagamento e categorias.
 *
 * A assimetria entre listar e resolver por id é a regra, não um descuido.
 * **Arquivar não apaga**: o item some dos formulários (CART-03, AC 7) mas
 * continua resolvível por id, porque as parcelas antigas e os relatórios
 * precisam mostrar o nome do cartão ou da categoria de quando o gasto
 * aconteceu (CART-03, AC 6).
 *
 * A escrita de usuário e a criação de meio ficam nesta classe e fora das
 * ports: quem as faz é o seed e a action de criar meio, e nenhum caso de uso de
 * mês ou de compra precisa delas. As de categoria subiram para a port porque a
 * importação cria e reativa categorias (IMP-03 AC 9 a 11). `atualizarCategoria`
 * fica aqui, e não na port, pelo mesmo motivo de `criarUsuario`: só a tela de
 * Categorias troca a cor e renomeia (COR-04).
 *
 * A edição do meio tem port própria, `EdicaoDeMeioRepository`, que esta classe
 * também implementa: o caso de uso de editar meio a recebe, e só ele. Só a tela
 * de Cadastros renomeia um meio e corrige os dias do cartão (CADCOL-07).
 */

export type NovoUsuario = Omit<Usuario, "id">;
export type NovoMeioPagamento = Omit<MeioSemFatura, "id"> | Omit<Cartao, "id">;
/** Sem `cor`: quem cria categoria não escolhe cor, e ela nasce nula (COR-01, AC 5). */
export type NovaCategoria = Omit<Categoria, "id" | "cor">;

/** O que muda numa categoria pela tela de Categorias. Ausente fica como está. */
export interface MudancasDaCategoria {
  readonly nome?: string;
  readonly cor?: CorDeCategoria | null;
}

function paraInstante(iso: string | null): Date | null {
  return iso === null ? null : new Date(iso);
}

export class CadastroRepositoryDrizzle implements CadastroRepository, EdicaoDeMeioRepository {
  constructor(private readonly db: Executor) {}

  async listarUsuarios(): Promise<ReadonlyArray<Usuario>> {
    const linhas = await this.db.select().from(usuario).orderBy(asc(usuario.nome));
    return linhas.map(paraUsuario);
  }

  async criarUsuario(novo: NovoUsuario): Promise<Usuario> {
    const [linha] = await this.db.insert(usuario).values(novo).returning();
    if (!linha) {
      throw new Error("insert de usuario não retornou linha");
    }
    return paraUsuario(linha);
  }

  async listarMeiosDePagamentoDisponiveis(): Promise<ReadonlyArray<MeioPagamento>> {
    const linhas = await this.db
      .select()
      .from(meioPagamento)
      .where(isNull(meioPagamento.arquivadoEm))
      .orderBy(asc(meioPagamento.nome));
    return linhas.map(paraMeioPagamento);
  }

  async buscarMeioDePagamento(id: string): Promise<MeioPagamento | null> {
    const linhas = await this.db
      .select()
      .from(meioPagamento)
      .where(eq(meioPagamento.id, id))
      .limit(1);
    const linha = linhas[0];
    return linha ? paraMeioPagamento(linha) : null;
  }

  /**
   * Busca por nome **ignorando caixa**, entre os **não arquivados**.
   *
   * O recorte em ativos é a diferença para a busca de categoria. Lá o nome é
   * `UNIQUE` no banco, então um nome arquivado continua ocupando o lugar e
   * precisa ser reativável. Aqui não há `UNIQUE`: recriar um cartão que foi
   * encerrado é operação legítima, e travá-la por causa de um homônimo
   * arquivado seria inventar uma regra que o banco não tem.
   */
  async buscarMeioDePagamentoAtivoPorNome(nome: string): Promise<MeioPagamento | null> {
    const linhas = await this.db
      .select()
      .from(meioPagamento)
      .where(
        and(sql`lower(${meioPagamento.nome}) = lower(${nome})`, isNull(meioPagamento.arquivadoEm)),
      )
      .limit(1);
    const linha = linhas[0];
    return linha ? paraMeioPagamento(linha) : null;
  }

  async criarMeioDePagamento(novo: NovoMeioPagamento): Promise<MeioPagamento> {
    const ehCartao = novo.tipo === "CARTAO_CREDITO";
    const [linha] = await this.db
      .insert(meioPagamento)
      .values({
        nome: novo.nome,
        tipo: novo.tipo,
        geraFatura: ehCartao,
        diaFechamento: ehCartao ? novo.diaFechamento : null,
        diaVencimento: ehCartao ? novo.diaVencimento : null,
        fechamentoVaiParaFaturaSeguinte: ehCartao ? novo.fechamentoVaiParaFaturaSeguinte : true,
        arquivadoEm: paraInstante(novo.arquivadoEm),
      })
      .returning();
    if (!linha) {
      throw new Error("insert de meio_pagamento não retornou linha");
    }
    return paraMeioPagamento(linha);
  }

  /**
   * Nome e dias num `UPDATE` só, com as chaves presentes: o Drizzle deixa fora
   * do `SET` o que vem `undefined`. Tipo, `gera_fatura`, o fechamento na fatura
   * seguinte e `arquivado_em` não estão em `MudancasDoMeio` e ficam como estão.
   * Os `CHECK` de `meio_pagamento` continuam sendo a última guarda dos dias.
   */
  async atualizarMeioDePagamento(id: string, mudancas: MudancasDoMeio): Promise<MeioPagamento> {
    const [linha] = await this.db
      .update(meioPagamento)
      .set({
        nome: mudancas.nome,
        diaFechamento: mudancas.diaFechamento,
        diaVencimento: mudancas.diaVencimento,
      })
      .where(eq(meioPagamento.id, id))
      .returning();
    if (!linha) {
      throw new Error("update de meio_pagamento não retornou linha");
    }
    return paraMeioPagamento(linha);
  }

  /** Todas, inclusive arquivadas: a importação reconhece por nome também as que saíram dos formulários. */
  async listarTodasAsCategorias(): Promise<ReadonlyArray<Categoria>> {
    const linhas = await this.db.select().from(categoria).orderBy(asc(categoria.nome));
    return linhas.map(paraCategoria);
  }

  async listarCategoriasDisponiveis(): Promise<ReadonlyArray<Categoria>> {
    const linhas = await this.db
      .select()
      .from(categoria)
      .where(isNull(categoria.arquivadaEm))
      .orderBy(asc(categoria.nome));
    return linhas.map(paraCategoria);
  }

  /**
   * Sem filtro de `arquivado_em`, e isso é a regra (BLOCO-01, AC 6). O bloco
   * "Cartão de Crédito" precisa continuar reunindo o que foi pago num cartão
   * que desde então foi encerrado; filtrar aqui reclassificaria meses fechados.
   */
  async idsDeMeiosComFatura(): Promise<ReadonlySet<string>> {
    const linhas = await this.db
      .select({ id: meioPagamento.id })
      .from(meioPagamento)
      .where(eq(meioPagamento.geraFatura, true));
    return new Set(linhas.map((linha) => linha.id));
  }

  async buscarCategoria(id: string): Promise<Categoria | null> {
    const linhas = await this.db.select().from(categoria).where(eq(categoria.id, id)).limit(1);
    const linha = linhas[0];
    return linha ? paraCategoria(linha) : null;
  }

  /**
   * Busca por nome **ignorando caixa**, e é por isso que ela existe.
   *
   * O `UNIQUE` de `categoria.nome` é sensível a caixa no Postgres: sem esta
   * consulta, `"Mercado"` e `"mercado"` entrariam as duas e a lista ficaria
   * com duas linhas que ninguém distingue. Quem cria categoria consulta aqui
   * primeiro e reaproveita o que já existe.
   *
   * Ela **não** filtra arquivada. É de propósito: o nome de uma categoria
   * arquivada continua ocupando o `UNIQUE`, e quem tentasse criá-la de novo
   * receberia "já existe" apontando para algo que não está em lista nenhuma.
   * Devolvendo-a, quem chama consegue reativá-la em vez de travar.
   */
  async buscarCategoriaPorNome(nome: string): Promise<Categoria | null> {
    const linhas = await this.db
      .select()
      .from(categoria)
      .where(sql`lower(${categoria.nome}) = lower(${nome})`)
      .limit(1);
    const linha = linhas[0];
    return linha ? paraCategoria(linha) : null;
  }

  /** Desfaz o arquivamento. Idempotente: reativar uma categoria ativa não a muda. */
  async reativarCategoria(id: string): Promise<Categoria> {
    const [linha] = await this.db
      .update(categoria)
      .set({ arquivadaEm: null })
      .where(eq(categoria.id, id))
      .returning();
    if (!linha) {
      throw new Error("update de categoria não retornou linha");
    }
    return paraCategoria(linha);
  }

  async criarCategoria(nova: NovaCategoria): Promise<Categoria> {
    const [linha] = await this.db
      .insert(categoria)
      .values({ nome: nova.nome, arquivadaEm: paraInstante(nova.arquivadaEm), cor: null })
      .returning();
    if (!linha) {
      throw new Error("insert de categoria não retornou linha");
    }
    return paraCategoria(linha);
  }

  /**
   * Nome e cor num `UPDATE` só. Renomear grava junto a cor que estava em uso,
   * e as duas mudanças entram ou ficam de fora juntas: um nome recusado pelo
   * `UNIQUE` não deixa a cor gravada pela metade. `cor: null` apaga a
   * escolha e devolve a categoria à cor automática.
   */
  async atualizarCategoria(id: string, mudancas: MudancasDaCategoria): Promise<Categoria> {
    const [linha] = await this.db
      .update(categoria)
      .set(mudancas)
      .where(eq(categoria.id, id))
      .returning();
    if (!linha) {
      throw new Error("update de categoria não retornou linha");
    }
    return paraCategoria(linha);
  }
}
