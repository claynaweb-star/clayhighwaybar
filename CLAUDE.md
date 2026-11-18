# CLAUDE.md — Regras do projeto clayhighway-site

## Fluxo de entrega (regra permanente)

Em **qualquer tarefa**:

1. Rode o build.
2. **Se o build passar sem erro**, faça `git add`, `git commit` e `git push` **direto, sem pedir aprovação**.
3. No fim, diga **o que mudou** e o **link** para o usuário conferir no ar.

**Só pare antes do push** se:

- o **build der erro**; ou
- **faltar algum arquivo** necessário (ex.: um arquivo de referência que a tarefa manda seguir e que não está no repositório); ou
- a mudança **exigir atualizar o Apps Script antes** (mudança no backend da planilha/`scripts/apps-script-lista.gs` que precisa ser publicada e testada pelo usuário antes de ir pro ar).

Nesses casos, pare e avise o usuário em vez de dar push.

## Modo teste do Quiz do Clay

Credenciais do modo teste (conferidas só no servidor): **nome `clayx`** (maiúsculas/minúsculas tanto faz) + **celular `1938`** (comparado só pelos dígitos). Não alterar sem pedido explícito.

## Não alterar sem pedido explícito

Regras do quiz, prêmios, planilha/Apps Script, portaria e o modo teste.
