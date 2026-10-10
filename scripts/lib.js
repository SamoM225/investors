// Spoločné pomocné funkcie pilotu: CSV, dátumy, cesty.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RUN_DATE = '2026-10-09';
const WINDOW_START = '2023-10-09';

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift() || [];
  return rows.map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

function readCsv(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return [];
  return parseCsv(fs.readFileSync(p, 'utf8').replace(/^﻿/, ''));
}

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'string' ? v : (typeof v === 'object' ? JSON.stringify(v) : String(v));
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function writeCsv(rel, header, rows) {
  const lines = [header.join(',')].concat(rows.map(r => header.map(h => csvCell(r[h])).join(',')));
  fs.writeFileSync(path.join(ROOT, rel), lines.join('\n') + '\n', 'utf8');
}

// Zjednotenie textu pre porovnanie citátu s kópiou zdroja.
function normalizeText(s) {
  return String(s)
    .replace(/[“”„«»"]/g, '"')
    .replace(/[‘’‚']/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/ /g, ' ')
    .replace(/\\"/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function inWindow(date) {
  return !!date && date >= WINDOW_START && date <= RUN_DATE;
}

module.exports = { ROOT, RUN_DATE, WINDOW_START, readCsv, writeCsv, normalizeText, inWindow, parseCsv };
