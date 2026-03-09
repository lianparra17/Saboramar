// src/llm/index.js
import { shortReply } from '../utils/text.js';

const PROVIDER = (process.env.LLM_PROVIDER || 'openai').toLowerCase();
const MODEL = process.env.MODEL || 'gpt-4o-mini';

const PRICE_BOOK = {
  'cazuela de mariscos': 42000,
  'encocado de pescado': 39900,
  'arroz con camarones': 38000,
  'tacos de pescado': 36000,
  'ceviche': 34000,
};

let openai = null;
if (PROVIDER === 'openai' && process.env.OPENAI_API_KEY) {
  const OpenAI = (await import('openai')).default;
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function buildMessages(history = [], userMsg = '') {
  const sys = [{ role: 'system', content: 'Eres Sofi, asistente de Sabor a Mar. Habla c\u00e1lido y muy breve (m\u00e1x. ~220 caracteres). Si preguntan por precios y no hay exactos, usa precios de referencia y aclara que son estimados. Evita p\u00e1rrafos largos; usa bullets solo si ayuda.' }];
  const recent = (history || []).slice(-10).map(h => ({ role: h.who === 'user' ? 'user' : 'assistant', content: h.text }));
  return [...sys, ...recent, { role: 'user', content: userMsg }];
}

function priceAnswer(text) {
  const s = String(text || '').toLowerCase();
  const match = Object.keys(PRICE_BOOK).find(k => s.includes(k));
  if (match) { const val = PRICE_BOOK[match].toLocaleString('es-CO'); return `Aprox. ${match}: $${val} (referencia).`; }
  const line = Object.entries(PRICE_BOOK).slice(0, 3).map(([k, v]) => `\u2022 ${k} $${v.toLocaleString('es-CO')}`).join('\n');
  return `Precios de referencia\n${line}\nEl valor exacto est\u00e1 en el men\u00fa.`;
}

function localFallback(userMsg = '') {
  const s = String(userMsg).toLowerCase();
  if (/cu(a|\u00e1)nt(o|os) (vale|valen|cuesta|cuestan|precio)/.test(s)) return priceAnswer(userMsg);
  if (/recom|suger|aconsej/.test(s)) return 'Te sugiero la cazuela de mariscos o el encocado de pescado. \u00bfCu\u00e1l prefieres?';
  if (/men[\u00fau]|carta/.test(s)) return 'Estrellas: cazuela, encocado y arroz con camarones. \u00bfTe cuento m\u00e1s de alguno?';
  if (/reserv/.test(s)) return '\u00a1Vamos a reservar! Dime personas, d\u00eda y hora en un mensaje. Ej: "4 ma\u00f1ana 7:30 pm".';
  return '\u00bfBuscas recomendaci\u00f3n o reservar? Puedo ayudarte con ambos.';
}

export async function askLLM({ profile, history, userMsg }) {
  if (/cu(a|\u00e1)nt(o|os) (vale|valen|cuesta|cuestan|precio)/i.test(userMsg || '')) return shortReply(priceAnswer(userMsg), 220);
  if (!(openai && PROVIDER === 'openai')) return shortReply(localFallback(userMsg), 220);
  try {
    const messages = buildMessages(history, userMsg);
    const completion = await openai.chat.completions.create({ model: MODEL, messages, temperature: 0.3, max_tokens: 220 });
    const text = completion?.choices?.[0]?.message?.content?.trim() || localFallback(userMsg);
    return shortReply(text, profile?.tone === 'normal' ? 300 : 220);
  } catch (err) {
    console.error('[LLM][OpenAI] Error:', err?.response?.data || err);
    return shortReply(localFallback(userMsg), 220);
  }
}

export function extractEntities() { return {}; }
