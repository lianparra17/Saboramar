// src/server.js
import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { sendText, sendButtons, verifyWebhook } from './channels/whatsapp.js';
import {
  getUserState,
  setUserState,
  resetUser,
  appendHistory,
  adaptProfile,
  mergeReservation,
  markConfirmed,
  ensureReservationFlow,
  reopenFromLastConfirmed,
} from './storage/memory.js';

import {
  shortReply,
  normalizeText,
  isHola,
  yesNo,
  extractEntitiesSpan,
  wantsCorrection,
  snapshotES,
} from './utils/text.js';

import { menuSpeech } from './llm/prompts.js';
import { askLLM } from './llm/index.js';

// ---------- Boot ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.PORT) || 3000;
const MAX_PER_TABLE = Number(process.env.MAX_PER_TABLE || 8);

// ---------- Helpers ----------
function capacityNote(n) {
  if (!n || n <= MAX_PER_TABLE) return null;
  const mesas = Math.ceil(n / MAX_PER_TABLE);
  return `Nota: para grupos de m\u00e1s de ${MAX_PER_TABLE}, reservamos en ~${mesas} mesa(s). \u00bfTe sirve as\u00ed o prefieres otra distribuci\u00f3n?`;
}

function fullMenuText() {
  return `\ud83d\udcd6 *MEN\u00da Sabor a Mar*\n\n\ud83e\udd57 *Entradas*\n\u2022 Ceviche cl\u00e1sico \u2014 $34.000\n\u2022 Tiradito de pesc\u00e1do \u2014 $36.000\n\u2022 Patacones con hogao \u2014 $19.000\n\n\ud83c\udf72 *Sopas & Caldos*\n\u2022 Sancocho de pescado \u2014 $33.000\n\u2022 Caldo de mariscos \u2014 $32.000\n\n\ud83c\udf7d\ufe0f *Platos fuertes*\n\u2022 Tacos de pescado (5 uds) \u2014 $36.000\n\u2022 Encocado de pescado \u2014 $39.900\n\u2022 Arroz con camarones \u2014 $38.000\n\u2022 Paella de mariscos \u2014 $48.000\n\u2022 Cazuela de mariscos \u2014 $42.000\n\u2022 Pescado a la plancha (2 acompa\u00f1antes) \u2014 $41.000\n\n\ud83d\udd25 *Parrilla del mar*\n\u2022 Pulpo a la brasa \u2014 $47.000\n\u2022 Langostinos al ajillo \u2014 $45.000\n\n\ud83c\udf70 *Postres*\n\u2022 Tres leches \u2014 $14.000\n\u2022 Flan de coco \u2014 $13.000\n\n\ud83e\udd64 *Bebidas*\n\u2022 Limonada cerezada \u2014 $10.000\n\u2022 Maracuy\u00e1 frappe \u2014 $12.000\n\u2022 Cervezas artesanales \u2014 desde $12.000\n\n\u00bfTe gustar\u00eda algo sin gluten o vegetariano? \u00a1Te ayudo!`;
}

function starsOfDayText() {
  return `\u2b50 *Estrellas de hoy*\n\u2022 Cazuela de mariscos ($42.000)\n\u2022 Encocado de pescado ($39.900)\n\u2022 Arroz con camarones ($38.000)\n\u00bfQuieres que te recomiende seg\u00fan antojo o presupuesto?`;
}

function welcomeText() {
  return '\u00a1Bienvenid@ a Sabor a Mar! Soy Sofi \ud83d\ude0a \u00bfEn qu\u00e9 te ayudo hoy?\n\u2022 Ver men\u00fa\n\u2022 Recomendaci\u00f3n\n\u2022 Reservar mesa';
}

async function sendWelcome(to) {
  await sendButtons(
    to,
    [
      { id: 'menu', title: 'Ver men\u00fa' },
      { id: 'recom', title: 'Recomendaci\u00f3n' },
      { id: 'reserva', title: 'Reservar' },
    ],
    welcomeText(),
  );
}

// ---------- Routes ----------
app.get('/webhook', (req, res) => verifyWebhook(req, res));

app.post('/webhook', async (req, res) => {
  try {
    const entry = req.body?.entry?.[0]?.changes?.[0]?.value;
    const msg = entry?.messages?.[0];
    const from = msg?.from;
    if (!from) return res.sendStatus(200);

    const type = msg?.type;
    let text = '';
    if (type === 'interactive' && msg.interactive?.type === 'button_reply') {
      text = msg.interactive.button_reply.id || '';
    } else if (type === 'text') {
      text = msg.text?.body || '';
    }
    const clean = normalizeText(text);

    if (isHola(clean)) {
      resetUser(from);
      await sendWelcome(from);
      return res.sendStatus(200);
    }

    if (clean === 'menu' || /ver menu|ver men\u00fa/.test(clean)) {
      await sendText(from, fullMenuText());
      const st = getUserState(from);
      st.ui = st.ui || {};
      st.ui.askStars = true;
      setUserState(from, st);
      await sendButtons(from, [{ id: 'stars_yes', title: 'S\u00ed, mu\u00e9stramelas' }, { id: 'stars_no', title: 'No, gracias' }], '\u00bfQuieres conocer las *estrellas* del d\u00eda de hoy?');
      return res.sendStatus(200);
    }

    if (clean === 'stars_yes' || (getUserState(from).ui?.askStars && yesNo(clean) === 'yes')) {
      const st = getUserState(from); st.ui.askStars = false; setUserState(from, st);
      await sendText(from, starsOfDayText());
      return res.sendStatus(200);
    }
    if (clean === 'stars_no' || (getUserState(from).ui?.askStars && yesNo(clean) === 'no')) {
      const st = getUserState(from); st.ui.askStars = false; setUserState(from, st);
      await sendText(from, shortReply('\u00a1Perfecto! Si quieres, te hago una recomendaci\u00f3n r\u00e1pida. \ud83d\ude0a'));
      return res.sendStatus(200);
    }

    if (clean === 'reserva' || /reserv(ar|a)/.test(clean)) {
      ensureReservationFlow(from);
      await sendButtons(from, [{ id: 'res_mode_table_dishes', title: 'Mesa + platos' }, { id: 'res_mode_table_only', title: 'Solo mesa' }], '\u00bfQu\u00e9 te gustar\u00eda reservar?');
      return res.sendStatus(200);
    }

    if (clean === 'res_mode_table_dishes' || clean === 'res_mode_table_only') {
      ensureReservationFlow(from);
      const st = getUserState(from);
      st.reservation.mode = clean === 'res_mode_table_dishes' ? 'table+dishes' : 'table';
      setUserState(from, st);
      await sendText(from, shortReply('\u00a1Genial! Ahora cu\u00e9ntame en *un mensaje*: personas, d\u00eda y hora. Ej: "6 personas 13 sep 7:30 pm".'));
      return res.sendStatus(200);
    }

    if (clean === 'recom' || /recomendaci[o\u00f3]n/.test(clean)) {
      appendHistory(from, 'user', 'Recomendaci\u00f3n breve del men\u00fa.');
      const txt = await askLLM({ profile: getUserState(from).profile, history: getUserState(from).history, userMsg: 'recom' });
      appendHistory(from, 'assistant', txt);
      await sendText(from, shortReply(txt));
      return res.sendStatus(200);
    }

    const state = getUserState(from);
    const wantsChange = wantsCorrection(text) || /\b(cambiar|modificar|ajustar)\b.*\breserva\b/.test(clean);

    if (wantsChange && state.reservation.step === 'idle' && state.lastConfirmed) {
      reopenFromLastConfirmed(from);
      const ent = extractEntitiesSpan(text);
      const { changed } = mergeReservation(from, ent);
      const st2 = getUserState(from);
      if (!Object.keys(changed).length) {
        const snap = snapshotES(st2.reservation);
        await sendText(from, shortReply(`Tengo tu \u00faltima reserva: ${snap}. \u00bfQu\u00e9 te gustar\u00eda cambiar? (personas, fecha u hora)`));
        return res.sendStatus(200);
      }
      st2.reservation.confirmPending = true;
      setUserState(from, st2);
      const snap = snapshotES(st2.reservation);
      await sendText(from, shortReply(`Hecho \ud83d\ude4c Quedar\u00eda: ${snap}. \u00bfConfirmo el cambio? \u2705`));
      return res.sendStatus(200);
    }

    if (state.reservation && state.reservation.step !== 'idle') {
      const ent = extractEntitiesSpan(text);
      const { changed } = mergeReservation(from, ent);
      const st = getUserState(from);
      const yn = yesNo(clean);
      if (st.reservation.confirmPending && yn) {
        if (yn === 'yes') {
          const modeNow = st.reservation.mode;
          markConfirmed(from);
          let msg = '\u00a1Listo! Tu reserva qued\u00f3 confirmada \u2705 Guardamos tu mesa 15 min; el turno dura 90 min.';
          if (modeNow === 'table+dishes') msg += ' Si quieres, puedo dejar *preordenados* algunos platos. Ej: "2 ceviches y 4 tacos".';
          msg += ' Si luego necesitas cambiar algo, dime y lo actualizo.';
          await sendText(from, shortReply(msg, 300));
        } else {
          st.reservation.confirmPending = false; st.reservation.step = 'ask'; setUserState(from, st);
          await sendText(from, shortReply('Sin problema. Dime de nuevo *fecha*, *hora* y *personas* y lo ajusto. \ud83d\udc4d'));
        }
        return res.sendStatus(200);
      }
      if (Object.keys(changed).length) {
        const stNow = getUserState(from);
        const snap = snapshotES(stNow.reservation);
        let msg = `Perfecto \ud83d\ude4c Me queda: ${snap}. \u00bfLo dejo as\u00ed?`;
        const note = capacityNote(stNow.reservation.people);
        if (note) msg += `\n${note}`;
        await sendText(from, shortReply(msg));
        stNow.reservation.confirmPending = true; setUserState(from, stNow);
        return res.sendStatus(200);
      }
      const r = st.reservation;
      if (r.people && r.date && r.time && !r.confirmPending) {
        const snap = snapshotES(r);
        await sendText(from, shortReply(`As\u00ed quedar\u00eda: ${snap}. \u00bfConfirmo? \ud83c\udf0a`));
        r.confirmPending = true; setUserState(from, st);
        return res.sendStatus(200);
      }
      const missing = [];
      if (!st.reservation.people) missing.push('personas');
      if (!st.reservation.date) missing.push('fecha');
      if (!st.reservation.time) missing.push('hora');
      if (missing.length) {
        await sendText(from, shortReply(`Me falta: ${missing.join(' y ')}. D\u00edmelo en un mensaje, ej: "13 sep 8:30 pm para 6". \ud83d\udcdd`));
        return res.sendStatus(200);
      }
    }

    adaptProfile(from, text);
    appendHistory(from, 'user', text);
    const answer = await askLLM({ profile: getUserState(from).profile, history: getUserState(from).history, userMsg: text });
    appendHistory(from, 'assistant', answer);
    await sendText(from, shortReply(answer));
    return res.sendStatus(200);
  } catch (e) {
    console.error(e);
    return res.sendStatus(200);
  }
});

app.get('/', (_, res) => res.send('OK'));
app.listen(PORT, () => console.log(`[SaborAMar] Sabor a Mar WA-LLM en puerto ${PORT}`));
