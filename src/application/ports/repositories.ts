import type {
  Categoria,
  Cents,
  Competencia,
  DomainError,
  Lancamento,
  MeioPagamento,
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

export interface MovimentoRepository {
  /** Apenas lançamentos daquela competência que não foram cancelados. */
  listarPorCompetencia(competencia: Competencia): Promise<ReadonlyArray<Lancamento>>;
  buscarPorId(id: string): Promise<Lancamento | null>;
  /** `pagoEm` em `'YYYY-MM-DD'`; `null` desfaz a marcação (MOV-06, AC 1). */
  marcarPagamento(id: string, pagoEm: string | null): Promise<void>;
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
