# Landing da lista de espera

Página estática, HTML e CSS puros, na identidade de `docs/design.md`. Não faz parte do app Next.js:
não entra no proxy de login nem no gate de cobertura de `src/`. O texto segue
`docs/marketing/posicionamento.md`. Spec e tasks em `.specs/features/campanha-lista-de-espera/`.

## Abrir local

Qualquer servidor estático serve. Por exemplo, a partir da raiz do repositório:

```bash
python3 -m http.server 8765 --bind 127.0.0.1 --directory site
# http://127.0.0.1:8765/
```

Abrir o `index.html` direto do disco também funciona: a página não tem build nem dependência.

## Colar a URL do formulário

A URL do Google Forms vive numa constante única, a `<meta name="lista-de-espera">` do `<head>`. Não
edite à mão. Rode, a partir da raiz:

```bash
node site/formulario.mjs https://docs.google.com/forms/d/e/SEU-ID/viewform
```

O script reescreve a meta e todos os botões `.botao-lista` de uma vez: com uma URL `https://` eles
viram links em nova aba; com o placeholder eles ficam desabilitados e dizem "em breve". `http://`
sem TLS é recusado. Sem argumento, o script imprime a URL atual.

Sugestão para o formulário: e-mail e uma pergunta, "Como você controla as contas da casa hoje?"
(planilha, caderno, nada, outro app). A resposta diz para qual estado da persona escrever depois.

## Regenerar as capturas

As imagens de `site/imagens/` vêm do app rodando contra o banco de teste descartável, semeado por
`pnpm db:seed`. Nenhum dado real entra (AD-009). Com o Docker de pé e nenhum `next dev` rodando:

```bash
export DATABASE_URL=postgres://mybilling:mybilling@localhost:5433/mybilling_test
pnpm db:migrate && pnpm db:seed
pnpm site:capturar
```

O seed se ancora no mês corrente, então as capturas mudam quando o mês vira. Conferir cada imagem a
olho antes de commitar: só "Pessoa A", "Cartão Azul", "Categoria Um" e afins podem aparecer.

## Verificar

```bash
pnpm site:verificar
```

Roda o teste estrutural (`site/estrutura.test.mjs`: seções na ordem, um script só, azul só em botão
e link, inversão uma vez, constante do formulário, nenhum `R$` fora das fixtures, promessas
proibidas, fonte e ano em cada número) e o teste de navegador (`site/verificar-navegador.mjs`:
Playwright com o Chrome da máquina e axe-core, em 360, 768 e 1440 px, claro e escuro, sem rolagem
horizontal e sem violação WCAG 2.1 AA).

## Contraste

Todos os pares de cor usados estão na tabela de `docs/design.md`. A única regra própria desta
página é que `--ink-soft` **não** é usado em texto que carrega informação (legenda de imagem, fonte
de número, grupo da tabela): ele mede 3,88:1 sobre branco e o axe reprovou na primeira rodada. Esses
textos usam `--ink-muted`.

## Deploy

É um projeto separado na Vercel, com *Root Directory* `site/`, sem build (framework "Other", output
na própria pasta). Criar o projeto é operação remota e é do dono, como `git push`. Depois do
primeiro deploy, colar a URL do formulário e commitar: o deploy seguinte publica os botões ativos.
