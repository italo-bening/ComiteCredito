/* Simula o Apps Script (planilha, sessão, propriedades) para testar o Code.gs no Node. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function criar() {
  const estado = { email: '', props: {}, abas: {}, logs: [] };

  function sheet(nome) {
    const d = [];                                       // matriz de linhas
    const lastRow = () => { let r = d.length; while (r && d[r - 1].every(v => v === '' || v == null)) r--; return r; };
    const lastCol = () => d.reduce((m, l) => Math.max(m, l.reduce((mm, v, i) => (v === '' || v == null ? mm : i + 1), 0)), 0);
    const range = (r, c, nr, nc) => { const rg = {
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => (d[r - 1 + i] || [])[c - 1 + j] ?? '')),
      setValues: v => { v.forEach((l, i) => { d[r - 1 + i] = d[r - 1 + i] || []; l.forEach((x, j) => { d[r - 1 + i][c - 1 + j] = x == null ? '' : x; }); }); return rg; },
      clearContent: () => { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) if (d[r - 1 + i]) d[r - 1 + i][c - 1 + j] = ''; return rg; },
      setFontWeight: () => rg, setNumberFormat: () => rg, setDataValidation: () => rg
    }; return rg; };
    const api = {
      nome, d,
      getLastRow: lastRow, getLastColumn: lastCol,
      getRange: (r, c, nr, nc) => typeof r === 'string' ? range(1, 1, 0, 0) : range(r, c, nr || 1, nc || 1),
      getDataRange: () => range(1, 1, lastRow(), lastCol()),
      deleteRow: r => { d.splice(r - 1, 1); },
      setFrozenRows() {}
    };
    return api;
  }
  const ss = {
    getSheetByName: n => estado.abas[n] || null,
    insertSheet: n => (estado.abas[n] = sheet(n)),
    getUrl: () => 'https://docs.google.com/spreadsheets/d/TESTE/edit', getName: () => 'Comitê (teste)'
  };
  const dv = () => { const o = {}; ['requireValueInList', 'requireValueInRange', 'setAllowInvalid'].forEach(k => { o[k] = () => o; }); o.build = () => ({}); return o; };
  const pad = n => String(n).padStart(2, '0');
  const ctx = {
    console,
    SpreadsheetApp: { getActive: () => ss, newDataValidation: dv },
    Session: { getActiveUser: () => ({ getEmail: () => estado.email }), getEffectiveUser: () => ({ getEmail: () => estado.email }) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: k => (k in estado.props ? estado.props[k] : null),
      setProperty: (k, v) => { estado.props[k] = String(v); }, deleteProperty: k => { delete estado.props[k]; } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    Utilities: { formatDate: (d, tz, f) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}` },
    HtmlService: { createHtmlOutput: () => ({ setFaviconUrl() {} }), XFrameOptionsMode: { ALLOWALL: 1 } },
    ScriptApp: { getScriptId: () => 'SCRIPTID' },
    Logger: { log: m => estado.logs.push(String(m)) }
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8'), ctx, { filename: 'Code.gs' });
  const como = (email, fn, ...a) => { estado.email = email; return JSON.parse(JSON.stringify(ctx[fn](...a))); };
  return { ctx, estado, como };
}
module.exports = { criar };
