# Referências de design

O arquivo `DESIGN.md`, na raiz do repositório, foi instalado pelo `getdesign` como **referência de
linguagem visual**: é uma análise das superfícies públicas da Coinbase, não um pacote de tokens nem
um ativo de marca.

O que foi extraído dele, adaptado ao myBilling e **validado por medição de contraste**, vive em
[`docs/design.md`](../design.md). Esse é o documento normativo do projeto — é ele que manda quando os
dois divergirem, e eles divergem em três cores, cada uma com a razão medida registrada lá.

**O que nunca entra no app:** o logotipo e o nome da Coinbase, os tipos licenciados
(CoinbaseDisplay, CoinbaseSans, CoinbaseMono — usamos os substitutos abertos que o próprio documento
indica) e qualquer elemento que faça o myBilling parecer produto deles. A referência orienta a
linguagem; a identidade é do myBilling.

> **Decisão pendente, com o fato já consumado:** a referência anterior (`DESIGN-mastercard.md`) foi
> mantida **fora** do repositório de propósito, por descrever a identidade de uma marca de
> terceiros. O `DESIGN.md`, ao contrário do que esta nota dizia, **está versionado desde `9518dba`**
> — o mesmo commit que a escreveu dizendo "não rastreado" — e já está em `origin`. Tirá-lo agora o
> remove das versões futuras, não do histórico nem de clones. Mantê-lo torna a derivação auditável.
> Continua sendo escolha do dono do repositório.
