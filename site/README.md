# Landing do Jano

Página estática, HTML e CSS, na identidade de `docs/design.md`, com um único pacote de JavaScript
gerado da conta do app (`simulador.js`, abaixo). Não faz parte do app Next.js:
não entra no proxy de login nem no gate de cobertura de `src/`. O texto segue
`docs/marketing/posicionamento.md`. Specs em `.specs/features/campanha-lista-de-espera/`, `landing-dor/` e
`landing-jano/`. O nome é Jano, no app e na landing (AD-026, AD-027); banco, contêiner e pacote continuam
`mybilling`.

## Abrir local

Qualquer servidor estático serve. Por exemplo, a partir da raiz do repositório:

```bash
python3 -m http.server 8765 --bind 127.0.0.1 --directory site
# http://127.0.0.1:8765/
```

Abrir o `index.html` direto do disco também funciona: o simulador é um script clássico, não módulo,
justamente para rodar em `file://`.

## Reconstruir o simulador

O card "Dá pra comprar?" roda `site/simulador.js`, gerado a partir de `site/fonte/simulador.ts`, que
importa a conta e as frases do app (`src/domain`, `src/components/texto-do-veredito.ts`). A casa é
inventada, em `site/fonte/casa-inventada.ts`. Depois de mudar qualquer um desses, ou o domínio do
simulador, rode:

```bash
pnpm site:construir
```

O pacote vai versionado porque a Vercel publica `site/` sem build. `site/simulador.test.mjs`
reconstrói em memória e reprova se o arquivo ficou para trás.

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
export DATABASE_URL=postgres://mybilling:mybilling@localhost:5433/mybilling_test_jano
pnpm db:migrate && pnpm db:seed
DATABASE_URL_CAPTURA=$DATABASE_URL pnpm site:capturar
```

Um banco próprio (`mybilling_test_jano`, criado uma vez com `CREATE DATABASE`) evita disputar o
`mybilling_test` com os testes de integração. O script fotografa só a área de conteúdo, sem o menu
lateral, que mostra o nome interno do app. O seed se ancora no mês corrente, então as capturas mudam
quando o mês vira. Conferir cada imagem a
olho antes de commitar: só "Pessoa A", "Cartão Azul", "Categoria Um" e afins podem aparecer.

## Verificar

```bash
pnpm site:verificar
```

Roda o teste do pacote (`site/simulador.test.mjs`: frescor, a resposta do app para a casa inventada,
erros de entrada) e o teste estrutural (`site/estrutura.test.mjs`: seções na ordem e toda `<section>`
na lista, o herói do Jano, nenhum "myBilling", dois scripts, o do tema e o do simulador, azul só em botão e link, inversão uma vez, constante do formulário, nenhum `R$` fora das
fixtures, promessas proibidas, de um a cinco números numa seção só com fonte e ano e nenhuma
porcentagem fora dela, perguntas frequentes fechadas, nenhuma frase que fecha o público em casais)
e o teste de navegador (`site/verificar-navegador.mjs`: Playwright com o Chrome da máquina e
axe-core, em 360, 768 e 1440 px, claro e escuro, sem rolagem horizontal, sem violação WCAG 2.1 AA, e
a cena em destaque ocupando a grade a partir de 768 px, e o simulador respondendo 10x e 12x sem
chamada de rede).

## Contraste

Todos os pares de cor usados estão na tabela de `docs/design.md`. A única regra própria desta
página é que `--ink-soft` **não** é usado em texto que carrega informação (legenda de imagem, fonte
de número, grupo da tabela): ele mede 3,88:1 sobre branco e o axe reprovou na primeira rodada. Esses
textos usam `--ink-muted`.

## Deploy

É um projeto separado na Vercel, **`janofinancas-landing`** (criado como `mybilling-landing` em
2026-11-01 pela CLI e renomeado pelo dono em 2026-11-02), sem build
(framework "Other", a própria pasta é a saída). Ele não está ligado ao GitHub: a publicação sobe a
pasta `site/` direto do disco, o que não depende de `git push`. A pasta está vinculada ao projeto
por `site/.vercel/`, que fica fora do git.

A URL pública de produção é https://mybilling-landing.vercel.app, que continuou valendo depois da
troca de nome. O vínculo local usa o ID do projeto, então a troca não muda o comando.

Publicar em produção, a partir da raiz do repositório:

```bash
cd site && npx vercel deploy --prod
```

Sem `--prod`, a CLI cria uma pré-visualização, que a Vercel protege com login por padrão; só a URL
de produção é pública. Depois de colar a URL do formulário e commitar, publicar de novo: é o que
põe os botões ativos no ar. Ligar o projeto ao repositório, para publicar a cada push, fica a
critério do dono (Settings → Git, com *Root Directory* `site/`).
