/* Comitê de Crédito CrediBrás
 * Operações de crédito do cooperado:
 *   Atendente (mesa de negócios + checklist) > Análise > Gerente (IAP e voto) > Diretoria > Liberação (atendente)
 *
 * Histórico
 *   1  Primeira versão: operações de crédito com checklist da solicitação, análise com checklist
 *      (capacidade de pagamento etc.), IAP e voto do gerente, decisão da diretoria e liberação pela agência;
 *      pessoas e tipos de usuário, Trocar de acesso, Ver como, links e atalhos do dev.
 *   2  Sem CPF do cooperado (só a conta); avalista e garantia só sim/não; parecer da análise opcional;
 *      gerente envia com voto favorável automático; diretoria ganha "Análise estendida"; devolver sem motivo;
 *      ordem de chegada (coluna chegada) para a fila de cada etapa.
 */
const VERSAO = 2;
const VERSAO_DATA = '07/11/2026 16:12';   // dia/mês/ano hora:minuto da publicação (horário de Rondônia)

const NOME_SISTEMA = 'Comitê de Crédito';
const FUSO = 'America/Porto_Velho';
const AGENCIAS = ['Matriz', '001', '002', '003', '004'];

// ---------- ícone da aba do navegador (arquivo no Drive compartilhado como "Qualquer pessoa com o link") ----------
const FAVICON_URL = 'https://drive.google.com/file/d/1n77pd6-pobbzkxi6LUGdvX74AiuKuWPQ/view?usp=sharing';

// ---------- caminho da operação ----------
const ST = {
  RASCUNHO: 'Rascunho',          // atendente preenchendo
  ANALISE: 'Em análise',         // analista
  PENDENTE: 'Pendente',          // análise (ou gerente) devolveu ao atendente para corrigir
  GERENTE: 'Com o gerente',      // gerente inclui o IAP e vota
  DIRETORIA: 'Na diretoria',     // diretoria aprova
  ESTENDIDA: 'Análise estendida', // diretoria segurou para decidir em outro dia
  APROVADA: 'Aprovada',          // atendente libera
  LIBERADA: 'Liberada',          // fim
  REPROVADA: 'Reprovada',        // fim
  CANCELADA: 'Cancelada'         // dá para reativar
};
const STATUS = Object.keys(ST).map(k => ST[k]);
const PREPARO = [ST.RASCUNHO, ST.PENDENTE];
const CANCELAVEIS = [ST.RASCUNHO, ST.PENDENTE, ST.ANALISE, ST.GERENTE, ST.DIRETORIA, ST.ESTENDIDA];
const NA_DIRETORIA = [ST.DIRETORIA, ST.ESTENDIDA];

// ---------- listas da tela ----------
const MODALIDADES = ['Crédito pessoal', 'Capital de giro', 'Financiamento de veículo', 'Crédito rural',
  'Consignado', 'Cheque especial', 'Antecipação de recebíveis', 'Investimento', 'Outra'];
const CHECK_SOLICITACAO = [
  { id: 'spc', nome: 'Consulta SPC/Serasa', obrig: true },
  { id: 'scr', nome: 'Consulta SCR (Banco Central)', obrig: true },
  { id: 'cadastro', nome: 'Cadastro do cooperado atualizado', obrig: true },
  { id: 'renda', nome: 'Comprovante de renda ou faturamento', obrig: true },
  { id: 'documentos', nome: 'Documentos pessoais conferidos', obrig: true },
  { id: 'proposta', nome: 'Proposta assinada pelo cooperado', obrig: false }
];
const CHECK_ANALISE = [
  { id: 'capacidade', nome: 'Capacidade de pagamento' },
  { id: 'restricoes', nome: 'Restrições cadastrais (SPC/Serasa)' },
  { id: 'endividamento', nome: 'Endividamento (SCR)' },
  { id: 'garantias', nome: 'Garantias suficientes' },
  { id: 'documentacao', nome: 'Documentação completa' }
];
const RECOMENDACOES = ['Favorável', 'Favorável com ressalvas', 'Desfavorável'];
const RISCOS = ['AA', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// ---------- planilha ----------
const ABAS = {
  Operacoes: ['n', 'agencia', 'status', 'criado', 'atualizado', 'chegada', 'email', 'solicitante', 'cooperado', 'conta',
    'numero_operacao', 'modalidade', 'valor', 'prazo', 'dados', 'checklist', 'analise', 'gerente', 'diretoria',
    'liberacao', 'historico', 'excluida', 'rev'],
  Usuarios: ['email', 'nome', 'agencia', 'perfil', 'ativo', 'acessos'],
  Perfis: ['perfil', 'descricao', 'gerencia', 'tecnico', 'solicita', 'analisa', 'vota', 'aprova', 'libera'],
  Atalhos: ['nome', 'link', 'descricao']
};
const JSONS = { dados: {}, checklist: {}, analise: {}, gerente: {}, diretoria: {}, liberacao: {}, historico: [] };

// ---------- tipos de usuário ----------
const PERMS = ['solicita', 'analisa', 'vota', 'aprova', 'libera'];
const PERM_INFO = {
  solicita: 'Cadastra a operação e envia para análise',
  analisa: 'Faz a análise da operação',
  vota: 'Inclui o IAP e vota como gerente',
  aprova: 'Aprova ou reprova (diretoria)',
  libera: 'Registra a liberação da operação aprovada'
};
const FIXOS = ['usuario', 'admin', 'dev'];
const PERFIS_INICIAIS = [
  ['usuario', 'Atendente: cadastra a operação, envia para análise e faz a liberação', 'não', 'não', 'sim', 'não', 'não', 'não', 'sim'],
  ['admin', 'Atendente que também gerencia pessoas, tipos e links', 'sim', 'não', 'sim', 'não', 'não', 'não', 'sim'],
  ['dev', 'Admin com acesso técnico (planilha e código) e todas as etapas', 'sim', 'sim', 'sim', 'sim', 'sim', 'sim', 'sim'],
  ['analista', 'Analisa as operações e marca o checklist da análise', 'não', 'não', 'não', 'sim', 'não', 'não', 'não'],
  ['gerente', 'Inclui o IAP, vota e envia para a diretoria', 'não', 'não', 'não', 'não', 'sim', 'não', 'não'],
  ['diretoria', 'Aprova, reprova ou devolve as operações', 'não', 'não', 'não', 'não', 'não', 'sim', 'não']
];

// =====================================================================================
// Abrir a tela e ícone
// =====================================================================================
function doGet() {
  const saida = HtmlService.createHtmlOutputFromFile('app')
    .setTitle(NOME_SISTEMA + ' CrediBrás')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  aplicarIcone_(saida);
  return saida;
}

// aceita link do Drive (".../file/d/ID/view" ou "...?id=ID") e devolve o endereço direto da imagem
function linkImagem_(link) {
  const t = String(link || '').trim();
  if (!t) return '';
  const m = t.match(/\/d\/([\w-]{20,})/) || t.match(/[?&]id=([\w-]{20,})/);
  if (m && /google\.com/.test(t)) return 'https://lh3.googleusercontent.com/d/' + m[1];
  return /^https:\/\//.test(t) ? t : '';
}
// o Google só aceita ícone com final de imagem: tenta com "#.png" e depois o endereço puro
function aplicarIcone_(h) {
  const ico = linkImagem_(FAVICON_URL);
  if (!ico) return 'sem ícone configurado';
  const tentativas = /\.(png|ico|gif|jpe?g)(\?|#|$)/i.test(ico) ? [ico] : [ico + '#.png', ico];
  for (const u of tentativas) {
    try { h.setFaviconUrl(u); return 'ok: ' + u; } catch (e) { /* tenta o próximo */ }
  }
  return 'o Google recusou o endereço: ' + ico;
}
// rode no editor para conferir no Registro de execução
function testarIcone() {
  Logger.log('Resultado: ' + aplicarIcone_(HtmlService.createHtmlOutput('teste')));
}

// =====================================================================================
// Utilidades
// =====================================================================================
function ss_() { return SpreadsheetApp.getActive(); }
function agora_() { return Utilities.formatDate(new Date(), FUSO, 'dd/MM/yyyy HH:mm'); }
function chegada_() { return Utilities.formatDate(new Date(), FUSO, 'yyyy-MM-dd HH:mm:ss'); }   // ordena a fila
function norm_(e) { return String(e == null ? '' : e).toLowerCase().replace(/\s+/g, ''); }
function sim_(v) { return /^(sim|s|true|1|x|yes)$/i.test(String(v == null ? '' : v).trim()); }
function nao_(v) { return /^(n|não|nao|false|0|no)$/i.test(String(v == null ? '' : v).trim()); }
function seguro_(v) { return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v; }   // nunca vira fórmula
function ag_(v) {
  const t = String(v == null ? '' : v).trim();
  if (!t || /^matriz$/i.test(t)) return 'Matriz';
  return /^\d{1,3}$/.test(t) ? ('000' + t).slice(-3) : t;
}
function txt_(v, max, nome) {
  const t = String(v == null ? '' : v).trim();
  if (t.length > max) throw new Error(nome + ': máximo de ' + max + ' caracteres.');
  return t;
}
function num_(v) {                                     // aceita 1234.56, "1.234,56" e "R$ 1.234,56"
  if (typeof v === 'number') return isFinite(v) ? Math.round(v * 100) / 100 : 0;
  const t = String(v == null ? '' : v).replace(/[^\d,.-]/g, '');
  const n = +(t.indexOf(',') >= 0 ? t.replace(/\./g, '').replace(',', '.') : t);
  return isFinite(n) ? Math.round(n * 100) / 100 : 0;
}
function https_(v) {
  const t = String(v == null ? '' : v).trim();
  return /^https:\/\/[^\s"'<>]+$/i.test(t) ? t : '';
}
function digitos_(v) { return String(v == null ? '' : v).replace(/\D/g, ''); }
function dataOk_(v) {
  const m = String(v || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return false;
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  return d.getFullYear() === +m[3] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[1];
}
function nomePerfil_(p) {
  const n = { usuario: 'Usuário', admin: 'Admin', dev: 'Dev' }[p];
  return n || (String(p).charAt(0).toUpperCase() + String(p).slice(1)).replace(/_/g, ' ');
}
function labelAcesso_(a) {
  return (a.agencia === 'Matriz' ? 'Matriz' : 'Agência ' + a.agencia) + ' · ' + nomePerfil_(a.perfil);
}
const chave_ = a => a.agencia + '|' + a.perfil;
const clone_ = o => JSON.parse(JSON.stringify(o));

// =====================================================================================
// Planilha: tudo pelo NOME da coluna
// =====================================================================================
function aba_(nome) {
  let s = ss_().getSheetByName(nome);
  if (s) return s;
  s = ss_().insertSheet(nome);
  s.getRange(1, 1, 1, ABAS[nome].length).setValues([ABAS[nome]]).setFontWeight('bold');
  s.setFrozenRows(1);
  s.getRange('A:Z').setNumberFormat('@');              // texto: "001" continua "001", datas não viram data
  return s;
}
function cab_(s) {
  const c = s.getLastColumn();
  return c ? s.getRange(1, 1, 1, c).getValues()[0].map(x => String(x).trim()) : [];
}
function garanteCab_(nome) {                          // acrescenta colunas que faltam, nunca apaga
  const s = aba_(nome), h = cab_(s);
  const falta = ABAS[nome].filter(k => h.indexOf(k) < 0);
  if (falta.length) s.getRange(1, h.length + 1, 1, falta.length).setValues([falta]).setFontWeight('bold');
  return s;
}
function ler_(nome) {
  const s = aba_(nome);
  if (s.getLastRow() < 1) return [];
  const v = s.getDataRange().getValues(), h = (v.shift() || []).map(x => String(x).trim());
  const t = x => x instanceof Date ? Utilities.formatDate(x, FUSO, 'dd/MM/yyyy HH:mm') : x;
  const out = [];
  v.forEach((r, i) => {
    if (r.join('') === '') return;
    const o = {};
    h.forEach((k, j) => { if (k) o[k] = t(r[j]); });
    o._linha = i + 2;
    out.push(o);
  });
  return out;
}
function gravar_(s, r, o) {                            // grava pelo nome da coluna; o que não veio fica como estava
  const h = cab_(s);
  const atual = r <= s.getLastRow() ? s.getRange(r, 1, 1, h.length).getValues()[0] : [];
  s.getRange(r, 1, 1, h.length).setValues([h.map((k, i) => {
    if (!(k in o)) return atual[i] == null ? '' : atual[i];
    const v = k in JSONS ? JSON.stringify(o[k]) : (o[k] == null ? '' : o[k]);
    return seguro_(v);
  })]);
}
function comTrava_(fn) {                               // uma gravação por vez
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('Outra pessoa está salvando agora. Tente de novo em alguns segundos.');
  try { return fn(); } finally { lock.releaseLock(); }
}
function props_() { return PropertiesService.getScriptProperties(); }

// =====================================================================================
// Tipos de usuário e pessoas
// =====================================================================================
function perfis_() {
  const out = [];
  ler_('Perfis').forEach(p => {
    const nome = String(p.perfil || '').trim().toLowerCase();
    if (!nome || out.some(x => x.perfil === nome)) return;
    const o = { perfil: nome, nome: nomePerfil_(nome), descricao: String(p.descricao || ''), fixo: FIXOS.indexOf(nome) >= 0,
      gerencia: sim_(p.gerencia), tecnico: sim_(p.tecnico) };
    PERMS.forEach(k => { o[k] = sim_(p[k]); });
    if (nome === 'admin') o.gerencia = true;
    if (nome === 'dev') { o.gerencia = true; o.tecnico = true; PERMS.forEach(k => { o[k] = true; }); }
    if (nome === 'usuario') { o.gerencia = false; o.tecnico = false; }
    out.push(o);
  });
  return out;
}
function mapaPerfis_(lista) { const m = {}; (lista || perfis_()).forEach(p => { m[p.perfil] = p; }); return m; }

function extrasDe_(x) {                                // "Matriz:admin; 003:usuario" → lista
  return String(x.acessos || '').split(/[;,\n]/).map(t => t.trim()).filter(Boolean).map(t => {
    const i = t.indexOf(':');
    return i < 0 ? null : { agencia: ag_(t.slice(0, i)), perfil: t.slice(i + 1).trim().toLowerCase() };
  }).filter(Boolean);
}
function acessosDe_(x) {
  const lista = [{ agencia: ag_(x.agencia), perfil: String(x.perfil || '').trim().toLowerCase(), principal: true }]
    .concat(extrasDe_(x));
  const vistos = {};
  return lista.filter(a => (vistos[chave_(a)] ? false : (vistos[chave_(a)] = true)));
}
function formataExtras_(l) { return l.map(a => a.agencia + ':' + a.perfil).join('; '); }

function monta_(a, pm) {
  const p = pm[a.perfil];
  const perm = {};
  PERMS.forEach(k => { perm[k] = !!p[k]; });
  return { agencia: a.agencia, perfil: a.perfil, perm: perm, gerencia: !!p.gerencia, tecnico: !!p.tecnico,
    ve: a.agencia === 'Matriz' ? AGENCIAS.slice() : [a.agencia] };
}
function podeVerComo_(real, v, pm) {
  return !!(real.gerencia && v && pm[v.perfil] && AGENCIAS.indexOf(v.agencia) >= 0 && real.ve.indexOf(v.agencia) >= 0 &&
    (!pm[v.perfil].tecnico || real.tecnico));
}

// a pessoa conectada, com o acesso efetivo (o escolhido em Trocar de acesso, ou o do Ver como)
function eu_() {
  const email = norm_(Session.getActiveUser().getEmail());
  if (!email) throw new Error('Não deu para identificar seu e-mail. Entre com a conta Google da empresa.');
  const pm = mapaPerfis_();
  const x = ler_('Usuarios').find(p => norm_(p.email) === email);
  if (!x || nao_(x.ativo)) throw new Error('Acesso não liberado: o e-mail ' + email + ' não está cadastrado ou está desativado neste sistema. Peça a um administrador da sua agência para liberar.');
  const acessos = acessosDe_(x).filter(a => AGENCIAS.indexOf(a.agencia) >= 0 && pm[a.perfil]);
  if (!acessos.length) throw new Error('Acesso não liberado: a agência ou o tipo de usuário de ' + email + ' está errado na aba Usuarios. Peça a um administrador para corrigir.');
  const p = props_();
  const escolhido = acessos.find(a => chave_(a) === p.getProperty('acesso:' + email)) || acessos[0];
  const real = monta_(escolhido, pm);
  let ef = real, verComo = null;
  const vc = p.getProperty('vercomo:' + email);
  if (vc) {
    try {
      const v = JSON.parse(vc);
      if (podeVerComo_(real, v, pm)) { verComo = { agencia: v.agencia, perfil: v.perfil }; ef = monta_(verComo, pm); }
    } catch (e) { /* ignora */ }
  }
  return { email: email, nome: String(x.nome || email), agencia: ef.agencia, perfil: ef.perfil, perm: ef.perm,
    admin: ef.gerencia, tecnico: ef.tecnico, ve: ef.ve, acessos: acessos, acesso: escolhido,
    podeVerComo: real.gerencia, verComo: verComo, real: real, pm: pm };
}
function euGrava_() {
  const u = eu_();
  if (u.verComo) throw new Error('Você está no modo Ver como (' + labelAcesso_(u.verComo) + '). Saia dele para salvar.');
  return u;
}

// =====================================================================================
// Regras das operações (sempre conferidas aqui no servidor)
// =====================================================================================
const atende_ = (u, o) => u.ve.indexOf(o.agencia) >= 0;
function ve_(u, o) {
  if (o.excluida) return false;
  if (!u.verComo && o.email === u.email) return true;  // quem cadastrou sempre vê a sua
  if (!atende_(u, o)) return false;
  if (o.status === ST.RASCUNHO) return u.perm.solicita || u.admin;
  return true;
}
const podeEditar_ = (u, o) => PREPARO.indexOf(o.status) >= 0 && u.perm.solicita && atende_(u, o);
const podeAnalisar_ = (u, o) => o.status === ST.ANALISE && u.perm.analisa && atende_(u, o);
const podeVotar_ = (u, o) => o.status === ST.GERENTE && u.perm.vota && atende_(u, o);
const podeDecidir_ = (u, o) => NA_DIRETORIA.indexOf(o.status) >= 0 && u.perm.aprova && atende_(u, o);
const podeLiberar_ = (u, o) => o.status === ST.APROVADA && u.perm.libera && atende_(u, o);
const podeCancelar_ = (u, o) => CANCELAVEIS.indexOf(o.status) >= 0 && (u.perm.solicita || u.admin) && atende_(u, o);
const podeReativar_ = (u, o) => o.status === ST.CANCELADA && (u.perm.solicita || u.admin) && atende_(u, o);
const nuncaEnviada_ = o => !o.historico.some(h => h.etapa >= 1);
const podeExcluir_ = (u, o) => o.status === ST.RASCUNHO && nuncaEnviada_(o) && (u.perm.solicita || u.admin) && atende_(u, o);

function opObj_(x) {                                   // linha da planilha → operação
  const o = Object.assign({}, x);
  for (const k in JSONS) {
    try { o[k] = o[k] ? JSON.parse(o[k]) : clone_(JSONS[k]); } catch (e) { o[k] = clone_(JSONS[k]); }
  }
  o.n = +o.n; o.rev = +o.rev || 0; o.valor = num_(o.valor); o.prazo = parseInt(o.prazo, 10) || 0;
  o.email = norm_(o.email);
  o.agencia = ag_(o.agencia);
  o.excluida = sim_(o.excluida);
  if (STATUS.indexOf(o.status) < 0) o.status = ST.RASCUNHO;
  return o;
}
function hist_(o, u, acao, obs, etapa) {
  o.historico.push({ em: agora_(), por: u.nome, email: u.email, acao: acao, obs: obs || '', etapa: etapa });
}

// abre a operação dentro da trava, confere se ninguém mexeu, aplica fn e grava
function mexer_(n, rev, fn) {
  return comTrava_(() => {
    const s = aba_('Operacoes');
    const x = ler_('Operacoes').find(r => +r.n === +n);
    if (!x) throw new Error('Operação não encontrada. Clique em Atualizar.');
    const o = opObj_(x);
    if (rev != null && rev !== '' && +rev !== o.rev) throw new Error('Esta operação foi alterada por outra pessoa enquanto você mexia nela. Clique em Atualizar e confira.');
    const era = o.status;
    fn(o);
    o.atualizado = agora_(); o.rev++;
    if (o.status !== era && !(era === ST.DIRETORIA && o.status === ST.ESTENDIDA)) o.chegada = chegada_();
    delete o._linha;
    gravar_(s, x._linha, o);
    return o.n;
  });
}
function resposta_(n) { const r = getData(); r.ultimo = n || null; return r; }

// limpa e confere o que veio do formulário do atendente
function limpaOperacao_(d, u) {
  const dd = d.dados && typeof d.dados === 'object' ? d.dados : {};
  const ck = d.checklist && typeof d.checklist === 'object' ? d.checklist : {};
  const simNao = v => v === 'sim' || v === 'não' ? v : '';
  const checklist = {};
  CHECK_SOLICITACAO.forEach(c => { checklist[c.id] = ck[c.id] === true; });
  const x = {
    agencia: ag_(d.agencia || u.agencia),
    cooperado: txt_(d.cooperado, 150, 'Nome do cooperado'),
    conta: txt_(d.conta, 30, 'Conta corrente'),
    numero_operacao: txt_(d.numero_operacao, 40, 'Número da operação'),
    modalidade: MODALIDADES.indexOf(d.modalidade) >= 0 ? d.modalidade : '',
    valor: num_(d.valor),
    prazo: Math.max(0, Math.min(600, parseInt(digitos_(d.prazo), 10) || 0)),
    checklist: checklist,
    dados: {
      finalidade: txt_(dd.finalidade, 1000, 'Finalidade'),
      observacao: txt_(dd.observacao, 2000, 'Observações'),
      tem_avalista: simNao(dd.tem_avalista),
      tem_garantia: simNao(dd.tem_garantia)
    }
  };
  if (x.valor < 0) throw new Error('O valor não pode ser negativo.');
  if (!x.cooperado) throw new Error('Preencha pelo menos o nome do cooperado para salvar.');
  if (u.ve.indexOf(x.agencia) < 0) throw new Error('Você não pode cadastrar operação para a agência ' + x.agencia + '.');
  return x;
}
// o que falta para enviar para análise (a tela confere igual, aqui é a palavra final)
function faltaEnvio_(o) {
  const f = [];
  if (!o.numero_operacao) f.push('número da operação na mesa de negócios');
  if (!o.cooperado) f.push('nome do cooperado');
  if (!o.conta) f.push('conta do cooperado');
  if (!o.modalidade) f.push('modalidade');
  if (!(o.valor > 0)) f.push('valor');
  if (!(o.prazo > 0)) f.push('prazo');
  if (!o.dados.finalidade) f.push('finalidade');
  CHECK_SOLICITACAO.forEach(c => { if (c.obrig && !o.checklist[c.id]) f.push('checklist: ' + c.nome); });
  if (!o.dados.tem_avalista) f.push('se possui avalista');
  if (!o.dados.tem_garantia) f.push('se possui garantia');
  return f;
}

// =====================================================================================
// Funções chamadas pela tela: operações
// =====================================================================================

// cria (sem n) ou corrige (com n). Com d.enviar = true, já manda para a análise.
function salvarOperacao(d) {
  const u = euGrava_();
  if (!u.perm.solicita) throw new Error('Seu tipo de usuário não cadastra operações.');
  d = d || {};
  const x = limpaOperacao_(d, u);
  if (d.enviar) {
    const falta = faltaEnvio_(x);
    if (falta.length) throw new Error('Para enviar para análise, falta: ' + falta.join(', ') + '.');
  }
  let n;
  if (d.n) {
    n = mexer_(d.n, d.rev, o => {
      if (!podeEditar_(u, o)) throw new Error(PREPARO.indexOf(o.status) < 0 ? 'Esta operação já foi enviada (está "' + o.status + '") e não pode mais ser alterada.' : 'Você não pode alterar operações desta agência.');
      const era = o.status;
      Object.assign(o, x);
      hist_(o, u, 'corrigiu', '', 0);
      if (d.enviar) { o.status = ST.ANALISE; hist_(o, u, era === ST.PENDENTE ? 'reenviou para análise' : 'enviou para análise', '', 1); }
    });
  } else {
    n = comTrava_(() => {
      const s = aba_('Operacoes');
      const ns = ler_('Operacoes').map(r => +r.n || 0);
      const o = Object.assign({ n: Math.max.apply(null, [0].concat(ns)) + 1, status: ST.RASCUNHO, criado: agora_(),
        atualizado: agora_(), chegada: chegada_(), email: u.email, solicitante: u.nome, analise: {}, gerente: {}, diretoria: {},
        liberacao: {}, historico: [], excluida: '', rev: 1 }, x);
      hist_(o, u, 'criou', '', 0);
      if (d.enviar) { o.status = ST.ANALISE; hist_(o, u, 'enviou para análise', '', 1); }
      gravar_(s, s.getLastRow() + 1, o);
      return o.n;
    });
  }
  return resposta_(n);
}

// manda para a análise uma operação já salva
function enviarAnalise(n, rev) {
  const u = euGrava_();
  mexer_(n, rev, o => {
    if (!podeEditar_(u, o)) throw new Error(PREPARO.indexOf(o.status) < 0 ? 'Esta operação já foi enviada.' : 'Você não pode enviar operações desta agência.');
    const falta = faltaEnvio_(o);
    if (falta.length) throw new Error('Para enviar para análise, falta: ' + falta.join(', ') + '.');
    const era = o.status;
    o.status = ST.ANALISE;
    hist_(o, u, era === ST.PENDENTE ? 'reenviou para análise' : 'enviou para análise', '', 1);
  });
  return resposta_(n);
}

// analista: d = { acao: 'concluir' | 'pendencia', itens: {capacidade: 'ok'|'nok', ...}, risco, recomendacao, parecer }
function analisarOperacao(n, d, rev) {
  const u = euGrava_();
  d = d || {};
  const parecer = txt_(d.parecer, 4000, 'Parecer');
  mexer_(n, rev, o => {
    if (!podeAnalisar_(u, o)) throw new Error(o.status !== ST.ANALISE ? 'Esta operação não está aguardando análise (está "' + o.status + '").' : 'Você não analisa operações desta agência.');
    if (d.acao === 'pendencia') {
      o.status = ST.PENDENTE;
      o.analise = Object.assign({}, o.analise, { pendencia: { texto: parecer, por: u.nome, em: agora_() } });
      hist_(o, u, 'devolveu ao atendente', parecer, 1);
      return;
    }
    if (d.acao !== 'concluir') throw new Error('Ação inválida.');
    const itens = {}, sem = [];
    CHECK_ANALISE.forEach(c => {
      const v = d.itens && d.itens[c.id];
      if (v !== 'ok' && v !== 'nok') sem.push(c.nome); else itens[c.id] = v;
    });
    if (sem.length) throw new Error('Marque no checklist da análise: ' + sem.join(', ') + '.');
    if (RECOMENDACOES.indexOf(d.recomendacao) < 0) throw new Error('Escolha a recomendação da análise.');
    o.status = ST.GERENTE;
    o.analise = { itens: itens, risco: RISCOS.indexOf(d.risco) >= 0 ? d.risco : '', recomendacao: d.recomendacao,
      parecer: parecer, por: u.nome, email: u.email, em: agora_() };
    hist_(o, u, 'concluiu a análise', d.recomendacao, 2);
  });
  return resposta_(n);
}

// gerente: d = { acao: 'enviar' | 'devolver', iap, parecer }. Ao enviar, o voto do gerente é favorável.
function votarGerente(n, d, rev) {
  const u = euGrava_();
  d = d || {};
  const parecer = txt_(d.parecer, 4000, 'Parecer do gerente');
  mexer_(n, rev, o => {
    if (!podeVotar_(u, o)) throw new Error(o.status !== ST.GERENTE ? 'Esta operação não está com o gerente (está "' + o.status + '").' : 'Você não vota em operações desta agência.');
    if (d.acao === 'devolver') {
      o.status = ST.ANALISE;
      hist_(o, u, 'devolveu para a análise', parecer, 2);
      return;
    }
    if (d.acao !== 'enviar') throw new Error('Ação inválida.');
    const iapTxt = String(d.iap == null ? '' : d.iap).trim();
    if (!iapTxt || !/^-?[\d.,]+$/.test(iapTxt)) throw new Error('Informe o IAP (só números).');
    o.status = ST.DIRETORIA;
    o.gerente = { iap: num_(iapTxt), voto: 'Favorável', parecer: parecer, por: u.nome, email: u.email, em: agora_() };
    hist_(o, u, 'votou favorável e enviou à diretoria', parecer, 3);
  });
  return resposta_(n);
}

// diretoria: acao = 'aprovar' | 'reprovar' | 'devolver' | 'estender' (motivo só é obrigatório para reprovar)
function decidirDiretoria(n, acao, texto, rev) {
  const u = euGrava_();
  texto = txt_(texto, 4000, 'Parecer da diretoria');
  const st = { aprovar: ST.APROVADA, reprovar: ST.REPROVADA, devolver: ST.GERENTE, estender: ST.ESTENDIDA }[acao];
  if (!st) throw new Error('Ação inválida.');
  if (acao === 'reprovar' && !texto) throw new Error('Escreva o motivo para reprovar.');
  mexer_(n, rev, o => {
    if (!podeDecidir_(u, o)) throw new Error(NA_DIRETORIA.indexOf(o.status) < 0 ? 'Esta operação não está aguardando a diretoria (está "' + o.status + '").' : 'Você não aprova operações desta agência.');
    if (acao === 'estender' && o.status === ST.ESTENDIDA) throw new Error('Esta operação já está em análise estendida.');
    if (acao === 'devolver') hist_(o, u, 'devolveu ao gerente', texto, 3);
    else if (acao === 'estender') hist_(o, u, 'pediu análise estendida', texto, 3);
    else {
      o.diretoria = { decisao: st, texto: texto, por: u.nome, email: u.email, em: agora_() };
      hist_(o, u, acao === 'aprovar' ? 'aprovou' : 'reprovou', texto, acao === 'aprovar' ? 4 : 3);
    }
    o.status = st;
  });
  return resposta_(n);
}

// atendente da agência: d = { data: 'dd/mm/aaaa', contrato, obs }
function liberarOperacao(n, d, rev) {
  const u = euGrava_();
  d = d || {};
  const data = String(d.data || '').trim();
  if (!dataOk_(data)) throw new Error('Informe a data da liberação no formato dd/mm/aaaa.');
  const contrato = txt_(d.contrato, 40, 'Número do contrato');
  const obs = txt_(d.obs, 1000, 'Observação');
  mexer_(n, rev, o => {
    if (!podeLiberar_(u, o)) throw new Error(o.status !== ST.APROVADA ? 'Só operação aprovada pode ser liberada (esta está "' + o.status + '").' : 'Você não libera operações desta agência.');
    o.status = ST.LIBERADA;
    o.liberacao = { data: data, contrato: contrato, obs: obs, por: u.nome, email: u.email, em: agora_() };
    hist_(o, u, 'liberou', obs, 5);
  });
  return resposta_(n);
}

// cancelar = true desiste; false reativa (volta a Rascunho)
function cancelarOperacao(n, cancelar, motivo, rev) {
  const u = euGrava_();
  motivo = txt_(motivo, 500, 'Motivo');
  mexer_(n, rev, o => {
    if (cancelar) {
      if (!podeCancelar_(u, o)) throw new Error(o.status === ST.CANCELADA ? 'Já está cancelada.' : 'Esta operação não pode ser cancelada (está "' + o.status + '").');
      if (!motivo) throw new Error('Escreva o motivo do cancelamento.');
      o.status = ST.CANCELADA;
      hist_(o, u, 'cancelou', motivo, 0);
    } else {
      if (!podeReativar_(u, o)) throw new Error('Só operação cancelada pode ser reativada.');
      o.status = ST.RASCUNHO;
      hist_(o, u, 'reativou', motivo, 0);
    }
  });
  return resposta_(n);
}

// rascunho que nunca foi enviado: some da lista (dá para desfazer)
function excluirOperacao(n, rev) {
  const u = euGrava_();
  mexer_(n, rev, o => {
    if (!podeExcluir_(u, o)) throw new Error('Só dá para excluir rascunho que nunca foi enviado para análise.');
    o.excluida = 'sim';
    hist_(o, u, 'excluiu', '', 0);
  });
  return resposta_(n);
}
function restaurarOperacao(n) {
  const u = euGrava_();
  mexer_(n, null, o => {
    if (!o.excluida || o.status !== ST.RASCUNHO || !(u.perm.solicita || u.admin) || !atende_(u, o)) throw new Error('Esta operação não pode ser restaurada.');
    o.excluida = '';
    hist_(o, u, 'restaurou', '', 0);
  });
  return resposta_(n);
}

// =====================================================================================
// Carga da tela
// =====================================================================================
function getData() {
  const u = eu_();
  const pm = u.pm;
  const ops = ler_('Operacoes').map(opObj_).filter(o => ve_(u, o)).map(o => {
    delete o._linha;
    return Object.assign(o, {
      meu: o.email === u.email,
      editar: podeEditar_(u, o), analisar: podeAnalisar_(u, o), votar: podeVotar_(u, o), decidir: podeDecidir_(u, o),
      liberar: podeLiberar_(u, o), cancelar: podeCancelar_(u, o), reativar: podeReativar_(u, o), excluir: podeExcluir_(u, o)
    });
  }).sort((a, b) => b.n - a.n);

  let pessoas = [];
  if (u.admin) {
    pessoas = ler_('Usuarios').filter(p => p.email && u.ve.indexOf(ag_(p.agencia)) >= 0).map(p => ({
      email: norm_(p.email), nome: String(p.nome || ''), agencia: ag_(p.agencia), perfil: String(p.perfil || '').trim().toLowerCase(),
      ativo: !nao_(p.ativo), acessos: extrasDe_(p), eu: norm_(p.email) === u.email
    })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }
  const atalhos = ler_('Atalhos').map(a => ({ nome: String(a.nome || '').trim(), link: https_(a.link), descricao: String(a.descricao || '').trim() }))
    .filter(a => a.nome && a.link);
  const perfis = perfis_();
  return {
    sistema: NOME_SISTEMA,
    versao: { numero: VERSAO, data: VERSAO_DATA },
    eu: {
      email: u.email, nome: u.nome, agencia: u.agencia, perfil: u.perfil, perm: u.perm, admin: u.admin, tecnico: u.tecnico,
      ve: u.ve, matriz: u.agencia === 'Matriz',
      acesso: { agencia: u.acesso.agencia, perfil: u.acesso.perfil, chave: chave_(u.acesso), label: labelAcesso_(u.acesso) },
      acessos: u.acessos.map(a => ({ agencia: a.agencia, perfil: a.perfil, chave: chave_(a), label: labelAcesso_(a) })),
      podeVerComo: u.podeVerComo,
      verComo: u.verComo ? { agencia: u.verComo.agencia, perfil: u.verComo.perfil, label: labelAcesso_(u.verComo) } : null,
      verComoOpcoes: u.podeVerComo ? {
        agencias: u.real.ve,
        perfis: perfis.filter(p => !p.tecnico || u.real.tecnico).map(p => ({ perfil: p.perfil, nome: p.nome }))
      } : null,
      podeDev: u.real.tecnico
    },
    agencias: AGENCIAS,
    perfis: perfis,
    permInfo: PERM_INFO,
    listas: { modalidades: MODALIDADES, checkSolicitacao: CHECK_SOLICITACAO,
      checkAnalise: CHECK_ANALISE, recomendacoes: RECOMENDACOES, riscos: RISCOS, status: STATUS },
    operacoes: ops,
    pessoas: pessoas,
    central: u.tecnico ? {
      planilha: ss_().getUrl(),
      codigo: 'https://script.google.com/d/' + ScriptApp.getScriptId() + '/edit'
    } : null,
    linkLogo: https_(props_().getProperty('link_logo')),
    atalhos: atalhos
  };
}

// =====================================================================================
// Meu acesso: Trocar de acesso e Ver como
// =====================================================================================
function trocarAcesso(chave) {
  const u = eu_();
  const a = u.acessos.find(x => chave_(x) === chave);
  if (!a) throw new Error('Este acesso não é seu.');
  props_().setProperty('acesso:' + u.email, chave);
  props_().deleteProperty('vercomo:' + u.email);
  return getData();
}
function verComo(agencia, perfil) {
  const u = eu_();
  const v = { agencia: ag_(agencia), perfil: String(perfil || '').trim().toLowerCase() };
  if (!u.real.gerencia) throw new Error('Só quem gerencia pode usar o Ver como.');
  if (!podeVerComo_(u.real, v, u.pm)) throw new Error('Você não pode ver como ' + labelAcesso_(v) + '.');
  props_().setProperty('vercomo:' + u.email, JSON.stringify(v));
  return getData();
}
function sairVerComo() {
  const email = norm_(Session.getActiveUser().getEmail());
  props_().deleteProperty('vercomo:' + email);
  return getData();
}

// =====================================================================================
// Pessoas
// =====================================================================================
function temTecnico_(acessos, pm) { return acessos.some(a => pm[a.perfil] && pm[a.perfil].tecnico); }
function checaSobra_(lista, pm) {
  const ativos = lista.filter(p => p.email && !nao_(p.ativo));
  if (!ativos.some(p => acessosDe_(p).some(a => a.agencia === 'Matriz' && pm[a.perfil] && pm[a.perfil].gerencia)))
    throw new Error('Precisa sobrar pelo menos uma pessoa ativa que gerencia na Matriz.');
  if (!ativos.some(p => temTecnico_(acessosDe_(p), pm)))
    throw new Error('Precisa sobrar pelo menos um dev ativo.');
}

// d = { emailOriginal, email, nome, agencia, perfil, ativo, acessos: [{agencia, perfil}] }
function salvarPessoa(d) {
  const u = euGrava_();
  if (!u.admin) throw new Error('Seu acesso não gerencia pessoas.');
  d = d || {};
  comTrava_(() => {
    const pm = mapaPerfis_();
    const lista = ler_('Usuarios');
    const orig = norm_(d.emailOriginal);
    const velho = orig ? lista.find(p => norm_(p.email) === orig) : null;
    if (orig && !velho) throw new Error('Pessoa não encontrada. Clique em Atualizar.');
    const email = norm_(d.email);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('E-mail inválido.');
    if (lista.some(p => p !== velho && norm_(p.email) === email)) throw new Error('Este e-mail já está cadastrado.');
    const nome = txt_(d.nome, 120, 'Nome');
    if (nome.length < 2) throw new Error('Preencha o nome da pessoa.');
    const agencia = ag_(d.agencia), perfil = String(d.perfil || '').trim().toLowerCase();
    if (AGENCIAS.indexOf(agencia) < 0) throw new Error('Escolha a agência.');
    if (!pm[perfil]) throw new Error('Escolha o tipo de usuário.');
    const ativo = d.ativo !== false;
    const proprio = !!velho && norm_(velho.email) === u.email;
    if (proprio && email !== orig) throw new Error('Você não pode mudar o seu próprio e-mail.');
    if (proprio && !ativo) throw new Error('Você não pode desativar a si mesmo.');
    if (velho && u.ve.indexOf(ag_(velho.agencia)) < 0) throw new Error('Esta pessoa é de outra agência. Só a Matriz pode alterá-la.');
    if (u.ve.indexOf(agencia) < 0) throw new Error('Você só cadastra pessoas da sua agência (' + u.agencia + ').');

    const vistos = {};
    const novos = (Array.isArray(d.acessos) ? d.acessos : []).map(a => ({ agencia: ag_(a && a.agencia), perfil: String(a && a.perfil || '').trim().toLowerCase() }))
      .filter(a => AGENCIAS.indexOf(a.agencia) >= 0 && pm[a.perfil] && !(a.agencia === agencia && a.perfil === perfil))
      .filter(a => (vistos[chave_(a)] ? false : (vistos[chave_(a)] = true)));
    if (novos.some(a => u.ve.indexOf(a.agencia) < 0)) throw new Error('Você só dá acessos da sua agência (' + u.agencia + ').');
    const fora = velho ? extrasDe_(velho).filter(a => u.ve.indexOf(a.agencia) < 0 && !vistos[chave_(a)]) : [];
    const extras = fora.concat(novos).slice(0, 10);

    const antes = velho ? acessosDe_(velho) : [];
    const depois = acessosDe_({ agencia: agencia, perfil: perfil, acessos: formataExtras_(extras) });
    const tec = l => l.filter(a => pm[a.perfil] && pm[a.perfil].tecnico).map(chave_).sort().join(',');
    if (!u.tecnico && tec(antes) !== tec(depois)) throw new Error('Só um dev pode dar ou tirar o tipo dev (ou outro tipo técnico).');
    if (!u.tecnico && velho && temTecnico_(antes, pm) && nao_(velho.ativo) !== !ativo) throw new Error('Só um dev pode ativar ou desativar um dev.');
    const chaves = l => l.map(chave_).sort().join(',');
    if (proprio && !u.tecnico && chaves(antes) !== chaves(depois)) throw new Error('Você não pode mudar os seus próprios acessos. Peça a outro administrador.');

    const obj = Object.assign({}, velho || {}, { email: email, nome: nome, agencia: agencia, perfil: perfil,
      ativo: ativo ? 'sim' : 'não', acessos: formataExtras_(extras) });
    const nova = velho ? lista.map(p => (p === velho ? obj : p)) : lista.concat([obj]);
    checaSobra_(nova, pm);
    const s = aba_('Usuarios');
    delete obj._linha;
    gravar_(s, velho ? velho._linha : s.getLastRow() + 1, obj);
    if (proprio) props_().deleteProperty('acesso:' + u.email);
  });
  return getData();
}

function excluirPessoa(email) {
  const u = euGrava_();
  if (!u.admin) throw new Error('Seu acesso não gerencia pessoas.');
  email = norm_(email);
  comTrava_(() => {
    const pm = mapaPerfis_();
    const lista = ler_('Usuarios');
    const p = lista.find(x => norm_(x.email) === email);
    if (!p) throw new Error('Pessoa não encontrada. Clique em Atualizar.');
    if (email === u.email) throw new Error('Você não pode excluir a si mesmo.');
    if (u.ve.indexOf(ag_(p.agencia)) < 0) throw new Error('Esta pessoa é de outra agência. Só a Matriz pode excluí-la.');
    if (extrasDe_(p).some(a => u.ve.indexOf(a.agencia) < 0)) throw new Error('Esta pessoa tem acesso em outra agência. Só a Matriz pode excluí-la.');
    if (!u.tecnico && temTecnico_(acessosDe_(p), pm)) throw new Error('Só um dev pode excluir um dev.');
    checaSobra_(lista.filter(x => x !== p), pm);
    aba_('Usuarios').deleteRow(p._linha);
  });
  return getData();
}

// =====================================================================================
// Tipos de usuário (só quem gerencia, na Matriz)
// =====================================================================================
// d = { perfil, novo: true|false, descricao, gerencia, tecnico, solicita, analisa, vota, aprova, libera }
function salvarTipo(d) {
  const u = euGrava_();
  if (!u.admin || u.agencia !== 'Matriz') throw new Error('Só quem gerencia na Matriz cria ou altera tipos de usuário.');
  d = d || {};
  comTrava_(() => {
    const pm = mapaPerfis_();
    const descricao = txt_(d.descricao, 200, 'Descrição');
    let nome = String(d.perfil || '').trim().toLowerCase();
    if (d.novo) nome = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (!/^[a-z0-9_]{2,30}$/.test(nome)) throw new Error('Nome do tipo: de 2 a 30 letras ou números, sem espaço.');
    const velho = ler_('Perfis').find(p => String(p.perfil).trim().toLowerCase() === nome);
    if (d.novo && velho) throw new Error('Já existe um tipo chamado "' + nome + '".');
    if (!d.novo && !velho) throw new Error('Tipo não encontrado. Clique em Atualizar.');
    const fixo = FIXOS.indexOf(nome) >= 0;
    const obj = { perfil: nome, descricao: descricao };
    if (!fixo) {
      const querTec = d.tecnico === true;
      if ((querTec || (pm[nome] && pm[nome].tecnico)) && !u.tecnico) throw new Error('Só um dev cria ou altera um tipo técnico.');
      obj.gerencia = d.gerencia === true ? 'sim' : 'não';
      obj.tecnico = querTec ? 'sim' : 'não';
      PERMS.forEach(k => { obj[k] = d[k] === true ? 'sim' : 'não'; });
    }
    if (!d.novo && !fixo) {                            // confere antes de gravar: sempre sobra gestor na Matriz e dev
      const pm2 = clone_(pm);
      pm2[nome] = Object.assign({}, pm2[nome], { gerencia: obj.gerencia === 'sim', tecnico: obj.tecnico === 'sim' });
      checaSobra_(ler_('Usuarios'), pm2);
    }
    const s = aba_('Perfis');
    gravar_(s, velho ? velho._linha : s.getLastRow() + 1, obj);
  });
  return getData();
}

function excluirTipo(perfil) {
  const u = euGrava_();
  if (!u.admin || u.agencia !== 'Matriz') throw new Error('Só quem gerencia na Matriz exclui tipos de usuário.');
  perfil = String(perfil || '').trim().toLowerCase();
  comTrava_(() => {
    const pm = mapaPerfis_();
    if (FIXOS.indexOf(perfil) >= 0) throw new Error('Os tipos usuario, admin e dev não podem ser excluídos.');
    const p = ler_('Perfis').find(x => String(x.perfil).trim().toLowerCase() === perfil);
    if (!p) throw new Error('Tipo não encontrado. Clique em Atualizar.');
    if (pm[perfil] && pm[perfil].tecnico && !u.tecnico) throw new Error('Só um dev exclui um tipo técnico.');
    const usando = ler_('Usuarios').filter(x => acessosDe_(x).some(a => a.perfil === perfil));
    if (usando.length) throw new Error('Este tipo está em uso por ' + usando.length + ' pessoa(s). Troque o tipo dessas pessoas antes de excluir.');
    aba_('Perfis').deleteRow(p._linha);
  });
  return getData();
}

// =====================================================================================
// Links: logo do topo e menu "Links e guias"
// =====================================================================================
function salvarLinks(d) {
  const u = euGrava_();
  if (!u.admin || u.agencia !== 'Matriz') throw new Error('Só quem gerencia na Matriz altera os links.');
  d = d || {};
  const logoTxt = String(d.linkLogo || '').trim();
  const linkLogo = https_(logoTxt);
  if (logoTxt && !linkLogo) throw new Error('Link da logo: use um endereço que comece com https://');
  const lista = Array.isArray(d.atalhos) ? d.atalhos : [];
  if (lista.length > 30) throw new Error('No máximo 30 links.');
  const atalhos = lista.map((a, i) => {
    const nome = txt_(a && a.nome, 80, 'Nome do link ' + (i + 1));
    const link = https_(a && a.link);
    if (!nome) throw new Error('Link ' + (i + 1) + ': preencha o nome.');
    if (!link) throw new Error('Link ' + (i + 1) + ' (' + nome + '): use um endereço que comece com https://');
    return { nome: nome, link: link, descricao: txt_(a && a.descricao, 120, 'Descrição do link ' + (i + 1)) };
  });
  comTrava_(() => {
    if (linkLogo) props_().setProperty('link_logo', linkLogo); else props_().deleteProperty('link_logo');
    const s = garanteCab_('Atalhos'), h = cab_(s);
    if (s.getLastRow() > 1) s.getRange(2, 1, s.getLastRow() - 1, h.length).clearContent();
    if (atalhos.length) s.getRange(2, 1, atalhos.length, h.length).setValues(atalhos.map(a => h.map(k => seguro_(a[k] == null ? '' : a[k]))));
  });
  return getData();
}

// =====================================================================================
// Editor: setup e diagnóstico
// =====================================================================================
// cria abas, cabeçalhos, tipos iniciais e listas suspensas. Pode rodar várias vezes: nunca apaga dados.
function setup() {
  Object.keys(ABAS).forEach(n => { garanteCab_(n).getRange('A:Z').setNumberFormat('@'); });
  const existentes = ler_('Perfis').map(p => String(p.perfil).trim().toLowerCase());
  const sp = aba_('Perfis'), hp = cab_(sp);
  PERFIS_INICIAIS.forEach(l => {
    if (existentes.indexOf(l[0]) >= 0) return;
    const o = {};
    ABAS.Perfis.forEach((k, i) => { o[k] = l[i]; });
    gravar_(sp, sp.getLastRow() + 1, o);
  });

  const su = aba_('Usuarios'), hu = cab_(su);
  const col = k => hu.indexOf(k) + 1;
  const regra = l => SpreadsheetApp.newDataValidation().requireValueInList(l, true).setAllowInvalid(false).build();
  su.getRange(2, col('agencia'), 999, 1).setDataValidation(regra(AGENCIAS));
  su.getRange(2, col('ativo'), 999, 1).setDataValidation(regra(['sim', 'não']));
  su.getRange(2, col('perfil'), 999, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInRange(sp.getRange(2, hp.indexOf('perfil') + 1, 999, 1), true).setAllowInvalid(false).build());

  // primeiro dev: quem roda o setup, se ainda não houver nenhum
  const email = norm_(Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail());
  const pm = mapaPerfis_();
  const lista = ler_('Usuarios');
  if (!lista.some(p => !nao_(p.ativo) && temTecnico_(acessosDe_(p), pm)) && email) {
    const x = lista.find(p => norm_(p.email) === email);
    const obj = { email: email, nome: x ? (x.nome || email.split('@')[0]) : email.split('@')[0], agencia: 'Matriz', perfil: 'dev', ativo: 'sim' };
    gravar_(su, x ? x._linha : su.getLastRow() + 1, obj);
    Logger.log('Você (' + email + ') virou dev da Matriz.');
  }
  Logger.log('Setup concluído. Versão ' + VERSAO + '.');
}

function diagnostico() {
  Logger.log(NOME_SISTEMA + ' · Versão ' + VERSAO + ' · Publicada em ' + VERSAO_DATA);
  Logger.log('Planilha: ' + ss_().getName() + ' (' + ss_().getUrl() + ')');
  try {
    const u = eu_();
    Logger.log('Pessoa: ' + u.nome + ' <' + u.email + '>');
    Logger.log('Acesso em uso: ' + labelAcesso_(u.acesso) + (u.verComo ? ' · Ver como ' + labelAcesso_(u.verComo) : ''));
    Logger.log('Acessos: ' + u.acessos.map(labelAcesso_).join(' | '));
    Logger.log('Vê as agências: ' + u.ve.join(', ') + ' · Gerencia: ' + (u.admin ? 'sim' : 'não') + ' · Técnico: ' + (u.tecnico ? 'sim' : 'não'));
    Logger.log('Etapas: ' + PERMS.filter(k => u.perm[k]).join(', '));
    Logger.log('Operações que vê: ' + getData().operacoes.length);
  } catch (e) {
    Logger.log('Pessoa: ' + e.message);
  }
}
