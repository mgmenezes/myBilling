# Trocar a categoria na lista de Lançamentos — Validação

## Validation: trocar-categoria — **FAIL**

**Result**: FAIL ❌ — rodada 1 (2026-10-29, `b582e19`).

O código de produto faz o que a spec pede em todas as camadas, o gate está verde e 50 dos 55
mutantes morreram. O veredito vem de **quatro mutantes vivos que quebram um critério da spec**. Os
quatro se corrigem com teste, sem tocar em código de produto, e cada correção já foi provada numa
sonda: passa no `b582e19` e mata o mutante.

1. **Nada atravessa a página para provar quais categorias ela entrega (P2, P3; TRC-02 ACs 1 e 3).**
   A página escolhe duas listas: os nomes de **todas** as categorias, para que o gasto com uma
   arquivada a veja pelo nome, e só as **ativas** como opções. Trocar uma pela outra, em
   `src/app/(app)/[competencia]/lancamentos/page.tsx:151` ou `:154`, passa no unit, na integração e
   no e2e. Nenhum e2e arquiva uma categoria. Com P2, o gasto com categoria arquivada diz "Categoria
   removida". Com P3, a arquivada vira opção de todo gasto, e escolhê-la volta como
   `CATEGORIA_NAO_ENCONTRADA`. A traceability de T8 diz que "a página passando o nome de todas as
   categorias" está provada, mas o teste da tabela recebe o mapa já montado.
2. **"Receita" não está presa à coluna Categoria (TB6; TRC-01 AC 1).** O teste da tabela e o e2e
   procuram "Receita" na linha. Mover a pílula para a célula da descrição, com a célula Categoria
   vazia, passa nos dois.
3. **A fixture que diz provar "a ordem recebida" já está em ordem alfabética (S10; TRC-02 AC 1, Done
   when de T7).** `seletor-de-categoria.test.tsx:23-27` comenta "fora de ordem alfabética de
   propósito", mas "Categoria Dois" vem antes de "Categoria Um". Ordenar as opções por nome no
   seletor passa. Em produção o efeito é quase nulo, porque `listarCategoriasDisponiveis` já ordena
   por nome. Mesmo assim, o teste afirma uma garantia que não tem.

**Data**: 2026-10-29
**Spec**: `.specs/features/trocar-categoria/spec.md` (TRC-01 a TRC-05, 25 critérios, 3 edge cases)
**Faixa do diff**: `f7bfc1a..b582e19`, 11 commits: a spec (`21943d0`) e T1 a T10, de `ecba630` a
`b582e19`. A base `f7bfc1a` é o `main` local com a edição de fixos verificada.
**Verificador**: sub-agente independente (autor ≠ verificador). Leitura apenas sobre o código e os
testes da fatia. As mutações rodaram numa `git worktree` descartável, em modo detached no
`b582e19`, com `pnpm install --offline` próprio e um banco próprio (`mybilling_test_trc_mut`, criado
e apagado no Postgres local). **Nenhum `git stash`.** O porcelain da worktree da fatia foi gravado
antes (vazio) e conferido no fim (vazio). O `next dev` do e2e reescreveu `next-env.d.ts`, e o
arquivo voltou ao commitado com `git checkout`. O checkout principal e as outras worktrees não
foram tocados.

---

## Task Completion

| Task | Status | Notas |
| --- | --- | --- |
| T1 | ✅ Done | `alcanceDaTroca` e `CATEGORIA_EM_RECEITA`; mensagem com `SPEC_DEVIATION` em `src/lib/erros.ts:74` (`ecba630`) |
| T2 | ✅ Done | `trocarCategoria` nas duas ports, nos fakes e no Drizzle (`d606788`) |
| T3 | ✅ Done | Schema estrito (`a761b51`) |
| T4 | ✅ Done | Caso de uso; rollback provado com `TransacaoQueDesfaz` no teste (`c250b8b`) |
| T5 | ✅ Done | Action, revalidação das três rotas (`3f1ad68`) |
| T6 | ✅ Done | `ProvedorDeAvisos` no layout de `(app)` (`640537c`) |
| T7 | ✅ Done | `SeletorDeCategoria` com `useOptimistic` (`762ffa8`). A fixture da ordem não prova a ordem (S10) |
| T8 | ✅ Done | Tabela e página (`91ba5b1`). A escolha das listas na página não tem teste (P2, P3) |
| T9 | ✅ Done | `e2e/trocar-categoria.spec.ts`, 5 percursos (`e140c33`) |
| T10 | ✅ Done | Roadmap e traceability (`b582e19`) |

10 tasks, todos os itens marcados. Cada commit de task traz `tasks.md` e `spec.md`.

---

## Critérios de aceitação, ancorados na spec

Legenda: ✅ a assertion afirma o resultado que a spec define, e o mutante que o quebra morre ·
❌ a assertion não prova o critério inteiro: há mutante vivo.

### TRC-01 — Entrada aparece como Receita

| AC | Resultado definido pela spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| 1 | "Receita" **na coluna Categoria**, com ou sem categoria gravada | `src/components/tabela-lancamentos.test.tsx:524` — `within(linha).getByText("Receita")` para a entrada sem categoria e a entrada com `cat-1`; `:528-529` — nem "Categoria Um" nem "Sem categoria" em Entradas; `e2e/trocar-categoria.spec.ts:308-311` confirma no banco uma com e outra sem categoria, e `:313-317` acha "Receita" nas duas linhas | ❌ "Receita" e "com ou sem categoria" provados (TB2, TB5 mortos); a coluna não: TB6 vivo |
| 2 | A entrada não tem seletor | `tabela-lancamentos.test.tsx:525` — `within(linha).queryByRole("combobox")` nulo; `e2e/trocar-categoria.spec.ts:318` — `Entradas.getByRole("combobox")` com `toHaveCount(0)` | ✅ TB1 morto no unit e, sozinho, no e2e (TB1e) |

### TRC-02 — Trocar a categoria de um gasto na linha

| AC | Resultado definido pela spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| 1 | Seletor em despesa e investimento, com "Sem categoria" e as categorias **ativas**, e a gravada selecionada | `seletor-de-categoria.test.tsx:98` — opções na ordem recebida; `:104-105`, `:111-112` — a gravada selecionada; `tabela-lancamentos.test.tsx:540-544` (despesa), `:553` (investimento) | ❌ seletor e tabela provados (TB3 morto); "ativas" depende da página: P3 vivo. A ordem recebida não está provada: S10 vivo |
| 2 | Grava ao escolher, sem outro clique nem confirmação | `seletor-de-categoria.test.tsx:156-158` — a action é chamada uma vez com `{ lancamentoId, categoriaId }`; `:166-169` — `categoriaId: null` para "Sem categoria"; `e2e/trocar-categoria.spec.ts:185-189` — `selectOption` e o toast, sem outro clique | ✅ S5, P1 mortos |
| 3 | A gravada fora das ativas aparece selecionada como opção a mais, com o nome dela ou "Categoria removida" | `seletor-de-categoria.test.tsx:120-127`, `:133-139`; `tabela-lancamentos.test.tsx:563-568` | ❌ componente e tabela provados (S6, S7, TB4 mortos); a página que entrega o nome não: P2 vivo |
| 4 | Desabilitado enquanto grava | `seletor-de-categoria.test.tsx:187`, `:199`, `:206` — `disabled` `false` antes, `true` com a gravação pendente, `false` depois | ✅ S4 morto |
| 5 | Nome acessível "Categoria de <descrição>" | `seletor-de-categoria.test.tsx:92`; todo e2e acha o seletor por esse nome (`e2e/trocar-categoria.spec.ts:155`) | ✅ S8 morto |

### TRC-03 — O alcance da troca

| AC | Resultado definido pela spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| 1 | Fixo: a categoria nova no fixo e em todas as ocorrências, passadas inclusive, sem mudar valor, previsto, data, pagamento nem cancelamento | `src/domain/mes/alcance-da-troca.test.ts:25` — `FIXO`; `src/application/mes/trocar-categoria/handler.test.ts:158-160` — as três ocorrências iguais às de antes, só com `categoriaId: "cat-2"`; `:161` — outubro pago; `:162-165` — o fixo; `src/app/actions/lancamentos.integration.test.ts:643-648` — linhas inteiras de `movimento` e `recorrencia` iguais, só `categoria_id` muda; `:655-659` — datas, valores e `pago_em`; `e2e/trocar-categoria.spec.ts:191-198` | ✅ H3, H4, H8, H9 mortos |
| 2 | Ocorrência gerada depois nasce com a categoria nova | `handler.test.ts:178` — fevereiro materializado depois da troca em `cat-2`; `lancamentos.integration.test.ts:646-648` — `recorrencia.categoria_id` gravado no Postgres, que é o que o materializador lê | ✅ H4 morto |
| 3 | Parcela: a compra e todas as parcelas, sem mudar valor, número, data nem pagamento | `alcance-da-troca.test.ts:35` — `COMPRA`; `handler.test.ts:195-198`; `src/infrastructure/db/repositories/compra.repository.integration.test.ts:450-456` — compra e parcelas, linhas inteiras; `:468` — valor, número, competência, data, `pago_em`; `:501-502` — a outra compra intacta; `e2e/trocar-categoria.spec.ts:224-232` | ✅ R3 a R7, F1, H5 mortos |
| 4 | Gasto do mês: só ele | `alcance-da-troca.test.ts:45` — `LANCAMENTO`; `handler.test.ts:217-223` — o resto do estado igual; `src/infrastructure/db/repositories/movimento.repository.integration.test.ts:489-490`, `:505`, `:513`; `e2e/trocar-categoria.spec.ts:254-255` | ✅ R1, R2, F2 mortos |
| 5 | "Sem categoria" grava a ausência com o mesmo alcance | `handler.test.ts:236-238`, `:249-250`, `:261-263`; `compra.repository.integration.test.ts:508-509`; `movimento.repository.integration.test.ts:527` | ✅ S5 morto |
| 6 | Falha numa escrita desfaz todas as da troca | `handler.test.ts:397-400` — a exceção sobe e o estado volta inteiro; `lancamentos.integration.test.ts:687-694` — falha injetada em `atualizarOcorrenciasDaSerie` depois de `atualizarSerie` e o Postgres igual ao de antes | ✅ H6 morto |

### TRC-04 — Avisar a troca

| AC | Resultado definido pela spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| 1 | Toast "Categoria trocada em todos os meses deste fixo." | `seletor-de-categoria.test.tsx:228` (alcance `FIXO`); `e2e/trocar-categoria.spec.ts:187` | ✅ S3 morto |
| 2 | Toast "Categoria trocada em todas as parcelas desta compra." | `seletor-de-categoria.test.tsx:228` (alcance `COMPRA`); `e2e/trocar-categoria.spec.ts:220` | ✅ S3 morto; A6 morre só aqui |
| 3 | Toast "Categoria trocada." | `seletor-de-categoria.test.tsx:228` (alcance `LANCAMENTO`); `e2e/trocar-categoria.spec.ts:251` | ✅ H7 morto |
| 4 | `role="status"` e fora da tela 4 segundos depois | `src/components/avisos.test.tsx:60`, `:64` — a região `status` não existe antes e tem o texto depois; `:73-78` — presente aos 3.999 ms, ausente aos 4.000 ms; `:90-99`, `:113-117` — o novo aviso reinicia o prazo; `e2e/trocar-categoria.spec.ts:222` | ✅ T1 a T4 mortos |
| 5 | Revalidar a lista, a Visão geral e "Todo mês" | `lancamentos.integration.test.ts:668` — exatamente as três rotas; `:695` e as recusas — nenhuma na falha; `e2e/trocar-categoria.spec.ts:205-208` — "Gastos por categoria"; `:280` — o gasto sai da lista filtrada | ✅ A3a, A3b, A3c, A5 mortos |

### TRC-05 — Recusar sem gravar

| AC | Resultado definido pela spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| 1 | Falha: o seletor volta à anterior, a mensagem na linha em `role="alert"`, sem toast | `seletor-de-categoria.test.tsx:242` — `alert` com a mensagem; `:246-249` — valor de volta a `CATEGORIA_UM`; `:251` — nenhuma `status` | ✅ S1, S2, S9 mortos |
| 2 | Lançamento inexistente ou cancelado: `LANCAMENTO_NAO_ENCONTRADO`, sem gravar | `handler.test.ts:277-278`, `:291-292`; `lancamentos.integration.test.ts:590-594` | ✅ H2 morto |
| 3 | Categoria inexistente ou arquivada: `CATEGORIA_NAO_ENCONTRADA`, sem gravar | `handler.test.ts:307-308` (as duas); `lancamentos.integration.test.ts:607-609` | ✅ H1 morto |
| 4 | Entrada: `CATEGORIA_EM_RECEITA` com "Entrada não tem categoria.", sem gravar | `alcance-da-troca.test.ts:61-64`; `handler.test.ts:331-332`, `:347-348`; `lancamentos.integration.test.ts:624-628` | ✅ D2 morto |
| 5 | Payload estrito: `VALIDACAO`, sem gravar | `src/application/schemas/troca-de-categoria.schema.test.ts:16`, `:25`, `:36`, `:40`; `lancamentos.integration.test.ts:580-582` | ✅ |
| 6 | `requireSession()` antes de qualquer leitura | `lancamentos.integration.test.ts:545` — primeira instrução; `:560-564` — `NAO_AUTENTICADO` com payload válido e inválido, `buscarPorId` nunca chamado | ✅ A1, A2 mortos |
| 7 | Erro inesperado: `ERRO_INESPERADO` com referência, sem lançar | `lancamentos.integration.test.ts:690-693` | ✅ A4 morto |

**Status**: ❌ 22 de 25 critérios provados por inteiro. TRC-01 AC 1, TRC-02 AC 1 e TRC-02 AC 3 têm
uma parte sem prova (quatro mutantes vivos). Nenhuma lacuna de precisão na spec: os quatro
critérios dizem o resultado com exatidão, e o que falta é o teste.

---

## Discriminação (sensor)

55 mutantes válidos, cada um na worktree descartável, contra a suíte inteira da camada (unit; unit
e integração; unit, integração e e2e de `trocar-categoria` e `editar-fixo`). O primeiro TB5 não
compilava (JSX inválido) e foi refeito; só o refeito conta.

| Mutante | Arquivo:linha | Falha injetada | Resultado |
| --- | --- | --- | --- |
| D1 | `src/domain/mes/alcance-da-troca.ts:27-32` | `compraId` conferido antes de `recorrenciaId` | ✅ morto (unit) |
| D2 | `alcance-da-troca.ts:24` | receita aceita | ✅ morto (unit) |
| D3 | `alcance-da-troca.ts:24` | investimento tratado como receita | ✅ morto (unit) |
| R1 | `src/infrastructure/db/repositories/movimento.repository.ts:268` | `UPDATE` sem `WHERE`: todas as linhas | ✅ morto (integração) |
| R2 | `movimento.repository.ts:268` | a troca também zera `pago_em` | ✅ morto (integração) |
| R3 | `src/infrastructure/db/repositories/compra.repository.ts:122` | nenhuma parcela gravada | ✅ morto (integração) |
| R4 | `compra.repository.ts:122` | parcelas sem `WHERE`: todos os movimentos | ✅ morto (integração) |
| R5 | `compra.repository.ts:121` | `compra_parcelada` sem `WHERE` | ✅ morto (integração) |
| R6 | `compra.repository.ts:122` | a troca também zera `pago_em` das parcelas | ✅ morto (integração) |
| R7 | `compra.repository.ts:122` | só a parcela 1 | ✅ morto (integração) |
| F1 | `src/application/ports/fakes.ts:149` | fake de compra sem as parcelas em `estado.movimentos` | ✅ morto (unit) |
| F2 | `fakes.ts:415` | fake de movimento grava em todos | ✅ morto (unit) |
| H1 | `src/application/mes/trocar-categoria/handler.ts:69` | sem conferir a categoria arquivada | ✅ morto (unit) |
| H2 | `handler.ts:58` | sem conferir o lançamento cancelado | ✅ morto (unit) |
| H3 | `handler.ts:124` | fixo: só `atualizarSerie` | ✅ morto (unit) |
| H4 | `handler.ts:123` | fixo: só as ocorrências | ✅ morto (unit) |
| H5 | `handler.ts:93` | compra: só a parcela escolhida | ✅ morto (unit) |
| H6 | `handler.ts:74` | exceção da transação engolida, devolve `ok` | ✅ morto (unit) |
| H7 | `handler.ts:75` | devolve sempre `LANCAMENTO` | ✅ morto (unit) |
| H8 | `handler.ts:118` | série regravada com dia 1: muda a data das ocorrências | ✅ morto (unit) |
| H9 | `handler.ts:120` | série regravada com a categoria antiga | ✅ morto (unit) |
| A1 | `src/app/actions/lancamentos.ts:136` | `requireSession` depois da validação | ✅ morto (integração) |
| A2 | `lancamentos.ts:136` | sem `requireSession` | ✅ morto (integração) |
| A3a | `lancamentos.ts:156` | não revalida a lista | ✅ morto (integração) |
| A3b | `lancamentos.ts:157` | não revalida a Visão geral | ✅ morto (integração) |
| A3c | `lancamentos.ts:158` | não revalida "Todo mês" | ✅ morto (integração) |
| A4 | `lancamentos.ts:169` | lança o erro inesperado | ✅ morto (integração) |
| A5 | `lancamentos.ts:156` | revalida também na recusa | ✅ morto (integração) |
| A6 | `lancamentos.ts:164` | a action devolve sempre `FIXO` | ✅ morto (só no e2e, `e2e/trocar-categoria.spec.ts:220`) |
| T1 | `src/components/avisos.tsx:67` | o toast não some | ✅ morto (unit) |
| T2 | `avisos.tsx:83` | sem `role="status"` | ✅ morto (unit) |
| T3 | `avisos.tsx:68` | o prazo do aviso anterior não é cancelado | ✅ morto (unit) |
| T4 | `avisos.tsx:41` | 5 segundos | ✅ morto (unit) |
| S1 | `src/components/seletor-de-categoria.tsx:66` | `useState` no lugar de `useOptimistic`: não volta no erro | ✅ morto (unit) |
| S2 | `seletor-de-categoria.tsx:80` | toast também no erro | ✅ morto (unit) |
| S3 | `seletor-de-categoria.tsx:34-35` | textos de `FIXO` e `COMPRA` trocados | ✅ morto (unit) |
| S4 | `seletor-de-categoria.tsx:95` | não desabilita enquanto grava | ✅ morto (unit) |
| S5 | `seletor-de-categoria.tsx:77` | "Sem categoria" manda `""` | ✅ morto (unit) |
| S6 | `seletor-de-categoria.tsx:105` | sem a opção a mais | ✅ morto (unit) |
| S7 | `seletor-de-categoria.tsx:106` | ignora `nomeDaGravada` | ✅ morto (unit) |
| S8 | `seletor-de-categoria.tsx:90` | nome acessível "Categoria <descrição>" | ✅ morto (unit) |
| S9 | `seletor-de-categoria.tsx:80` | recusa sem mensagem na linha | ✅ morto (unit) |
| **S10** | `seletor-de-categoria.tsx:100` | opções em ordem alfabética, e não na recebida | ❌ **vivo** (unit) |
| S11 | `seletor-de-categoria.tsx:74` | sem estado otimista | ➖ vivo, fora da spec (ver Notas) |
| TB1 | `src/components/tabela-lancamentos.tsx:269` | seletor também na receita | ✅ morto (unit) |
| TB1e | `tabela-lancamentos.tsx:269` | o mesmo, só contra o e2e (L-001) | ✅ morto (`e2e/trocar-categoria.spec.ts:318`) |
| TB2 | `tabela-lancamentos.tsx:270` | receita diz "Sem categoria" | ✅ morto (unit) |
| TB3 | `tabela-lancamentos.tsx:269` | investimento sem seletor | ✅ morto (unit) |
| TB4 | `tabela-lancamentos.tsx:277` | a tabela não passa o nome da gravada | ✅ morto (unit) |
| TB5 | `tabela-lancamentos.tsx:270` | receita com categoria mostra a categoria | ✅ morto (unit) |
| **TB6** | `tabela-lancamentos.tsx:268-270` | "Receita" na célula da descrição, Categoria vazia | ❌ **vivo** (unit e e2e) |
| TB7 | `tabela-lancamentos.tsx:275` | seletor sempre na primeira ativa (sonda do EDF-02) | ✅ morto pelo `trocar-categoria`; vivo só no `editar-fixo` (ver Notas) |
| P1 | `src/app/(app)/[competencia]/lancamentos/page.tsx:233` | a página não passa as categorias | ✅ morto (e2e) |
| **P2** | `page.tsx:151` | nomes só das ativas | ❌ **vivo** (unit e e2e) |
| **P3** | `page.tsx:154` | arquivadas como opção | ❌ **vivo** (unit e e2e) |

**Profundidade**: expandida (55 mutantes, todas as camadas; a fatia grava em linhas de fixo e de
compra de todos os meses).
**Resultado**: 50 mortos, 1 vivo fora da spec (S11), **4 vivos que quebram critério** (S10, TB6,
P2, P3) — FAIL ❌.

**A regra "gasto tem seletor, entrada não" (L-001)** é exercida no e2e: TB1e, com a regra apagada
na tabela e só o e2e rodando, morre em `e2e/trocar-categoria.spec.ts:318`.

### Sondas que provam as correções

Rodadas na worktree descartável, com o teste proposto em cada fix. Cada uma passa no `b582e19` e
falha com o mutante:

| Sonda | `b582e19` | Mutante | Resultado com o mutante |
| --- | --- | --- | --- |
| Fix 1: e2e com categoria arquivada | 1 passed | P2 | `Expected: "Categoria Dois"`, `Received: "Categoria removida"` |
| Fix 1 | 1 passed | P3 | a lista de opções de "Padaria" ganha "Categoria Dois" |
| Fix 2: "Receita" na célula da coluna Categoria | 46 passed | TB6 | 1 failed |
| Fix 3: fixture fora de ordem alfabética | 46 passed | S10 | 4 failed |

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Mínimo de código | ✅ Uma regra pura de 10 linhas, um caso de uso, dois métodos de repositório, dois componentes |
| Mudanças cirúrgicas | ✅ O `layout.tsx` muda de indentação inteira para envolver o provedor; nenhuma outra mudança nele |
| Sem escopo extra | ✅ |
| Segue os padrões | ✅ Action igual às vizinhas (sessão, Zod estrito, `ERRO_INESPERADO`); seletor no padrão do `BotaoPago` |
| Asserções sobre o resultado da spec | ❌ TB6, S10, P2, P3 (ver acima) |
| Cobertura por camada | ❌ Domínio 1:1 e 100% de branches (351/351); a composição da página não tem teste, embora a traceability de T8 a cite |
| Todo teste mapeia para AC, edge case ou Done when | ✅ |
| Guidelines do projeto (`AGENTS.md`) | ✅ Domínio puro e sem `Date`; centavos; `requireSession()` primeiro; mensagens em `src/lib/erros.ts`; nenhum dado real novo (os nomes e valores dos e2e já existiam na base) |

### Desvios declarados, conferidos

| Desvio | Conferência |
| --- | --- |
| Mensagem de `CATEGORIA_EM_RECEITA` em T1, com `SPEC_DEVIATION` (`src/lib/erros.ts:74`) | Correto: o `Record` exaustivo de mensagens não compila sem ela. A mensagem é a da spec (`lancamentos.integration.test.ts:626`) |
| Rollback do caso de uso com `TransacaoQueDesfaz` | Correto. Prova que as escritas estão dentro da transação e que a exceção sobe (H6 morto); o rollback real está no Postgres (`lancamentos.integration.test.ts:694`) |
| O fake de compra não guarda a categoria da compra | Correto. A da compra está provada no Drizzle (`compra.repository.integration.test.ts:450-453`; R5 morto) |
| `role="status"` só enquanto há aviso | Cumpre o TRC-04 AC 4 (`avisos.test.tsx:60-64`); o contêiner `aria-live` fica montado |
| `useOptimistic` no seletor | Sem critério que o exija (S11 vivo, fora da spec); a volta no erro está provada (S1 morto) |
| A página carrega `listarTodasAsCategorias()` | Correto no código, sem teste: P2 vivo (Fix 1) |
| T6 com `fireEvent` e relógio falso | As asserções são exatas ao milissegundo (T4 morto) |
| EDF-02 (`e2e/editar-fixo.spec.ts:137-141`) lendo `option:checked` | **Não ficou mais fraco.** A linha agora traz todas as categorias como opção, então o `toContainText`/`not.toContainText` antigo seria sempre verde/sempre vermelho; a opção escolhida é o equivalente exato. O ponto cego que TB7 revela (o destino da edição é a primeira ativa em ordem alfabética) já existia na base com a pílula, e o e2e da troca o cobre agora |

---

## Edge Cases

- [x] Última parcela alcança as anteriores: `handler.test.ts:245-250` troca a parcela 4 e afirma as
  quatro sem categoria.
- [x] Fixo encerrado alcança as ocorrências que tem: o fixo das fixtures tem fim (`2026-12`) e as
  três ocorrências trocam (`handler.test.ts:158-160`, `lancamentos.integration.test.ts:643-648`). A
  troca não lê fim nem `encerradaEm`, e `atualizarOcorrenciasDaSerie` grava pelo `recorrencia_id`;
  encerrar só remove as não pagas dali em diante. Nenhum teste encerra pelo caso de uso `encerrar`.
- [x] Lista filtrada pela categoria antiga: `e2e/trocar-categoria.spec.ts:279-281`.

---

## Gate Check

- **Comando**: `DATABASE_URL_TEST=postgres://mybilling:mybilling@localhost:5433/mybilling_test_trc pnpm verify`
  e o mesmo `DATABASE_URL_TEST` com `pnpm test:e2e`
- **Resultado**: verde. `tsc --noEmit` sem erro; Biome em 275 arquivos sem achado; unit **1333
  passed** (92 arquivos), domínio com 100% de branches (351/351); integração **326 passed** (22
  arquivos); `next build` sem erro; e2e **67 passed**.
- **Antes da fatia (`f7bfc1a`)**: unit 1268, integração 307, e2e 62.
- **Delta**: +65 unit, +19 integração, +5 e2e. Nenhum teste removido.
- **Pulados**: nenhum. Nenhum `.skip`, `.only`, `.todo` ou `fixme` em `src` e `e2e`.
- **Testes que já existiam e mudaram** (`git diff f7bfc1a..HEAD`): `tabela-lancamentos.test.tsx`
  troca três `getByText` de categoria de gasto pela opção selecionada do seletor (mais estrito: o
  texto agora está entre as opções, e só a selecionada prova), e todo render ganha as props novas;
  `editar-fixo.spec.ts`, conferido acima; `lancamentos.integration.test.ts` só reescreve os imports.
  Nenhuma assertion apagada nem enfraquecida.

---

## Fix Plans

### Fix 1 (Major): e2e da página com uma categoria arquivada — mata P2 e P3

- **Causa**: o teste da tabela recebe o mapa de nomes e as opções já montados. Nada atravessa a
  página, que escolhe `listarTodasAsCategorias()` para os nomes e `listarCategoriasDisponiveis()`
  para as opções (`page.tsx:151`, `:154`). Nenhum e2e arquiva categoria.
- **Fix task**: em `e2e/trocar-categoria.spec.ts`, um percurso que cadastra "Farmácia" em Categoria
  Dois e "Padaria" em Categoria Um, arquiva Categoria Dois no banco e abre a lista. A sonda
  verificada:

  ```ts
  await pool.query("UPDATE categoria SET arquivada_em = now() WHERE nome = $1", ["Categoria Dois"]);
  await page.goto("/2026-03/lancamentos");
  await expect(categoriaEscolhida(page, "Farmácia")).toHaveText("Categoria Dois");
  await expect(seletor(page, "Padaria").locator("option")).toHaveText(["Sem categoria", "Categoria Um"]);
  ```
- **Done when**: passa no código atual; falha com `page.tsx:151` lendo `categorias` (P2) e com
  `page.tsx:154` lendo `todasAsCategorias` (P3). TRC-02 ACs 1 e 3.

### Fix 2 (Minor): "Receita" na célula da coluna Categoria — mata TB6

- **Causa**: `tabela-lancamentos.test.tsx:524` e `e2e/trocar-categoria.spec.ts:315` procuram
  "Receita" na linha inteira.
- **Fix task**: em `tabela-lancamentos.test.tsx`, achar o índice do `columnheader` "Categoria" na
  região Entradas e afirmar `celulas[indice].textContent === "Receita"` na linha da entrada.
- **Done when**: passa no código atual; falha com a pílula movida para a célula da descrição.
  TRC-01 AC 1.

### Fix 3 (Minor): fixture do seletor de fato fora de ordem alfabética — mata S10

- **Causa**: `seletor-de-categoria.test.tsx:24-27` tem `[Categoria Dois, Categoria Um]`, que já é a
  ordem alfabética, apesar do comentário.
- **Fix task**: inverter para `[Categoria Um, Categoria Dois]` e ajustar as três listas esperadas
  (`:98`, `:120-125`, `:133-138`, `:145`).
- **Done when**: passa no código atual; falha com as opções ordenadas por nome no seletor. TRC-02
  AC 1, Done when de T7.

Os três fixes são só teste. Cada um é uma task e um commit; nenhum muda código de produto.

---

## Notas (sem fix task)

1. **S11 — estado otimista sem critério.** Tirar o `definirEscolhida(valor)` deixa o seletor
   mostrar a categoria antiga, desabilitado, até a lista revalidada chegar. Nenhum AC define o que
   o seletor mostra durante a gravação, então o mutante é equivalente à spec. Se o comportamento
   importa, ele precisa virar critério antes de virar teste.
2. **A troca no fixo regrava descrição, meio, pessoa e data de todas as ocorrências** com os
   valores do fixo, porque reusa `atualizarOcorrenciasDaSerie` (`handler.ts:116-124`). Hoje isso
   não muda nada: só a materialização e a edição de fixo escrevem ocorrência, e as duas usam os
   campos do fixo (a importação cria fixo com dia 1 e materializa). Se `editar-lancamentos` passar
   a editar uma ocorrência sozinha, a troca de categoria do fixo vai apagar essa edição e quebrar o
   "sem mudar data" do TRC-03 AC 1. Vale registrar no `context.md` de `editar-lancamentos`.
3. **Exceção de rede no seletor.** Se a chamada da action lançar (rede, servidor fora), a exceção
   sobe pela transição até o `error.tsx`, em vez de voltar o seletor com mensagem. É o mesmo padrão
   do `BotaoPago` e fica fora do TRC-05 AC 1, que fala da recusa devolvida pela action.

---

## Requirement Traceability Update

Proposta para o `spec.md` (não editado pelo verificador):

| Requisito | Status anterior | Novo status |
| --- | --- | --- |
| TRC-01 | Implemented | ❌ Needs Fix — AC 1: a coluna não é provada (TB6, Fix 2) |
| TRC-02 | Implemented | ❌ Needs Fix — AC 1: "ativas" na página (P3) e a ordem recebida (S10); AC 3: o nome vindo da página (P2) (Fixes 1 e 3) |
| TRC-03 | Implemented | ✅ Verified |
| TRC-04 | Implemented | ✅ Verified |
| TRC-05 | Implemented | ✅ Verified |

A linha de TRC-02 na traceability atribui a T8 "a página passando o nome de todas as categorias";
essa parte só fica verdadeira com o Fix 1.

---

## Summary

**Overall**: ❌ Not Ready — quatro mutantes vivos; nenhum defeito de comportamento.

**Spec-anchored check**: 22/25 critérios provados por inteiro; 3 critérios com uma parte sem prova;
0 lacunas de precisão na spec.
**Sensor**: 55 mutantes, 50 mortos, 1 vivo fora da spec, 4 vivos que quebram critério.
**Gate**: unit 1333, integração 326, e2e 67, typecheck, lint e build verdes.

**O que funciona**: o alcance da troca nas três formas, com valor, data e pagamento intactos e
tudo numa transação, provado no domínio, nos fakes, no Postgres e no navegador; as recusas e a
sessão; os três textos do toast e o prazo de 4 segundos; a volta do seletor na recusa; "Receita"
nas entradas e o seletor nos gastos, investimento inclusive.

**Próximo passo**: Fixes 1 a 3 (só teste, com as sondas acima), depois reverificação. Rodada 1 de 3.

---

## Lições destiladas

| Sinal | Lição | Efeito |
| --- | --- | --- |
| P2, P3 (mutantes vivos) | L-014: garantia provada em cada elo separado precisa de um teste que atravesse a composição | Segunda feature: promovida a confirmada |
| TB6 (mutante vivo) | L-018: AC que situa um elemento precisa de consulta restrita àquela região | Segunda feature: promovida a confirmada |
| S10 (mutante vivo) | L-026: fixture que prova "a ordem recebida" precisa estar fora da ordem que uma regra óbvia daria | Nova, candidata |
| `SPEC_DEVIATION` em `src/lib/erros.ts:74` | L-027: código novo na union de erros do domínio leva a mensagem em `erros.ts` na mesma task | Nova, candidata |

L-001 (confirmada) foi carregada pela fatia e aplicada à regra da tabela, que o e2e exerce (TB1e
morto). As escolhas da página são composição, e não `.filter()`: ficaram em L-014, sem penalizar a
L-001.
