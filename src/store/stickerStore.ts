/**
 * @fileoverview Store global de stickers usando Zustand.
 *
 * El estado se normaliza como Record<code, Sticker> para lograr
 * actualizaciones O(1) — crítico con 994 láminas y 4 usuarios en tiempo real.
 *
 * Este store solo gestiona el ESTADO en memoria.
 * Las llamadas a Supabase ocurren en el hook useStickers.
 */

import { create } from "zustand";
import type { Sticker, StickersMap, StickerStatus } from "../types";

// ---------------------------------------------------------------------------
// Tipos del store
// ---------------------------------------------------------------------------

/**
 * @description Estado y acciones del store de stickers.
 */
interface StickerStore {
  // --- Estado ---

  /** Mapa normalizado de todos los stickers. Clave: código de lámina */
  stickers: StickersMap;

  /** true mientras se carga el inventario inicial desde Supabase */
  isLoading: boolean;

  /** Mensaje de error si la carga inicial o una actualización falló */
  error: string | null;

  // --- Acciones ---

  /**
   * @description Reemplaza el mapa completo de stickers (carga inicial).
   * @param stickers - Mapa normalizado de todos los stickers
   */
  setStickers: (stickers: StickersMap) => void;

  /**
   * @description Actualiza un único sticker en el store (O(1)).
   * Usado por Supabase Realtime y por las mutaciones locales optimistas.
   * @param sticker - Sticker con los datos actualizados
   */
  upsertSticker: (sticker: Sticker) => void;

  /**
   * @description Actualiza el estado de carga.
   * @param loading - true si se está cargando, false si terminó
   */
  setLoading: (loading: boolean) => void;

  /**
   * @description Establece un mensaje de error global.
   * @param error - Mensaje de error, o null para limpiar
   */
  setError: (error: string | null) => void;

  // --- Selectores derivados ---

  /**
   * @description Retorna todos los stickers como array ordenado.
   * Se recalcula solo cuando cambia el mapa de stickers.
   * @returns Array de stickers ordenado por equipo y código
   */
  getStickersArray: () => Sticker[];

  /**
   * @description Retorna los stickers de un equipo específico.
   * @param teamCode - Sigla del equipo (ej. "MEX", "ARG")
   * @returns Array de stickers del equipo
   */
  getStickersByTeam: (teamCode: string) => Sticker[];

  /**
   * @description Retorna los stickers filtrados por estado.
   * @param status - Estado a filtrar ("D" | "F" | "R" | "V")
   * @returns Array de stickers con ese estado
   */
  getStickersByStatus: (status: StickerStatus) => Sticker[];
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/**
 * @description Store de Zustand para el inventario de láminas.
 * Exponer este hook en los componentes para acceder al estado global.
 */
export const useStickerStore = create<StickerStore>((set, get) => ({
  // --- Estado inicial ---
  stickers:  {},
  isLoading: false,
  error:     null,

  // --- Acciones ---

  setStickers: (stickers) => set({ stickers, isLoading: false, error: null }),

  upsertSticker: (sticker) =>
    set((state) => ({
      stickers: {
        ...state.stickers,
        // Actualizar solo la entrada afectada — O(1) sin tocar las otras 993
        [sticker.code]: sticker,
      },
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  // --- Selectores derivados ---

  getStickersArray: () =>
    // Orden natural numérico: ALG1 < ALG2 < ... < ALG10 (no lexicográfico)
    Object.values(get().stickers).sort((a, b) =>
      a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: "base" })
    ),

  getStickersByTeam: (teamCode) =>
    Object.values(get().stickers)
      .filter((s) => s.team === teamCode)
      .sort((a, b) =>
        a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: "base" })
      ),

  getStickersByStatus: (status) =>
    Object.values(get().stickers)
      .filter((s) => s.status === status)
      .sort((a, b) =>
        a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: "base" })
      ),
}));
