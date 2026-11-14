# Quiz do Clay — como ligar o backend

O **Quiz do Clay** (`/quiz-do-clay`) já funciona sozinho: cadastro, 10 perguntas
com tempo conferido no servidor, pontuação, anti-cola e imagem de story. O que
depende de um backend (como o "Nome na Lista") é:

- **1 partida por WhatsApp por dia** (limite diário);
- **ranking mensal** (Top 10 na página);
- **código de entrada grátis do 10/10 sem repetir** dentro de 30 dias.

Sem o backend, o jogo roda em "modo degradado": joga normalmente, o 10/10
**ainda recebe um código**, mas **sem** limite diário, **sem** ranking e **sem**
checar o limite de 30 dias. Para ativar tudo:

## 1. Publicar o Apps Script

1. Crie uma **Planilha Google nova** (separada da planilha do Nome na Lista).
2. `Extensões > Apps Script`, cole o conteúdo de
   [`scripts/apps-script-quiz.gs`](../scripts/apps-script-quiz.gs) e troque
   `TOKEN` por um segredo forte.
3. `Implantar > Nova implantação > App da Web`. Executar como: **eu**. Quem tem
   acesso: **qualquer pessoa**.
4. Copie a URL `/exec`. Abrindo no navegador deve aparecer `online`.
5. (Opcional) rode `instalarLimpezaQuiz()` uma vez para apagar meses antigos.
   Rode `testeFluxo()` e depois `apagarTeste()` para conferir.

## 2. Variáveis de ambiente no Netlify

| Variável             | Valor                                                        |
| -------------------- | ------------------------------------------------------------ |
| `QUIZ_WEBHOOK_URL`   | a URL `/exec` do App da Web                                   |
| `QUIZ_WEBHOOK_TOKEN` | exatamente o mesmo valor de `TOKEN` no `.gs`                 |
| `QUIZ_SECRET`        | um segredo forte e aleatório (cifra os tokens do jogo)       |

`QUIZ_SECRET` é só do site (não vai para a planilha). Sem ele em produção, o
site usa um segredo de desenvolvimento inseguro e registra um aviso no log.

## Mascotes

As 6 poses do Claytinho (`public/claytinho_v3_*.webp`) tiveram o fundo removido e
viraram WebP transparentes (~120 KB cada). Os PNGs originais estão em
`backup-mascotes/` (fora de `public/` e fora do Git). Não havia poses
`claytinho_v3_*` além das 6 usadas.

## Observação sobre o anti-cola

As defesas fortes: tempo conferido no **servidor** (mexer no relógio do celular
não ajuda), respostas certas **nunca** saem do servidor, perguntas desenhadas em
**canvas** (não dá pra copiar/pesquisar), e **sair da tela = perder a pergunta**.
Como o site é serverless (sem banco), o estado da partida viaja em tokens
cifrados. Um jogador muito técnico ainda poderia, em tese, repetir uma pergunta;
o dano é limitado pelo **limite de 1 partida/dia**, pelo **teto de 1 entrada
grátis a cada 30 dias por WhatsApp** e pela **conferência do código na portaria**.
