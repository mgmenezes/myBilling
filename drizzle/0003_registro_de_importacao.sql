CREATE TYPE "public"."classe_entrada" AS ENUM('FIXA', 'AVULSA');--> statement-breakpoint
CREATE TYPE "public"."tipo_decisao_importacao" AS ENUM('MEIO', 'ENTRADA');--> statement-breakpoint
CREATE TABLE "importacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competencia" date NOT NULL,
	"nome_arquivo" text NOT NULL,
	"usuario_id" uuid NOT NULL,
	"importada_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "importacao_competencia_unique" UNIQUE("competencia"),
	CONSTRAINT "importacao_competencia_dia_1" CHECK (EXTRACT(DAY FROM "importacao"."competencia") = 1)
);
--> statement-breakpoint
CREATE TABLE "importacao_decisao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" "tipo_decisao_importacao" NOT NULL,
	"nome_normalizado" text NOT NULL,
	"meio_pagamento_id" uuid NOT NULL,
	"classe" "classe_entrada",
	CONSTRAINT "importacao_decisao_unica" UNIQUE("tipo","nome_normalizado"),
	CONSTRAINT "importacao_decisao_classe_sse_entrada" CHECK (("importacao_decisao"."tipo" = 'ENTRADA') = ("importacao_decisao"."classe" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "importacao" ADD CONSTRAINT "importacao_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "importacao_decisao" ADD CONSTRAINT "importacao_decisao_meio_pagamento_id_meio_pagamento_id_fk" FOREIGN KEY ("meio_pagamento_id") REFERENCES "public"."meio_pagamento"("id") ON DELETE no action ON UPDATE no action;