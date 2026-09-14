import type {
  Categoria,
  Cents,
  Competencia,
  DomainError,
  Lancamento,
  MeioPagamento,
  Natureza,
  PlanoParcelamento,
  PoliticaResiduo,
  Recorrencia,
  Result,
  VersaoRecorrencia,
} from "@/domain";

/**
 * Ports de persistência. **Fronteira da aplicação** (AD-006): tudo aqui é
 * tipo de domínio. Nenhuma assinatura menciona Drizzle, `Pool`, linha de
 * banco ou qualquer detalhe de SQL — a infraestrutura mapeia linha para
 * tipo de domínio, nunca o contrário.
 *
 * O caso de uso depende desta interface; trocar o repositório concreto pelo
 * fake em memória de T32 não exige alterar nenhum caso de uso.
 */

/**
 * Pessoa dona do lançamento. É classificação, não permissão: ambos leem e
 * escrevem tudo (AD-007). Vive aqui e não no domínio porque o domínio só
 * precisa do `usuarioId`.
 */
export interface Usuario {
  readonly id: string;
  readonly nome: string;
  readonly email: string;
}

/** Os campos descritivos da compra. O dinheiro vem todo no plano. */
export interface DadosCompra {
  readonly descricao: string;
  readonly modo: "TOTAL" | "VALOR_PARCELA";
  readonly politicaResiduo: PoliticaResiduo;
  /** Competência da parcela 1, mesmo quando a compra já está em andamento. */
  readonly competenciaCompra: Competencia;
  readonly qtdParcelas: number;
  /** 1 por padrão; 8 no caso `8/10` (AD-005). */
  readonly parcelaInicial: number;
  readonly categoriaId: string | null;
  readonly usuarioId: string;
  readonly meioPagamentoId: string;
  readonly dataEvento: string;
}

export interface EntradaSalvarCompra {
  /** Gerada no cliente ao abrir o formulário, não ao submeter (PARC-05, AC 9). */
  readonly idempotencyKey: string;
  readonly dados: DadosCompra;
  readonly plano: PlanoParcelamento;
}

export interface CompraPersistida {
  readonly id: string;
  readonly idempotencyKey: string;
  readonly valorTotal: Cents;
  readonly qtdParcelas: number;
  readonly parcelaInicial: number;
  /** Soma das parcelas anteriores à inicial; fica fora de todo somatório (AD-005). */
  readonly valorAmortizadoAnterior: Cents;
  readonly parcelas: ReadonlyArray<Lancamento>;
}

export interface CompraRepository {
  /**
   * Grava o plano e as N parcelas em **uma única transação**, com assert de
   * conservação antes do commit. Falha ao inserir qualquer parcela reverte
   * tudo, sem deixar a compra órfã (PARC-05, AC 8). Reenvio com a mesma
   * chave devolve a compra existente, sem alterar a contagem de parcelas
   * (PARC-05, AC 9).
   */
  salvarComParcelas(entrada: EntradaSalvarCompra): Promise<Result<CompraPersistida, DomainError>>;
  buscarPorIdempotencyKey(idempotencyKey: string): Promise<CompraPersistida | null>;
  /**
   * Quantidade total de parcelas de cada compra informada.
   *
   * O lançamento guarda o número da parcela, mas não o total: `qtd_parcelas`
   * vive no plano, que é a única coisa que ele sabe sobre a compra. Sem esta
   * leitura, a tela mostraria "parcela 8" sem o "de 10" — e o usuário não
   * teria como saber quantas ainda faltam (PARC-08, AC 7).
   *
   * Devolve um mapa por id; ids sem compra correspondente simplesmente não
   * aparecem nele.
   */
  totaisDeParcelas(compraIds: ReadonlyArray<string>): Promise<ReadonlyMap<string, number>>;
}

/** Uma ocorrência de recorrência pronta para virar linha de `movimento`. */
export interface OcorrenciaParaMaterializar {
  readonly recorrenciaId: string;
  readonly natureza: Natureza;
  readonly descricao: string;
  readonly competencia: Competencia;
  readonly dataEvento: string;
  readonly valorPrevisto: Cents;
  readonly categoriaId: string | null;
  readonly usuarioId: string;
  readonly meioPagamentoId: string;
}

export interface MovimentoRepository {
  /** Apenas lançamentos daquela competência que não foram cancelados. */
  listarPorCompetencia(competencia: Competencia): Promise<ReadonlyArray<Lancamento>>;
  buscarPorId(id: string): Promise<Lancamento | null>;
  /** `pagoEm` em `'YYYY-MM-DD'`; `null` desfaz a marcação (MOV-06, AC 1). */
  marcarPagamento(id: string, pagoEm: string | null): Promise<void>;
  /**
   * Cria as ocorrências que ainda não existem, **ignorando as que já existem**.
   * Devolve quantas foram criadas de fato.
   *
   * A idempotência é da restrição única `(recorrencia, competência)`, e não de
   * uma consulta prévia: a materialização roda durante a leitura da página, e
   * "consultar e depois inserir" perderia a corrida entre dois carregamentos
   * simultâneos (FIXO-02, AC 2).
   */
  materializarOcorrencias(ocorrencias: ReadonlyArray<OcorrenciaParaMaterializar>): Promise<number>;
  /**
   * Propaga um valor previsto novo a partir de uma competência, **pulando o
   * que está protegido** — pago ou com valor já confirmado (FIXO-03, AC 3).
   *
   * A definição de protegido é `ocorrenciaProtegida`, no domínio. Aqui ela
   * vira `WHERE`, e um teste de concordância exige que os dois concordem.
   */
  atualizarPrevistoNaoProtegido(
    recorrenciaId: string,
    desde: Competencia,
    valorPrevisto: Cents,
  ): Promise<void>;
  /**
   * Grava o valor que a conta realmente veio, **preservando o previsto**
   * (FIXO-04, AC 1). Os dois convivem: é a diferença entre eles que permite
   * comparar o planejado com o realizado.
   *
   * Não marca como pago. Confirmar quanto veio e registrar que saiu da conta
   * são gestos diferentes, ainda que costumem acontecer juntos.
   */
  confirmarValorReal(id: string, valor: Cents): Promise<void>;
  /**
   * Apaga as ocorrências **não pagas** de uma recorrência, da competência
   * informada em diante (FIXO-06, AC 2). As pagas ficam: cancelar a internet
   * não pode apagar o que já foi pago por ela.
   */
  removerNaoPagasDaRecorrencia(recorrenciaId: string, desde: Competencia): Promise<void>;
}

/** Os campos descritivos da recorrência. O valor vem separado, na versão. */
export type DadosRecorrencia = Omit<Recorrencia, "id" | "encerradaEm">;

export interface EntradaCriarRecorrencia {
  readonly dados: DadosRecorrencia;
  /** Vira a versão vigente a partir de `competenciaInicio`. */
  readonly valorInicial: Cents;
}

/**
 * Uma recorrência com o histórico de valores dela. Vêm juntas porque nenhum
 * consumidor precisa de uma sem a outra: sem versão não há valor, e uma versão
 * solta não diz de quem é.
 */
export interface RecorrenciaComVersoes {
  readonly recorrencia: Recorrencia;
  /** Ordenadas por vigência crescente. */
  readonly versoes: ReadonlyArray<VersaoRecorrencia>;
}

export interface RecorrenciaRepository {
  /**
   * Todas, inclusive as encerradas. Quem decide o que materializar é
   * `janelaMaterializacao`, com o período — e uma recorrência encerrada
   * continua precisando aparecer na tela que a administra (FIXO-06, AC 3).
   */
  listarComVersoes(): Promise<ReadonlyArray<RecorrenciaComVersoes>>;
  /** Grava recorrência e versão inicial **atomicamente**: uma sem a outra é um
   *  estado que não pode existir. */
  criar(entrada: EntradaCriarRecorrencia): Promise<Recorrencia>;
  /** Vigência já existente tem o valor substituído, e não duplicado
   *  (FIXO-03, AC 4). */
  registrarVersao(
    recorrenciaId: string,
    vigenteDesde: Competencia,
    valorPrevisto: Cents,
  ): Promise<void>;
  /**
   * `competenciaFim` é a **última competência em que ainda vale** — quem
   * encerra a partir de maio passa abril. A tradução é do caso de uso, para
   * este contrato não ter duas leituras possíveis.
   */
  encerrar(recorrenciaId: string, competenciaFim: Competencia, encerradaEm: string): Promise<void>;
}

export interface CadastroRepository {
  listarUsuarios(): Promise<ReadonlyArray<Usuario>>;
  /** Só os meios ativos: arquivado não aparece para nova compra (CART-03, AC 7). */
  listarMeiosDePagamentoDisponiveis(): Promise<ReadonlyArray<MeioPagamento>>;
  /** Resolve por id mesmo arquivado, para exibir parcelas existentes (CART-03, AC 6). */
  buscarMeioDePagamento(id: string): Promise<MeioPagamento | null>;
  /** Só as categorias ativas: arquivada some dos formulários. */
  listarCategoriasDisponiveis(): Promise<ReadonlyArray<Categoria>>;
  /** Resolve por id mesmo arquivada, para os relatórios continuarem íntegros. */
  buscarCategoria(id: string): Promise<Categoria | null>;
}
