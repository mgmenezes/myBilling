CREATE TYPE "public"."modo_entrada" AS ENUM('TOTAL', 'VALOR_PARCELA');--> statement-breakpoint
CREATE TYPE "public"."natureza" AS ENUM('RECEITA', 'DESPESA', 'INVESTIMENTO');--> statement-breakpoint
CREATE TYPE "public"."origem" AS ENUM('AVULSO', 'PARCELA', 'RECORRENCIA');--> statement-breakpoint
CREATE TYPE "public"."politica_residuo" AS ENUM('PRIMEIRAS', 'ULTIMAS');--> statement-breakpoint
CREATE TYPE "public"."tipo_meio" AS ENUM('CONTA_CORRENTE', 'CARTAO_CREDITO', 'ROTULO');--> statement-breakpoint
CREATE TABLE "categoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"arquivada_em" timestamp with time zone,
	CONSTRAINT "categoria_nome_unique" UNIQUE("nome")
);
--> statement-breakpoint
CREATE TABLE "compra_parcelada" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"descricao" text NOT NULL,
	"modo_entrada" "modo_entrada" NOT NULL,
	"valor_total_centavos" bigint NOT NULL,
	"qtd_parcelas" integer NOT NULL,
	"parcela_inicial" integer NOT NULL,
	"competencia_compra" date NOT NULL,
	"politica_residuo" "politica_residuo" NOT NULL,
	"valor_amortizado_anterior_centavos" bigint NOT NULL,
	"categoria_id" uuid,
	"usuario_id" uuid NOT NULL,
	"meio_pagamento_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "compra_parcelada_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "compra_parcelada_competencia_dia_1" CHECK (EXTRACT(DAY FROM "compra_parcelada"."competencia_compra") = 1),
	CONSTRAINT "compra_parcelada_qtd_parcelas_1_120" CHECK ("compra_parcelada"."qtd_parcelas" BETWEEN 1 AND 120),
	CONSTRAINT "compra_parcelada_parcela_inicial_valida" CHECK ("compra_parcelada"."parcela_inicial" BETWEEN 1 AND "compra_parcelada"."qtd_parcelas"),
	CONSTRAINT "compra_parcelada_parcela_min_um_centavo" CHECK ("compra_parcelada"."qtd_parcelas" <= "compra_parcelada"."valor_total_centavos"),
	CONSTRAINT "compra_parcelada_amortizado_nao_negativo" CHECK ("compra_parcelada"."valor_amortizado_anterior_centavos" >= 0)
);
--> statement-breakpoint
CREATE TABLE "fatura" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cartao_id" uuid NOT NULL,
	"competencia_fatura" date NOT NULL,
	"ciclo_inicio" date NOT NULL,
	"ciclo_fim" date NOT NULL,
	"data_vencimento" date NOT NULL,
	"fechada_em" timestamp with time zone,
	CONSTRAINT "fatura_competencia_dia_1" CHECK (EXTRACT(DAY FROM "fatura"."competencia_fatura") = 1),
	CONSTRAINT "fatura_ciclo_ordenado" CHECK ("fatura"."ciclo_inicio" <= "fatura"."ciclo_fim")
);
--> statement-breakpoint
CREATE TABLE "meio_pagamento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"tipo" "tipo_meio" NOT NULL,
	"gera_fatura" boolean NOT NULL,
	"dia_fechamento" integer,
	"dia_vencimento" integer,
	"fechamento_vai_para_fatura_seguinte" boolean DEFAULT true NOT NULL,
	"arquivado_em" timestamp with time zone,
	CONSTRAINT "meio_pagamento_gera_fatura_sse_cartao" CHECK ("meio_pagamento"."gera_fatura" = ("meio_pagamento"."tipo" = 'CARTAO_CREDITO')),
	CONSTRAINT "meio_pagamento_cartao_tem_ciclo" CHECK ("meio_pagamento"."gera_fatura" = ("meio_pagamento"."dia_fechamento" IS NOT NULL AND "meio_pagamento"."dia_vencimento" IS NOT NULL)),
	CONSTRAINT "meio_pagamento_dias_validos" CHECK (("meio_pagamento"."dia_fechamento" IS NULL OR "meio_pagamento"."dia_fechamento" BETWEEN 1 AND 31)
        AND ("meio_pagamento"."dia_vencimento" IS NULL OR "meio_pagamento"."dia_vencimento" BETWEEN 1 AND 31))
);
--> statement-breakpoint
CREATE TABLE "movimento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"natureza" "natureza" NOT NULL,
	"origem" "origem" NOT NULL,
	"descricao" text NOT NULL,
	"competencia" date NOT NULL,
	"data_evento" date NOT NULL,
	"valor_centavos" bigint NOT NULL,
	"valor_previsto_centavos" bigint,
	"pago_em" date,
	"categoria_id" uuid,
	"usuario_id" uuid NOT NULL,
	"meio_pagamento_id" uuid NOT NULL,
	"compra_id" uuid,
	"numero_parcela" integer,
	"recorrencia_id" uuid,
	"fatura_id" uuid,
	"sobrescrito_em" timestamp with time zone,
	"origem_dado" text,
	"origem_hash" text,
	"cancelado_em" timestamp with time zone,
	CONSTRAINT "movimento_competencia_dia_1" CHECK (EXTRACT(DAY FROM "movimento"."competencia") = 1),
	CONSTRAINT "movimento_parcela_sse_compra" CHECK (("movimento"."origem" = 'PARCELA') = ("movimento"."compra_id" IS NOT NULL AND "movimento"."numero_parcela" IS NOT NULL)),
	CONSTRAINT "movimento_recorrencia_sse_vinculo" CHECK (("movimento"."origem" = 'RECORRENCIA') = ("movimento"."recorrencia_id" IS NOT NULL)),
	CONSTRAINT "movimento_numero_parcela_positivo" CHECK ("movimento"."numero_parcela" IS NULL OR "movimento"."numero_parcela" >= 1)
);
--> statement-breakpoint
CREATE TABLE "orcamento_categoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"categoria_id" uuid NOT NULL,
	"competencia" date NOT NULL,
	"limite_centavos" bigint NOT NULL,
	CONSTRAINT "orcamento_categoria_competencia_dia_1" CHECK (EXTRACT(DAY FROM "orcamento_categoria"."competencia") = 1),
	CONSTRAINT "orcamento_categoria_limite_nao_negativo" CHECK ("orcamento_categoria"."limite_centavos" >= 0)
);
--> statement-breakpoint
CREATE TABLE "pagamento_fatura" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fatura_id" uuid NOT NULL,
	"data_pagamento" date NOT NULL,
	"valor_pago_centavos" bigint NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pagamento_fatura_valor_positivo" CHECK ("pagamento_fatura"."valor_pago_centavos" > 0)
);
--> statement-breakpoint
CREATE TABLE "recorrencia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"descricao" text NOT NULL,
	"natureza" "natureza" NOT NULL,
	"categoria_id" uuid,
	"usuario_id" uuid NOT NULL,
	"meio_pagamento_id" uuid NOT NULL,
	"competencia_inicio" date NOT NULL,
	"competencia_fim" date,
	"dia_vencimento" integer NOT NULL,
	"encerrada_em" timestamp with time zone,
	CONSTRAINT "recorrencia_competencia_inicio_dia_1" CHECK (EXTRACT(DAY FROM "recorrencia"."competencia_inicio") = 1),
	CONSTRAINT "recorrencia_competencia_fim_dia_1" CHECK ("recorrencia"."competencia_fim" IS NULL OR EXTRACT(DAY FROM "recorrencia"."competencia_fim") = 1),
	CONSTRAINT "recorrencia_dia_vencimento_valido" CHECK ("recorrencia"."dia_vencimento" BETWEEN 1 AND 31)
);
--> statement-breakpoint
CREATE TABLE "recorrencia_versao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recorrencia_id" uuid NOT NULL,
	"vigente_desde" date NOT NULL,
	"valor_previsto_centavos" bigint NOT NULL,
	CONSTRAINT "recorrencia_versao_vigencia_dia_1" CHECK (EXTRACT(DAY FROM "recorrencia_versao"."vigente_desde") = 1)
);
--> statement-breakpoint
CREATE TABLE "usuario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuario_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "compra_parcelada" ADD CONSTRAINT "compra_parcelada_categoria_id_categoria_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categoria"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compra_parcelada" ADD CONSTRAINT "compra_parcelada_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compra_parcelada" ADD CONSTRAINT "compra_parcelada_meio_pagamento_id_meio_pagamento_id_fk" FOREIGN KEY ("meio_pagamento_id") REFERENCES "public"."meio_pagamento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fatura" ADD CONSTRAINT "fatura_cartao_id_meio_pagamento_id_fk" FOREIGN KEY ("cartao_id") REFERENCES "public"."meio_pagamento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimento" ADD CONSTRAINT "movimento_categoria_id_categoria_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categoria"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimento" ADD CONSTRAINT "movimento_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimento" ADD CONSTRAINT "movimento_meio_pagamento_id_meio_pagamento_id_fk" FOREIGN KEY ("meio_pagamento_id") REFERENCES "public"."meio_pagamento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimento" ADD CONSTRAINT "movimento_compra_id_compra_parcelada_id_fk" FOREIGN KEY ("compra_id") REFERENCES "public"."compra_parcelada"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimento" ADD CONSTRAINT "movimento_recorrencia_id_recorrencia_id_fk" FOREIGN KEY ("recorrencia_id") REFERENCES "public"."recorrencia"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimento" ADD CONSTRAINT "movimento_fatura_id_fatura_id_fk" FOREIGN KEY ("fatura_id") REFERENCES "public"."fatura"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orcamento_categoria" ADD CONSTRAINT "orcamento_categoria_categoria_id_categoria_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categoria"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamento_fatura" ADD CONSTRAINT "pagamento_fatura_fatura_id_fatura_id_fk" FOREIGN KEY ("fatura_id") REFERENCES "public"."fatura"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recorrencia" ADD CONSTRAINT "recorrencia_categoria_id_categoria_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categoria"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recorrencia" ADD CONSTRAINT "recorrencia_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recorrencia" ADD CONSTRAINT "recorrencia_meio_pagamento_id_meio_pagamento_id_fk" FOREIGN KEY ("meio_pagamento_id") REFERENCES "public"."meio_pagamento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recorrencia_versao" ADD CONSTRAINT "recorrencia_versao_recorrencia_id_recorrencia_id_fk" FOREIGN KEY ("recorrencia_id") REFERENCES "public"."recorrencia"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "fatura_cartao_competencia_uq" ON "fatura" USING btree ("cartao_id","competencia_fatura");--> statement-breakpoint
CREATE UNIQUE INDEX "movimento_compra_parcela_uq" ON "movimento" USING btree ("compra_id","numero_parcela");--> statement-breakpoint
CREATE UNIQUE INDEX "movimento_recorrencia_competencia_uq" ON "movimento" USING btree ("recorrencia_id","competencia");--> statement-breakpoint
CREATE UNIQUE INDEX "movimento_origem_dado_hash_uq" ON "movimento" USING btree ("origem_dado","origem_hash") WHERE "movimento"."origem_dado" <> 'MANUAL';--> statement-breakpoint
CREATE INDEX "movimento_competencia_idx" ON "movimento" USING btree ("competencia");--> statement-breakpoint
CREATE UNIQUE INDEX "orcamento_categoria_categoria_competencia_uq" ON "orcamento_categoria" USING btree ("categoria_id","competencia");--> statement-breakpoint
CREATE UNIQUE INDEX "recorrencia_versao_recorrencia_vigencia_uq" ON "recorrencia_versao" USING btree ("recorrencia_id","vigente_desde");