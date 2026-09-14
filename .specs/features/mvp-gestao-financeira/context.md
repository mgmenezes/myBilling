# MVP Gestão Financeira Doméstica — Context

**Gathered:** 2026-09-13
**Spec:** `.specs/features/mvp-gestao-financeira/spec.md`
**Design aprovado:** `(plano de design aprovado, mantido fora do repositório)`
**Status:** Ready for design

---

## Feature Boundary

Aplicativo web de gestão financeira doméstica para duas pessoas (Moisés e Ana), substituindo uma planilha do Google Sheets com uma aba por mês.

**Esta feature entrega as Fases 0 a 6 do plano aprovado:** núcleo financeiro puro e testado, persistência, autenticação, e o corte vertical mínimo — cadastrar uma compra parcelada uma única vez e ver as parcelas se distribuírem automaticamente pelos meses seguintes.

**Fora desta feature:** Fases 7 a 9 (marcar pago na UI, lançamento avulso, recorrências na UI, orçamento, dashboard, exportação, deploy). O domínio dessas fases é construído e testado nas Fases 1–3, mas não recebe UI nesta entrega.

---

## Implementation Decisions

### Competência (o eixo que governa todo o modelo)

- **Competência = mês da compra.** Uma compra de 20/mar cuja fatura vence 10/abr conta em **março**.
- Corolário confirmado pelos dados da planilha (linhas como `Preenchimento 9/12` em Março): a competência da parcela `k` é `mês_da_compra + (k−1) meses`.
- **O dia de fechamento do cartão nunca afeta a competência.** Ele afeta apenas a alocação em fatura (eixo caixa).

### Pessoas e compartilhamento

- Finanças **compartilhadas**: um único caixa, um único saldo.
- Cada lançamento marca a **pessoa dona** (Moisés ou Ana), como já ocorre na planilha em "Salário - Ana" e "Moisés localiza".
- `usuario_id` no lançamento é **classificação**, não permissão. Ambos leem e escrevem tudo.

### Meios de pagamento

- **Cartões de crédito ativos:** Bradesco, NuBank (titular Ana), NuMoises (titular Moisés). Os três com dia de fechamento e dia de vencimento conhecidos e cadastrados pelo usuário.
- **Débito** = conta corrente, não gera fatura.
- **Porto Seguro** = rótulo de segregação usado apenas para o Seguro do Carro. Não é cartão, não tem ciclo, não gera fatura. Confirmado pelos dados: R$ 180,00 em Saídas = exatamente o fixo "Seguro do Carro".
- **Latam** não existe mais e não deve ser migrado. Mas o modelo suporta **cartão arquivado com parcelas em aberto** — o caso `Abraão 8/10` mostra que isso acontece na vida real.

### Marcador de pagamento

- **"Pago?" significa que o dinheiro já saiu da conta.** É o que separa previsto de realizado.

### Saldo e investimentos

- **Saldo = Entradas − Saídas − Investimentos.** Confirmado aritmeticamente contra o print: `12.000,00 − 9.400,00 − 600,00 = 2.000,00`.
- Investimento (Reserva R$ 400,00, Tributação R$ 200,00) é dinheiro comprometido: **reduz o saldo** mas **não é despesa** (não entra em Total de Gastos nem em Saídas).

### Orçamento por categoria

- Duas porcentagens, em **lugares diferentes da interface**:
  - **% do limite da categoria consumido** — barra de orçamento com alerta de estouro. Responde "posso gastar mais nessa categoria?".
  - **% da categoria sobre o total de gastos** — distribuição. Responde "para onde vai meu dinheiro?". É a fórmula atual da planilha, conferida: `1.640,00 ÷ 8.200,00 = 20,00%`.
- **Indicador global 95,02% = total gasto ÷ total orçado** do mês.
- O limite pode mudar de mês para mês.

### Recorrências de valor variável

- Contas como Celpe, água e telefonia carregam um **valor previsto** que já aparece na projeção.
- Quando a conta chega, o usuário **confirma o valor real daquele mês**.
- A confirmação **não altera meses anteriores nem futuros**.

### Bootstrap dos dados

- **Cadastro manual** no MVP. O usuário cadastra os fixos, os cartões e os parcelamentos em andamento.
- **Importador CSV em fase posterior.** O modelo de dados já nasce preparado: colunas `origem_dado` e `origem_hash` em `movimento`, e o exportador da Fase 9 define o formato que o importador vai consumir.
- Histórico antigo permanece na planilha; não será migrado.

### Hospedagem e acesso

- **Web na nuvem**, responsivo para celular e computador, os dois acessam com login.
- Stack escolhida: Next.js + TypeScript, Neon Postgres, Vercel. Custo alvo R$ 0/mês.
- O usuário trabalha profissionalmente com .NET/C# e Angular. Avaliado e **descartado** para este projeto: não existe free tier de ASP.NET comparável, e dois artefatos (API + SPA) aumentariam o trabalho em ~30% para 6 telas. A arquitetura em camadas dos projetos `Portal.*` é replicada em TypeScript.

### Escopo da primeira entrega

- **Parar na Fase 6** e usar com dados reais por ~2 semanas antes de construir orçamento e dashboard, para que os limites nasçam calibrados por histórico e não chutados.

### Agent's Discretion

Escolhas técnicas rotineiras delegadas ao agente durante o design e a implementação:

- ORM, gerenciador de pacotes, linter, runner de teste e estrutura de diretórios.
- Mecanismo de autenticação (definido: Google OAuth com allowlist de dois e-mails, por evitar senha armazenada, SMTP e fluxo de reset).
- Representação monetária interna (definido: `BIGINT` em centavos).
- Representação de competência (definido: `DATE` no dia 1 no banco, `'YYYY-MM'` branded no domínio).
- Política de alocação do resíduo do rateio (definido: **primeiras parcelas**, por ser a prática das operadoras brasileiras — é o único critério que o usuário consegue conferir contra a fatura real).
- Estratégia de teste e níveis de gate.

### Declined / Undiscussed Gray Areas → Assumptions

Registrados na seção Assumptions & Open Questions do `spec.md`, com default e rationale:

- Significado do destaque **vermelho** na coluna "Valor gasto" da planilha — o usuário não o explicou e ele é inconsistente nos dados (Mercado 820,00 está vermelho estando abaixo do limite de 900,00; Pets outros 140,00 não está estando abaixo de 250,00). Tratado como formatação manual residual.
- Fuso horário de referência para converter data em competência.
- Comportamento de uma compra feita exatamente no dia do fechamento do cartão.
- Tratamento de categoria com lançamentos quando o usuário tenta excluí-la.
- Resolução de conflito quando as duas pessoas editam o mesmo lançamento.

---

## Specific References

- **A planilha atual é a referência funcional, não visual.** O usuário pediu explicitamente uma interface própria de aplicativo, sem reproduzir o layout da planilha.
- Blocos da planilha que informam o modelo: Fixos · Cartão de Crédito (com identificação `8/10`) · Gastos do Mês · Entradas · Saídas · Investimentos · Gastos do mês por categoria · Gastos por tipo de pagamento.
- Categorias reais observadas: Apartamento, Condomínio, Celpe, Mercado, Mães, Nova, Telefonia, Plano Pets, Pets outros, Academia, Assinaturas, ifood/restaurante, Gasolina, Internet, Inglês, Farmácia, Seguro Carro, Tributo Sogra, Cuidados Pessoais, Tributação, para pix, "depesas mensais" (guarda-chuva, 28% do total).
- **Divergência de R$ 1.200,00** entre Saídas (9.400,00) e Total de gastos (8.200,00): identificada como a diferença legítima entre regime de competência e regime de caixa. O app mostra os dois com selos distintos e **nunca os soma nem os subtrai na interface**.
- Interface em **português do Brasil**, valores em **reais**.

---

## Lacunas encontradas durante a execução

Registradas aqui em vez de corrigidas na hora, porque nenhuma está no `Done when` das tasks em que apareceram.

- **`isOk` / `isErr` não estreitam o ramo negativo.** Os guards de `src/domain/shared/result.ts` declaram `resultado is Result<T, E> & { ok: true }`, o que impede o TypeScript de excluir esse membro em `!isOk(x)`. A Fase 2 contornou usando o discriminante nativo `!rateio.ok`. Correção: o predicado deve apontar para o membro concreto da união, não para uma interseção. Pequena, isolada, merece uma task própria.
- **`resolverCicloFatura` assume que a fatura é sempre a do mês seguinte ao fechamento.** É o único arranjo definido no spec. Cartão cujo vencimento cai no mesmo mês do fechamento precisaria de regra adicional. Nenhum dos três cartões atuais tem esse arranjo.
- **`dataParaCompetencia` aceita dia inexistente.** `2026-02-30` transborda para março pelo algoritmo civil, em vez de ser rejeitado. O spec não define o comportamento — é uma lacuna de precisão do spec, não um bug de implementação. Decidir antes de a data vir de entrada do usuário, na Fase 7.
- **`competenciaCompra` é a competência da parcela 1**, mesmo numa compra já em andamento. Uma compra 8/10 cuja parcela 8 cai em 2026-03 entra no domínio com `competenciaCompra: '2025-08'`. A conversão da entrada do usuário ("estou na parcela 8, e ela é deste mês") para essa forma é responsabilidade da Fase 7 e ainda não existe.

## Deferred Ideas

Surgiram durante a discussão e ficam fora desta feature:

- **Importador CSV das abas mensais** — Fase 10, depois de 2 meses de uso real. O exportador da Fase 9 define o formato primeiro.
- **Tela de conciliação competência ↔ caixa** — a ponte linha a linha que explica os R$ 1.200,00. Valiosa, mas não é MVP.
- **Lançamento privado** (`visibilidade: casa | privado`) — aditivo, custo zero de retrabalho, só implementar se a necessidade aparecer.
- **Fechamento de mês** (tabela `competencia_mes`) e **changelog completo** (tabela `auditoria`) — adiados; `pago_em` já protege o que foi pago.
- **Notificações de vencimento, PWA/offline, anexos de comprovante, metas e patrimônio, acerto de contas entre as pessoas** — fora do MVP.
- **Integrações bancárias, IA e Open Finance** — descartados por pedido explícito do usuário.
