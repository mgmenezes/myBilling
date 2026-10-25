-- ============================================================================
-- myBilling — limpar o banco para recomeçar a importação da planilha (IMP-09)
--
-- APAGA tudo o que a importação cria:
--   movimento            (todos os lançamentos: avulsos, parcelas e ocorrências
--                         de fixo, inclusive os lançados à mão)
--   compra_parcelada     (todas as compras parceladas)
--   recorrencia_versao   (todo o histórico de valor dos fixos)
--   recorrencia          (todos os fixos e receitas fixas)
--   importacao           (o registro das abas importadas)
--   importacao_decisao   (as ligações de "Tipo" e as classificações lembradas)
--
-- PRESERVA usuario, meio_pagamento e categoria. Faturas, pagamentos de fatura
-- e orçamentos também ficam: a importação não os cria.
--
-- Depois dele, a próxima importação volta a ser a primeira e aceita qualquer
-- mês.
--
-- Não há volta. Rode primeiro no banco local; no Neon, só quando quiser
-- recomeçar as três importações do zero.
--
-- Sem CASCADE, de propósito. Se alguma tabela fora desta lista tiver chave
-- estrangeira para uma destas, o TRUNCATE falha inteiro e nada é apagado, em
-- vez de esvaziar junto uma tabela que ninguém pediu.
-- ============================================================================

TRUNCATE TABLE
  movimento,
  compra_parcelada,
  recorrencia_versao,
  recorrencia,
  importacao_decisao,
  importacao;
