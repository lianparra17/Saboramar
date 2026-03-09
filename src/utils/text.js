// src/utils/text.js
export function normalizeText(s = '') { return String(s || '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase(); }
export function isHola(s = '') { return /\b(hola|buen[oa]s|qu\u00e9 tal|ola)\b/.test(s); }
export function yesNo(s = '') { if (/\b(s[i\u00ed]|claro|s\u00ed|dale|correcto|ok|listo|afirmativo)\b/.test(s)) return 'yes'; if (/\b(no|nop|nel|negativo)\b/.test(s)) return 'no'; return null; }

export function shortReply(str, max = 220) {
  const s = String(str || '').trim();
  if (s.length <= max) return s;
  const parts = s.split(/(?<=[\.\!\?])\s+/);
  let out = '';
  for (const p of parts) { if ((out + (out ? ' ' : '') + p).length <= max) out += (out ? ' ' : '') + p; else break; }
  return out || s.slice(0, max - 1) + '\u2026';
}

const monthSyn = { 'ene':0,'enero':0,'feb':1,'febrero':1,'mar':2,'marzo':2,'abr':3,'abril':3,'may':4,'mayo':4,'jun':5,'junio':5,'jul':6,'julio':6,'ago':7,'agosto':7,'sep':8,'sept':8,'septiembre':8,'set':8,'setiembre':8,'oct':9,'octubre':9,'nov':10,'noviembre':10,'dic':11,'diciembre':11 };
const numWords = { uno:1, una:1, dos:2, tres:3, cuatro:4, cinco:5, seis:6, siete:7, ocho:8, nueve:9, diez:10, once:11, doce:12 };

function parseDate(text) {
  const now = new Date();
  let s = normalizeText(text).replace(/\bse\b/g, ' de ');
  if (/\bhoy\b/.test(s)) return now.toISOString().slice(0,10);
  if (/\b(ma\u00f1ana|manana)\b/.test(s)) { const d = new Date(now.getTime()+86400000); return d.toISOString().slice(0,10); }
  let m = s.match(/\b(\d{1,2})\s*(?:de|del)?\s*(ene|enero|feb|febrero|mar|marzo|abr|abril|may|mayo|jun|junio|jul|julio|ago|agosto|sep|sept|septiembre|set|setiembre|oct|octubre|nov|noviembre|dic|diciembre)\b/);
  if (m) { const day = parseInt(m[1],10); const month = monthSyn[m[2]]; return new Date(now.getFullYear(), month, day).toISOString().slice(0,10); }
  m = s.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (m) { const day = parseInt(m[1],10); const month = parseInt(m[2],10)-1; const year = m[3] ? (m[3].length===2 ? 2000+parseInt(m[3],10) : parseInt(m[3],10)) : now.getFullYear(); return new Date(year, month, day).toISOString().slice(0,10); }
  return null;
}

function parseTime(text) {
  let s = normalizeText(text).replace(/\d{4}-\d{2}-\d{2}/g, ' ').replace(/\b(tipo|aprox|sobre|a las)\b/g, ' ');
  let m = s.match(/\b(0?\d|1[0-2]):([0-5]\d)\s*(am|pm)\b/);
  if (m) { let hh = parseInt(m[1],10), mm = parseInt(m[2],10); const ap = m[3]; if (ap==='pm' && hh<12) hh+=12; if (ap==='am' && hh===12) hh=0; return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`; }
  m = s.match(/\b(0?\d|1[0-2])[\s\.\-:]([0-5]\d)\s*(am|pm)\b/);
  if (m) { let hh = parseInt(m[1],10), mm = parseInt(m[2],10); const ap = m[3]; if (ap==='pm' && hh<12) hh+=12; if (ap==='am' && hh===12) hh=0; return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`; }
  m = s.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (m) { return `${String(parseInt(m[1],10)).padStart(2,'0')}:${String(parseInt(m[2],10)).padStart(2,'0')}`; }
  m = s.match(/\b(0?\d|1[0-2])\s*(am|pm)\b/);
  if (m) { let hh = parseInt(m[1],10); const ap = m[2]; if (ap==='pm' && hh<12) hh+=12; if (ap==='am' && hh===12) hh=0; return `${String(hh).padStart(2,'0')}:00`; }
  return null;
}

function parsePeople(text) {
  const s = normalizeText(text); let m;
  if ((m = s.match(/\b(\d{1,2})\s*(personas?|pax|pers)\b/))) return parseInt(m[1],10);
  if ((m = s.match(/\b(somos|para|de|por)\s+(\d{1,2})\b/))) return parseInt(m[2],10);
  for (const [w,n] of Object.entries(numWords)) { if (new RegExp(`\\b(somos|para|de|por)\\s+${w}\\b`).test(s)) return n; }
  if ((m = s.match(/\b(somos|son|seremos)\s+(\d{1,2})\b/))) return parseInt(m[2],10);
  return null;
}

export function extractEntitiesSpan(text) { return { date: parseDate(text), time: parseTime(text), people: parsePeople(text) }; }
export function wantsCorrection(text = '') { return /\b(perd[o\u00f3]n|me equivoqu[e\u00e9]|corrige|corrig[e\u00e9]me|cambia|rectifico|actualiza|eran|son\s+\d+|cambiar reserva|modificar reserva|ajustar reserva)\b/.test(normalizeText(text)); }

const monthNamesShort = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
export function formatDateES(iso='') { if (!iso) return ''; const [y,m,d] = iso.split('-').map(Number); const name = monthNamesShort[(m||1)-1] || ''; return new Date().getFullYear()===y ? `${d} ${name}` : `${d} ${name} ${y}`; }
export function formatTimeES(hhmm='') { if (!hhmm) return ''; let [hh,mm] = hhmm.split(':').map(Number); const ap = hh>=12 ? 'pm' : 'am'; hh = hh%12 || 12; return `${hh}:${String(mm).padStart(2,'0')} ${ap}`; }
export function prettyChangeList(changed={}) { const map = { people:'personas', date:'fecha', time:'hora' }; return Object.entries(changed).map(([k,v]) => `\u2022 ${map[k]||k}: ${v.to}${v.from ? ` (antes ${v.from})` : ''}`).join('\n'); }
export function snapshotES(r={}) { const parts = []; if (r.people) parts.push(`${r.people} personas`); if (r.date) parts.push(formatDateES(r.date)); if (r.time) parts.push(formatTimeES(r.time)); return parts.join(' \u2022 '); }
