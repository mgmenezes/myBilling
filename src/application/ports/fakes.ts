import {
  type CamposDaSerie,
  type Categoria,
  type Cents,
  type Competencia,
  compararCompetencias,
  type DecisaoDeEntrada,
  type DecisoesDaImportacao,
  type DomainError,
  dataDeVencimento,
  err,
  type Lancamento,
  type MeioPagamento,
  ocorrenciaProtegida,
  ok,
  type ParcelaDaCompra,
  type Recorrencia,
  type Result,
  somar,
  ZERO_CENTS,
} from "@/domain";
import {
  type CadastroRepository,
  type CompraPersistida,
  type CompraRepository,
  type EntradaCriarRecorrencia,
  type EntradaLancamentoAvulso,
  type EntradaSalvarCompra,
  type ImportacaoRegistrada,
  type ImportacaoRepository,
  type MovimentoRepository,
  type OcorrenciaParaMaterializar,
  type RecorrenciaComVersoes,
  type RecorrenciaRepository,
  type RepositoriosDaImportacao,
  type RepositoriosTransacionais,
  type Transacao,
  type TransacaoDaImportacao,
  type Usuario,
  ViolacaoDeConservacao,
} from "./repositories";

/**
 * Implementações em memória das três ports, para que os casos de uso sejam
 * testáveis sem banco. **Nenhum import de `@/infrastructure`**: se estes
 * fakes precisassem de infraestrutura, a fronteira já teria vazado.
 *
 * Os fakes reproduzem as restrições do schema que mudam comportamento
 * observável: unicidade de `(compra, número de parcela)`, unicidade da
 * chave de idempotência e o assert de conservação. Uma violação de
 * unicidade **lança**, do mesmo jeito que o Postgres lança — quem consome
 * a port vê o mesmo formato de falha com fake e com banco real.
 */

export interface EstadoEmMemoria {
  readonly compras: Map<string, CompraPersistida>;
  readonly movimentos: Map<string, Lancamento>;
  readonly usuarios: Usuario[];
  readonly meiosDePagamento: MeioPagamento[];
  readonly categorias: Categoria[];
  readonly recorrencias: Map<string, RecorrenciaComVersoes>;
  readonly importacoes: ImportacaoRegistrada[];
  /** As decisões lembradas, uma por tipo e chave, como `importacao_decisao`. */
  readonly decisoes: {
    readonly meios: Map<string, string>;
    readonly entradas: Map<string, DecisaoDeEntrada>;
  };
  /** `origem_dado` e `origem_hash` dos avulsos importados, por id do lançamento. */
  readonly origensDeDado: Map<string, NonNullable<EntradaLancamentoAvulso["origemDado"]>>;
}

export function criarEstadoEmMemoria(): EstadoEmMemoria {
  return {
    compras: new Map(),
    movimentos: new Map(),
    usuarios: [],
    meiosDePagamento: [],
    categorias: [],
    recorrencias: new Map(),
    importacoes: [],
    decisoes: { meios: new Map(), entradas: new Map() },
    origensDeDado: new Map(),
  };
}

export class ViolacaoDeUnicidade extends Error {
  constructor(public readonly restricao: string) {
    super(`violação de unicidade: ${restricao}`);
    this.name = "ViolacaoDeUnicidade";
  }
}

function somarParcelas(parcelas: ReadonlyArray<{ readonly valor: Cents }>): Cents {
  return parcelas.reduce<Cents>((total, p) => somar(total, p.valor), ZERO_CENTS);
}

export class FakeCompraRepository implements CompraRepository {
  private sequencia = 0;

  constructor(private readonly estado: EstadoEmMemoria) {}

  async buscarPorIdempotencyKey(idempotencyKey: string): Promise<CompraPersistida | null> {
    for (const compra of this.estado.compras.values()) {
      if (compra.idempotencyKey === idempotencyKey) {
        return compra;
      }
    }
    return null;
  }

  async buscarPorId(compraId: string): Promise<CompraPersistida | null> {
    return this.estado.compras.get(compraId) ?? null;
  }

  /**
   * Mesma conferência do Drizzle: com os valores novos aplicados, amortizado +
   * soma das parcelas gravadas tem que dar o total. Se não der, lança antes de
   * tocar no estado, que é o que o rollback faz no banco.
   */
  async reprecificar(
    compraId: string,
    parcelas: ReadonlyArray<ParcelaDaCompra>,
    valorTotal: Cents,
  ): Promise<void> {
    const compra = this.estado.compras.get(compraId);
    if (!compra) {
      throw new Error(`compra inexistente: ${compraId}`);
    }
    const valorNovo = new Map<number | null, Cents>(parcelas.map((p) => [p.numero, p.valor]));
    const atualizadas = compra.parcelas.map((parcela) => {
      const valor = valorNovo.get(parcela.numeroParcela);
      return valor === undefined ? parcela : { ...parcela, valor };
    });
    const soma = somar(somarParcelas(atualizadas), compra.valorAmortizadoAnterior);
    if (soma !== valorTotal) {
      throw new ViolacaoDeConservacao(soma, valorTotal);
    }
    for (const parcela of atualizadas) {
      this.estado.movimentos.set(parcela.id, parcela);
    }
    this.estado.compras.set(compraId, { ...compra, valorTotal, parcelas: atualizadas });
  }

  /**
   * As parcelas da compra mudam no estado e na cópia que a compra guarda. A
   * categoria da compra em si não tem onde morar aqui: `CompraPersistida` não a
   * expõe, e nenhum consumidor a lê. Silencioso para id inexistente.
   */
  async trocarCategoria(compraId: string, categoriaId: string | null): Promise<void> {
    for (const [id, atual] of this.estado.movimentos) {
      if (atual.compraId === compraId) {
        this.estado.movimentos.set(id, { ...atual, categoriaId });
      }
    }
    const compra = this.estado.compras.get(compraId);
    if (compra) {
      this.estado.compras.set(compraId, {
        ...compra,
        parcelas: compra.parcelas.map((parcela) => ({ ...parcela, categoriaId })),
      });
    }
  }

  async totaisDeParcelas(compraIds: ReadonlyArray<string>): Promise<ReadonlyMap<string, number>> {
    const totais = new Map<string, number>();
    for (const id of compraIds) {
      const compra = this.estado.compras.get(id);
      if (compra) {
        totais.set(id, compra.qtdParcelas);
      }
    }
    return totais;
  }

  async salvarComParcelas(
    entrada: EntradaSalvarCompra,
  ): Promise<Result<CompraPersistida, DomainError>> {
    const existente = await this.buscarPorIdempotencyKey(entrada.idempotencyKey);
    if (existente) {
      return ok(existente);
    }

    const { plano, dados } = entrada;
    const soma = somar(somarParcelas(plano.parcelas), plano.valorAmortizadoAnterior);
    if (soma !== plano.valorTotal) {
      return err<DomainError>({
        code: "CONSERVACAO_VIOLADA",
        detalhes: { soma, valorTotal: plano.valorTotal },
      });
    }

    this.sequencia += 1;
    const compraId = `compra-${this.sequencia}`;

    const parcelas: Lancamento[] = [];
    for (const parcela of plano.parcelas) {
      const chave = `${compraId}#${parcela.numero}`;
      if (this.estado.movimentos.has(chave)) {
        throw new ViolacaoDeUnicidade("movimento_compra_parcela_uq");
      }
      const lancamento: Lancamento = {
        id: chave,
        natureza: "DESPESA",
        origem: "PARCELA",
        descricao: dados.descricao,
        competencia: parcela.competencia,
        dataEvento: dados.dataEvento,
        valor: parcela.valor,
        valorPrevisto: null,
        pagoEm: null,
        categoriaId: dados.categoriaId,
        usuarioId: dados.usuarioId,
        meioPagamentoId: dados.meioPagamentoId,
        compraId,
        numeroParcela: parcela.numero,
        recorrenciaId: null,
        canceladoEm: null,
      };
      this.estado.movimentos.set(chave, lancamento);
      parcelas.push(lancamento);
    }

    const compra: CompraPersistida = {
      id: compraId,
      idempotencyKey: entrada.idempotencyKey,
      valorTotal: plano.valorTotal,
      qtdParcelas: dados.qtdParcelas,
      parcelaInicial: dados.parcelaInicial,
      valorAmortizadoAnterior: plano.valorAmortizadoAnterior,
      parcelas,
    };
    this.estado.compras.set(compraId, compra);
    return ok(compra);
  }
}

export class FakeMovimentoRepository implements MovimentoRepository {
  constructor(private readonly estado: EstadoEmMemoria) {}

  private proximoAvulso = 1;

  /** Id sequencial e legível: o teste que falha aponta para `avulso-2`, não
   *  para um uuid que não diz nada.
   *
   *  Com `origemDado`, reproduz o índice parcial único do banco: a mesma fonte
   *  e chave uma segunda vez lança, e nada é gravado. */
  async criarAvulso(entrada: EntradaLancamentoAvulso): Promise<Lancamento> {
    const { origemDado } = entrada;
    if (origemDado) {
      const repetida = [...this.estado.origensDeDado.values()].some(
        (o) => o.fonte === origemDado.fonte && o.chave === origemDado.chave,
      );
      if (repetida) {
        throw new ViolacaoDeUnicidade("movimento_origem_dado_hash_uq");
      }
    }
    const lancamento: Lancamento = {
      id: `avulso-${this.proximoAvulso++}`,
      natureza: entrada.natureza,
      origem: "AVULSO",
      descricao: entrada.descricao,
      competencia: entrada.competencia,
      dataEvento: entrada.dataEvento,
      valor: entrada.valor,
      valorPrevisto: null,
      pagoEm: entrada.pagoEm,
      categoriaId: entrada.categoriaId,
      usuarioId: entrada.usuarioId,
      meioPagamentoId: entrada.meioPagamentoId,
      compraId: null,
      numeroParcela: null,
      recorrenciaId: null,
      canceladoEm: null,
    };
    this.estado.movimentos.set(lancamento.id, lancamento);
    if (origemDado) {
      this.estado.origensDeDado.set(lancamento.id, origemDado);
    }
    return lancamento;
  }

  async listarPorCompetencia(competencia: Competencia): Promise<ReadonlyArray<Lancamento>> {
    return [...this.estado.movimentos.values()].filter(
      (m) => m.competencia === competencia && m.canceladoEm === null,
    );
  }

  async buscarPorId(id: string): Promise<Lancamento | null> {
    return this.estado.movimentos.get(id) ?? null;
  }

  /** Mesmas três condições do `WHERE` do Drizzle. */
  async cancelar(id: string, canceladoEm: string): Promise<boolean> {
    const atual = this.estado.movimentos.get(id);
    if (atual?.origem !== "AVULSO" || atual.canceladoEm !== null) {
      return false;
    }
    this.estado.movimentos.set(id, { ...atual, canceladoEm });
    return true;
  }

  /** Cancelado não se marca como pago, igual ao `WHERE` do Drizzle (AVUL-04). */
  async marcarPagamento(id: string, pagoEm: string | null): Promise<void> {
    const atual = this.estado.movimentos.get(id);
    if (!atual || atual.canceladoEm !== null) {
      return;
    }
    this.estado.movimentos.set(id, { ...atual, pagoEm });
  }

  /**
   * Reproduz a restrição `(recorrencia, competência)` do banco, que é o que
   * torna a materialização idempotente. Um fake que aceitasse a segunda
   * ocorrência deixaria o caso de uso passar no teste e duplicar em produção.
   */
  async materializarOcorrencias(
    ocorrencias: ReadonlyArray<OcorrenciaParaMaterializar>,
  ): Promise<number> {
    let criadas = 0;
    for (const o of ocorrencias) {
      const jaExiste = [...this.estado.movimentos.values()].some(
        (m) => m.recorrenciaId === o.recorrenciaId && m.competencia === o.competencia,
      );
      if (jaExiste) {
        continue;
      }
      const id = `mov-rec-${this.estado.movimentos.size + 1}`;
      this.estado.movimentos.set(id, {
        id,
        natureza: o.natureza,
        origem: "RECORRENCIA",
        descricao: o.descricao,
        competencia: o.competencia,
        dataEvento: o.dataEvento,
        valor: o.valorPrevisto,
        valorPrevisto: o.valorPrevisto,
        pagoEm: null,
        categoriaId: o.categoriaId,
        usuarioId: o.usuarioId,
        meioPagamentoId: o.meioPagamentoId,
        compraId: null,
        numeroParcela: null,
        recorrenciaId: o.recorrenciaId,
        canceladoEm: null,
      });
      criadas += 1;
    }
    return criadas;
  }

  /**
   * Aqui o filtro é a **própria** `ocorrenciaProtegida`, e não uma tradução
   * dela. O repositório real usa `WHERE`, e é o teste de concordância que
   * prende os dois à mesma definição.
   */
  async atualizarPrevistoNaoProtegido(
    recorrenciaId: string,
    desde: Competencia,
    valorPrevisto: Cents,
  ): Promise<void> {
    for (const [id, atual] of this.estado.movimentos) {
      if (atual.recorrenciaId !== recorrenciaId) {
        continue;
      }
      if (compararCompetencias(atual.competencia, desde) < 0) {
        continue;
      }
      if (ocorrenciaProtegida(atual)) {
        continue;
      }
      this.estado.movimentos.set(id, { ...atual, valor: valorPrevisto, valorPrevisto });
    }
  }

  async confirmarValorReal(id: string, valor: Cents): Promise<void> {
    const atual = this.estado.movimentos.get(id);
    if (!atual) {
      return;
    }
    this.estado.movimentos.set(id, { ...atual, valor });
  }

  async removerNaoPagasDaRecorrencia(recorrenciaId: string, desde: Competencia): Promise<void> {
    for (const [id, atual] of this.estado.movimentos) {
      if (atual.recorrenciaId !== recorrenciaId || atual.pagoEm !== null) {
        continue;
      }
      if (compararCompetencias(atual.competencia, desde) >= 0) {
        this.estado.movimentos.delete(id);
      }
    }
  }

  /** Os cinco campos e a data, nada de valor nem de pagamento, como o Drizzle. */
  async atualizarOcorrenciasDaSerie(recorrenciaId: string, campos: CamposDaSerie): Promise<number> {
    let alteradas = 0;
    for (const [id, atual] of this.estado.movimentos) {
      if (atual.recorrenciaId !== recorrenciaId) {
        continue;
      }
      this.estado.movimentos.set(id, {
        ...atual,
        descricao: campos.descricao,
        categoriaId: campos.categoriaId,
        meioPagamentoId: campos.meioPagamentoId,
        usuarioId: campos.usuarioId,
        dataEvento: dataDeVencimento(atual.competencia, campos.diaVencimento),
      });
      alteradas += 1;
    }
    return alteradas;
  }

  /** Só a categoria, e só deste id, como o `UPDATE ... WHERE id` do Drizzle. */
  async trocarCategoria(id: string, categoriaId: string | null): Promise<void> {
    const atual = this.estado.movimentos.get(id);
    if (!atual) {
      return;
    }
    this.estado.movimentos.set(id, { ...atual, categoriaId });
  }
}

export class FakeCadastroRepository implements CadastroRepository {
  private proximaCategoria = 1;

  constructor(private readonly estado: EstadoEmMemoria) {}

  async listarUsuarios(): Promise<ReadonlyArray<Usuario>> {
    return [...this.estado.usuarios];
  }

  async listarMeiosDePagamentoDisponiveis(): Promise<ReadonlyArray<MeioPagamento>> {
    return this.estado.meiosDePagamento.filter((m) => m.arquivadoEm === null);
  }

  async buscarMeioDePagamento(id: string): Promise<MeioPagamento | null> {
    return this.estado.meiosDePagamento.find((m) => m.id === id) ?? null;
  }

  async listarCategoriasDisponiveis(): Promise<ReadonlyArray<Categoria>> {
    return this.estado.categorias.filter((c) => c.arquivadaEm === null);
  }

  async buscarCategoria(id: string): Promise<Categoria | null> {
    return this.estado.categorias.find((c) => c.id === id) ?? null;
  }

  /** Sem filtro de arquivado, igual ao Drizzle (BLOCO-01, AC 6). */
  async idsDeMeiosComFatura(): Promise<ReadonlySet<string>> {
    return new Set(
      this.estado.meiosDePagamento.filter((m) => m.tipo === "CARTAO_CREDITO").map((m) => m.id),
    );
  }

  /** Ignora caixa e não filtra arquivada, igual ao `lower()` do Drizzle. */
  async buscarCategoriaPorNome(nome: string): Promise<Categoria | null> {
    const alvo = nome.toLowerCase();
    return this.estado.categorias.find((c) => c.nome.toLowerCase() === alvo) ?? null;
  }

  async criarCategoria(nova: {
    readonly nome: string;
    readonly arquivadaEm: null;
  }): Promise<Categoria> {
    const categoria: Categoria = {
      id: `categoria-${this.proximaCategoria++}`,
      nome: nova.nome,
      arquivadaEm: nova.arquivadaEm,
    };
    this.estado.categorias.push(categoria);
    return categoria;
  }

  async reativarCategoria(id: string): Promise<Categoria> {
    const indice = this.estado.categorias.findIndex((c) => c.id === id);
    const atual = this.estado.categorias[indice];
    if (!atual) {
      throw new Error(`categoria inexistente: ${id}`);
    }
    const reativada: Categoria = { ...atual, arquivadaEm: null };
    this.estado.categorias[indice] = reativada;
    return reativada;
  }

  async listarTodasAsCategorias(): Promise<ReadonlyArray<Categoria>> {
    return [...this.estado.categorias];
  }
}

/**
 * Registro da importação em memória. A competência repetida lança como a
 * unicidade de `importacao.competencia`, e as decisões entram por upsert em
 * `(tipo, chave)`, como `importacao_decisao`.
 */
export class FakeImportacaoRepository implements ImportacaoRepository {
  constructor(private readonly estado: EstadoEmMemoria) {}

  async ultimaCompetenciaImportada(): Promise<Competencia | null> {
    let ultima: Competencia | null = null;
    for (const { competencia } of this.estado.importacoes) {
      if (ultima === null || compararCompetencias(competencia, ultima) > 0) {
        ultima = competencia;
      }
    }
    return ultima;
  }

  /** Avulso cancelado conta: a linha continua em `movimento` (IMP-02 AC 6). */
  async haLancamentoCompraOuRecorrencia(): Promise<boolean> {
    return (
      this.estado.movimentos.size > 0 ||
      this.estado.compras.size > 0 ||
      this.estado.recorrencias.size > 0
    );
  }

  async decisoesLembradas(): Promise<DecisoesDaImportacao> {
    return {
      meios: new Map(this.estado.decisoes.meios),
      entradas: new Map(this.estado.decisoes.entradas),
    };
  }

  async registrar(importacao: ImportacaoRegistrada, decisoes: DecisoesDaImportacao): Promise<void> {
    if (this.estado.importacoes.some((i) => i.competencia === importacao.competencia)) {
      throw new ViolacaoDeUnicidade("importacao_competencia_unique");
    }
    this.estado.importacoes.push(importacao);
    for (const [chave, meioPagamentoId] of decisoes.meios) {
      this.estado.decisoes.meios.set(chave, meioPagamentoId);
    }
    for (const [chave, decisao] of decisoes.entradas) {
      this.estado.decisoes.entradas.set(chave, decisao);
    }
  }
}

/**
 * Executa a operação sobre os fakes, **sem rollback**: desfazer é prova de
 * integração, contra Postgres real. Aqui o que importa é que todos os
 * repositórios vejam o mesmo estado.
 */
export class FakeTransacaoDaImportacao implements TransacaoDaImportacao {
  constructor(private readonly repos: RepositoriosDaImportacao) {}

  executar<T>(operacao: (repos: RepositoriosDaImportacao) => Promise<T>): Promise<T> {
    return operacao(this.repos);
  }
}

/**
 * A transação genérica sobre os fakes, também **sem rollback**, pela mesma
 * razão da importação: desfazer é prova de integração, em `transacao.integration.test.ts`.
 */
export class FakeTransacao implements Transacao {
  constructor(private readonly repos: RepositoriosTransacionais) {}

  executar<T>(operacao: (repos: RepositoriosTransacionais) => Promise<T>): Promise<T> {
    return operacao(this.repos);
  }
}

export interface Fakes {
  readonly estado: EstadoEmMemoria;
  readonly compras: FakeCompraRepository;
  readonly movimentos: FakeMovimentoRepository;
  readonly cadastros: FakeCadastroRepository;
  readonly recorrencias: FakeRecorrenciaRepository;
  readonly importacoes: FakeImportacaoRepository;
  /** Entrega à operação os mesmos repositórios acima, sobre o mesmo estado. */
  readonly transacao: FakeTransacaoDaImportacao;
}

export function criarFakes(estado: EstadoEmMemoria = criarEstadoEmMemoria()): Fakes {
  const repos = {
    compras: new FakeCompraRepository(estado),
    movimentos: new FakeMovimentoRepository(estado),
    cadastros: new FakeCadastroRepository(estado),
    recorrencias: new FakeRecorrenciaRepository(estado),
    importacoes: new FakeImportacaoRepository(estado),
  };
  return { estado, ...repos, transacao: new FakeTransacaoDaImportacao(repos) };
}

/**
 * Recorrência em memória.
 *
 * Ele existe para os casos de uso rodarem sem banco, e só vale enquanto se
 * comportar como o Drizzle nos pontos que eles observam: versões ordenadas,
 * vigência repetida substituindo, e encerrar sem apagar. Os mesmos três pontos
 * são asserados contra Postgres real no teste de integração do repositório —
 * é esse par que impede este fake de virar uma ficção conveniente.
 */
export class FakeRecorrenciaRepository implements RecorrenciaRepository {
  private proximoId = 1;

  constructor(private readonly estado: EstadoEmMemoria) {}

  async listarComVersoes(): Promise<ReadonlyArray<RecorrenciaComVersoes>> {
    return [...this.estado.recorrencias.values()];
  }

  async criar(entrada: EntradaCriarRecorrencia): Promise<Recorrencia> {
    const recorrencia: Recorrencia = {
      ...entrada.dados,
      id: `rec-${this.proximoId++}`,
      encerradaEm: null,
    };
    this.estado.recorrencias.set(recorrencia.id, {
      recorrencia,
      versoes: [
        { vigenteDesde: entrada.dados.competenciaInicio, valorPrevisto: entrada.valorInicial },
      ],
    });
    return recorrencia;
  }

  async registrarVersao(
    recorrenciaId: string,
    vigenteDesde: Competencia,
    valorPrevisto: Cents,
  ): Promise<void> {
    const atual = this.estado.recorrencias.get(recorrenciaId);
    if (!atual) {
      return;
    }
    const semAVigencia = atual.versoes.filter((v) => v.vigenteDesde !== vigenteDesde);
    this.estado.recorrencias.set(recorrenciaId, {
      ...atual,
      versoes: [...semAVigencia, { vigenteDesde, valorPrevisto }].sort((a, b) =>
        compararCompetencias(a.vigenteDesde, b.vigenteDesde),
      ),
    });
  }

  async encerrar(
    recorrenciaId: string,
    competenciaFim: Competencia,
    encerradaEm: string,
  ): Promise<void> {
    const atual = this.estado.recorrencias.get(recorrenciaId);
    if (!atual) {
      return;
    }
    this.estado.recorrencias.set(recorrenciaId, {
      ...atual,
      recorrencia: { ...atual.recorrencia, competenciaFim, encerradaEm },
    });
  }

  async buscarComVersoes(recorrenciaId: string): Promise<RecorrenciaComVersoes | null> {
    return this.estado.recorrencias.get(recorrenciaId) ?? null;
  }

  async atualizarSerie(recorrenciaId: string, campos: CamposDaSerie): Promise<void> {
    this.alterar(recorrenciaId, {
      descricao: campos.descricao,
      diaVencimento: campos.diaVencimento,
      meioPagamentoId: campos.meioPagamentoId,
      categoriaId: campos.categoriaId,
      usuarioId: campos.usuarioId,
    });
  }

  async reabrir(recorrenciaId: string): Promise<void> {
    this.alterar(recorrenciaId, { competenciaFim: null, encerradaEm: null });
  }

  async estenderFim(recorrenciaId: string, competenciaFim: Competencia): Promise<void> {
    this.alterar(recorrenciaId, { competenciaFim });
  }

  /** Silencioso para id inexistente, como o `UPDATE ... WHERE id` do Drizzle. */
  private alterar(recorrenciaId: string, campos: Partial<Recorrencia>): void {
    const atual = this.estado.recorrencias.get(recorrenciaId);
    if (!atual) {
      return;
    }
    this.estado.recorrencias.set(recorrenciaId, {
      ...atual,
      recorrencia: { ...atual.recorrencia, ...campos },
    });
  }
}
