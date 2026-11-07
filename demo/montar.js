/* Monta demo/index.html: a tela (app.html) + o Code.gs rodando no próprio navegador, com planilha simulada.
   Uso: node demo/montar.js   (depois abra demo/index.html) */
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(raiz, 'app.html'), 'utf8');
const code = fs.readFileSync(path.join(raiz, 'Code.gs'), 'utf8');
const funcoes = (code.match(/^function [a-zA-Z]+\(/gm) || []).map(f => f.slice(9, -1));

const simulador = `
<script>
/* ===== MODO DE TESTE: planilha simulada no navegador (não vai para o Apps Script) ===== */
(function () {
  const CHAVE = 'comite-demo-v3';
  const PESSOAS = [
    ['italo@credisis.com.br', 'Italo (dev)'],
    ['ana@credisis.com.br', 'Ana · atendente 002'],
    ['bia@credisis.com.br', 'Bia · atendente 003'],
    ['carlos@credisis.com.br', 'Carlos · analista'],
    ['davi@credisis.com.br', 'Davi · gerente 002'],
    ['eva@credisis.com.br', 'Eva · diretoria'],
    ['fabio@credisis.com.br', 'Fábio · admin 002']
  ];
  let salvo = null;
  try { salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch (e) {}
  const estado = { email: '', props: salvo ? salvo.props : {}, abas: {} };

  function sheet(d) {
    const lastRow = () => { let r = d.length; while (r && d[r - 1].every(v => v === '' || v == null)) r--; return r; };
    const lastCol = () => d.reduce((m, l) => Math.max(m, l.reduce((mm, v, i) => (v === '' || v == null ? mm : i + 1), 0)), 0);
    const range = (r, c, nr, nc) => { const rg = {
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => { const v = (d[r - 1 + i] || [])[c - 1 + j]; return v == null ? '' : v; })),
      setValues: v => { v.forEach((l, i) => { d[r - 1 + i] = d[r - 1 + i] || []; l.forEach((x, j) => { d[r - 1 + i][c - 1 + j] = x == null ? '' : (typeof x === 'string' && x.charAt(0) === "'" ? x.slice(1) : x); }); }); return rg; },
      clearContent: () => { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) if (d[r - 1 + i]) d[r - 1 + i][c - 1 + j] = ''; return rg; },
      setFontWeight: () => rg, setNumberFormat: () => rg, setDataValidation: () => rg }; return rg; };
    return { d: d, getLastRow: lastRow, getLastColumn: lastCol,
      getRange: (r, c, nr, nc) => typeof r === 'string' ? range(1, 1, 0, 0) : range(r, c, nr || 1, nc || 1),
      getDataRange: () => range(1, 1, lastRow(), lastCol()), deleteRow: r => { d.splice(r - 1, 1); }, setFrozenRows() {} };
  }
  if (salvo) Object.keys(salvo.abas).forEach(n => { estado.abas[n] = sheet(salvo.abas[n]); });
  const ss = { getSheetByName: n => estado.abas[n] || null, insertSheet: n => (estado.abas[n] = sheet([])),
    getUrl: () => 'https:' + '\\/\\/docs.google.com/spreadsheets', getName: () => 'Planilha de teste' };
  const dv = () => { const o = {}; ['requireValueInList', 'requireValueInRange', 'setAllowInvalid'].forEach(k => { o[k] = () => o; }); o.build = () => ({}); return o; };
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Porto_Velho', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const formatDate = (d, tz, f) => { const p = {}; fmt.formatToParts(d).forEach(x => { p[x.type] = x.value; });
    return f.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour === '24' ? '00' : p.hour).replace('mm', p.minute).replace('ss', p.second); };
  const M = {
    SpreadsheetApp: { getActive: () => ss, newDataValidation: dv },
    Session: { getActiveUser: () => ({ getEmail: () => estado.email }), getEffectiveUser: () => ({ getEmail: () => estado.email }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in estado.props ? estado.props[k] : null),
      setProperty: (k, v) => { estado.props[k] = String(v); }, deleteProperty: k => { delete estado.props[k]; } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    Utilities: { formatDate: formatDate },
    HtmlService: { createHtmlOutput: () => ({ setFaviconUrl() {} }), XFrameOptionsMode: {} },
    ScriptApp: { getScriptId: () => 'TESTE' },
    Logger: { log: m => console.log(m) }
  };
  const S = (new Function(Object.keys(M).join(','), ${JSON.stringify(code)} + '\\n;return {' + ${JSON.stringify(funcoes.join(','))} + '};')).apply(null, Object.keys(M).map(k => M[k]));
  const guardar = () => { try { const a = {}; Object.keys(estado.abas).forEach(n => { a[n] = estado.abas[n].d; }); localStorage.setItem(CHAVE, JSON.stringify({ abas: a, props: estado.props })); } catch (e) {} };
  const como = (email, fn, ...a) => { estado.email = email; return S[fn](...a); };

  /* dados de exemplo */
  if (!salvo) {
    const [DEV, ANA, BIA, CAR, DAV, EVA, FAB] = PESSOAS.map(p => p[0]);
    estado.email = DEV; S.setup();
    como(DEV, 'salvarPessoa', { emailOriginal: DEV, email: DEV, nome: 'Italo', agencia: 'Matriz', perfil: 'dev' });
    como(DEV, 'salvarPessoa', { email: ANA, nome: 'Ana Atendente', agencia: '002', perfil: 'usuario' });
    como(DEV, 'salvarPessoa', { email: BIA, nome: 'Bia Atendente', agencia: '003', perfil: 'usuario' });
    como(DEV, 'salvarPessoa', { email: CAR, nome: 'Carlos Analista', agencia: 'Matriz', perfil: 'analista' });
    como(DEV, 'salvarPessoa', { email: DAV, nome: 'Davi Gerente', agencia: '002', perfil: 'gerente', acessos: [{ agencia: '002', perfil: 'usuario' }] });
    como(DEV, 'salvarPessoa', { email: EVA, nome: 'Eva Diretora', agencia: 'Matriz', perfil: 'diretoria' });
    como(DEV, 'salvarPessoa', { email: FAB, nome: 'Fábio Admin', agencia: '002', perfil: 'admin' });
    como(DEV, 'salvarLinks', { linkLogo: '', atalhos: [{ nome: 'Manual de crédito', link: 'https:' + '\\/\\/drive.google.com', descricao: 'Regras e alçadas' }] });
    const ck = { spc: true, scr: true, cadastro: true, renda: true, documentos: true, proposta: true };
    const op = (quem, x) => como(quem, 'salvarOperacao', Object.assign({ enviar: true, checklist: ck }, x)).ultimo;
    const base = (coop, conta, mesa, mod, valor, prazo, fin, ag, aval) => ({ cooperado: coop, conta: conta, numero_operacao: mesa, modalidade: mod, valor: valor, prazo: prazo, agencia: ag || '002',
      dados: { finalidade: fin, tem_avalista: aval ? 'sim' : 'não', tem_garantia: 'sim' } });
    const itens = { capacidade: 'ok', restricoes: 'ok', endividamento: 'ok', garantias: 'ok', documentacao: 'ok' };
    const ateDiretoria = (n, iap, rec, risco) => { como(CAR, 'analisarOperacao', n, { acao: 'concluir', itens: itens, risco: risco, recomendacao: rec, parecer: '' }); como(DAV, 'votarGerente', n, { acao: 'enviar', iap: iap }); };
    /* 1: liberada */
    let n = op(ANA, base('José Pereira', '10234-5', '700101', 'Financiamento de veículo', 38000, 36, 'Compra de carro usado'));
    ateDiretoria(n, '3,1', 'Favorável', 'A');
    como(EVA, 'decidirDiretoria', n, 'aprovar', '');
    como(ANA, 'liberarOperacao', n, { data: '05/11/2026', contrato: 'CT-0001', obs: '' });
    /* 2, 3 e 4: fila da diretoria (por ordem de chegada) */
    n = op(ANA, base('Mercado Bom Preço Ltda', '20871-0', '700102', 'Capital de giro', 120000, 24, 'Estoque para o fim de ano', '002', true));
    como(CAR, 'analisarOperacao', n, { acao: 'concluir', itens: Object.assign({}, itens, { endividamento: 'nok' }), risco: 'C', recomendacao: 'Favorável com ressalvas', parecer: 'Endividamento alto no SCR, mas o faturamento cobre.' });
    como(DAV, 'votarGerente', n, { acao: 'enviar', iap: '2,4', parecer: 'Cliente antigo.' });
    n = op(ANA, base('Luiz Carvalho', '30112-8', '700106', 'Crédito pessoal', 12000, 18, 'Reforma da cozinha'));
    ateDiretoria(n, '2,9', 'Favorável', 'B');
    n = op(DEV, base('Agropecuária Vale Verde', '40551-3', '700107', 'Crédito rural', 250000, 60, 'Compra de matrizes', '003', true));
    como(CAR, 'analisarOperacao', n, { acao: 'concluir', itens: itens, risco: 'B', recomendacao: 'Favorável', parecer: '' });
    como(DEV, 'votarGerente', n, { acao: 'enviar', iap: '3,8' });
    /* deixada para aprovação posterior ONTEM: hoje volta para a fila */
    n = op(ANA, base('Construtora Alfa Ltda', '70440-1', '700108', 'Capital de giro', 90000, 36, 'Capital para nova obra', '002', true));
    ateDiretoria(n, '2,2', 'Favorável com ressalvas', 'C');
    como(EVA, 'decidirDiretoria', n, 'estender', 'Ver balanço atualizado');
    (function () {
      const d = estado.abas.Operacoes.d, h = d[0], l = d.find(x => +x[h.indexOf('n')] === n);
      const dj = JSON.parse(l[h.indexOf('diretoria')]), ontem = new Date(Date.now() - 864e5);
      dj.adiadaDia = formatDate(ontem, '', 'yyyy-MM-dd'); dj.adiadaEm = formatDate(ontem, '', 'dd/MM/yyyy HH:mm');
      l[h.indexOf('diretoria')] = JSON.stringify(dj);
      l[h.indexOf('chegada')] = formatDate(new Date(Date.now() - 2 * 864e5), '', 'yyyy-MM-dd HH:mm:ss');
    })();
    /* 5: com o gerente */
    n = op(ANA, base('Fernanda Lima', '11873-2', '700103', 'Crédito pessoal', 8000, 12, 'Tratamento dentário'));
    como(CAR, 'analisarOperacao', n, { acao: 'concluir', itens: itens, risco: 'B', recomendacao: 'Favorável', parecer: 'Sem restrições.' });
    /* 6: em análise (agência 003) */
    op(BIA, base('Antônio Rocha', '50020-9', '700104', 'Crédito rural', 60000, 48, 'Custeio da safra', '003'));
    /* 7: pendente */
    n = op(ANA, base('Paulo Mendes', '60317-4', '700105', 'Consignado', 15000, 48, 'Quitar outra dívida'));
    como(CAR, 'analisarOperacao', n, { acao: 'pendencia', parecer: 'Falta o contracheque dos últimos 3 meses.' });
    /* 8: rascunho */
    como(ANA, 'salvarOperacao', { cooperado: 'Rita Souza', agencia: '002' });
    guardar();
  }

  let QUEM = PESSOAS[1][0];
  try { QUEM = localStorage.getItem(CHAVE + ':quem') || QUEM; } catch (e) {}
  const mk = (ok, fail) => new Proxy({}, { get: (_, k) => {
    if (k === 'withSuccessHandler') return f => mk(f, fail);
    if (k === 'withFailureHandler') return f => mk(ok, f);
    return (...a) => setTimeout(() => {
      let r, erro = null;
      try { r = JSON.parse(JSON.stringify(como(QUEM, k, ...JSON.parse(JSON.stringify(a))))); } catch (e) { erro = e; }
      guardar();
      if (erro) { if (fail) fail({ message: erro.message }); } else if (ok) ok(r);
    }, 250);
  } });
  window.google = { script: { run: mk() } };

  /* seletor "Testando como" */
  document.addEventListener('DOMContentLoaded', () => {
    const box = document.createElement('div');
    box.id = 'demoBox';
    box.innerHTML = '<style>body{padding-bottom:56px}#demoBox{position:fixed;left:12px;bottom:12px;z-index:85;display:flex;gap:6px;align-items:center;flex-wrap:wrap;max-width:calc(100vw - 24px);padding:6px 8px;border-radius:14px;background:#f4c21b;color:#16211a;font:600 12.5px Inter,system-ui,sans-serif;box-shadow:0 10px 30px -10px rgba(0,0,0,.45)}#demoBox select{height:30px;border-radius:8px;border:1px solid rgba(0,0,0,.2);background:#fff;color:#16211a;font:inherit;max-width:190px}#demoBox button{height:30px;border:0;border-radius:8px;background:rgba(0,0,0,.15);color:#16211a;font:inherit;padding:0 8px;cursor:pointer}</style>' +
      '<span>TESTE &middot; entrar como</span><select id="demoQuem"></select><button type="button" id="demoZerar" title="Apagar tudo e voltar aos dados de exemplo">Recomeçar</button>';
    document.body.appendChild(box);
    const sel = box.querySelector('select');
    const lista = PESSOAS.slice();
    try { (estado.abas.Usuarios.d || []).slice(1).forEach(l => { if (l[0] && !lista.some(p => p[0] === l[0])) lista.push([l[0], l[1] || l[0]]); }); } catch (e) {}
    sel.innerHTML = lista.map(p => '<option value="' + p[0] + '"' + (p[0] === QUEM ? ' selected' : '') + '>' + p[1] + '</option>').join('');
    sel.onchange = () => { try { localStorage.setItem(CHAVE + ':quem', sel.value); } catch (e) {} location.reload(); };
    box.querySelector('#demoZerar').onclick = () => { try { localStorage.removeItem(CHAVE); } catch (e) {} location.reload(); };
  });
})();
</script>
`;
const i = app.indexOf('<script>\nconst VERSAO_TELA');
if (i < 0) throw new Error('não achei o script principal no app.html');
fs.writeFileSync(path.join(__dirname, 'index.html'), app.slice(0, i) + simulador + app.slice(i));
console.log('demo/index.html montado (' + funcoes.length + ' funções do Code.gs)');
