/**
 * Backend da promocao "Nome na Lista" (Google Apps Script sobre uma Planilha).
 *
 * Este arquivo NAO faz parte do build do site. E o codigo que roda no Google
 * Apps Script, publicado como Web App, atendendo o webhook usado pelas rotas
 * /api/nome-na-lista (cadastro) e /api/portaria/* (lista e checkin).
 *
 * A promocao e uma CAMPANHA: uma linha por CPF por campanha (coluna "Evento"
 * guarda o PROMO_ID). A coluna "Entradas" guarda uma entrada por dia valido
 * (ex.: cada sexta) no formato "AAAA-MM-DD|HH:mm", separadas por ";", no fuso
 * America/Sao_Paulo. "Total de entradas" guarda a contagem dessas entradas.
 *
 * Como publicar:
 *  1. Crie uma Planilha Google e abra Extensoes > Apps Script.
 *  2. Cole este codigo e troque o valor de TOKEN por um segredo forte.
 *  3. Implantar > Nova implantacao > Tipo "App da Web".
 *     Executar como: eu. Quem tem acesso: qualquer pessoa.
 *  4. Copie a URL /exec gerada.
 *
 * No Netlify, defina as variaveis de ambiente:
 *  LISTA_WEBHOOK_URL   = a URL /exec do Web App
 *  LISTA_WEBHOOK_TOKEN = exatamente o mesmo valor de TOKEN abaixo
 *
 * Contrato com o site (o que o site envia em e.postData.contents):
 *  Cadastro: { token, action: "signup",  evento, periodo, nome, cpf, email, aceitaNovidades }
 *  Lista:    { token, action: "list",    evento, data }
 *  Checkin:  { token, action: "checkin", id, entrou, data }   (entrou = true ou false)
 *
 * Respostas (texto simples, exceto list que e JSON):
 *  signup  -> "ok" | "duplicate"
 *  checkin -> "ok" | "notfound"
 *  list    -> JSON de [{ id, nome, cpfMascarado, entrou, hora }] em ordem alfabetica
 *  token invalido -> "forbidden"
 */
var TOKEN = 'TROQUE_POR_UM_SEGREDO';
var FUSO = 'America/Sao_Paulo';
var HEADERS = ['ID', 'Cadastro em', 'Evento', 'Período', 'Nome', 'CPF', 'E-mail', 'Aceita novidades', 'Entradas', 'Total de entradas'];

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Lista');
  if (!sh) {
    sh = ss.insertSheet('Lista');
    sh.appendRow(HEADERS);
    // Mantem CPF, e-mail, datas/horas e contadores como texto, evitando que o
    // CPF vire notacao cientifica ou perca zeros a esquerda.
    sh.getRange('C:J').setNumberFormat('@');
  }
  return sh;
}

function text_(s) {
  return ContentService.createTextOutput(s);
}

function doPost(e) {
  var d = JSON.parse(e.postData.contents);
  if (d.token !== TOKEN) return text_('forbidden');
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = sheet_();
    if (d.action === 'list') return text_(JSON.stringify(list_(sh, d)));
    if (d.action === 'checkin') return text_(checkin_(sh, d));
    return text_(register_(sh, d));
  } finally {
    lock.releaseLock();
  }
}

/** So os digitos de um valor. */
function digits_(s) {
  return String(s == null ? '' : s).replace(/\D/g, '');
}

/** Mascara a partir dos 11 digitos: ***.456.789-**. */
function mask_(cpf) {
  var d = digits_(cpf);
  if (d.length !== 11) return '***.***.***-**';
  return '***.' + d.substr(3, 3) + '.' + d.substr(6, 3) + '-**';
}

/** "AAAA-MM-DD|HH:mm;AAAA-MM-DD|HH:mm" -> [{data, hora}]. */
function parseEntradas_(valor) {
  var out = [];
  var txt = String(valor || '').trim();
  if (!txt) return out;
  var itens = txt.split(';');
  for (var i = 0; i < itens.length; i++) {
    if (!itens[i]) continue;
    var partes = itens[i].split('|');
    out.push({ data: partes[0] || '', hora: partes[1] || '' });
  }
  return out;
}

/** [{data, hora}] -> "AAAA-MM-DD|HH:mm;...". */
function stringifyEntradas_(arr) {
  var partes = [];
  for (var i = 0; i < arr.length; i++) {
    partes.push(arr[i].data + '|' + arr[i].hora);
  }
  return partes.join(';');
}

/** Hora registrada para uma data, ou "" se nao houver. */
function horaDaData_(valor, data) {
  var arr = parseEntradas_(valor);
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].data === data) return arr[i].hora;
  }
  return '';
}

function register_(sh, d) {
  var rows = sh.getDataRange().getValues();
  var cpf = digits_(d.cpf);
  for (var i = 1; i < rows.length; i++) {
    if (digits_(rows[i][5]) === cpf && String(rows[i][2]) === String(d.evento)) {
      return 'duplicate';
    }
  }
  sh.appendRow([
    Utilities.getUuid(),
    new Date(),
    d.evento,
    d.periodo,
    d.nome,
    cpf,
    d.email,
    d.aceitaNovidades ? 'sim' : 'nao',
    '',
    '0'
  ]);
  return 'ok';
}

function list_(sh, d) {
  var rows = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (String(r[2]) !== String(d.evento)) continue;
    var hora = horaDaData_(r[8], d.data);
    out.push({
      id: String(r[0]),
      nome: String(r[4]),
      cpfMascarado: mask_(r[5]),
      entrou: hora !== '',
      hora: hora
    });
  }
  out.sort(function (a, b) {
    return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
  });
  return out;
}

function checkin_(sh, d) {
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(d.id)) {
      var linha = i + 1;
      var entradas = parseEntradas_(rows[i][8]);
      var existe = -1;
      for (var j = 0; j < entradas.length; j++) {
        if (entradas[j].data === d.data) { existe = j; break; }
      }
      if (d.entrou) {
        if (existe === -1) {
          var hora = Utilities.formatDate(new Date(), FUSO, 'HH:mm');
          entradas.push({ data: d.data, hora: hora });
        }
      } else if (existe !== -1) {
        entradas.splice(existe, 1);
      }
      sh.getRange(linha, 9).setValue(stringifyEntradas_(entradas)); // coluna I
      sh.getRange(linha, 10).setValue(String(entradas.length)); // coluna J
      return 'ok';
    }
  }
  return 'notfound';
}
