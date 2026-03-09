// src/storage/memory.js
const store = new Map();

function defaultState() {
  return {
    profile: { tone: 'concise' },
    history: [],
    ui: { askStars: false },
    reservation: { step: 'idle', people: null, date: null, time: null, confirmPending: false, confirmed: false, mode: null },
    lastConfirmed: null
  };
}

export function getUserState(id) { if (!store.has(id)) store.set(id, defaultState()); return store.get(id); }
export function setUserState(id, st) { store.set(id, st); return st; }
export function resetUser(id) { store.set(id, defaultState()); }

export function appendHistory(id, who, text) {
  const st = getUserState(id);
  st.history.push({ who, text, ts: Date.now() });
  if (st.history.length > 20) st.history = st.history.slice(-20);
  setUserState(id, st);
}

export function adaptProfile(id, userText) {
  const st = getUserState(id);
  st.profile.tone = (String(userText || '').length > 180) ? 'normal' : 'concise';
  setUserState(id, st);
}

export function mergeReservation(id, ent) {
  const st = getUserState(id);
  let changed = {};
  function setField(key, value) { if (value && value !== st.reservation[key]) { changed[key] = { from: st.reservation[key], to: value }; st.reservation[key] = value; } }
  if (ent.people) setField('people', ent.people);
  if (ent.date) setField('date', ent.date);
  if (ent.time) setField('time', ent.time);
  if (Object.keys(changed).length) st.reservation.step = 'updating';
  setUserState(id, st);
  return { changed, state: st };
}

export function ensureReservationFlow(id) {
  const st = getUserState(id);
  if (!st.reservation || st.reservation.step === 'idle') {
    st.reservation = { step: 'ask', people: null, date: null, time: null, confirmPending: false, confirmed: false, mode: null };
    setUserState(id, st);
  }
  return st;
}

export function markConfirmed(id) {
  const st = getUserState(id);
  st.reservation.confirmed = true; st.reservation.confirmPending = false; st.reservation.step = 'idle';
  st.lastConfirmed = { people: st.reservation.people, date: st.reservation.date, time: st.reservation.time, mode: st.reservation.mode, ts: Date.now() };
  setUserState(id, st);
  return st;
}

export function reopenFromLastConfirmed(id) {
  const st = getUserState(id);
  if (!st.lastConfirmed) return st;
  const { people, date, time, mode } = st.lastConfirmed;
  st.reservation = { step: 'ask', people, date, time, confirmPending: false, confirmed: false, mode: mode || null };
  setUserState(id, st);
  return st;
}
