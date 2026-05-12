/**
 * @fileoverview Servicio de precios por categoría.
 *
 * Gestiona la tabla `category_prices` de Supabase.
 * Cada categoría tiene un precio base editable; las láminas pueden
 * tener además un precio individual (override) en la columna `precio`.
 *
 * Lógica de precio efectivo (aplicada en frontend):
 *   precio_efectivo = sticker.precio ?? categoryPrices[categoria]
 */

import { supabase } from "../lib/supabaseClient";
import type { StickerCategory, CategoryPricesMap } from "../types";
import { DEFAULT_CATEGORY_PRICES } from "../types";

// ---------------------------------------------------------------------------
// Tipo interno de fila de Supabase
// ---------------------------------------------------------------------------

interface CategoryPriceRow {
  /** Nombre de la categoría — clave primaria en DB */
  category:   string;
  /** Precio en pesos COP */
  price:      number;
  /** Timestamp de última modificación */
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Operaciones de lectura
// ---------------------------------------------------------------------------

/**
 * @description Obtiene los precios base de todas las categorías desde Supabase.
 * Parte de los DEFAULT_CATEGORY_PRICES y sobreescribe con los valores de la DB,
 * garantizando que siempre haya un precio para cada categoría aunque la DB
 * no tenga todas las filas.
 *
 * @returns Mapa completo CategoryPricesMap con precio por cada StickerCategory
 * @throws Error si la query falla
 */
export async function fetchCategoryPrices(): Promise<CategoryPricesMap> {
  const { data, error } = await supabase
    .from("category_prices")
    .select("category, price");

  if (error) {
    throw new Error(`Error al cargar precios de categoría: ${error.message}`);
  }

  // Partir de los defaults locales y sobreescribir con los valores reales de la DB
  const result: CategoryPricesMap = { ...DEFAULT_CATEGORY_PRICES };
  for (const row of data as CategoryPriceRow[]) {
    // Solo sobreescribir si la categoría es válida en nuestro modelo
    if (row.category in result) {
      result[row.category as StickerCategory] = row.price;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Operaciones de escritura
// ---------------------------------------------------------------------------

/**
 * @description Actualiza el precio base de una categoría en Supabase.
 * Usa UPSERT para crear la fila si no existe (por si el seed no se ejecutó).
 * Esta operación afecta a TODAS las láminas de esa categoría que no tengan
 * un precio individual override.
 *
 * @param category - Categoría cuyo precio base se va a actualizar
 * @param price    - Nuevo precio en pesos COP (debe ser >= 0)
 * @throws Error si el precio es negativo o si la query falla
 */
export async function updateCategoryPrice(
  category: StickerCategory,
  price:    number
): Promise<void> {
  // Validar que el precio sea no-negativo
  if (price < 0) {
    throw new Error(`El precio no puede ser negativo. Valor recibido: ${price}`);
  }

  const { error } = await supabase
    .from("category_prices")
    .upsert({
      category,
      price,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(`Error al actualizar precio de categoría ${category}: ${error.message}`);
  }
}
