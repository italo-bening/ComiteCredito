/* Teste da tela com o navegador, falando com o Code.gs simulado: node testes/tela.test.js [pasta-das-fotos] */
const path = require('path');
const { chromium } = require('playwright');
const { criar } = require('./simulador');

const FOTOS = process.argv[2] || path.join(__dirname, 'fotos');
const { ctx, estado, como } = criar();
const DEV = 'dev@credisis.com.br', AT2 = 'ana@credisis.com.br', AN = 'carlos@credisis.com.br', GE = 'davi@credisis.com.br', DI = 'eva@credisis.com.br';
estado.email = DEV; ctx.setup();
como(DEV, 'salvarPessoa', { emailOriginal: DEV, email: DEV, nome: 'Italo Dev', agencia: 'Matriz', perfil: 'dev' });
como(DEV, 'salvarPessoa', { email: AT2, nome: 'Ana Atendente', agencia: '002', perfil: 'usuario' });
como(DEV, 'salvarPessoa', { email: AN, nome: 'Carlos Analista', agencia: 'Matriz', perfil: 'analista' });
como(DEV, 'salvarPessoa', { email: GE, nome: 'Davi Gerente', agencia: '002', perfil: 'gerente', acessos: [{ agencia: '002', perfil: 'usuario' }] });
como(DEV, 'salvarPessoa', { email: DI, nome: 'Eva Diretora', agencia: 'Matriz', perfil: 'diretoria' });

let QUEM = AT2, falhas = 0, ok = 0;
const passo = async (nome, fn) => { try { await fn(); ok++; console.log('  ok   ' + nome); } catch (e) { falhas++; console.log('  FALHA ' + nome + '\n        ' + e.message.split('\n')[0]); } };

(async () => {
  require('fs').mkdirSync(FOTOS, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const erros = [];
  page.on('pageerror', e => erros.push(e.message));
  page.on('console', m => { if (/Could not find one or more icon/.test(m.text())) erros.push('ícone inexistente: ' + m.text()); });
  /* Font Awesome local, quando o CDN não está acessível (FA_LOCAL=caminho do all.min.js) */
  if (process.env.FA_LOCAL) await page.route('**/font-awesome/6.5.2/js/all.min.js', r => r.fulfill({ path: process.env.FA_LOCAL, contentType: 'text/javascript' }));
  await page.exposeFunction('__srv', (fn, args) => {
    try { return JSON.stringify({ val: como(QUEM, fn, ...JSON.parse(args)) }); }
    catch (e) { return JSON.stringify({ erro: e.message }); }
  });
  await page.addInitScript(() => {
    const mk = (ok, fail) => new Proxy({}, { get: (_, k) => {
      if (k === 'withSuccessHandler') return f => mk(f, fail);
      if (k === 'withFailureHandler') return f => mk(ok, f);
      return (...a) => { window.__srv(k, JSON.stringify(a)).then(r => { r = JSON.parse(r); setTimeout(() => (r.erro ? fail && fail({ message: r.erro }) : ok && ok(r.val)), 60); }); };
    } });
    window.google = { script: { run: mk() } };
  });
  const url = 'file://' + path.join(__dirname, '..', 'app.html');
  const entrar = async email => { QUEM = email; await page.goto(url); await page.waitForSelector('#nav button'); };
  const foto = n => page.screenshot({ path: path.join(FOTOS, n + '.png') });
  const popTitulo = async () => (await page.waitForSelector('.pop h2')).textContent();
  const fechaPop = async () => { await page.click('.pop .bts .btn'); await page.waitForSelector('.pop', { state: 'detached' }); };
  const abrirOp = async () => { await page.click('.item[data-a="abrirOp"]'); await page.waitForSelector('.painel'); };
  const igual = (a, b) => { if (a !== b) throw new Error('esperado "' + b + '" veio "' + a + '"'); };

  await passo('e-mail não cadastrado mostra Acesso não liberado', async () => {
    QUEM = 'ninguem@x.com'; await page.goto(url); await page.waitForSelector('.estado h2');
    igual(await page.textContent('.estado h2'), 'Acesso não liberado');
  });
  await passo('atendente abre e vê o rodapé com a versão', async () => {
    await entrar(AT2);
    const r = await page.textContent('#rodape');
    if (!/Comitê de Crédito · Versão 2 · Publicada em \d\d\/\d\d\/\d{4} às \d\d:\d\d/.test(r)) throw new Error(r);
  });
  await passo('enviar incompleto mostra o que falta e marca em vermelho', async () => {
    await page.click('[data-a="aba"][data-id="nova"]');
    await page.fill('[data-f="cooperado"]', 'Maria da Silva');
    await page.click('[data-a="enviarForm"]');
    igual(await popTitulo(), 'Falta preencher');
    await foto('01-falta-preencher');
    await fechaPop();
    if (await page.locator('.campo.erro').count() < 3) throw new Error('campos não ficaram vermelhos');
  });
  await passo('preenche tudo e envia para análise', async () => {
    await page.fill('[data-f="conta"]', '12345-6');
    await page.fill('[data-f="numero_operacao"]', '784512');
    await page.selectOption('[data-f="modalidade"]', 'Financiamento de veículo');
    await page.fill('[data-f="valor"]', '4500000');
    igual(await page.inputValue('[data-f="valor"]'), '45.000,00');
    await page.fill('[data-f="prazo"]', '36');
    await page.fill('[data-f="dados.finalidade"]', 'Compra de caminhonete para a fazenda');
    for (const c of await page.$$('[data-fc]')) { if ((await c.getAttribute('data-fc')) !== 'proposta') await c.check(); }
    await page.click('[data-a="fset"][data-p="dados.tem_avalista"][data-v="sim"]');
    await page.click('[data-a="fset"][data-p="dados.tem_garantia"][data-v="sim"]');
    if (await page.locator('[data-f*="avalistas"], [data-f*="garantias"], [data-f="documento"]').count()) throw new Error('ainda pede dados do avalista, da garantia ou CPF');
    igual(await page.textContent('[data-cont="op"]'), '5/5');
    igual(await page.textContent('[data-cont="aval"]'), '2/2');
    await foto('02-formulario');
    await page.click('[data-a="enviarForm"]');
    igual(await popTitulo(), 'Enviada para análise');
    await page.waitForTimeout(900); await foto('03-popup-enviada'); await fechaPop();
  });
  await passo('analista: checklist, capacidade ok e conclui', async () => {
    await entrar(AN);
    igual((await page.textContent('[data-id="ops"] .cnt')).trim(), '1');
    await abrirOp();
    await page.click('[data-a="analiseOk"]'); igual(await popTitulo(), 'Falta preencher'); await fechaPop();
    for (const k of ['capacidade', 'restricoes', 'endividamento', 'garantias', 'documentacao']) await page.click(`[data-a="aitem"][data-k="${k}"][data-v="ok"]`);
    await page.selectOption('#a_risco', 'B');
    await page.click('[data-a="aset"][data-k="recomendacao"][data-v="Favorável"]');
    await foto('04-painel-analise');
    await page.click('[data-a="analiseOk"]');
    igual(await popTitulo(), 'Análise concluída'); await fechaPop();
  });
  await passo('gerente: IAP e envia à diretoria (voto favorável automático)', async () => {
    await entrar(GE); await abrirOp();
    if (await page.locator('[data-k="voto"]').count()) throw new Error('ainda pede o voto');
    await page.click('[data-a="gerEnviar"]'); igual(await popTitulo(), 'Falta o IAP'); await fechaPop();
    await page.fill('#a_iap', '3,25');
    await page.click('[data-a="gerEnviar"]');
    igual(await popTitulo(), 'Enviada à diretoria'); await fechaPop();
  });
  await passo('mais duas operações chegam à diretoria', async () => {
    for (const [coop, conta] of [['Segundo Cooperado', '222-2'], ['Terceiro Cooperado', '333-3']]) {
      const n = como(AT2, 'salvarOperacao', { enviar: true, cooperado: coop, conta: conta, numero_operacao: 'M' + conta, modalidade: 'Crédito pessoal', valor: 1000, prazo: 10, agencia: '002',
        checklist: { spc: true, scr: true, cadastro: true, renda: true, documentos: true }, dados: { finalidade: 'x', tem_avalista: 'não', tem_garantia: 'não' } }).ultimo;
      como(AN, 'analisarOperacao', n, { acao: 'concluir', itens: { capacidade: 'ok', restricoes: 'ok', endividamento: 'ok', garantias: 'ok', documentacao: 'ok' }, recomendacao: 'Favorável' });
      como(GE, 'votarGerente', n, { acao: 'enviar', iap: '2' });
    }
  });
  await passo('Ver como: dev vê como diretoria e o servidor barra a aprovação', async () => {
    await entrar(DEV);
    await page.click('[data-a="menu"][data-m="user"]');
    await page.waitForTimeout(400); await foto('05-menu-do-nome');
    await page.selectOption('#vcPf', 'diretoria');
    await page.click('[data-a="verComo"]');
    await page.waitForSelector('#vcbar:not([hidden])');
    await page.click('[data-a="filtro"][data-id="todas"]');
    await page.click('.item[data-n="1"]'); await page.waitForSelector('.painel');
    await page.click('[data-a="dirDecide"][data-v="aprovar"]');
    igual(await popTitulo(), 'Você está no modo Ver como');
    await page.waitForTimeout(1200); await foto('06-ver-como-barrado');
    await page.click('.pop .bts .btn-primary');
    await page.waitForSelector('#vcbar', { state: 'hidden' });
  });
  await passo('diretoria: janela no meio, fila por chegada, estende e aprova seguindo para a próxima', async () => {
    await entrar(DI);
    const ordem = await page.$$eval('.item .mid b', l => l.map(x => x.textContent));
    igual(ordem.join(' | '), 'Maria da Silva | Segundo Cooperado | Terceiro Cooperado');
    await abrirOp();
    if (!(await page.locator('.painel.centro').count())) throw new Error('não abriu no meio da tela');
    igual(await page.textContent('.fila .pos'), '1 de 3');
    await page.click('[data-a="navOp"][data-d="1"]');
    igual(await page.textContent('.painel h2'), 'Segundo Cooperado');
    await page.keyboard.press('ArrowLeft');
    igual(await page.textContent('.painel h2'), 'Maria da Silva');
    await page.waitForTimeout(400); await foto('06b-diretoria-janela');
    const titulo = t => page.waitForFunction(x => document.querySelector('.painel h2') && document.querySelector('.painel h2').textContent === x, t);
    await page.click('[data-a="dirDecide"][data-v="aprovar"]');
    await titulo('Segundo Cooperado');
    await page.click('[data-a="dirDecide"][data-v="estender"]');
    await titulo('Terceiro Cooperado');
    await page.click('[data-a="dirDecide"][data-v="devolver"]');
    await titulo('Segundo Cooperado');
    igual((await page.textContent('.painel .ph .tag')).trim(), 'Análise estendida');
    await page.click('[data-a="dirDecide"][data-v="reprovar"]');
    igual(await popTitulo(), 'Escreva o motivo'); await fechaPop();
    await page.fill('#a_texto', 'Sem capacidade');
    await page.click('[data-a="dirDecide"][data-v="reprovar"]');
    igual(await popTitulo(), 'Operação reprovada'); await fechaPop();
  });
  await passo('filtro Analisadas', async () => {
    await page.click('[data-a="filtro"][data-id="analisadas"]');
    igual(await page.locator('.item').count(), 3);
  });
  await passo('atendente registra a liberação', async () => {
    await entrar(AT2); await page.click('.item[data-n="1"]'); await page.waitForSelector('.painel');
    await page.fill('#a_contrato', 'CT-2026-0042');
    await page.click('[data-a="liberarOp"]');
    igual(await popTitulo(), 'Liberação registrada'); await fechaPop();
    await page.click('[data-a="filtro"][data-id="todas"]');
    await page.click('.item[data-n="1"]'); await page.waitForSelector('.painel');
    await page.waitForTimeout(400); await foto('07-painel-liberada');
    igual((await page.locator('.et.feito').count()), 5);
    await page.click('.painel [data-a="fecharPainel"]');
  });
  await passo('rascunho: salvar, excluir com segundo clique e desfazer', async () => {
    await page.click('[data-a="aba"][data-id="nova"]');
    await page.fill('[data-f="cooperado"]', 'Pedro Rascunho');
    await page.click('[data-a="salvarForm"]');
    await page.waitForSelector('.toast');
    await page.click('[data-a="descartarForm"]');
    await page.click('[data-a="aba"][data-id="ops"]');
    await page.click('[data-a="filtro"][data-id="andamento"]');
    await page.click('.item:has-text("Pedro Rascunho")'); await page.waitForSelector('.painel');
    await page.click('[data-a="excluirOp"]');
    igual((await page.textContent('[data-a="excluirOp"]')).trim(), 'Confirmar exclusão');
    await page.click('[data-a="excluirOp"]');
    await page.waitForSelector('.toast button');
    await page.click('.toast button');
    await page.waitForSelector('.item[data-a="abrirOp"]');
  });
  await passo('dev: pessoas, tipos, links e tema escuro', async () => {
    await entrar(DEV);
    await page.click('[data-a="aba"][data-id="usuarios"]');
    await page.click('.item[data-email="' + GE + '"]');
    await page.waitForSelector('.painel');
    await page.waitForTimeout(400); await foto('08-cadastro-pessoa');
    await page.click('.painel [data-a="fecharPainel"].btn-ghost');
    await page.click('[data-a="vistaU"][data-id="tipos"]');
    await foto('09-tipos');
    await page.click('[data-a="aba"][data-id="gerenciar"]');
    await page.click('[data-a="lkAdd"]');
    await page.fill('[data-lk="nome"][data-i="0"]', 'Manual de crédito');
    await page.fill('[data-lk="link"][data-i="0"]', 'http://errado');
    await page.click('[data-a="lkSalvar"]');
    igual(await popTitulo(), 'Confira os campos em vermelho'); await fechaPop();
    await page.fill('[data-lk="link"][data-i="0"]', 'https://drive.google.com/manual');
    await page.click('[data-a="lkSalvar"]');
    igual(await popTitulo(), 'Links salvos'); await fechaPop();
    await page.click('.sis');
    await page.waitForSelector('.menu .mi');
    await page.click('[data-a="tema"]');
    await page.click('[data-a="aba"][data-id="ops"]');
    await page.click('[data-a="filtro"][data-id="todas"]');
    await foto('10-lista-escuro');
  });
  await passo('celular: sem rolagem lateral', async () => {
    await page.setViewportSize({ width: 390, height: 800 });
    await entrar(AT2);
    await page.click('[data-a="aba"][data-id="nova"]');
    const w = await page.evaluate(() => document.documentElement.scrollWidth);
    if (w > 390) throw new Error('largura ' + w);
    await foto('11-celular');
  });
  await passo('nenhum erro de JavaScript e sem faixa vermelha', async () => {
    if (erros.length) throw new Error(erros.join(' | '));
    if (await page.locator('[role="alert"]').count()) throw new Error('faixa vermelha apareceu');
    if (process.env.FA_LOCAL && await page.locator('i.fa-solid, i.fa-regular').count()) throw new Error('ícone que o Font Awesome não reconheceu');
  });
  await browser.close();
  console.log(`\n${ok} ok, ${falhas} falha(s)`);
  process.exit(falhas ? 1 : 0);
})();
