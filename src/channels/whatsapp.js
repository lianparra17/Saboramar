// src/channels/whatsapp.js
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

function assertEnv() {
  const missing = [];
  if (!process.env.META_TOKEN) missing.push("META_TOKEN");
  if (!process.env.PHONE_NUMBER_ID) missing.push("PHONE_NUMBER_ID");
  if (missing.length) throw new Error(`[WhatsApp] Faltan variables de entorno: ${missing.join(", ")}`);
}

const BASE = `https://graph.facebook.com/${process.env.GRAPH_VERSION || 'v21.0'}`;

async function callWhatsApp(endpoint, payload) {
  assertEnv();
  const url = `${BASE}/${process.env.PHONE_NUMBER_ID}${endpoint}`;
  try {
    const { data } = await axios.post(url, payload, {
      headers: { Authorization: `Bearer ${process.env.META_TOKEN}`, "Content-Type": "application/json" },
      timeout: 15000,
    });
    return data;
  } catch (err) {
    const data = err?.response?.data;
    if (data?.error?.code === 190 && (data?.error?.error_subcode === 463 || data?.error?.error_subcode === 467)) {
      console.error("[WhatsApp] TOKEN EXPIRADO. Genera uno nuevo y actualiza META_TOKEN en .env.");
    }
    console.error("Error en procesamiento async:", JSON.stringify(data || {}, null, 2));
    throw err;
  }
}

export async function sendText(to, body) {
  return callWhatsApp(`/messages`, { messaging_product: "whatsapp", to, type: "text", text: { body } });
}

export async function sendButtons(to, buttons, body) {
  const capped = buttons.slice(0, 3).map(b => ({ type: "reply", reply: { id: b.id, title: String(b.title).slice(0, 20) } }));
  return callWhatsApp(`/messages`, { messaging_product: "whatsapp", to, type: "interactive", interactive: { type: "button", body: { text: body }, action: { buttons: capped } } });
}

export function verifyWebhook(req, res) {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "";
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) return res.status(200).send(challenge);
  return res.sendStatus(403);
}
