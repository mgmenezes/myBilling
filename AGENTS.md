# myBilling — Guidelines do projeto

App de gestão financeira doméstica para duas pessoas. Substitui uma planilha do Google Sheets.
Especificação viva em `.specs/`. Decisões de projeto em `.specs/STATE.md` (AD-001 a AD-011).

## Regras invioláveis

### 1. Nenhum dado financeiro real no repositório (AD-009)
Nenhum valor, nome ou descrição real da família pode aparecer em seed, fixture, teste, snapshot,
screenshot, comentário ou mensagem de commit. Seeds usam PRNG com semente fixa e nomes genéricos
("Pessoa A", "Cartão Roxo"). Fixtures de teste são escolhidas por valor matemático, não por realismo.
Dado financeiro em git é irreversível: reescrever histórico não desfaz clones.

### 2. Dinheiro é inteiro em centavos (AD-001)
Toda coluna e todo campo monetário termina em `_centavos` e é inteiro. Nenhum `float`, nenhum
`DECIMAL`, nenhum `toFixed` sobre valor monetário fora de `src/lib/formatar.ts`.
Um campo `valor` sem sufixo que compile é sinal de bug.

### 3. Competência é `'YYYY-MM'`, nunca `Date` (AD-002)
Aritmética de mês em inteiros (`ano * 12 + mes`). Proibido `Date`, `setMonth` e fuso implícito dentro
de `src/domain`. A conversão de data para competência é uma função única, com fuso como parâmetro
obrigatório.

### 4. `src/domain` é puro (AD-006)
Proibido importar `next`, `react`, `drizzle-orm`, `zod`, `@/infrastructure`, `@/app` e módulos do
Node. Não lança exceção: retorna `Result<T, DomainError>`. Não é `async`. Não conhece `Date.now()`.
A proibição é enforçada por `src/domain/shared/arquitetura.test.ts` e pelo Biome — não é convenção.

### 5. Só `movimento` é somável (AD-003)
`compra_parcelada`, `recorrencia` e `recorrencia_versao` são planos de geração: nenhuma coluna delas
entra em `SUM`. `pagamento_fatura` não tem `natureza` nem `categoria_id`, para que nenhuma consulta
de gasto consiga lê-la. Competência e caixa são eixos separados e nunca são somados nem subtraídos
entre si na interface.

## Convenções de código

- TypeScript `strict` com `noUncheckedIndexedAccess`. Sem `any`.
- Nomes de domínio em português (`competencia`, `parcela`, `movimento`); termos de framework em inglês.
- Um caso de uso por diretório: `src/application/<área>/<caso-de-uso>/handler.ts`.
- Toda Server Action chama `requireSession()` na primeira instrução e revalida o payload com Zod.
- Erros do domínio são códigos de uma union fechada. Mensagens em pt-BR vivem em `src/lib/erros.ts`.

## Testes

- Testes co-locados: `*.test.ts` ao lado do módulo; `*.integration.test.ts` para os que usam banco.
- Cobertura de **100% de branches** em `src/domain`. Demais camadas: todo ramo e todo caminho de erro.
- Testes derivam dos acceptance criteria do `spec.md`, nunca da implementação.
- Testes de integração usam Postgres real em Docker (`pnpm db:up`). SQLite em memória é proibido (AD-010).
- Proibido enfraquecer assertion, deletar teste ou usar `skip` para fazer a suíte passar.

## Comandos

| Comando | O que faz |
| --- | --- |
| `pnpm test:unit` | Testes puros de domínio e aplicação (gate `quick`) |
| `pnpm test:integration` | Testes com Postgres em Docker (gate `full`) |
| `pnpm test:e2e` | Playwright |
| `pnpm verify` | `typecheck && lint && test:unit && test:integration && build` (gate `build`) |
| `pnpm db:up` / `pnpm db:reset` | Sobe e recria o Postgres local |

## Commits

Conventional Commits, uma task por commit. Validar antes de commitar:

```
python3 .claude/skills/tlc-spec-driven/scripts/check_commit.py --message "<msg>"
```

Marcar a task concluída em `tasks.md` e atualizar a traceability em `spec.md` **dentro do mesmo commit**.

## Escopo

`git push`, deploy, criação de recurso em nuvem e qualquer operação remota exigem autorização
explícita e separada. A aprovação das tasks autoriza apenas implementação e commits locais.
