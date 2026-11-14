/**
 * Backend da promocao "Nome na Lista" (Google Apps Script sobre uma Planilha).
 *
 * Este arquivo NAO faz parte do build do site. E o codigo que roda no Google
 * Apps Script, publicado como Web App, atendendo o webhook usado pelas rotas
 * /api/nome-na-lista (cadastro) e /api/portaria/* (lista, checkin e ping).
 *
 * MODELO: uma aba por dia, chamada "Lista AAAA-MM-DD", com uma linha por
 * telefone. Uma aba "Clientes" guarda uma linha por telefone. As listas
 * diarias sao apagadas depois de RETENCAO_DIAS dias; "Clientes" nunca e
 * apagada automaticamente.
 *
 * COMO PUBLICAR E TESTAR:
 *  1. Crie uma Planilha Google e abra Extensoes > Apps Script.
 *  2. Cole este codigo e troque o valor de TOKEN por um segredo forte.
 *  3. Implantar > Nova implantacao > Tipo "App da Web".
 *     Executar como: eu. Quem tem acesso: qualquer pessoa.
 *  4. Copie a URL /exec gerada. Abra no navegador: deve mostrar "online".
 *  5. No editor, rode instalarLimpeza() uma vez (gatilho diario de limpeza).
 *  6. Para testar: testePing(), testeCadastro(), testeCasoReal(),
 *     testeLimpeza() e, no fim, apagarDadosDeTeste(). Veja o Logger.
 *
 * No Netlify, defina as variaveis de ambiente:
 *  LISTA_WEBHOOK_URL   = a URL /exec do Web App
 *  LISTA_WEBHOOK_TOKEN = exatamente o mesmo valor de TOKEN abaixo
 *
 * Contrato com o site (e.postData.contents):
 *  Cadastro: { token, action: "signup", datas: ["AAAA-MM-DD", ...], nome, email, telefone, aceitaNovidades }
 *            (ainda aceita "data" como texto unico, para compatibilidade)
 *  Lista:    { token, action: "list",    data }
 *  Checkin:  { token, action: "checkin", id, entrou, data }  (entrou = true/false)
 *  Ping:     { token, action: "ping" }
 *
 *  QUIZ DO CLAY (mesma planilha, aba "Quiz"):
 *  Inicio:   { token, action: "quiz_start",  wa, nome, dia, telefone }
 *  Fim:      { token, action: "quiz_finish", wa, nome, dia, telefone, pontos, acertos, tempoMs, acertouTudo }
 *  Ranking:  { token, action: "quiz_ranking", mes }   (mes = "AAAA-MM")
 *  Resgate:  { token, action: "quiz_claim",  codigo, data }  (inclui o vencedor na lista da data)
 *
 * Respostas (texto simples, exceto list/quiz_ranking que sao JSON):
 *  doGet          -> "online"
 *  ping           -> "pong"
 *  signup         -> "ok" (sempre que processado; repetir nao duplica) | "invalid"
 *  checkin        -> "ok" | "notfound"
 *  list           -> JSON de [{ id, nome, telefone, entrou, hora, premioQuiz, codigoQuiz, premioUsado, premioUsadoData }]
 *                    (inclui automaticamente os vencedores do Quiz pendentes nesta data)
 *  quiz_start     -> "ok" | "duplicate" (ja jogou hoje) | "invalid"
 *  quiz_finish    -> JSON { codigo, jaGanhou, validade }   (10/10: emite o codigo; o
 *                    vencedor entra em TODAS as listas abertas, via list, enquanto nao usar)
 *  quiz_ranking   -> JSON de [{ nome, pontos, tempoMs }] (melhor por WhatsApp no mes)
 *  quiz_claim     -> "ok" | "notfound" | "expirado" | "usado" | "indisponivel" | "invalid"
 *  token invalido -> "forbidden"
 */
var TOKEN = 'TROQUE_POR_UM_SEGREDO';
var FUSO = 'America/Sao_Paulo';
var RETENCAO_DIAS = 14;
var MAX_DATAS = 7;

// As duas ultimas colunas (I, J) guardam o premio do Quiz quando a pessoa e vencedora.
var COLS_DIA = ['ID', 'Cadastro em', 'Nome', 'E-mail', 'Telefone', 'Aceita novidades', 'Entrou', 'Hora da entrada', 'Prêmio Quiz', 'Código Quiz'];
var COLS_CLIENTES = ['Telefone', 'Nome', 'E-mail', 'Aceita novidades', 'Primeiro cadastro', 'Último cadastro', 'Dias na lista'];
var COLS_QUIZ = ['Dia', 'WhatsApp', 'Nome', 'Telefone', 'Pontos', 'Acertos', 'TempoMs', 'Código', 'Validade', 'Data escolhida', 'Status', 'Criado em', 'Finalizado em', 'Resgatado em', 'Usado em', 'Usado dia'];

var QUIZ_VALIDADE_DIAS = 30;
var COR_VENCEDOR = '#D9EAD3'; // verde claro da linha do vencedor do Quiz
var ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem I, O, 0, 1

function text_(s) {
  return ContentService.createTextOutput(s);
}

/** Abrir a URL /exec no navegador mostra "online" (confirma que esta publico). */
function doGet(e) {
  return text_('online');
}

function doPost(e) {
  var d = JSON.parse(e.postData.contents);
  if (d.token !== TOKEN) return text_('forbidden');
  if (d.action === 'ping') return text_('pong');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (d.action === 'list') return text_(JSON.stringify(list_(d)));
    if (d.action === 'checkin') return text_(checkin_(d));
    if (d.action === 'quiz_start') return text_(quizStart_(d));
    if (d.action === 'quiz_finish') return text_(JSON.stringify(quizFinish_(d)));
    if (d.action === 'quiz_ranking') return text_(JSON.stringify(quizRanking_(d)));
    if (d.action === 'quiz_claim') return text_(quizClaim_(d));
    return text_(signup_(d));
  } finally {
    lock.releaseLock();
  }
}

// ---- Utilidades ------------------------------------------------------------

/** So os digitos de um valor. */
function digits_(s) {
  return String(s == null ? '' : s).replace(/\D/g, '');
}

/** Protege contra injecao de formula: prefixa apostrofo se comecar com = + - @. */
function protegeFormula_(v) {
  var s = String(v == null ? '' : v);
  if (/^[=+\-@]/.test(s)) return "'" + s;
  return s;
}

/** Valida o formato AAAA-MM-DD. */
function dataValida_(data) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(data || ''));
}

function nomeAbaDia_(data) {
  return 'Lista ' + data;
}

/** Aba do dia (cria com cabecalho se `criar` e as colunas de texto). */
function sheetDoDia_(ss, data, criar) {
  var nome = nomeAbaDia_(data);
  var sh = ss.getSheetByName(nome);
  if (!sh && criar) {
    sh = ss.insertSheet(nome);
    sh.appendRow(COLS_DIA);
    sh.getRange('E:E').setNumberFormat('@'); // Telefone como texto
    sh.getRange('H:H').setNumberFormat('@'); // Hora da entrada como texto
    sh.getRange('J:J').setNumberFormat('@'); // Código Quiz como texto
  }
  return sh;
}

/** Aba "Clientes" (cria com cabecalho se nao existir). */
function sheetClientes_(ss) {
  var sh = ss.getSheetByName('Clientes');
  if (!sh) {
    sh = ss.insertSheet('Clientes');
    sh.appendRow(COLS_CLIENTES);
    sh.getRange('A:A').setNumberFormat('@'); // Telefone como texto
  }
  return sh;
}

/** O telefone (so digitos) ja esta na aba do dia? */
function telefoneExiste_(sh, tel) {
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (digits_(rows[i][4]) === tel) return true; // col E = Telefone
  }
  return false;
}

// ---- Acoes -----------------------------------------------------------------

function signup_(d) {
  var datas = [];
  if (Array.isArray(d.datas)) datas = d.datas.slice();
  else if (d.data) datas = [d.data];
  if (datas.length === 0 || datas.length > MAX_DATAS) return 'invalid';
  for (var i = 0; i < datas.length; i++) {
    if (!dataValida_(datas[i])) return 'invalid';
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tel = digits_(d.telefone);
  var adicionados = 0;

  for (var i = 0; i < datas.length; i++) {
    var sh = sheetDoDia_(ss, datas[i], true);
    if (!telefoneExiste_(sh, tel)) {
      sh.appendRow([
        Utilities.getUuid(),
        new Date(),
        protegeFormula_(d.nome),
        protegeFormula_(d.email),
        protegeFormula_(d.telefone),
        d.aceitaNovidades ? 'sim' : 'nao',
        '',
        '',
        '', // Prêmio Quiz (so o resgate preenche)
        ''  // Código Quiz
      ]);
      adicionados++;
    }
  }

  upsertCliente_(ss, d, adicionados);
  return 'ok';
}

function upsertCliente_(ss, d, adicionados) {
  var sh = sheetClientes_(ss);
  var tel = digits_(d.telefone);
  var agora = new Date();
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (digits_(rows[i][0]) === tel) {
      var linha = i + 1;
      // Nome e E-mail de uma linha ja existente NAO sao sobrescritos (mantem os
      // primeiros valores). So atualiza o resto.
      sh.getRange(linha, 4).setValue(d.aceitaNovidades ? 'sim' : 'nao'); // mais recente
      sh.getRange(linha, 6).setValue(agora); // Último cadastro
      sh.getRange(linha, 7).setValue(Number(rows[i][6] || 0) + adicionados); // Dias na lista
      return;
    }
  }
  sh.appendRow([
    protegeFormula_(d.telefone),
    protegeFormula_(d.nome),
    protegeFormula_(d.email),
    d.aceitaNovidades ? 'sim' : 'nao',
    agora,
    agora,
    adicionados
  ]);
}

function list_(d) {
  if (!dataValida_(d.data)) return [];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  // Inclui automaticamente os vencedores do Quiz ainda pendentes nesta lista
  // (cobre as listas abertas no momento do premio E as datas criadas depois).
  quizGarantirVencedores_(ss, d.data);
  var sh = sheetDoDia_(ss, d.data, false);
  if (!sh) return [];
  var estados = quizEstadoPorCodigo_(ss);
  var rows = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var codigoUp = String(r[9] || '').toUpperCase();
    var est = codigoUp ? estados[codigoUp] : null;
    var usado = !!(est && est.status === 'usado');
    out.push({
      id: String(r[0]),
      nome: String(r[2]),
      telefone: String(r[4]),
      entrou: String(r[6]) === 'sim',
      hora: String(r[7] || ''),
      premioQuiz: String(r[8] || ''),
      codigoQuiz: String(r[9] || ''),
      premioUsado: usado,
      premioUsadoData: usado && est.usadoDia ? shortBR_(est.usadoDia) : ''
    });
  }
  out.sort(function (a, b) {
    return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
  });
  return out;
}

function checkin_(d) {
  if (!dataValida_(d.data)) return 'notfound';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = sheetDoDia_(ss, d.data, false);
  if (!sh) return 'notfound';
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(d.id)) {
      var linha = i + 1;
      if (d.entrou) {
        sh.getRange(linha, 7).setValue('sim');
        sh.getRange(linha, 8).setValue(Utilities.formatDate(new Date(), FUSO, 'HH:mm'));
      } else {
        sh.getRange(linha, 7).setValue('');
        sh.getRange(linha, 8).setValue('');
      }
      // Vencedor do Quiz: ao liberar, marca o codigo como usado nesta noite (desfazer volta a pendente).
      var codigo = String(rows[i][9] || '');
      if (codigo) quizMarcarUso_(ss, codigo, d.entrou === true, d.data);
      return 'ok';
    }
  }
  return 'notfound';
}

// ---- QUIZ DO CLAY (aba "Quiz", mesma planilha) -----------------------------

/** Aba "Quiz" (cria com cabecalho e colunas de texto se nao existir). */
function sheetQuiz_(ss) {
  var sh = ss.getSheetByName('Quiz');
  if (!sh) {
    sh = ss.insertSheet('Quiz');
    sh.appendRow(COLS_QUIZ);
    sh.getRange('A:A').setNumberFormat('@'); // Dia
    sh.getRange('B:B').setNumberFormat('@'); // WhatsApp
    sh.getRange('D:D').setNumberFormat('@'); // Telefone
    sh.getRange('H:H').setNumberFormat('@'); // Código
    sh.getRange('I:I').setNumberFormat('@'); // Validade (ISO)
    sh.getRange('J:J').setNumberFormat('@'); // Data escolhida
    sh.getRange('P:P').setNumberFormat('@'); // Usado dia (ISO)
  }
  return sh;
}

/** Hoje em ISO AAAA-MM-DD, fuso de Sao Paulo. */
function todayISO_() {
  return Utilities.formatDate(new Date(), FUSO, 'yyyy-MM-dd');
}

/**
 * Normaliza um valor de celula de data para ISO AAAA-MM-DD. O Sheets as vezes
 * converte o texto "AAAA-MM-DD" para um objeto Date; aqui garantimos o texto de
 * volta, para as comparacoes (limite diario, ranking, validade) baterem sempre.
 */
function diaISO_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, FUSO, 'yyyy-MM-dd');
  return String(v == null ? '' : v);
}

/** Soma dias a uma data ISO (via UTC, sem efeito de fuso). */
function addDiasISO_(iso, n) {
  var p = String(iso).split('-');
  var dt = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
  dt.setUTCDate(dt.getUTCDate() + n);
  var y = dt.getUTCFullYear();
  var m = ('0' + (dt.getUTCMonth() + 1)).slice(-2);
  var da = ('0' + dt.getUTCDate()).slice(-2);
  return y + '-' + m + '-' + da;
}

/** ISO AAAA-MM-DD -> DD/MM/AAAA. */
function formatBR_(iso) {
  var p = String(iso).split('-');
  return p[2] + '/' + p[1] + '/' + p[0];
}

/** Numero da linha com o telefone (so digitos) na aba, ou -1. Col E = Telefone. */
function acharLinhaPorTelefone_(sh, telDigitos) {
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (digits_(rows[i][4]) === telDigitos) return i + 1;
  }
  return -1;
}

/** Gera um codigo "QUIZ-XXXX" sem ambiguidade e que ainda nao exista na aba Quiz. */
function gerarCodigoQuiz_(sh) {
  var rows = sh.getDataRange().getValues();
  var usados = {};
  for (var i = 1; i < rows.length; i++) {
    var c = String(rows[i][7] || '').toUpperCase();
    if (c) usados[c] = true;
  }
  for (var t = 0; t < 50; t++) {
    var s = '';
    for (var j = 0; j < 4; j++) {
      s += ALFABETO_CODIGO.charAt(Math.floor(Math.random() * ALFABETO_CODIGO.length));
    }
    var cod = 'QUIZ-' + s;
    if (!usados[cod]) return cod;
  }
  return 'QUIZ-' + Utilities.getUuid().slice(0, 4).toUpperCase();
}

/** Ja tem um codigo dentro da validade (teto de 1 premio a cada 30 dias)? */
function quizTemCodigoValido_(sh, wa, hojeISO) {
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (digits_(rows[i][1]) !== wa) continue;
    var codigo = String(rows[i][7] || '');
    var val = diaISO_(rows[i][8]);
    if (codigo && val && val >= hojeISO) return true;
  }
  return false;
}

/** Pinta a linha inteira do vencedor de verde e em negrito. */
function destaqueVencedor_(sh, linha) {
  var rng = sh.getRange(linha, 1, 1, COLS_DIA.length);
  rng.setBackground(COR_VENCEDOR);
  rng.setFontWeight('bold');
}

/** ISO AAAA-MM-DD -> DD/MM (curto, para a portaria). */
function shortBR_(iso) {
  var p = String(iso).split('-');
  if (p.length < 3) return '';
  return p[2] + '/' + p[1];
}

/**
 * Vencedores do Quiz ainda PENDENTES (código emitido, prêmio não usado e dentro
 * da validade). Cada um deve aparecer em todas as listas com Nome na Lista.
 */
function quizVencedoresPendentes_(ss) {
  var sh = sheetQuiz_(ss);
  var rows = sh.getDataRange().getValues();
  var hoje = todayISO_();
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var codigo = String(rows[i][7] || '');
    var status = String(rows[i][10] || '');
    if (!codigo || status !== 'pendente') continue;
    var val = diaISO_(rows[i][8]);
    if (val && val < hoje) continue; // prêmio expirado
    out.push({
      codigo: codigo,
      nome: String(rows[i][2] || ''),
      telefone: String(rows[i][3] || ''),
      validade: val
    });
  }
  return out;
}

/**
 * Garante que todos os vencedores pendentes estejam na lista da `data` (até a
 * validade de cada um). Cria a aba do dia se ainda não existir. Idempotente:
 * não duplica quem já está na lista.
 */
function quizGarantirVencedores_(ss, data) {
  var pend = quizVencedoresPendentes_(ss);
  if (pend.length === 0) return;
  var sh = null;
  for (var k = 0; k < pend.length; k++) {
    if (pend[k].validade && data > pend[k].validade) continue; // depois da validade, não inclui
    if (!sh) sh = sheetDoDia_(ss, data, true);
    var linhaDia = acharLinhaPorTelefone_(sh, digits_(pend[k].telefone));
    var premioText = '🏆 VENCEDOR DO QUIZ: ENTRADA GRÁTIS (código ' + pend[k].codigo + ')';
    if (linhaDia === -1) {
      sh.appendRow([
        Utilities.getUuid(), new Date(), protegeFormula_(pend[k].nome), '',
        protegeFormula_(pend[k].telefone), 'nao', '', '', premioText, pend[k].codigo
      ]);
      destaqueVencedor_(sh, sh.getLastRow());
    } else if (String(sh.getRange(linhaDia, 10).getValue() || '') === '') {
      // Já estava na lista (cadastro normal): carimba o prêmio e o destaque.
      sh.getRange(linhaDia, 9).setValue(premioText);
      sh.getRange(linhaDia, 10).setValue(pend[k].codigo);
      destaqueVencedor_(sh, linhaDia);
    }
  }
}

/** Mapa Código (maiúsculo) -> { status, usadoDia } lido da aba "Quiz". */
function quizEstadoPorCodigo_(ss) {
  var sh = sheetQuiz_(ss);
  var rows = sh.getDataRange().getValues();
  var map = {};
  for (var i = 1; i < rows.length; i++) {
    var c = String(rows[i][7] || '').toUpperCase();
    if (!c) continue;
    map[c] = { status: String(rows[i][10] || ''), usadoDia: diaISO_(rows[i][15]) };
  }
  return map;
}

/** Inicio de partida: aplica o limite de 1 por dia por WhatsApp. */
function quizStart_(d) {
  if (!dataValida_(d.dia)) return 'invalid';
  var wa = digits_(d.wa || d.telefone);
  if (!wa) return 'invalid';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = sheetQuiz_(ss);
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (diaISO_(rows[i][0]) === String(d.dia) && digits_(rows[i][1]) === wa) {
      return 'duplicate';
    }
  }
  sh.appendRow([
    d.dia, wa, protegeFormula_(d.nome), protegeFormula_(d.telefone),
    '', '', '', '', '', '', 'jogando', new Date(), '', '', ''
  ]);
  return 'ok';
}

/** Fim de partida: grava o resultado e, no 10/10 elegivel, emite o codigo. */
function quizFinish_(d) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = sheetQuiz_(ss);
  var wa = digits_(d.wa || d.telefone);
  var pontos = Number(d.pontos || 0);
  var acertos = Number(d.acertos || 0);
  var tempoMs = Number(d.tempoMs || 0);
  var acertouTudo = d.acertouTudo === true || acertos >= 10;

  var rows = sh.getDataRange().getValues();
  var linha = -1;
  for (var i = rows.length - 1; i >= 1; i--) {
    if (diaISO_(rows[i][0]) === String(d.dia) && digits_(rows[i][1]) === wa) {
      linha = i + 1;
      if (String(rows[i][10]) === 'jogando') break; // prefere a partida em aberto
    }
  }
  if (linha === -1) {
    sh.appendRow([
      d.dia, wa, protegeFormula_(d.nome), protegeFormula_(d.telefone),
      pontos, acertos, tempoMs, '', '', '', 'concluido', new Date(), new Date(), '', ''
    ]);
    linha = sh.getLastRow();
  } else {
    sh.getRange(linha, 5).setValue(pontos);
    sh.getRange(linha, 6).setValue(acertos);
    sh.getRange(linha, 7).setValue(tempoMs);
    sh.getRange(linha, 13).setValue(new Date()); // Finalizado em
    sh.getRange(linha, 11).setValue('concluido');
  }

  var resp = { codigo: null, jaGanhou: false, validade: null };
  if (acertouTudo) {
    var hoje = todayISO_();
    if (quizTemCodigoValido_(sh, wa, hoje)) {
      resp.jaGanhou = true;
    } else {
      var codigo = gerarCodigoQuiz_(sh);
      var validadeISO = addDiasISO_(hoje, QUIZ_VALIDADE_DIAS);
      sh.getRange(linha, 8).setValue(codigo);        // Código
      sh.getRange(linha, 9).setValue(validadeISO);   // Validade (ISO)
      sh.getRange(linha, 11).setValue('pendente');   // Status
      resp.codigo = codigo;
      resp.validade = formatBR_(validadeISO);
    }
  }
  return resp;
}

/** Ranking do mes: melhor pontuacao por WhatsApp (empate: menor tempo). Top 10. */
function quizRanking_(d) {
  var mes = String(d.mes || '');
  if (!/^\d{4}-\d{2}$/.test(mes)) return [];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = sheetQuiz_(ss);
  var rows = sh.getDataRange().getValues();
  var melhor = {};
  for (var i = 1; i < rows.length; i++) {
    var dia = diaISO_(rows[i][0]);
    if (dia.slice(0, 7) !== mes) continue;
    if (String(rows[i][12] || '') === '') continue; // so partidas finalizadas
    var wa = digits_(rows[i][1]);
    var pontos = Number(rows[i][4] || 0);
    var tempoMs = Number(rows[i][6] || 0);
    var nome = String(rows[i][2] || '');
    var atual = melhor[wa];
    if (!atual || pontos > atual.pontos || (pontos === atual.pontos && tempoMs < atual.tempoMs)) {
      melhor[wa] = { nome: nome, pontos: pontos, tempoMs: tempoMs };
    }
  }
  var arr = [];
  for (var k in melhor) {
    if (melhor.hasOwnProperty(k)) arr.push(melhor[k]);
  }
  arr.sort(function (a, b) { return b.pontos - a.pontos || a.tempoMs - b.tempoMs; });
  return arr.slice(0, 10);
}

/** Resgate: inclui o vencedor na lista da data escolhida (mesma lista da portaria). */
function quizClaim_(d) {
  var codigo = String(d.codigo || '').toUpperCase();
  var data = String(d.data || '');
  if (!/^QUIZ-[A-Z0-9]{4}$/.test(codigo)) return 'invalid';
  if (!dataValida_(data)) return 'invalid';

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var shQuiz = sheetQuiz_(ss);
  var rows = shQuiz.getDataRange().getValues();
  var linha = -1;
  var info = null;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][7] || '').toUpperCase() === codigo) { linha = i + 1; info = rows[i]; break; }
  }
  if (linha === -1) return 'notfound';

  var status = String(info[10] || '');
  if (status === 'usado') return 'usado';
  if (status !== 'pendente') return 'indisponivel';
  var validadeISO = diaISO_(info[8]);
  if (!validadeISO || validadeISO < todayISO_()) return 'expirado';

  var nome = String(info[2] || '');
  var telefone = String(info[3] || '');
  var premioText = '🏆 VENCEDOR DO QUIZ: ENTRADA GRÁTIS (código ' + codigo + ')';

  var sh = sheetDoDia_(ss, data, true);
  var linhaDia = acharLinhaPorTelefone_(sh, digits_(telefone));
  if (linhaDia === -1) {
    sh.appendRow([
      Utilities.getUuid(), new Date(), protegeFormula_(nome), '', protegeFormula_(telefone),
      'nao', '', '', premioText, codigo
    ]);
    linhaDia = sh.getLastRow();
  } else {
    sh.getRange(linhaDia, 9).setValue(premioText);  // Prêmio Quiz
    sh.getRange(linhaDia, 10).setValue(codigo);     // Código Quiz
  }
  destaqueVencedor_(sh, linhaDia);

  shQuiz.getRange(linha, 10).setValue(data);        // Data escolhida
  shQuiz.getRange(linha, 11).setValue('resgatado'); // Status
  shQuiz.getRange(linha, 14).setValue(new Date());  // Resgatado em
  return 'ok';
}

/**
 * Marca o codigo como USADO numa noite (status 'usado', carimba data/hora e a
 * noite em que foi usado). Ao desfazer na portaria, volta para 'pendente' e o
 * vencedor volta a aparecer nas demais listas.
 */
function quizMarcarUso_(ss, codigo, usar, diaUso) {
  var sh = sheetQuiz_(ss);
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][7] || '').toUpperCase() === String(codigo).toUpperCase()) {
      var linha = i + 1;
      if (usar) {
        sh.getRange(linha, 11).setValue('usado');
        sh.getRange(linha, 15).setValue(new Date());
        sh.getRange(linha, 16).setValue(diaUso || '');
      } else {
        sh.getRange(linha, 11).setValue('pendente');
        sh.getRange(linha, 15).setValue('');
        sh.getRange(linha, 16).setValue('');
      }
      return;
    }
  }
}

// ---- Limpeza das listas antigas --------------------------------------------

/**
 * Apaga as abas "Lista AAAA-MM-DD" com mais de RETENCAO_DIAS dias. NUNCA toca
 * em nenhuma outra aba (principalmente "Clientes"). Registra no Logger.
 */
function limparListasAntigas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var limite = new Date();
  limite.setHours(0, 0, 0, 0);
  limite.setDate(limite.getDate() - RETENCAO_DIAS);
  var abas = ss.getSheets();
  var apagadas = [];
  for (var i = 0; i < abas.length; i++) {
    var nome = abas[i].getName();
    var m = nome.match(/^Lista (\d{4})-(\d{2})-(\d{2})$/);
    if (!m) continue; // so abas de lista diaria
    var dataAba = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (dataAba < limite) {
      ss.deleteSheet(abas[i]);
      apagadas.push(nome);
    }
  }
  Logger.log(
    apagadas.length
      ? 'Abas apagadas: ' + apagadas.join(', ')
      : 'Nenhuma aba antiga para apagar.'
  );
  return apagadas;
}

/** Remove gatilhos antigos de limparListasAntigas e cria um diario (por volta das 4h). */
function instalarLimpeza() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'limparListasAntigas') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('limparListasAntigas').timeBased().everyDays(1).atHour(4).create();
  Logger.log('Limpeza diaria instalada (por volta das 4h).');
}

// =====================  TESTES (rodar dentro do editor)  ====================
var TEL_TESTE = '(41) 99999-0000';
var DATAS_TESTE = ['2000-01-01', '2000-01-02'];

/** Monta um request de teste com o token correto. */
function reqTeste_(payload) {
  payload.token = TOKEN;
  return { postData: { contents: JSON.stringify(payload) } };
}

function corpoTeste_(datas) {
  return {
    action: 'signup',
    datas: datas,
    nome: 'Teste Silva',
    email: 'teste@exemplo.com',
    telefone: TEL_TESTE,
    aceitaNovidades: false
  };
}

/** Conta quantas linhas da aba tem o telefone (so digitos). */
function contaTelefone_(sh, tel) {
  if (!sh) return 0;
  var rows = sh.getDataRange().getValues();
  var n = 0;
  var t = digits_(tel);
  for (var i = 1; i < rows.length; i++) {
    if (digits_(rows[i][4]) === t) n++;
  }
  return n;
}

/** Cadastra dois dias de uma vez; rodando duas vezes, ambas "ok" e sem duplicar. */
function testeCadastro() {
  var a = doPost(reqTeste_(corpoTeste_(DATAS_TESTE))).getContent();
  var b = doPost(reqTeste_(corpoTeste_(DATAS_TESTE))).getContent();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log(
    '1a: ' + a + ' | 2a: ' + b +
    ' | linhas 01: ' + contaTelefone_(ss.getSheetByName('Lista 2000-01-01'), TEL_TESTE) +
    ' | linhas 02: ' + contaTelefone_(ss.getSheetByName('Lista 2000-01-02'), TEL_TESTE)
  );
}

/** Caso real: telefone ja na lista de um dia; cadastrar os dois so adiciona o que falta. */
function testeCasoReal() {
  apagarDadosDeTeste();
  var so1 = doPost(reqTeste_(corpoTeste_(['2000-01-01']))).getContent();
  var dois = doPost(reqTeste_(corpoTeste_(DATAS_TESTE))).getContent();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log(
    'so 01: ' + so1 + ' | os dois: ' + dois +
    ' | linhas 01: ' + contaTelefone_(ss.getSheetByName('Lista 2000-01-01'), TEL_TESTE) +
    ' | linhas 02: ' + contaTelefone_(ss.getSheetByName('Lista 2000-01-02'), TEL_TESTE)
  );
}

/** Confere se o token esta certo pelo caminho real (deve mostrar "pong"). */
function testePing() {
  Logger.log(doPost(reqTeste_({ action: 'ping' })).getContent());
}

/** Cria uma aba antiga de teste, roda a limpeza e confirma que ela sumiu e que "Clientes" ficou. */
function testeLimpeza() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var nome = 'Lista 2000-01-01';
  if (!ss.getSheetByName(nome)) ss.insertSheet(nome).appendRow(COLS_DIA);
  sheetClientes_(ss);
  limparListasAntigas();
  var sumiu = ss.getSheetByName(nome) === null;
  var clientesOk = ss.getSheetByName('Clientes') !== null;
  Logger.log('Aba antiga removida: ' + sumiu + ' | Clientes preservada: ' + clientesOk);
}

/**
 * Limpa SOMENTE os dados de teste: o telefone de teste nas abas de teste de
 * 2000 (DATAS_TESTE) e na aba "Clientes". Nunca toca em abas de dias reais,
 * nem em "Lista" ou "Página1". So apaga uma aba se for de teste e ficar vazia.
 */
function apagarDadosDeTeste() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tel = digits_(TEL_TESTE);
  var removidas = 0;
  // Abas de teste de 2000: remove o telefone de teste e apaga se ficar vazia.
  for (var i = 0; i < DATAS_TESTE.length; i++) {
    var sh = ss.getSheetByName(nomeAbaDia_(DATAS_TESTE[i]));
    if (!sh) continue;
    removidas += removeLinhasPorTelefone_(sh, 5, tel); // col E
    if (sh.getLastRow() <= 1) ss.deleteSheet(sh); // so a aba de teste vazia
  }
  // Aba "Clientes": remove so as linhas do telefone de teste (nunca apaga a aba).
  var clientes = ss.getSheetByName('Clientes');
  if (clientes) removidas += removeLinhasPorTelefone_(clientes, 1, tel); // col A
  Logger.log('Linhas de teste removidas: ' + removidas);
}

/** Remove, de baixo para cima, as linhas cujo telefone (coluna dada) bate com os digitos. */
function removeLinhasPorTelefone_(sh, colTelefone, telDigitos) {
  var rows = sh.getDataRange().getValues();
  var removidas = 0;
  for (var i = rows.length - 1; i >= 1; i--) {
    if (digits_(rows[i][colTelefone - 1]) === telDigitos) {
      sh.deleteRow(i + 1);
      removidas++;
    }
  }
  return removidas;
}

// =====================  TESTES DO QUIZ  =====================
var QUIZ_DATA_TESTE = '2000-01-03';
var QUIZ_DATA_TESTE_2 = '2000-01-04';

/**
 * Fluxo completo do Quiz no modelo novo: 1 partida por dia; 10/10 gera codigo;
 * o vencedor aparece AUTOMATICAMENTE em TODAS as listas (aqui, duas datas de
 * teste); ao liberar numa noite, o codigo fica usado e nas outras listas mostra
 * premioUsado com a data. No fim, Logger mostra cada etapa. Rode apagarTesteQuiz() depois.
 */
function testeQuizFluxo() {
  apagarTesteQuiz();
  var hoje = todayISO_();
  var wa = digits_(TEL_TESTE);

  var start1 = doPost(reqTeste_({ action: 'quiz_start', wa: wa, nome: 'Teste Quiz', telefone: TEL_TESTE, dia: hoje })).getContent();
  var start2 = doPost(reqTeste_({ action: 'quiz_start', wa: wa, nome: 'Teste Quiz', telefone: TEL_TESTE, dia: hoje })).getContent();
  var fim = doPost(reqTeste_({ action: 'quiz_finish', wa: wa, nome: 'Teste Quiz', telefone: TEL_TESTE, dia: hoje, pontos: 150, acertos: 10, tempoMs: 42000, acertouTudo: true })).getContent();
  var j = JSON.parse(fim);

  // O vencedor deve aparecer sozinho em QUALQUER lista aberta (via list_).
  var lista1 = JSON.parse(doPost(reqTeste_({ action: 'list', data: QUIZ_DATA_TESTE })).getContent());
  var lista2 = JSON.parse(doPost(reqTeste_({ action: 'list', data: QUIZ_DATA_TESTE_2 })).getContent());
  var v1 = null, v2 = null;
  for (var i = 0; i < lista1.length; i++) { if (lista1[i].codigoQuiz === j.codigo) v1 = lista1[i]; }
  for (var i = 0; i < lista2.length; i++) { if (lista2[i].codigoQuiz === j.codigo) v2 = lista2[i]; }
  var rank = doPost(reqTeste_({ action: 'quiz_ranking', mes: hoje.slice(0, 7) })).getContent();

  Logger.log(
    'start1: ' + start1 + ' (ok) | start2: ' + start2 + ' (duplicate) | finish: ' + fim +
    ' | vencedor na lista 1: ' + (v1 ? 'sim' : 'NAO') +
    ' | vencedor na lista 2: ' + (v2 ? 'sim' : 'NAO') +
    ' | ranking contem teste: ' + (rank.indexOf('Teste Quiz') >= 0)
  );

  if (v1) {
    var usado = doPost(reqTeste_({ action: 'checkin', id: v1.id, entrou: true, data: QUIZ_DATA_TESTE })).getContent();
    var lista2b = JSON.parse(doPost(reqTeste_({ action: 'list', data: QUIZ_DATA_TESTE_2 })).getContent());
    var v2b = null;
    for (var i = 0; i < lista2b.length; i++) { if (lista2b[i].codigoQuiz === j.codigo) v2b = lista2b[i]; }
    Logger.log(
      'checkin vencedor: ' + usado +
      ' | lista 2 apos usar: premioUsado=' + (v2b ? v2b.premioUsado : '?') +
      ' em ' + (v2b ? v2b.premioUsadoData : '?') + ' (deve bater com ' + shortBR_(QUIZ_DATA_TESTE) + ')'
    );
  }
}

/** Remove os dados de teste do Quiz (aba "Quiz" e as abas de dia de teste). */
function apagarTesteQuiz() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tel = digits_(TEL_TESTE);
  var removidas = 0;
  var quiz = ss.getSheetByName('Quiz');
  if (quiz) removidas += removeLinhasPorTelefone_(quiz, 2, tel); // col B = WhatsApp
  var datas = [QUIZ_DATA_TESTE, QUIZ_DATA_TESTE_2];
  for (var k = 0; k < datas.length; k++) {
    var sh = ss.getSheetByName(nomeAbaDia_(datas[k]));
    if (sh) {
      removidas += removeLinhasPorTelefone_(sh, 5, tel); // col E = Telefone
      if (sh.getLastRow() <= 1) ss.deleteSheet(sh);
    }
  }
  Logger.log('Linhas de teste do Quiz removidas: ' + removidas);
}
