// src/llm/prompts.js
export function menuSpeech(mode='concise') {
  if (mode === 'concise') {
    return `Estrellas de hoy:\n\u2022 Cazuela de mariscos ($42.000)\n\u2022 Encocado de pescado ($39.900)\n\u2022 Arroz con camarones ($38.000)\n\u00bfTe explico alguno o reservo?`;
  }
  return `Men\u00fa destacado:\n- Cazuela de mariscos\n- Encocado de pescado\n- Arroz con camarones\n\u00bfPrefieres recomendaci\u00f3n o reservar?`;
}
