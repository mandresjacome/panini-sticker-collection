/**
 * @fileoverview Utilidad para derivar la categoría visual de una lámina.
 *
 * La categoría visual determina el color del badge/punto en la UI:
 *   - GOAT / TOP: asignadas manualmente en CRUD, persistidas en la DB.
 *   - El resto se auto-derivan de forma determinista a partir del equipo y código.
 *
 * Esta función es la única fuente de verdad para categorización.
 * No debe haber lógica de categorías dispersa en componentes.
 */

import type { Sticker, StickerCategory } from "../types";

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/**
 * @description Extrae el número al final de un código de lámina.
 * "MEX1" → 1,  "ARG13" → 13,  "FWC00" → 0,  "CC14" → 14
 *
 * @param code - Código completo de la lámina (ej. "MEX13")
 * @returns Número extraído, o NaN si no hay sufijo numérico
 */
function extractStickerNumber(code: string): number {
  // Captura el bloque de dígitos al final del string
  const match = code.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : NaN;
}

// ---------------------------------------------------------------------------
// Función principal
// ---------------------------------------------------------------------------

/**
 * @description Determina la categoría visual de una lámina aplicando las siguientes
 * reglas en orden de prioridad (la primera que coincide gana):
 *
 * 1. `categoria = 'GOAT'` (campo manual en DB)  → GOAT  (dorado)
 * 2. `categoria = 'TOP'`  (campo manual en DB)  → TOP   (morado)
 * 3. `team = 'FWC'`                             → METALIZADA (teal)
 * 4. `team = 'CC'`                              → PATROCINADOR (naranja)
 * 5. Número del código = 1  (ej. MEX1, ARG1)   → ESCUDO (rojo)
 * 6. Número del código = 13 (ej. MEX13, ARG13) → FOTO_EQUIPO (verde)
 * 7. Resto                                      → BASICA (azul)
 *
 * @param sticker - Lámina a categorizar
 * @returns La categoría visual correspondiente
 */
export function getStickerCategory(sticker: Sticker): StickerCategory {
  // ── Prioridad 1 y 2: overrides manuales persistidos en la DB ─────────────
  if (sticker.categoria === "GOAT") return "GOAT";
  if (sticker.categoria === "TOP")  return "TOP";

  // ── Prioridad 3: láminas especiales FIFA World Cup (todas las FWC) ───────
  if (sticker.team === "FWC") return "METALIZADA";

  // ── Prioridad 4: patrocinadores Coca-Cola ─────────────────────────────────
  if (sticker.team === "CC") return "PATROCINADOR";

  // ── Prioridades 5 y 6: basadas en el número del código ───────────────────
  const num = extractStickerNumber(sticker.code);

  if (num === 1)  return "ESCUDO";       // Ej: MEX1, ARG1 — foto del escudo
  if (num === 13) return "FOTO_EQUIPO";  // Ej: MEX13, ARG13 — los 11 titulares

  // ── Prioridad 7: lámina básica (jugadores individuales, estadios, etc.) ──
  return "BASICA";
}
