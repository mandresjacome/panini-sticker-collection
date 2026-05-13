/**
 * @fileoverview Tipos centrales del dominio de la app de láminas FIFA 2026.
 * Todas las entidades, enumeraciones y tipos de utilidad del negocio.
 */

/**
 * @description Identifica el grupo de inventario al que pertenece un conjunto de láminas.
 *
 * - `CN` — Inventario de Cristian y Nicolás (el original)
 * - `AM` — Inventario de Anny y Mario (independiente)
 */
export type Inventario = "CN" | "AM";

// ---------------------------------------------------------------------------
// Estados de lámina
// ---------------------------------------------------------------------------

/**
 * @description Representa los posibles estados de una lámina en el inventario de venta.
 *
 * - `F` Falta     — No se tiene. Color UI: Gris.
 * - `D` Disponible — Se tiene para vender; `quantity` indica cuántas copias. Color UI: Verde.
 */
export type StickerStatus = "F" | "D";

// ---------------------------------------------------------------------------
// Categorías de lámina (rareza / tipo visual)
// ---------------------------------------------------------------------------

/**
 * @description Categorías manuales que se pueden asignar a una lámina.
 * Solo TOP y GOAT se persisten en la DB; el resto se auto-deriva en frontend.
 *
 * - `TOP`  — Jugador destacado (morado). Asignación manual.
 * - `GOAT` — La más valiosa/rara (dorado). Asignación manual.
 */
export type StickerCategoryOverride = "TOP" | "GOAT";

/**
 * @description Todas las categorías posibles de una lámina, incluyendo las auto-derivadas.
 *
 * | Categoría      | Origen    | Color UI  |
 * |----------------|-----------|-----------|
 * | `GOAT`         | Manual    | Dorado    |
 * | `TOP`          | Manual    | Morado    |
 * | `METALIZADA`   | Auto (FWC)| Teal      |
 * | `ESCUDO`       | Auto (num=1)  | Rojo  |
 * | `FOTO_EQUIPO`  | Auto (num=13) | Verde |
 * | `PATROCINADOR` | Auto (CC) | Rojo      |
 * | `BASICA`       | Auto (resto)  | Azul  |
 */
export type StickerCategory =
  | "GOAT"
  | "TOP"
  | "METALIZADA"
  | "ESCUDO"
  | "FOTO_EQUIPO"
  | "PATROCINADOR"
  | "BASICA";

// ---------------------------------------------------------------------------
// Entidad Sticker
// ---------------------------------------------------------------------------

/**
 * @description Representa una lámina individual de la colección.
 *
 * Invariante de negocio: si `quantity > 0`, entonces `status !== "F"`.
 * Esta regla debe validarse en la capa de servicio, nunca solo en la UI.
 */
export interface Sticker {
  /** Identificador único de la lámina. Ej: "FWC1", "MEX10", "ARG20" */
  code: string;

  /** Sigla del equipo o categoría al que pertenece. Ej: "MEX", "ARG", "FWC" */
  team: string;

  /** Clasificación de la lámina. Ej: "Especial", "Selección", "Estadio" */
  type: string;

  /** Estado actual de la lámina en la colección */
  status: StickerStatus;

  /** Cantidad de copias en posesión. Debe ser >= 0 */
  quantity: number;

  /** Observaciones opcionales del coleccionista */
  notes?: string;

  /**
   * Override manual de categoría especial.
   * null / undefined = la categoría se auto-deriva por equipo+código en getStickerCategory().
   * Solo persiste en DB cuando el usuario asigna TOP o GOAT explícitamente.
   */
  categoria?: StickerCategoryOverride | null;

  /**
   * Precio de venta individual (override por lámina).
   * null / undefined = usar el precio default de su categoría (tabla category_prices).
   * Entero positivo = precio específico de esta lámina (ej. una metalizada rara vale más).
   */
  precio?: number | null;
  /**
   * Nombre oficial de la lámina (jugador, logo, foto equipo, etc.).
   * Fuente: paninitrade.com/api/sticker-catalog.
   * Ej: "Mexico - Hirving Lozano", "FIFA World Cup 2026 Official Emblem (FOIL)".
   * undefined cuando la columna `nombre` de la DB aún no tiene valor.
   */
  name?: string;
  /** Fecha y hora de la última modificación (gestionado por Supabase) */
  updated_at?: string;

  /** ID del usuario que realizó la última modificación (FK a auth.users) */
  updated_by?: string;
}

// ---------------------------------------------------------------------------
// Entidad Team
// ---------------------------------------------------------------------------

/**
 * @description Representa un equipo o categoría de la colección, con sus láminas.
 */
export interface Team {
  /** Sigla del equipo. Ej: "MEX", "ARG", "FWC" */
  code: string;

  /** Nombre completo del equipo. Ej: "México", "Argentina", "FIFA World Cup" */
  name: string;

  /** Lista de láminas pertenecientes a este equipo */
  stickers: Sticker[];
}

// ---------------------------------------------------------------------------
// Tipos de métricas y progreso
// ---------------------------------------------------------------------------

/**
 * @description Conteos de láminas agrupados por estado para el dashboard.
 */
export interface StickerCounts {
  /** Total de láminas en estado Falta */
  missing: number;

  /** Total de láminas en estado Disponible (suma de todas las cantidades > 0) */
  available: number;

  /** Total de láminas en la colección (fijo: 994) */
  total: number;
}

/**
 * @description Resumen de progreso para un equipo específico.
 */
export interface TeamProgress {
  /** Sigla del equipo */
  teamCode: string;

  /** Nombre completo del equipo */
  teamName: string;

  /** Conteos por estado para este equipo */
  counts: StickerCounts;

  /** Porcentaje de completitud: (D + R + V) / total_del_equipo * 100 */
  progressPercentage: number;
}

// ---------------------------------------------------------------------------
// Tipos de estado normalizado (para el store de Zustand)
// ---------------------------------------------------------------------------

/**
 * @description Mapa normalizado de stickers indexado por código.
 * Permite actualización O(1) sin recorrer arrays, crítico para 994 ítems.
 */
export type StickersMap = Record<string, Sticker>;

// ---------------------------------------------------------------------------
// Constantes de dominio
// ---------------------------------------------------------------------------

/** Total fijo de códigos únicos en la colección FIFA 2026
 * Desglose: FWC00 + FWC1-FWC19 (20) + 48 selecciones × 20 (960) + CC1-CC14 (14) = 994
 */
export const TOTAL_STICKERS = 994;

/**
 * @description Metadatos de cada estado: etiqueta y color Tailwind.
 * Solo existen dos estados en el flujo de venta: F (no tengo) y D (disponible para vender).
 */
export const STATUS_META: Record<
  StickerStatus,
  { label: string; color: string }
> = {
  F: { label: "Falta",      color: "bg-gray-300 text-gray-700"  },
  D: { label: "Disponible", color: "bg-green-400 text-white"     },
};

// ---------------------------------------------------------------------------
// Metadatos de categorías visuales
// ---------------------------------------------------------------------------

/**
 * @description Metadatos de cada categoría: etiqueta, color de fondo, color de texto,
 * color de punto, color de celda completa (cuando la lámina está Disponible)
 * y si requiere asignación manual.
 *
 * `cellColor` — clases Tailwind para bg + text usadas en StickerCell cuando status = D.
 *   La celda entera toma el color de la categoría, reemplazando el verde genérico.
 *   Cuando status = F la celda sigue siendo gris (STATUS_META.F.color).
 *
 * Usado en StickerCell (celda + punto), CRUDView (badge) y MatrixView (leyenda).
 */
export const CATEGORY_META: Record<
  StickerCategory,
  { label: string; bg: string; text: string; dot: string; cellColor: string; manual: boolean }
> = {
  // ── Manuales ──────────────────────────────────────────────────────────────
  GOAT: {
    label:     "GOAT",
    bg:        "bg-yellow-100",
    text:      "text-yellow-800",
    dot:       "bg-yellow-400",
    cellColor: "bg-yellow-400 text-yellow-900",   // Dorado saturado
    manual:    true,
  },
  TOP: {
    label:     "TOP",
    bg:        "bg-purple-100",
    text:      "text-purple-800",
    dot:       "bg-purple-500",
    cellColor: "bg-purple-500 text-white",         // Morado
    manual:    true,
  },
  // ── Auto-derivadas ─────────────────────────────────────────────────────────
  METALIZADA: {
    label:     "Metalizada",
    bg:        "bg-teal-100",
    text:      "text-teal-800",
    dot:       "bg-teal-400",
    cellColor: "bg-teal-400 text-white",           // Teal
    manual:    false,
  },
  ESCUDO: {
    label:     "Escudo",
    bg:        "bg-red-100",
    text:      "text-red-800",
    dot:       "bg-red-500",
    cellColor: "bg-red-500 text-white",            // Rojo
    manual:    false,
  },
  FOTO_EQUIPO: {
    label:     "Foto equipo",
    bg:        "bg-green-100",
    text:      "text-green-800",
    dot:       "bg-green-500",
    cellColor: "bg-green-500 text-white",          // Verde
    manual:    false,
  },
  PATROCINADOR: {
    label:     "Patrocinador",
    bg:        "bg-orange-100",
    text:      "text-orange-800",
    dot:       "bg-orange-400",
    cellColor: "bg-orange-400 text-white",         // Naranja
    manual:    false,
  },
  BASICA: {
    label:     "Básica",
    bg:        "bg-blue-50",
    text:      "text-blue-700",
    dot:       "bg-blue-400",
    cellColor: "bg-blue-400 text-white",           // Azul
    manual:    false,
  },
};

// ---------------------------------------------------------------------------
// Sistema de precios por categoría
// ---------------------------------------------------------------------------

/**
 * @description Mapa de precio base por cada categoría de lámina.
 * Usado como fallback cuando una lámina no tiene precio individual (precio = null).
 */
export type CategoryPricesMap = Record<StickerCategory, number>;

/**
 * @description Precios base acordados inicialmente (en pesos COP).
 * Se usan como fallback mientras la tabla `category_prices` carga desde Supabase.
 * PATROCINADOR queda en 0 porque aún está por definir.
 */
export const DEFAULT_CATEGORY_PRICES: CategoryPricesMap = {
  BASICA:       1000,
  PATROCINADOR: 0,
  FOTO_EQUIPO:  2000,
  ESCUDO:       3000,
  METALIZADA:   5000,
  TOP:          5000,
  GOAT:         10000,
};
