import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Schema físico do myBilling. Dez tabelas.
 *
 * Três invariantes estruturais mandam neste arquivo:
 *
 * 1. **AD-001** — todo valor monetário é `bigint` em centavos e o nome da
 *    coluna termina em `_centavos`. Uma coluna `valor` que compile é bug.
 * 2. **AD-002** — competência é `date` fixada no dia 1, com `CHECK` no banco.
 *    A string `'YYYY-MM'` do domínio nunca chega crua ao SQL.
 * 3. **AD-003** — `movimento` é o único razão somável. `pagamento_fatura`
 *    **não tem** `natureza` nem `categoria_id`: sem essas colunas, nenhuma
 *    consulta de gasto consegue lê-la, e a dupla contagem deixa de compilar.
 *    Acrescentá-las "por simetria" destrói a propriedade inteira.
 *
 * Este arquivo não importa nada de `src/domain`: o domínio define a forma,
 * a infraestrutura a reproduz, e os repositórios fazem o mapeamento (AD-006).
 */

export const naturezaEnum = pgEnum("natureza", ["RECEITA", "DESPESA", "INVESTIMENTO"]);
export const origemEnum = pgEnum("origem", ["AVULSO", "PARCELA", "RECORRENCIA"]);
export const tipoMeioEnum = pgEnum("tipo_meio", ["CONTA_CORRENTE", "CARTAO_CREDITO", "ROTULO"]);
export const politicaResiduoEnum = pgEnum("politica_residuo", ["PRIMEIRAS", "ULTIMAS"]);
export const modoEntradaEnum = pgEnum("modo_entrada", ["TOTAL", "VALOR_PARCELA"]);

/** `EXTRACT(DAY FROM col) = 1` — competência é sempre o dia 1 (AD-002). */
const competenciaNoDiaUm = (coluna: unknown) => sql`EXTRACT(DAY FROM ${coluna}) = 1`;

export const usuario = pgTable("usuario", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const meioPagamento = pgTable(
  "meio_pagamento",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nome: text("nome").notNull(),
    tipo: tipoMeioEnum("tipo").notNull(),
    /** Redundante com `tipo` de propósito: o CHECK abaixo os trava juntos. */
    geraFatura: boolean("gera_fatura").notNull(),
    diaFechamento: integer("dia_fechamento"),
    diaVencimento: integer("dia_vencimento"),
    fechamentoVaiParaFaturaSeguinte: boolean("fechamento_vai_para_fatura_seguinte")
      .notNull()
      .default(true),
    arquivadoEm: timestamp("arquivado_em", { withTimezone: true }),
  },
  (t) => [
    check(
      "meio_pagamento_gera_fatura_sse_cartao",
      sql`${t.geraFatura} = (${t.tipo} = 'CARTAO_CREDITO')`,
    ),
    check(
      "meio_pagamento_cartao_tem_ciclo",
      sql`${t.geraFatura} = (${t.diaFechamento} IS NOT NULL AND ${t.diaVencimento} IS NOT NULL)`,
    ),
    check(
      "meio_pagamento_dias_validos",
      sql`(${t.diaFechamento} IS NULL OR ${t.diaFechamento} BETWEEN 1 AND 31)
        AND (${t.diaVencimento} IS NULL OR ${t.diaVencimento} BETWEEN 1 AND 31)`,
    ),
  ],
);

export const categoria = pgTable("categoria", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull().unique(),
  arquivadaEm: timestamp("arquivada_em", { withTimezone: true }),
});

export const orcamentoCategoria = pgTable(
  "orcamento_categoria",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoriaId: uuid("categoria_id")
      .notNull()
      .references(() => categoria.id),
    competencia: date("competencia", { mode: "string" }).notNull(),
    limiteCentavos: bigint("limite_centavos", { mode: "number" }).notNull(),
  },
  (t) => [
    uniqueIndex("orcamento_categoria_categoria_competencia_uq").on(t.categoriaId, t.competencia),
    check("orcamento_categoria_competencia_dia_1", competenciaNoDiaUm(t.competencia)),
    check("orcamento_categoria_limite_nao_negativo", sql`${t.limiteCentavos} >= 0`),
  ],
);

/**
 * Plano de geração, não razão: nenhuma coluna desta tabela entra em `SUM`
 * (AD-003). `valor_amortizado_anterior_centavos` guarda a soma das parcelas
 * anteriores à parcela inicial de uma compra já em andamento (AD-005) e é
 * exatamente o valor que precisa ficar fora de todo somatório de despesa.
 */
export const compraParcelada = pgTable(
  "compra_parcelada",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    descricao: text("descricao").notNull(),
    modoEntrada: modoEntradaEnum("modo_entrada").notNull(),
    valorTotalCentavos: bigint("valor_total_centavos", { mode: "number" }).notNull(),
    qtdParcelas: integer("qtd_parcelas").notNull(),
    parcelaInicial: integer("parcela_inicial").notNull(),
    competenciaCompra: date("competencia_compra", { mode: "string" }).notNull(),
    politicaResiduo: politicaResiduoEnum("politica_residuo").notNull(),
    valorAmortizadoAnteriorCentavos: bigint("valor_amortizado_anterior_centavos", {
      mode: "number",
    }).notNull(),
    categoriaId: uuid("categoria_id").references(() => categoria.id),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuario.id),
    meioPagamentoId: uuid("meio_pagamento_id")
      .notNull()
      .references(() => meioPagamento.id),
    /** Gerada no cliente ao abrir o formulário, não ao submeter (PARC-05, AC 9). */
    idempotencyKey: text("idempotency_key").notNull().unique(),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("compra_parcelada_competencia_dia_1", competenciaNoDiaUm(t.competenciaCompra)),
    check("compra_parcelada_qtd_parcelas_1_120", sql`${t.qtdParcelas} BETWEEN 1 AND 120`),
    check(
      "compra_parcelada_parcela_inicial_valida",
      sql`${t.parcelaInicial} BETWEEN 1 AND ${t.qtdParcelas}`,
    ),
    /** Mais parcelas que centavos deixaria alguma parcela em R$ 0,00 (PARC-01, AC 5). */
    check(
      "compra_parcelada_parcela_min_um_centavo",
      sql`${t.qtdParcelas} <= ${t.valorTotalCentavos}`,
    ),
    check(
      "compra_parcelada_amortizado_nao_negativo",
      sql`${t.valorAmortizadoAnteriorCentavos} >= 0`,
    ),
  ],
);

/** Plano de geração, não razão (AD-003). */
export const recorrencia = pgTable(
  "recorrencia",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    descricao: text("descricao").notNull(),
    natureza: naturezaEnum("natureza").notNull(),
    categoriaId: uuid("categoria_id").references(() => categoria.id),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuario.id),
    meioPagamentoId: uuid("meio_pagamento_id")
      .notNull()
      .references(() => meioPagamento.id),
    competenciaInicio: date("competencia_inicio", { mode: "string" }).notNull(),
    /** `null` = sem fim; a materialização usa janela rolante (REC-02, AC 5). */
    competenciaFim: date("competencia_fim", { mode: "string" }),
    diaVencimento: integer("dia_vencimento").notNull(),
    encerradaEm: timestamp("encerrada_em", { withTimezone: true }),
  },
  (t) => [
    check("recorrencia_competencia_inicio_dia_1", competenciaNoDiaUm(t.competenciaInicio)),
    check(
      "recorrencia_competencia_fim_dia_1",
      sql`${t.competenciaFim} IS NULL OR EXTRACT(DAY FROM ${t.competenciaFim}) = 1`,
    ),
    check("recorrencia_dia_vencimento_valido", sql`${t.diaVencimento} BETWEEN 1 AND 31`),
  ],
);

/** Uma versão por competência de vigência: alterar o valor a partir de um mês
 * preserva as competências anteriores inalteradas (REC-02, AC 4). */
export const recorrenciaVersao = pgTable(
  "recorrencia_versao",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recorrenciaId: uuid("recorrencia_id")
      .notNull()
      .references(() => recorrencia.id),
    vigenteDesde: date("vigente_desde", { mode: "string" }).notNull(),
    valorPrevistoCentavos: bigint("valor_previsto_centavos", { mode: "number" }).notNull(),
  },
  (t) => [
    uniqueIndex("recorrencia_versao_recorrencia_vigencia_uq").on(t.recorrenciaId, t.vigenteDesde),
    check("recorrencia_versao_vigencia_dia_1", competenciaNoDiaUm(t.vigenteDesde)),
    /*
     * Valor previsto é estritamente positivo, como o de `movimento` e o limite
     * de `orcamento_categoria`. A ausência desta restrição era descuido, não
     * decisão: o previsto alimenta soma de mês e régua de comprometimento
     * futuro, e um negativo ali não é dado estranho — é número errado em
     * indicador. A validação da aplicação protege quem passa pelo formulário;
     * esta protege o seed e a correção feita direto no banco.
     */
    check("recorrencia_versao_valor_positivo", sql`${t.valorPrevistoCentavos} > 0`),
  ],
);

export const fatura = pgTable(
  "fatura",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cartaoId: uuid("cartao_id")
      .notNull()
      .references(() => meioPagamento.id),
    competenciaFatura: date("competencia_fatura", { mode: "string" }).notNull(),
    cicloInicio: date("ciclo_inicio", { mode: "string" }).notNull(),
    cicloFim: date("ciclo_fim", { mode: "string" }).notNull(),
    dataVencimento: date("data_vencimento", { mode: "string" }).notNull(),
    fechadaEm: timestamp("fechada_em", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("fatura_cartao_competencia_uq").on(t.cartaoId, t.competenciaFatura),
    check("fatura_competencia_dia_1", competenciaNoDiaUm(t.competenciaFatura)),
    check("fatura_ciclo_ordenado", sql`${t.cicloInicio} <= ${t.cicloFim}`),
  ],
);

/**
 * O razão. **A única tabela somável do sistema** (AD-003).
 *
 * As colunas de origem são nullable e disciplinadas por `CHECK` bicondicional:
 * `origem = 'PARCELA'` se e somente se `compra_id` e `numero_parcela` estão
 * preenchidos; `origem = 'RECORRENCIA'` se e somente se `recorrencia_id` está.
 * A bicondicional é o que impede tanto o registro incompleto quanto o
 * lançamento avulso que carrega, por acidente, um vínculo de parcela.
 */
export const movimento = pgTable(
  "movimento",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    natureza: naturezaEnum("natureza").notNull(),
    origem: origemEnum("origem").notNull(),
    descricao: text("descricao").notNull(),
    competencia: date("competencia", { mode: "string" }).notNull(),
    dataEvento: date("data_evento", { mode: "string" }).notNull(),
    valorCentavos: bigint("valor_centavos", { mode: "number" }).notNull(),
    /** Preservado quando o valor real de uma recorrência é confirmado (REC-01, AC 1). */
    valorPrevistoCentavos: bigint("valor_previsto_centavos", { mode: "number" }),
    /** `null` = previsto; preenchido = realizado, o dinheiro já saiu (MOV-06). */
    pagoEm: date("pago_em", { mode: "string" }),
    categoriaId: uuid("categoria_id").references(() => categoria.id),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuario.id),
    meioPagamentoId: uuid("meio_pagamento_id")
      .notNull()
      .references(() => meioPagamento.id),
    compraId: uuid("compra_id").references(() => compraParcelada.id),
    numeroParcela: integer("numero_parcela"),
    recorrenciaId: uuid("recorrencia_id").references(() => recorrencia.id),
    faturaId: uuid("fatura_id").references(() => fatura.id),
    /** Confirmação manual trava a ocorrência contra nova materialização (REC-01, AC 2). */
    sobrescritoEm: timestamp("sobrescrito_em", { withTimezone: true }),
    /** Preparação para o importador CSV da Fase 10: `null` enquanto tudo é manual. */
    origemDado: text("origem_dado"),
    origemHash: text("origem_hash"),
    canceladoEm: timestamp("cancelado_em", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("movimento_compra_parcela_uq").on(t.compraId, t.numeroParcela),
    uniqueIndex("movimento_recorrencia_competencia_uq").on(t.recorrenciaId, t.competencia),
    /** Só linhas importadas entram no índice: com `origem_dado` nulo a
     * comparação é NULL e a linha fica de fora (o caso manual). */
    uniqueIndex("movimento_origem_dado_hash_uq")
      .on(t.origemDado, t.origemHash)
      .where(sql`${t.origemDado} <> 'MANUAL'`),
    index("movimento_competencia_idx").on(t.competencia),
    check("movimento_competencia_dia_1", competenciaNoDiaUm(t.competencia)),
    /*
     * O razão é a única tabela somável, e era a única com coluna monetária sem
     * piso. `recorrencia_versao`, `orcamento_categoria` e `pagamento_fatura` já
     * tinham o deles. A ausência era descuido, não decisão: enquanto o banco
     * aceitar valor não positivo aqui, o teste de que a aplicação o recusa é
     * infalsificável — ele passa igual com a validação removida.
     */
    check("movimento_valor_positivo", sql`${t.valorCentavos} > 0`),
    check(
      "movimento_parcela_sse_compra",
      sql`(${t.origem} = 'PARCELA') = (${t.compraId} IS NOT NULL AND ${t.numeroParcela} IS NOT NULL)`,
    ),
    check(
      "movimento_recorrencia_sse_vinculo",
      sql`(${t.origem} = 'RECORRENCIA') = (${t.recorrenciaId} IS NOT NULL)`,
    ),
    check(
      "movimento_numero_parcela_positivo",
      sql`${t.numeroParcela} IS NULL OR ${t.numeroParcela} >= 1`,
    ),
  ],
);

/**
 * Pagamento de fatura: eixo **caixa**.
 *
 * **Não tem `natureza` e não tem `categoria_id`, e isso é a feature** (AD-003,
 * MOV-02 AC 2). Toda consulta do eixo competência filtra por natureza e
 * agrupa por categoria; sem essas duas colunas, nenhuma delas consegue ler
 * esta tabela, e somar a compra no cartão junto com o pagamento da fatura
 * deixa de ser um erro possível de escrever. Não acrescente as colunas.
 */
export const pagamentoFatura = pgTable(
  "pagamento_fatura",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    faturaId: uuid("fatura_id")
      .notNull()
      .references(() => fatura.id),
    dataPagamento: date("data_pagamento", { mode: "string" }).notNull(),
    valorPagoCentavos: bigint("valor_pago_centavos", { mode: "number" }).notNull(),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("pagamento_fatura_valor_positivo", sql`${t.valorPagoCentavos} > 0`)],
);
