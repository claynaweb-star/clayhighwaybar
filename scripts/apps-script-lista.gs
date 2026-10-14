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
 * Respostas (texto simples, exceto list que e JSON):
 *  doGet          -> "online"
 *  ping           -> "pong"
 *  signup         -> "ok" (sempre que processado; repetir nao duplica) | "invalid"
 *  checkin        -> "ok" | "notfound"
 *  list           -> JSON de [{ id, nome, telefone, entrou, hora }] (ordem alfabetica)
 *  token invalido -> "forbidden"
 */
var TOKEN = 'TROQUE_POR_UM_SEGREDO';
var FUSO = 'America/Sao_Paulo';
var RETENCAO_DIAS = 14;
var MAX_DATAS = 7;

var COLS_DIA = ['ID', 'Cadastro em', 'Nome', 'E-mail', 'Telefone', 'Aceita novidades', 'Entrou', 'Hora da entrada'];
var COLS_CLIENTES = ['Telefone', 'Nome', 'E-mail', 'Aceita novidades', 'Primeiro cadastro', 'Último cadastro', 'Dias na lista'];

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
        ''
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
      sh.getRange(linha, 2).setValue(protegeFormula_(d.nome)); // Nome
      sh.getRange(linha, 3).setValue(protegeFormula_(d.email)); // E-mail
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
  var sh = sheetDoDia_(ss, d.data, false);
  if (!sh) return [];
  var rows = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    out.push({
      id: String(r[0]),
      nome: String(r[2]),
      telefone: String(r[4]),
      entrou: String(r[6]) === 'sim',
      hora: String(r[7] || '')
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
      return 'ok';
    }
  }
  return 'notfound';
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

/** Remove das abas e da aba "Clientes" tudo com o telefone de teste e apaga abas de teste vazias. */
function apagarDadosDeTeste() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tel = digits_(TEL_TESTE);
  var abas = ss.getSheets();
  var removidas = 0;
  for (var i = 0; i < abas.length; i++) {
    var sh = abas[i];
    var nome = sh.getName();
    if (/^Lista \d{4}-\d{2}-\d{2}$/.test(nome)) {
      removidas += removeLinhasPorTelefone_(sh, 5, tel); // col E
      if (sh.getLastRow() <= 1) ss.deleteSheet(sh); // aba de teste vazia
    } else if (nome === 'Clientes') {
      removidas += removeLinhasPorTelefone_(sh, 1, tel); // col A
    }
  }
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
