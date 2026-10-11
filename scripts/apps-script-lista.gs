/**
 * Backend da promocao "Nome na Lista" (Google Apps Script sobre uma Planilha).
 *
 * Este arquivo NAO faz parte do build do site. E o codigo que roda no Google
 * Apps Script, publicado como Web App, e que atende o webhook usado pelas rotas
 * /api/nome-na-lista (cadastro) e /api/portaria/* (lista e checkin).
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
 *  Cadastro:  { token, action: "signup",  evento, dataEvento, nome, cpf, email, aceitaNovidades }
 *  Lista:     { token, action: "list",    evento, dataEvento }
 *  Checkin:   { token, action: "checkin", id, entrou }   (entrou = true ou false)
 *
 * Respostas:
 *  signup  -> "ok" | "duplicate"
 *  checkin -> "ok" | "notfound"
 *  list    -> JSON de [{ id, nome, cpfMascarado, entrou, hora }] em ordem alfabetica
 *  token invalido -> "forbidden"
 */
var TOKEN = 'TROQUE_POR_UM_SEGREDO';
var HEADERS = ['ID', 'Cadastro em', 'Evento', 'Data do evento', 'Nome', 'CPF', 'E-mail', 'Aceita novidades', 'Entradas', 'Total de entradas'];

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Lista');
  if (!sh) {
    sh = ss.insertSheet('Lista');
    sh.appendRow(HEADERS);
    // Mantem CPF, e-mail, horas e contadores como texto, evitando que o CPF
    // vire notacao cientifica ou perca zeros a esquerda.
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

function register_(sh, d) {
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][5]) === String(d.cpf) && String(rows[i][2]) === String(d.evento)) {
      return 'duplicate';
    }
  }
  sh.appendRow([
    Utilities.getUuid(),
    new Date(),
    d.evento,
    d.dataEvento,
    d.nome,
    d.cpf,
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
    var cpf = String(r[5]);
    var hora = String(r[8] || '');
    out.push({
      id: String(r[0]),
      nome: String(r[4]),
      // Mascara no formato ***.456.789-** (esconde os 3 primeiros e os 2 ultimos).
      cpfMascarado: '***.' + cpf.substr(3, 3) + '.' + cpf.substr(6, 3) + '-**',
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
      if (d.entrou) {
        var hora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'HH:mm');
        sh.getRange(linha, 9).setValue(hora); // coluna I: Entradas (hora da liberacao)
        sh.getRange(linha, 10).setValue(Number(rows[i][9] || 0) + 1); // coluna J: Total
      } else {
        sh.getRange(linha, 9).setValue(''); // desfaz a liberacao
      }
      return 'ok';
    }
  }
  return 'notfound';
}
