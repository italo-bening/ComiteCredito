/* Testes do Code.gs com planilha simulada: node testes/servidor.test.js */
const { criar } = require('./simulador');
const { ctx, estado, como } = criar();
let ok = 0, falhas = 0;
const t = (nome, fn) => { try { fn(); ok++; console.log('  ok   ' + nome); } catch (e) { falhas++; console.log('  FALHA ' + nome + '\n        ' + e.message); } };
const igual = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || '') + ' esperado ' + JSON.stringify(b) + ' veio ' + JSON.stringify(a)); };
const barra = (fn, trecho) => { try { fn(); } catch (e) { if (trecho && e.message.indexOf(trecho) < 0) throw new Error('mensagem errada: ' + e.message); return; } throw new Error('deveria ter sido barrado'); };

const DEV = 'dev@credisis.com.br', AT2 = 'atendente2@credisis.com.br', AT3 = 'atendente3@credisis.com.br',
  AN = 'analista@credisis.com.br', GE = 'gerente2@credisis.com.br', DI = 'diretor@credisis.com.br', AD2 = 'admin2@credisis.com.br';
const op = (r, n) => r.operacoes.find(o => o.n === n);

const OP = {
  cooperado: 'Maria da Silva', conta: '12345-6', numero_operacao: 'MN-2026-0001',
  modalidade: 'Crédito pessoal', valor: 'R$ 15.000,00', prazo: '24', agencia: '002',
  checklist: { spc: true, scr: true, cadastro: true, renda: true, documentos: true, proposta: false },
  dados: { finalidade: 'Reforma da casa', tem_avalista: 'sim', tem_garantia: 'não' }
};

console.log('Setup e pessoas');
t('setup torna dev quem roda', () => {
  estado.email = DEV; ctx.setup(); ctx.setup();   // duas vezes: não duplica nada
  const r = como(DEV, 'getData');
  igual(r.eu.perfil, 'dev'); igual(r.eu.agencia, 'Matriz'); igual(r.perfis.length, 6);
  if (!r.central || !r.central.codigo.includes('SCRIPTID')) throw new Error('sem atalhos do dev');
});
t('e-mail não cadastrado: Acesso não liberado', () => barra(() => como('x@y.com', 'getData'), 'Acesso não liberado'));
t('dev cadastra as pessoas', () => {
  como(DEV, 'salvarPessoa', { email: AT2, nome: 'Ana Atendente', agencia: '002', perfil: 'usuario' });
  como(DEV, 'salvarPessoa', { email: AT3, nome: 'Bia Atendente', agencia: '003', perfil: 'usuario' });
  como(DEV, 'salvarPessoa', { email: AN, nome: 'Carlos Analista', agencia: 'Matriz', perfil: 'analista' });
  como(DEV, 'salvarPessoa', { email: GE, nome: 'Davi Gerente', agencia: '002', perfil: 'gerente', acessos: [{ agencia: '002', perfil: 'usuario' }] });
  como(DEV, 'salvarPessoa', { email: DI, nome: 'Eva Diretora', agencia: 'Matriz', perfil: 'diretoria' });
  const r = como(DEV, 'salvarPessoa', { email: ' ADMIN2@credisis.com.br ', nome: 'Fábio Admin', agencia: '002', perfil: 'admin' });
  igual(r.pessoas.length, 7);
  if (!r.pessoas.find(p => p.email === AD2)) throw new Error('e-mail não normalizado');
});
t('e-mail repetido é recusado', () => barra(() => como(DEV, 'salvarPessoa', { email: 'Atendente2@credisis.com.br', nome: 'X', agencia: '002', perfil: 'usuario' }), 'já está cadastrado'));
t('admin de agência não cadastra na Matriz', () => barra(() => como(AD2, 'salvarPessoa', { email: 'n@c.com', nome: 'Novo', agencia: 'Matriz', perfil: 'usuario' }), 'sua agência'));
t('admin de agência não dá acesso de outra agência', () => barra(() => como(AD2, 'salvarPessoa', { email: 'n@c.com', nome: 'Novo', agencia: '002', perfil: 'usuario', acessos: [{ agencia: '003', perfil: 'usuario' }] }), 'sua agência'));
t('admin de agência não dá o tipo dev', () => barra(() => como(AD2, 'salvarPessoa', { email: 'n@c.com', nome: 'Novo', agencia: '002', perfil: 'dev' }), 'Só um dev'));
t('admin de agência não edita pessoa de outra agência', () => barra(() => como(AD2, 'salvarPessoa', { emailOriginal: AT3, email: AT3, nome: 'Bia', agencia: '002', perfil: 'usuario' }), 'outra agência'));
t('admin de agência só vê pessoas da agência', () => { const r = como(AD2, 'getData'); igual(r.pessoas.map(p => p.agencia).every(a => a === '002'), true); });
t('admin de agência cadastra na própria agência', () => { const r = como(AD2, 'salvarPessoa', { email: 'novo2@c.com', nome: 'Novo 002', agencia: '002', perfil: 'usuario' }); if (!r.pessoas.find(p => p.email === 'novo2@c.com')) throw new Error('não gravou'); });
t('ninguém se desativa', () => barra(() => como(AD2, 'salvarPessoa', { emailOriginal: AD2, email: AD2, nome: 'Fábio', agencia: '002', perfil: 'admin', ativo: false }), 'desativar a si'));
t('ninguém muda o próprio e-mail', () => barra(() => como(AD2, 'salvarPessoa', { emailOriginal: AD2, email: 'outro@c.com', nome: 'Fábio', agencia: '002', perfil: 'admin' }), 'próprio e-mail'));
t('quem não é dev não muda os próprios acessos', () => barra(() => como(AD2, 'salvarPessoa', { emailOriginal: AD2, email: AD2, nome: 'Fábio', agencia: '002', perfil: 'usuario' }), 'próprios acessos'));
t('dev pode mudar o próprio acesso', () => { como(DEV, 'salvarPessoa', { emailOriginal: DEV, email: DEV, nome: 'Dev', agencia: 'Matriz', perfil: 'dev', acessos: [{ agencia: '002', perfil: 'usuario' }] }); });
t('ninguém se exclui', () => barra(() => como(DEV, 'excluirPessoa', DEV), 'excluir a si'));
t('sempre sobra um dev ativo', () => barra(() => como(DEV, 'salvarPessoa', { emailOriginal: DEV, email: DEV, nome: 'Dev', agencia: 'Matriz', perfil: 'admin' }), 'um dev ativo'));
t('admin de agência não exclui o dev', () => barra(() => como(AD2, 'excluirPessoa', DEV), 'outra agência'));
t('excluir pessoa e desfazer', () => {
  let r = como(AD2, 'excluirPessoa', 'novo2@c.com'); igual(!!r.pessoas.find(p => p.email === 'novo2@c.com'), false);
  r = como(AD2, 'salvarPessoa', { email: 'novo2@c.com', nome: 'Novo 002', agencia: '002', perfil: 'usuario' }); igual(!!r.pessoas.find(p => p.email === 'novo2@c.com'), true);
});
t('desativado não entra', () => {
  como(DEV, 'salvarPessoa', { emailOriginal: 'novo2@c.com', email: 'novo2@c.com', nome: 'Novo 002', agencia: '002', perfil: 'usuario', ativo: false });
  barra(() => como('novo2@c.com', 'getData'), 'Acesso não liberado');
});

console.log('Tipos de usuário');
t('admin de agência não cria tipo', () => barra(() => como(AD2, 'salvarTipo', { novo: true, perfil: 'caixa', descricao: 'x' }), 'Matriz'));
t('dev cria tipo novo (nome normalizado)', () => { const r = como(DEV, 'salvarTipo', { novo: true, perfil: 'Comitê Local', descricao: 'teste', vota: true }); const p = r.perfis.find(p => p.perfil === 'comite_local'); if (!p || !p.vota || p.aprova) throw new Error('tipo errado'); });
t('tipo repetido é recusado', () => barra(() => como(DEV, 'salvarTipo', { novo: true, perfil: 'comite_local', descricao: 'x' }), 'Já existe'));
t('tipo fixo não é excluído', () => barra(() => como(DEV, 'excluirTipo', 'admin'), 'não podem ser excluídos'));
t('tipo em uso não é excluído', () => barra(() => como(DEV, 'excluirTipo', 'gerente'), 'em uso'));
t('tipo fixo: só a descrição muda', () => { const r = como(DEV, 'salvarTipo', { perfil: 'usuario', descricao: 'Atendente da agência', gerencia: true, aprova: true }); const p = r.perfis.find(p => p.perfil === 'usuario'); igual([p.descricao, p.gerencia, p.aprova], ['Atendente da agência', false, false]); });
t('tipo livre é excluído', () => { const r = como(DEV, 'excluirTipo', 'comite_local'); igual(!!r.perfis.find(p => p.perfil === 'comite_local'), false); });

console.log('Caminho da operação');
let N;
t('atendente salva rascunho', () => { const r = como(AT2, 'salvarOperacao', { cooperado: 'Maria', agencia: '002' }); N = r.ultimo; igual(op(r, N).status, 'Rascunho'); igual(op(r, N).excluir, true); });
t('não envia incompleto (lista o que falta)', () => barra(() => como(AT2, 'enviarAnalise', N, null), 'número da operação na mesa de negócios'));
t('sem a conta não envia', () => barra(() => como(AT2, 'salvarOperacao', Object.assign({}, OP, { enviar: true, conta: '' })), 'conta do cooperado'));
t('sem responder avalista não envia', () => barra(() => como(AT2, 'salvarOperacao', Object.assign({}, OP, { enviar: true, dados: Object.assign({}, OP.dados, { tem_avalista: '' }) })), 'se possui avalista'));
t('atendente de outra agência não cadastra para 002', () => barra(() => como(AT3, 'salvarOperacao', OP), 'agência 002'));
t('analista não cadastra operação', () => barra(() => como(AN, 'salvarOperacao', OP), 'não cadastra'));
t('corrige e envia para análise', () => {
  let r = como(AT2, 'getData'); const o = op(r, N);
  r = como(AT2, 'salvarOperacao', Object.assign({}, OP, { n: N, rev: o.rev, enviar: true }));
  igual(op(r, N).status, 'Em análise'); igual(op(r, N).valor, 15000); igual(op(r, N).dados.tem_avalista, 'sim'); if (!op(r, N).chegada) throw new Error('sem chegada'); igual(op(r, N).editar, false);
});
t('atendente da 003 não vê', () => igual(!!op(como(AT3, 'getData'), N), false));
t('depois de enviada, atendente não altera', () => barra(() => como(AT2, 'salvarOperacao', Object.assign({}, OP, { n: N })), 'já foi enviada'));
t('atendente não analisa', () => barra(() => como(AT2, 'analisarOperacao', N, { acao: 'concluir' }), 'não analisa'));
t('análise sem checklist é recusada', () => barra(() => como(AN, 'analisarOperacao', N, { acao: 'concluir', recomendacao: 'Favorável', parecer: 'ok' }), 'Capacidade de pagamento'));
t('analista devolve sem escrever motivo', () => { const r = como(AN, 'analisarOperacao', N, { acao: 'pendencia' }); igual(op(r, N).status, 'Pendente'); });
t('atendente reenvia', () => { const r = como(AT2, 'enviarAnalise', N, op(como(AT2, 'getData'), N).rev); igual(op(r, N).status, 'Em análise'); });
t('conflito de edição (rev antigo)', () => barra(() => como(AN, 'analisarOperacao', N, { acao: 'pendencia', parecer: 'x' }, 1), 'alterada por outra pessoa'));
const ITENS = { capacidade: 'ok', restricoes: 'ok', endividamento: 'ok', garantias: 'ok', documentacao: 'nok' };
t('analista conclui (capacidade ok)', () => { const r = como(AN, 'analisarOperacao', N, { acao: 'concluir', itens: ITENS, risco: 'B', recomendacao: 'Favorável com ressalvas' }); const o = op(r, N); igual(o.status, 'Com o gerente'); igual(o.analise.itens.capacidade, 'ok'); igual(o.analise.risco, 'B'); });
t('analista não vota', () => barra(() => como(AN, 'votarGerente', N, { acao: 'enviar', iap: '1', voto: 'Favorável' }), 'não vota'));
t('gerente sem IAP é recusado', () => barra(() => como(GE, 'votarGerente', N, { acao: 'enviar', voto: 'Favorável' }), 'IAP'));
t('gerente devolve para a análise sem motivo e recebe de volta', () => {
  let r = como(GE, 'votarGerente', N, { acao: 'devolver' }); igual(op(r, N).status, 'Em análise');
  r = como(AN, 'analisarOperacao', N, { acao: 'concluir', itens: ITENS, recomendacao: 'Favorável' }); igual(op(r, N).status, 'Com o gerente');
});
t('gerente inclui IAP e envia (voto favorável automático)', () => { const r = como(GE, 'votarGerente', N, { acao: 'enviar', iap: '2,75', voto: 'Desfavorável' }); const o = op(r, N); igual(o.status, 'Na diretoria'); igual(o.gerente.iap, 2.75); igual(o.gerente.voto, 'Favorável'); });
t('gerente não aprova', () => barra(() => como(GE, 'decidirDiretoria', N, 'aprovar', '', null), 'não aprova'));
t('negar sem motivo é recusado', () => barra(() => como(DI, 'decidirDiretoria', N, 'reprovar', '', null), 'motivo para negar'));
t('diretoria devolve ao gerente sem motivo e ele reenvia', () => {
  let r = como(DI, 'decidirDiretoria', N, 'devolver', '', null); igual(op(r, N).status, 'Com o gerente');
  r = como(GE, 'votarGerente', N, { acao: 'enviar', iap: '3' }); igual(op(r, N).status, 'Na diretoria');
});
t('aprovação posterior mantém a ordem de chegada', () => {
  const antes = op(como(DI, 'getData'), N).chegada;
  let r = como(DI, 'decidirDiretoria', N, 'estender', '', null); igual(op(r, N).status, 'Aprovação posterior'); igual(op(r, N).diretoria.adiadaDia, r.hoje); igual(op(r, N).chegada, antes); igual(op(r, N).decidir, true);
  barra(() => como(DI, 'decidirDiretoria', N, 'estender', '', null), 'já ficou');
});
t('ver como: diretoria não aprova no modo Ver como', () => {
  como(DEV, 'verComo', 'Matriz', 'diretoria');
  const r = como(DEV, 'getData'); igual(r.eu.verComo.label, 'Matriz · Diretoria'); igual(op(r, N).decidir, true);
  barra(() => como(DEV, 'decidirDiretoria', N, 'aprovar', '', null), 'modo Ver como');
  como(DEV, 'sairVerComo'); igual(como(DEV, 'getData').eu.verComo, null);
});
t('admin de agência não vê como Matriz nem dev', () => { barra(() => como(AD2, 'verComo', 'Matriz', 'usuario'), 'não pode'); barra(() => como(AD2, 'verComo', '002', 'dev'), 'não pode'); });
t('negar uma operação', () => {
  const k = como(AT2, 'salvarOperacao', Object.assign({}, OP, { enviar: true })).ultimo;
  como(AN, 'analisarOperacao', k, { acao: 'concluir', itens: ITENS, recomendacao: 'Desfavorável' });
  como(GE, 'votarGerente', k, { acao: 'enviar', iap: '1' });
  const r = como(DI, 'decidirDiretoria', k, 'reprovar', 'Sem capacidade', null); igual(op(r, k).status, 'Negada'); igual(op(r, k).historico.slice(-1)[0].acao, 'negou');
});
t('diretoria aprova', () => { const r = como(DI, 'decidirDiretoria', N, 'aprovar', 'Aprovado em comitê', null); igual(op(r, N).status, 'Aprovada'); igual(op(r, N).diretoria.decisao, 'Aprovada'); });
t('gerente não libera', () => barra(() => como(GE, 'liberarOperacao', N, { data: '07/11/2026' }), 'não libera'));
t('gerente com acesso de atendente: trocar de acesso e liberar', () => {
  let r = como(GE, 'getData'); igual(r.eu.acessos.length, 2);
  r = como(GE, 'trocarAcesso', '002|usuario'); igual(r.eu.perfil, 'usuario'); igual(op(r, N).liberar, true);
  como(GE, 'trocarAcesso', '002|gerente');
});
t('trocar para acesso que não é seu', () => barra(() => como(AT2, 'trocarAcesso', 'Matriz|dev'), 'não é seu'));
t('data inválida na liberação', () => barra(() => como(AT2, 'liberarOperacao', N, { data: '31/02/2026' }), 'data da liberação'));
t('atendente da 003 não libera da 002', () => barra(() => como(AT3, 'liberarOperacao', N, { data: '07/11/2026' }), 'não libera'));
t('atendente libera', () => { const r = como(AT2, 'liberarOperacao', N, { data: '07/11/2026', contrato: 'CT-99', obs: 'Crédito em conta' }); const o = op(r, N); igual(o.status, 'Liberada'); igual(o.historico.map(h => h.acao).slice(-1)[0], 'liberou'); });
t('liberada não volta', () => barra(() => como(AT2, 'cancelarOperacao', N, true, 'x', null), 'não pode ser cancelada'));

console.log('Cancelar, excluir e segurança');
let M;
t('cancelar exige motivo; reativar volta a Rascunho', () => {
  let r = como(AT2, 'salvarOperacao', Object.assign({}, OP, { enviar: true })); M = r.ultimo;
  barra(() => como(AT2, 'cancelarOperacao', M, true, '', null), 'motivo');
  r = como(AT2, 'cancelarOperacao', M, true, 'Cooperado desistiu', null); igual(op(r, M).status, 'Cancelada');
  r = como(AT2, 'cancelarOperacao', M, false, '', null); igual(op(r, M).status, 'Rascunho'); igual(op(r, M).excluir, false);
});
t('excluir só rascunho nunca enviado (e desfazer)', () => {
  barra(() => como(AT2, 'excluirOperacao', M, null), 'nunca foi enviado');
  let r = como(AT2, 'salvarOperacao', { cooperado: 'Teste', agencia: '002' }); const k = r.ultimo;
  r = como(AT2, 'excluirOperacao', k, null); igual(!!op(r, k), false);
  r = como(AT2, 'restaurarOperacao', k); igual(!!op(r, k), true);
});
t('texto com = vira texto (não fórmula)', () => {
  const r = como(AT2, 'salvarOperacao', { cooperado: '=HYPERLINK("x")', agencia: '002' });
  const linha = estado.abas.Operacoes.d.find(l => String(l[0]) === String(r.ultimo));
  const col = estado.abas.Operacoes.d[0].indexOf('cooperado');
  igual(linha[col].charAt(0), "'");
});
t('rascunho de outra pessoa da agência é visível ao atendente, não ao analista', () => { igual(!!op(como(AN, 'getData'), M), false); igual(!!op(como('atendente2@credisis.com.br', 'getData'), M), true); });
t('colunas novas na planilha não quebram', () => {
  const d = estado.abas.Operacoes.d; d[0].splice(3, 0, 'coluna_extra'); d.slice(1).forEach(l => l.splice(3, 0, 'x'));
  const r = como(AT2, 'getData'); igual(op(r, N).status, 'Liberada');
  como(AT2, 'salvarOperacao', { cooperado: 'Depois da coluna', agencia: '002' });
  igual(estado.abas.Operacoes.d.slice(-1)[0][3], '');
});

console.log('Links');
t('admin de agência não altera links', () => barra(() => como(AD2, 'salvarLinks', { linkLogo: '', atalhos: [] }), 'Matriz'));
t('link sem https é recusado', () => barra(() => como(DEV, 'salvarLinks', { linkLogo: '', atalhos: [{ nome: 'X', link: 'http://a.com' }] }), 'https'));
t('javascript: é recusado', () => barra(() => como(DEV, 'salvarLinks', { linkLogo: 'javascript:alert(1)', atalhos: [] }), 'https'));
t('salva links e logo', () => {
  let r = como(DEV, 'salvarLinks', { linkLogo: 'https://credisis.com.br', atalhos: [{ nome: 'Manual de crédito', link: 'https://drive.google.com/x', descricao: 'Regras' }, { nome: 'Sisbr', link: 'https://sisbr.com.br' }] });
  igual(r.linkLogo, 'https://credisis.com.br'); igual(r.atalhos.length, 2);
  igual(como(AT2, 'getData').atalhos[0].nome, 'Manual de crédito');
});

console.log(`\n${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
