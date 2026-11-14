/**
 * Backend do "Quiz do Clay" (Google Apps Script sobre uma Planilha).
 *
 * NÃO faz parte do build do site. É o código que roda no Google Apps Script,
 * publicado como Web App, atendendo o webhook usado pelas rotas /api/quiz/*.
 * É um projeto SEPARADO do backend do "Nome na Lista" (outra planilha, outro
 * token), para não misturar os dados.
 *
 * MODELO: uma aba por mês, "Quiz AAAA-MM", com uma linha por partida:
 *   [Dia, WhatsApp, Nome, Pontos, Acertos, TempoMs, Codigo, Validade,
 *    CriadoEm, FinalizadoEm]
 * - start reserva a linha do dia (1 partida por WhatsApp por dia);
 * - finish grava pontos/acertos/tempo e, no 10/10, gera o código de entrada
 *   grátis respeitando o limite de 1 a cada 30 dias por WhatsApp;
 * - ranking devolve o Top 10 do mês (melhor pontuação por WhatsApp).
 *
 * COMO PUBLICAR:
 *  1. Crie uma Planilha Google e abra Extensões > Apps Script.
 *  2. Cole este código e troque TOKEN por um segredo forte.
 *  3. Implantar > Nova implantação > Tipo "App da Web".
 *     Executar como: eu. Quem tem acesso: qualquer pessoa.
 *  4. Copie a URL /exec. Abrindo no navegador deve mostrar "online".
 *  5. (Opcional) rode instalarLimpezaQuiz() uma vez para apagar meses antigos.
 *
 * No Netlify, defina:
 *  QUIZ_WEBHOOK_URL   = a URL /exec do Web App
 *  QUIZ_WEBHOOK_TOKEN = exatamente o mesmo valor de TOKEN abaixo
 *  QUIZ_SECRET        = um segredo forte (cifra os tokens do jogo; só o site usa)
 *
 * Contrato (e.postData.contents):
 *  ping:    { token, action: "ping" }                         -> "pong"
 *  start:   { token, action: "start",  wa, nome, dia }        -> "ok" | "duplicate"
 *  finish:  { token, action: "finish", wa, nome, dia, pontos, acertos, tempoMs, acertouTudo }
 *                                                              -> JSON { codigo, jaGanhou, validade }
 *  ranking: { token, action: "ranking", mes }                 -> JSON [{ nome, pontos, tempoMs }]
 *  token errado                                                -> "forbidden"
 */
var TOKEN = 'TROQUE_POR_UM_SEGREDO';
var FUSO = 'America/Sao_Paulo';
var MESES_RETIDOS = 6;
var VALIDADE_DIAS = 30;
var ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

var COLS = ['Dia', 'WhatsApp', 'Nome', 'Pontos', 'Acertos', 'TempoMs', 'Codigo', 'Validade', 'CriadoEm', 'FinalizadoEm'];
// Índices (1-based) das colunas na planilha:
var C_DIA = 1, C_WA = 2, C_NOME = 3, C_PONTOS = 4, C_ACERTOS = 5, C_TEMPO = 6, C_CODIGO = 7, C_VALIDADE = 8, C_CRIADO = 9, C_FIM = 10;

function text_(s) {
  return ContentService.createTextOutput(s);
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return text_('online');
}

function doPost(e) {
  var d;
  try {
    d = JSON.parse(e.postData.contents);
  } catch (err) {
    return text_('invalid');
  }
  if (d.token !== TOKEN) return text_('forbidden');
  if (d.action === 'ping') return text_('pong');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (d.action === 'start') return text_(start_(d));
    if (d.action === 'finish') return json_(finish_(d));
    if (d.action === 'ranking') return json_(ranking_(d));
    return text_('invalid');
  } finally {
    lock.releaseLock();
  }
}

// ---- Utilidades ------------------------------------------------------------

function digits_(s) {
  return String(s == null ? '' : s).replace(/\D/g, '');
}
function protegeFormula_(v) {
  var s = String(v == null ? '' : v);
  if (/^[=+\-@]/.test(s)) return "'" + s;
  return s;
}
function diaValido_(dia) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(dia || ''));
}
function mesDe_(dia) {
  return String(dia).slice(0, 7);
}
function nomeAba_(mes) {
  return 'Quiz ' + mes;
}
function sheetMes_(ss, mes, criar) {
  var nome = nomeAba_(mes);
  var sh = ss.getSheetByName(nome);
  if (!sh && criar) {
    sh = ss.insertSheet(nome);
    sh.appendRow(COLS);
    sh.getRange('A:A').setNumberFormat('@'); // Dia como texto
    sh.getRange('B:B').setNumberFormat('@'); // WhatsApp como texto
    sh.getRange('G:G').setNumberFormat('@'); // Codigo como texto
    sh.getRange('H:H').setNumberFormat('@'); // Validade como texto
  }
  return sh;
}
function acharLinha_(sh, wa, dia) {
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (digits_(rows[i][C_WA - 1]) === wa && String(rows[i][C_DIA - 1]) === dia) {
      return i + 1; // 1-based
    }
  }
  return 0;
}
function gerarCodigo_() {
  var s = '';
  for (var i = 0; i < 4; i++) {
    s += ALFABETO.charAt(Math.floor(Math.random() * ALFABETO.length));
  }
  return 'QUIZ-' + s;
}
function validadeBR_(dia) {
  var p = String(dia).split('-');
  var dt = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
  dt.setUTCDate(dt.getUTCDate() + VALIDADE_DIAS);
  var dd = ('0' + dt.getUTCDate()).slice(-2);
  var mm = ('0' + (dt.getUTCMonth() + 1)).slice(-2);
  return dd + '/' + mm + '/' + dt.getUTCFullYear();
}

// ---- Ações -----------------------------------------------------------------

function start_(d) {
  if (!diaValido_(d.dia)) return 'invalid';
  var wa = digits_(d.wa);
  if (!wa) return 'invalid';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = sheetMes_(ss, mesDe_(d.dia), true);
  if (acharLinha_(sh, wa, d.dia)) return 'duplicate';
  sh.appendRow([d.dia, protegeFormula_(d.wa), protegeFormula_(d.nome), '', '', '', '', '', new Date(), '']);
  return 'ok';
}

function finish_(d) {
  if (!diaValido_(d.dia)) return { codigo: null, jaGanhou: false, validade: null };
  var wa = digits_(d.wa);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = sheetMes_(ss, mesDe_(d.dia), true);
  var linha = acharLinha_(sh, wa, d.dia);
  if (!linha) {
    sh.appendRow([d.dia, protegeFormula_(d.wa), protegeFormula_(d.nome), '', '', '', '', '', new Date(), '']);
    linha = sh.getLastRow();
  }
  sh.getRange(linha, C_PONTOS).setValue(Number(d.pontos) || 0);
  sh.getRange(linha, C_ACERTOS).setValue(Number(d.acertos) || 0);
  sh.getRange(linha, C_TEMPO).setValue(Number(d.tempoMs) || 0);
  sh.getRange(linha, C_FIM).setValue(new Date());

  var codigo = null, jaGanhou = false, validade = null;
  if (d.acertouTudo === true) {
    if (ganhouCodigoRecente_(ss, wa, d.dia)) {
      jaGanhou = true;
    } else {
      codigo = gerarCodigo_();
      validade = validadeBR_(d.dia);
      sh.getRange(linha, C_CODIGO).setValue(codigo);
      sh.getRange(linha, C_VALIDADE).setValue(validade);
    }
  }
  return { codigo: codigo, jaGanhou: jaGanhou, validade: validade };
}

/** O WhatsApp já ganhou um código nos últimos 30 dias? Varre o mês atual e o anterior. */
function ganhouCodigoRecente_(ss, wa, dia) {
  var limite = new Date();
  limite.setDate(limite.getDate() - VALIDADE_DIAS);
  var meses = [mesDe_(dia), mesAnterior_(mesDe_(dia))];
  for (var m = 0; m < meses.length; m++) {
    var sh = sheetMes_(ss, meses[m], false);
    if (!sh) continue;
    var rows = sh.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (digits_(rows[i][C_WA - 1]) !== wa) continue;
      var codigo = String(rows[i][C_CODIGO - 1] || '');
      if (!codigo) continue;
      var fim = rows[i][C_FIM - 1];
      var data = fim instanceof Date ? fim : new Date(fim);
      if (!isNaN(data.getTime()) && data >= limite) return true;
    }
  }
  return false;
}

function mesAnterior_(mes) {
  var p = mes.split('-');
  var y = Number(p[0]), m = Number(p[1]) - 1; // 0-based
  m -= 1;
  if (m < 0) { m = 11; y -= 1; }
  return y + '-' + ('0' + (m + 1)).slice(-2);
}

function ranking_(d) {
  var mes = String(d.mes || '');
  if (!/^\d{4}-\d{2}$/.test(mes)) return [];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = sheetMes_(ss, mes, false);
  if (!sh) return [];
  var rows = sh.getDataRange().getValues();
  var melhorPorWa = {}; // wa -> {nome, pontos, tempoMs}
  for (var i = 1; i < rows.length; i++) {
    var fim = rows[i][C_FIM - 1];
    if (!fim) continue; // só partidas finalizadas
    var wa = digits_(rows[i][C_WA - 1]);
    if (!wa) continue;
    var pontos = Number(rows[i][C_PONTOS - 1]) || 0;
    var tempo = Number(rows[i][C_TEMPO - 1]) || 0;
    var nome = String(rows[i][C_NOME - 1] || '');
    var atual = melhorPorWa[wa];
    if (!atual || pontos > atual.pontos || (pontos === atual.pontos && tempo < atual.tempoMs)) {
      melhorPorWa[wa] = { nome: nome, pontos: pontos, tempoMs: tempo };
    }
  }
  var lista = [];
  for (var k in melhorPorWa) {
    if (melhorPorWa.hasOwnProperty(k)) lista.push(melhorPorWa[k]);
  }
  lista.sort(function (a, b) {
    return b.pontos - a.pontos || a.tempoMs - b.tempoMs;
  });
  return lista.slice(0, 10);
}

// ---- Limpeza de meses antigos (opcional) -----------------------------------

function limparMesesAntigos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoje = new Date();
  var abas = ss.getSheets();
  var apagadas = [];
  for (var i = 0; i < abas.length; i++) {
    var nome = abas[i].getName();
    var mm = nome.match(/^Quiz (\d{4})-(\d{2})$/);
    if (!mm) continue;
    var dataAba = new Date(Number(mm[1]), Number(mm[2]) - 1, 1);
    var idadeMeses = (hoje.getFullYear() - dataAba.getFullYear()) * 12 + (hoje.getMonth() - dataAba.getMonth());
    if (idadeMeses > MESES_RETIDOS) {
      ss.deleteSheet(abas[i]);
      apagadas.push(nome);
    }
  }
  Logger.log(apagadas.length ? 'Abas apagadas: ' + apagadas.join(', ') : 'Nada a apagar.');
  return apagadas;
}

function instalarLimpezaQuiz() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'limparMesesAntigos') ScriptApp.deleteTrigger(triggers[i]);
  }
  ScriptApp.newTrigger('limparMesesAntigos').timeBased().everyDays(1).atHour(4).create();
  Logger.log('Limpeza mensal instalada (por volta das 4h).');
}

// =====================  TESTES (rodar dentro do editor)  ====================
var WA_TESTE = '41999990000';
var DIA_TESTE = '2000-01-01';

function reqTeste_(payload) {
  payload.token = TOKEN;
  return { postData: { contents: JSON.stringify(payload) } };
}

function testeFluxo() {
  var a = doPost(reqTeste_({ action: 'start', wa: WA_TESTE, nome: 'Teste Silva', dia: DIA_TESTE })).getContent();
  var b = doPost(reqTeste_({ action: 'start', wa: WA_TESTE, nome: 'Teste Silva', dia: DIA_TESTE })).getContent();
  var c = doPost(reqTeste_({ action: 'finish', wa: WA_TESTE, nome: 'Teste Silva', dia: DIA_TESTE, pontos: 150, acertos: 10, tempoMs: 42000, acertouTudo: true })).getContent();
  var r = doPost(reqTeste_({ action: 'ranking', mes: mesDe_(DIA_TESTE) })).getContent();
  Logger.log('start1=' + a + ' | start2(dup)=' + b + ' | finish=' + c + ' | ranking=' + r);
}

function apagarTeste() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(nomeAba_(mesDe_(DIA_TESTE)));
  if (!sh) { Logger.log('Aba de teste nao existe.'); return; }
  var rows = sh.getDataRange().getValues();
  for (var i = rows.length - 1; i >= 1; i--) {
    if (digits_(rows[i][C_WA - 1]) === WA_TESTE) sh.deleteRow(i + 1);
  }
  if (sh.getLastRow() <= 1) ss.deleteSheet(sh);
  Logger.log('Dados de teste removidos.');
}
