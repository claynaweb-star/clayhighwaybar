# Quiz do Clay — como ligar o backend

O **Quiz do Clay** (`/quiz-do-clay`) é uma **página escondida** (fora do menu, do
`sitemap.xml` e com `noindex`). Ele usa a **mesma planilha e o mesmo Apps Script
do Nome na Lista** — não há planilha separada. O que depende do backend:

- **1 partida por WhatsApp por dia** (limite diário);
- **ranking mensal** (Top 10 na página);
- **prêmio de entrada grátis** do 10/10, que vale **só em datas com Nome na Lista
  aberto**: o vencedor escolhe a noite e entra **automaticamente na mesma lista**
  que a portaria usa, com um selo 🏆.

Sem o backend, o jogo roda em "modo degradado": joga normalmente e o 10/10 até
vê um código, mas **sem** limite diário, **sem** ranking e **sem** conseguir
resgatar o prêmio numa data (precisa da planilha).

## 1. Atualizar o Apps Script do Nome na Lista

> Já existe um Apps Script publicado para o Nome na Lista. Vamos **colar a versão
> nova por cima** — ela continua fazendo tudo do Nome na Lista e passa a atender
> o Quiz também.

1. Abra a **mesma Planilha** do Nome na Lista e vá em `Extensões > Apps Script`.
2. Selecione **todo** o código atual e apague.
3. Cole o conteúdo novo de
   [`scripts/apps-script-lista.gs`](../scripts/apps-script-lista.gs).
4. **Troque o `TOKEN`** pelo mesmo segredo de antes (o mesmo valor de
   `LISTA_WEBHOOK_TOKEN` no Netlify). Se trocar por outro, o site para de falar
   com a planilha.
5. `Implantar > Gerenciar implantações > (editar) > Nova versão > Implantar`.
   Assim a **URL `/exec` continua a mesma** — nada muda no Netlify.
6. (Opcional) rode `testeQuizFluxo()` e depois `apagarTesteQuiz()` para conferir
   o fluxo do Quiz. `testePing()` deve mostrar `pong`.

A aba **"Quiz"** é criada sozinha na primeira partida. Nas abas de lista diária
("Lista AAAA-MM-DD") surgem duas colunas novas, **Prêmio Quiz** e **Código Quiz**,
preenchidas só para vencedores (linha pintada de amarelo e em negrito).

## 2. Variáveis de ambiente no Netlify

O Quiz reaproveita o webhook do Nome na Lista. As duas primeiras **já existem**:

| Variável             | Valor                                                        |
| -------------------- | ------------------------------------------------------------ |
| `LISTA_WEBHOOK_URL`   | a URL `/exec` do App da Web (a mesma de sempre)             |
| `LISTA_WEBHOOK_TOKEN` | exatamente o mesmo valor de `TOKEN` no `.gs`               |
| `QUIZ_SECRET`         | um segredo forte e aleatório (cifra os tokens do jogo)     |

`QUIZ_SECRET` é só do site (não vai para a planilha) e protege o estado da
partida. Sem ele em produção, o site usa um segredo de desenvolvimento inseguro e
registra um aviso no log. **Não existem mais** `QUIZ_WEBHOOK_URL` nem
`QUIZ_WEBHOOK_TOKEN` — pode apagar se tiver criado.

## 3. Como o prêmio chega na portaria

1. A pessoa gabarita (10/10) e escolhe uma **noite com Nome na Lista** na tela de
   vitória (ou guarda um link para escolher depois, se não houver data aberta).
2. O Apps Script inclui o nome dela na **lista daquela data** com o selo
   `🏆 VENCEDOR DO QUIZ: ENTRADA GRÁTIS (código QUIZ-XXXX)` e pinta a linha de
   amarelo.
3. Na portaria (`/portaria`), o vencedor aparece com selo dourado **🏆 VENCEDOR DO
   QUIZ**, o prêmio **ENTRADA GRÁTIS** e o botão **Liberar GRÁTIS (Quiz)** no
   lugar do valor. Ao liberar, o código é marcado como **usado**.

## Mascotes

As 6 poses do Claytinho (`public/claytinho_v3_*.webp`) tiveram o fundo removido e
viraram WebP transparentes. Os PNGs originais estão em `backup-mascotes/` (fora de
`public/` e fora do Git).

## Observação sobre o anti-cola

Tempo conferido no **servidor** (mexer no relógio do celular não ajuda), respostas
certas **nunca** saem do servidor, perguntas desenhadas em **canvas** (não dá pra
copiar/pesquisar) e **sair da tela = perder a pergunta**. Como o site é serverless
(sem banco), o estado da partida viaja em tokens cifrados. O dano de um jogador
muito técnico é limitado pelo **limite de 1 partida/dia**, pelo **teto de 1 entrada
grátis a cada 30 dias por WhatsApp** e pela **conferência do código na portaria**.

## Arquivo de revisão das perguntas

`docs/quiz-revisao-perguntas.csv` (coluna `nivel` incluída) é gerado a partir do
banco e **fica fora do Git** (está no `.gitignore`). Para regerá-lo, rode o script
de geração sobre `lib/quiz-perguntas.ts`.
