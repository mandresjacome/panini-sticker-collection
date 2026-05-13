/**
 * @fileoverview Servicio de catálogo público.
 * Solo lee láminas con estado "D" (Disponible) usando el cliente anon de Supabase.
 * No requiere sesión autenticada — la política RLS "public_can_read_available"
 * permite que el rol `anon` lea solo las filas con estado = 'D'.
 */

import { supabase } from "../lib/supabaseClient";
import type { Sticker, StickerCategoryOverride } from "../types";

// ---------------------------------------------------------------------------
// Tipo de fila de Supabase (snake_case español)
// ---------------------------------------------------------------------------

interface PublicStickerRow {
  codigo:    string;
  equipo:    string;
  tipo:      string;
  estado:    "D";         // La política RLS garantiza que siempre será "D"
  cantidad:  number;
  /** Override manual de categoría (TOP/GOAT) o null si es auto-derivada */
  categoria: StickerCategoryOverride | null;
  /** Precio individual de venta (null = usar default de la categoría) */
  precio:    number | null;
  /** Nombre oficial de la lámina. Ej: "Mexico - Hirving Lozano" */
  nombre:    string | null;
}

// ---------------------------------------------------------------------------
// Funciones del catálogo
// ---------------------------------------------------------------------------

/**
 * @description Obtiene todas las láminas disponibles para la venta (estado = "D")
 * del inventario indicado.
 * @param inventario - Grupo de inventario a consultar ('CN' o 'AM')
 * @returns Mapa Record<teamCode, Sticker[]> con solo las láminas disponibles
 * @throws Error si la query falla
 */
export async function fetchAvailableStickers(inventario: string): Promise<Record<string, Sticker[]>> {
  const { data, error } = await supabase
    .from("stickers")
    .select("codigo, equipo, tipo, estado, cantidad, categoria, precio, nombre")
    .eq("estado", "D")         // Filtro explícito + redundante con RLS (defensa en profundidad)
    .eq("inventario", inventario) // Solo las láminas del inventario del vendedor
    .order("equipo")
    .order("codigo");

  if (error) {
    throw new Error(`Error al cargar el catálogo: ${error.message}`);
  }

  // Agrupar por equipo en un solo recorrido O(n)
  const grouped: Record<string, Sticker[]> = {};
  for (const row of data as PublicStickerRow[]) {
    const sticker: Sticker = {
      code:      row.codigo,
      team:      row.equipo,
      type:      row.tipo,
      status:    row.estado,
      quantity:  row.cantidad,
      // Propagar el override manual para que getStickerCategory() lo use en el cliente
      categoria: row.categoria ?? null,
      // Propagar el precio individual para la cotización (null = usar default de categoría)
      precio:    row.precio ?? null,
      // Nombre oficial (undefined si la columna aún no tiene valor)
      name:      row.nombre ?? undefined,
    };
    if (!grouped[sticker.team]) {
      grouped[sticker.team] = [];
    }
    grouped[sticker.team].push(sticker);
  }

  // Orden natural numérico dentro de cada equipo: ALG1, ALG2 ... ALG10 (no lexicográfico)
  for (const stickers of Object.values(grouped)) {
    stickers.sort((a, b) =>
      a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: "base" })
    );
  }

  return grouped;
}

/**
 * @description Obtiene los nombres completos de equipos para el catálogo público.
 * Usa la tabla `teams`, accesible para el rol anon (sin RLS restrictivo).
 *
 * @returns Mapa Record<teamCode, teamName>
 */
export async function fetchPublicTeams(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("teams")
    .select("codigo, nombre")
    .order("codigo");

  if (error) {
    // Si falla, retornar mapa vacío — los componentes usarán la sigla como fallback
    console.warn("No se pudieron cargar los nombres de equipos:", error.message);
    return {};
  }

  const map: Record<string, string> = {};
  for (const row of data as { codigo: string; nombre: string }[]) {
    map[row.codigo] = row.nombre;
  }
  return map;
}

// ---------------------------------------------------------------------------
// Vendedores
// ---------------------------------------------------------------------------

/**
 * @description Datos públicos de un vendedor identificado por su slug de URL.
 */
export interface SellerPublic {
  /** Slug único. Ej: "anny" */
  slug: string;
  /** Nombre a mostrar en el catálogo. Ej: "Anny" */
  displayName: string;
  /** Inventario que gestiona este vendedor: 'CN' | 'AM' */
  inventario: string;
  /** Número de WhatsApp (opcional, reservado para uso futuro) */
  whatsapp: string | null;
}

/**
 * @description Busca un vendedor por su slug de URL.
 * Retorna `null` si el slug no existe (404 en el catálogo).
 *
 * @param slug - Slug de la URL, ej: "anny" de /laminas-anny
 * @returns Datos del vendedor o null si no existe
 */
export async function fetchSeller(slug: string): Promise<SellerPublic | null> {
  const { data, error } = await supabase
    .from("sellers")
    .select("slug, display_name, inventario, whatsapp")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.warn("Error buscando vendedor:", error.message);
    return null;
  }
  if (!data) return null;

  return {
    slug:        data.slug,
    displayName: data.display_name,
    inventario:  data.inventario,
    whatsapp:    data.whatsapp ?? null,
  };
}
