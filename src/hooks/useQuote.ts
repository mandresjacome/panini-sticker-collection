/**
 * @fileoverview Hook de cotización.
 *
 * Gestiona la "bolsa" de láminas que el cliente seleccionó para cotizar.
 * Estado efímero (solo dura la sesión del navegador — no se persiste).
 *
 * Lógica de precio efectivo por lámina:
 *   precio_efectivo = sticker.precio ?? categoryPrices[categoria]
 *
 * Expone:
 * - `selectedCodes`  — Set de códigos con al menos 1 unidad seleccionada
 * - `getQuantity`    — Cantidad seleccionada de un código concreto (0 si no está)
 * - `toggle`         — Cicla: 0 → 1 → 2 → … → máx stock → 0
 * - `clear`          — Vacía la selección
 * - `quoteLines`     — Array de líneas con lámina + precio calculado + cantidad
 * - `total`          — Suma de (precio × cantidad) para todas las líneas
 * - `whatsappText`   — Texto pre-armado para pegar en WhatsApp
 */

import { useState, useMemo, useCallback } from "react";
import type { Sticker, CategoryPricesMap, StickerCategory } from "../types";
import { getStickerCategory } from "../lib/stickerCategory";
import { ALBUM_TEAM_INDEX, TEAM_GROUP_LABEL } from "../lib/albumOrder";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/**
 * @description Una línea de la cotización: lámina + precio efectivo calculado + cantidad.
 */
export interface QuoteLine {
  /** La lámina seleccionada */
  sticker: Sticker;
  /** Categoría visual usada para la cotización */
  category: StickerCategory;
  /**
   * Precio efectivo en pesos por unidad.
   * = sticker.precio (si tiene override individual)
   * ?? categoryPrices[category] (default de la categoría)
   */
  effectivePrice: number;
  /** Cuántas unidades de esta lámina se cotizaron (1 ≤ qty ≤ sticker.quantity) */
  qty: number;
}

/**
 * @description Todo lo que expone el hook a los componentes.
 */
export interface UseQuoteReturn {
  /** Códigos de láminas con al menos 1 unidad en la cotización */
  selectedCodes: Set<string>;

  /** @returns true si el código tiene al menos 1 unidad en la cotización */
  isSelected: (code: string) => boolean;

  /**
   * @description Retorna la cantidad seleccionada del código.
   * @param code - Código de lámina
   * @returns Cantidad (0 si no está en la cotización)
   */
  getQuantity: (code: string) => number;

  /**
   * @description Cicla la cantidad de la lámina: 0→1→2→…→máx→0.
   * El máximo es el stock disponible (sticker.quantity).
   * @param sticker - Lámina a alternar
   */
  toggle: (sticker: Sticker) => void;

  /** Vacía la selección por completo */
  clear: () => void;

  /** Líneas de la cotización con precio y cantidad calculados */
  quoteLines: QuoteLine[];

  /** Suma total = Σ (precio_efectivo × qty) */
  total: number;

  /**
   * @description Texto listo para pegar en WhatsApp.
   * Incluye lista de láminas con categoría + precio + total.
   */
  whatsappText: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * @description Hook que implementa la funcionalidad de cotización del catálogo.
 * El cliente selecciona láminas haciendo tap/clic; el hook calcula precios
 * usando el mapa de precios por categoría como base, con override individual.
 *
 * @param categoryPrices - Mapa de precio base por categoría (de useCategoryPrices)
 * @param stickersFlat   - Array plano de todas las láminas disponibles en el catálogo
 * @returns Estado de selección, líneas de cotización, total y texto WhatsApp
 */
export function useQuote(
  categoryPrices: CategoryPricesMap,
  stickersFlat: Sticker[]
): UseQuoteReturn {
  /**
   * Mapa de código → cantidad seleccionada.
   * Invariante: si el código está en el mapa, su valor es >= 1.
   */
  const [selectedMap, setSelectedMap] = useState<Map<string, number>>(new Map());

  /**
   * @description Cicla la cantidad: si no existe → qty=1; si existe y qty < stock → qty+1;
   * si qty === stock → elimina del mapa (0 unidades = fuera de la cotización).
   * @param sticker - Lámina a alternar
   */
  const toggle = useCallback((sticker: Sticker) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      const current = next.get(sticker.code) ?? 0;
      // El tope es el stock disponible (sticker.quantity)
      const maxQty = sticker.quantity;

      if (current >= maxQty) {
        // Llegó al tope de stock → sacar del carrito
        next.delete(sticker.code);
      } else {
        // Sumar 1 unidad
        next.set(sticker.code, current + 1);
      }
      return next;
    });
  }, []);

  /** Vacía la selección */
  const clear = useCallback(() => {
    setSelectedMap(new Map());
  }, []);

  /**
   * Set derivado de las claves del mapa — para comparaciones rápidas O(1).
   * Se recalcula solo cuando cambia el mapa.
   */
  const selectedCodes = useMemo(
    () => new Set(selectedMap.keys()),
    [selectedMap]
  );

  /** Verifica si hay al menos 1 unidad seleccionada del código */
  const isSelected = useCallback(
    (code: string) => selectedMap.has(code),
    [selectedMap]
  );

  /**
   * @description Retorna la cantidad seleccionada de un código.
   * @param code - Código de lámina
   * @returns Cantidad (0 si no está en la cotización)
   */
  const getQuantity = useCallback(
    (code: string) => selectedMap.get(code) ?? 0,
    [selectedMap]
  );

  /**
   * Mapa de láminas por código para acceso O(1).
   * Se recalcula solo cuando cambia el array plano de láminas.
   */
  const stickersMap = useMemo(() => {
    const map = new Map<string, Sticker>();
    for (const s of stickersFlat) map.set(s.code, s);
    return map;
  }, [stickersFlat]);

  /**
   * Líneas de la cotización: una por lámina seleccionada, con precio efectivo y qty.
   * Orden: según el álbum físico (FWC → Grupos A-L → Patrocinadores CC).
   */
  const quoteLines = useMemo<QuoteLine[]>(() => {
    const lines: QuoteLine[] = [];
    for (const [code, qty] of selectedMap) {
      const sticker = stickersMap.get(code);
      if (!sticker) continue; // Defensivo: lámina ya no disponible

      const category = getStickerCategory(sticker);
      // Precio efectivo unitario: override individual tiene prioridad
      const effectivePrice =
        sticker.precio !== null && sticker.precio !== undefined
          ? sticker.precio
          : (categoryPrices[category] ?? 0);

      lines.push({ sticker, category, effectivePrice, qty });
    }

    // Ordenar según el orden del álbum físico usando ALBUM_TEAM_INDEX
    lines.sort((a, b) => {
      const teamA = a.sticker.team;
      const teamB = b.sticker.team;
      
      // Obtener índice de equipo en el orden del álbum
      const idxA = ALBUM_TEAM_INDEX[teamA] ?? Number.MAX_SAFE_INTEGER;
      const idxB = ALBUM_TEAM_INDEX[teamB] ?? Number.MAX_SAFE_INTEGER;
      
      if (idxA !== idxB) return idxA - idxB;
      
      // Si son del mismo equipo, ordenar por código numérico
      return a.sticker.code.localeCompare(b.sticker.code, undefined, {
        numeric:     true,
        sensitivity: "base",
      });
    });

    return lines;
  }, [selectedMap, stickersMap, categoryPrices]);

  /** Suma total: precio_unitario × cantidad para cada línea */
  const total = useMemo(
    () => quoteLines.reduce((acc, line) => acc + line.effectivePrice * line.qty, 0),
    [quoteLines]
  );

  /**
   * Texto pre-armado para WhatsApp.
   * Las láminas se agrupan por sección del álbum (Especiales, Grupo A … Patrocinadores)
   * para que el mensaje refleje el mismo orden visual de la app.
   * Muestra cantidad si es > 1: "• MEX1 ×2 (Básica) — $2.000"
   */
  const whatsappText = useMemo(() => {
    if (quoteLines.length === 0) return "";

    const separator = "─────────────────────────";

    // Construir líneas agrupadas por sección del álbum
    const bodyLines: string[] = [];
    let currentGroupLabel = "";

    for (const l of quoteLines) {
      // Etiqueta de la sección a la que pertenece el equipo (ej. "Grupo A", "Patrocinadores")
      const groupLabel = TEAM_GROUP_LABEL[l.sticker.team] ?? "Otros";

      // Añadir encabezado de sección cuando cambia el grupo
      if (groupLabel !== currentGroupLabel) {
        // Separación visual entre grupos (excepto antes del primero)
        if (currentGroupLabel !== "") bodyLines.push("");
        bodyLines.push(`📋 ${groupLabel}`);
        currentGroupLabel = groupLabel;
      }

      const catLabel =
        l.category === "FOTO_EQUIPO"
          ? "Foto equipo"
          : l.category.charAt(0) + l.category.slice(1).toLowerCase();

      const subtotal    = l.effectivePrice * l.qty;
      const fmtSubtotal = subtotal.toLocaleString("es-CO");
      const qtyPart     = l.qty > 1 ? ` ×${l.qty}` : "";

      // Nombre limpio: quita prefijo de equipo y sufijos redundantes para el mensaje
      const namePart = l.sticker.name
        ? ` — ${l.sticker.name
            .replace(/^[^-]+ - /, "")           // "Mexico - Hirving Lozano" → "Hirving Lozano"
            .replace(/\s*\(FOIL\)/gi, "")        // "...Argentina 2022 (FOIL)" → "...Argentina 2022"
            .replace(/\s*\(Extra Sticker - Gold\)/gi, "") // "Messi (Extra Sticker - Gold)" → "Messi"
            .replace(/\s*\(Variant\)/gi, "")     // elimina "(Variant)" si aparece
            .trim()}`
        : "";

      bodyLines.push(`• ${l.sticker.code}${namePart}${qtyPart} (${catLabel}) — $${fmtSubtotal}`);
    }

    const formattedTotal = total.toLocaleString("es-CO");
    // Total de unidades (no de códigos únicos)
    const totalUnits = quoteLines.reduce((acc, l) => acc + l.qty, 0);

    return [
      "🏆 Cotización Láminas Panini FIFA 2026",
      separator,
      ...bodyLines,
      separator,
      `💰 Total: $${formattedTotal}`,
      `(${totalUnits} lámina${totalUnits !== 1 ? "s" : ""})`,
    ].join("\n");
  }, [quoteLines, total]);

  return {
    selectedCodes,
    isSelected,
    getQuantity,
    toggle,
    clear,
    quoteLines,
    total,
    whatsappText,
  };
}
