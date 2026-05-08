/**
 * @fileoverview Servicio de stickers — encapsula todas las operaciones
 * de lectura y escritura contra la tabla `stickers` de Supabase.
 *
 * REGLA: Toda validación de invariantes de negocio ocurre aquí,
 * antes de cualquier llamada a la base de datos.
 */

import { supabase } from "../lib/supabaseClient";
import type { Sticker, StickerStatus, StickersMap } from "../types";

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

/**
 * @description Forma de la fila tal como viene de Supabase (snake_case).
 * Se mapea a la interfaz Sticker (camelCase) antes de salir del servicio.
 */
interface StickerRow {
  codigo:      string;
  equipo:      string;
  tipo:        string;
  estado:      StickerStatus;
  cantidad:    number;
  observacion: string | null;
  updated_at:  string;
  updated_by:  string | null;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

/**
 * @description Convierte una fila de Supabase al tipo Sticker del dominio.
 * @param row - Fila cruda de la tabla stickers
 * @returns Objeto Sticker tipado
 */
function rowToSticker(row: StickerRow): Sticker {
  // Normalizar estados legacy (R, V) al nuevo modelo simplificado.
  // R (Repetida) y V (Vendida) ya no existen → se convierten a D (Disponible).
  // Así los datos históricos en DB son compatibles sin migración inmediata.
  const rawStatus = row.estado as string;
  const status: StickerStatus =
    rawStatus === "D" || rawStatus === "R" || rawStatus === "V" ? "D" : "F";

  // Si el estado era F pero la cantidad es > 0, corregir a D
  const quantity = row.cantidad ?? 0;
  const finalStatus: StickerStatus = status === "F" && quantity > 0 ? "D" : status;

  return {
    code:       row.codigo,
    team:       row.equipo,
    type:       row.tipo,
    status:     finalStatus,
    quantity,
    notes:      row.observacion ?? undefined,
    updated_at: row.updated_at,
    updated_by: row.updated_by ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Validación de invariantes
// ---------------------------------------------------------------------------

/**
 * @description Valida la invariante de negocio principal:
 * si quantity > 0, el estado no puede ser "F" (Falta).
 * @param status - Estado que se quiere asignar
 * @param quantity - Cantidad que se quiere asignar
 * @throws Error descriptivo si se viola la invariante
 */
function validateStickerState(status: StickerStatus, quantity: number): void {
  if (status === "F" && quantity > 0) {
    throw new Error(
      `Estado inválido: una lámina con cantidad ${quantity} no puede estar en estado "F" (Falta). ` +
      `Cambia el estado a "D" (Disponible) o reduce la cantidad a 0.`
    );
  }
}

// ---------------------------------------------------------------------------
// Operaciones de lectura
// ---------------------------------------------------------------------------

/**
 * @description Obtiene todos los stickers de la colección como mapa normalizado.
 * Retornar un Record<code, Sticker> permite actualizaciones O(1) en el store.
 * @returns Mapa de stickers indexado por código, o lanza error si falla la query
 */
export async function fetchAllStickers(): Promise<StickersMap> {
  const { data, error } = await supabase
    .from("stickers")
    .select("*")
    .order("equipo")        // Ordenar por equipo facilita la agrupación en la Vista Matriz
    .order("codigo");       // Dentro del equipo, ordenar por código

  if (error) {
    throw new Error(`Error al cargar las láminas: ${error.message}`);
  }

  // Construir el mapa normalizado: { "MEX1": Sticker, "MEX2": Sticker, ... }
  const map: StickersMap = {};
  for (const row of data as StickerRow[]) {
    const sticker = rowToSticker(row);
    map[sticker.code] = sticker;
  }

  return map;
}

// ---------------------------------------------------------------------------
// Operaciones de escritura
// ---------------------------------------------------------------------------

/**
 * @description Avanza el estado de una lámina al siguiente en el ciclo.
 * Ciclo: F → D → R → V → F
 * También ajusta la cantidad al cambiar de/hacia estado F.
 * @param code - Código de la lámina a actualizar
 * @param currentStatus - Estado actual de la lámina
 * @param currentQuantity - Cantidad actual de la lámina
 * @returns La lámina actualizada
 * @throws Error si la validación de invariantes falla
 */
export async function cycleNextStatus(
  code: string,
  currentStatus: StickerStatus,
  currentQuantity: number
): Promise<Sticker> {
  // Solo dos estados: F ↔ D
  const nextStatus: StickerStatus = currentStatus === "F" ? "D" : "F";

  // Al volver a F → cantidad 0. Al pasar a D → al menos 1 copia.
  const nextQuantity =
    nextStatus === "F" ? 0 :
    currentStatus === "F" ? 1 :
    currentQuantity;

  // Validar invariante antes de escribir
  validateStickerState(nextStatus, nextQuantity);

  return updateSticker(code, { status: nextStatus, quantity: nextQuantity });
}

/**
 * @description Actualiza campos específicos de una lámina.
 * Valida invariantes antes de persistir.
 * @param code - Código de la lámina a actualizar
 * @param fields - Campos a actualizar (parcial de Sticker)
 * @returns La lámina actualizada con todos sus campos
 * @throws Error si la validación de invariantes falla o la query falla
 */
export async function updateSticker(
  code: string,
  fields: Partial<Pick<Sticker, "status" | "quantity" | "notes">>
): Promise<Sticker> {
  // Si vienen status y quantity juntos, validar la combinación
  if (fields.status !== undefined && fields.quantity !== undefined) {
    validateStickerState(fields.status, fields.quantity);
  }

  // Construir el objeto de actualización en snake_case para Supabase
  const update: Record<string, unknown> = {};
  if (fields.status   !== undefined) update.estado     = fields.status;
  if (fields.quantity !== undefined) update.cantidad   = fields.quantity;
  if (fields.notes    !== undefined) update.observacion = fields.notes;

  const { data, error } = await supabase
    .from("stickers")
    .update(update)
    .eq("codigo", code)
    .select()
    .single();

  if (error) {
    throw new Error(`Error al actualizar la lámina ${code}: ${error.message}`);
  }

  return rowToSticker(data as StickerRow);
}
