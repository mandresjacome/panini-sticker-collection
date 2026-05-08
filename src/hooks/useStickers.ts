/**
 * @fileoverview Hook principal de stickers.
 *
 * Responsabilidades:
 * 1. Carga inicial de los 994 stickers via TanStack Query.
 * 2. Suscripción a Supabase Realtime para actualizaciones en vivo
 *    (cuando otro usuario cambia una lámina, todos se actualizan).
 * 3. Mutaciones (cycleStatus, updateSticker) con actualización optimista.
 */

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { fetchAllStickers, cycleNextStatus, updateSticker } from "../services/stickerService";
import { useStickerStore } from "../store/stickerStore";
import type { Sticker, StickerStatus, StickersMap } from "../types";
import { TOTAL_STICKERS as TOTAL } from "../types";

// Clave de caché de TanStack Query para el inventario completo
const STICKERS_QUERY_KEY = ["stickers"] as const;

// ---------------------------------------------------------------------------
// Tipos de retorno
// ---------------------------------------------------------------------------

/**
 * @description Todo lo que expone el hook a los componentes.
 */
export interface UseStickersReturn {
  /** true mientras se carga el inventario inicial */
  isLoading: boolean;

  /** Mensaje de error si algo falló */
  error: string | null;

  /** Todos los stickers como array */
  stickersArray: Sticker[];

  /** Stickers filtrados por equipo */
  getStickersByTeam: (teamCode: string) => Sticker[];

  /** Stickers filtrados por estado */
  getStickersByStatus: (status: StickerStatus) => Sticker[];

  /** Avanza el estado de una lámina al siguiente en el ciclo F↔D */
  cycleStatus: (sticker: Sticker) => Promise<void>;

  /** Actualiza campos de una lámina (cantidad, estado, notas) */
  updateStickerFields: (
    code: string,
    fields: Partial<Pick<Sticker, "status" | "quantity" | "notes">>
  ) => Promise<void>;

  /** Conteos globales para el panel de resumen */
  counts: {
    total:     number;
    missing:   number;   // láminas con estado F
    available: number;   // láminas con estado D
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * @description Hook principal que conecta Supabase, el store de Zustand
 * y TanStack Query en una sola interfaz para los componentes.
 * @returns Estado, acciones y métricas del inventario de láminas
 */
export function useStickers(): UseStickersReturn {
  const queryClient = useQueryClient();
  const { setStickers, upsertSticker, setLoading, setError,
          isLoading, error,
          getStickersArray, getStickersByTeam, getStickersByStatus } = useStickerStore();

  // -------------------------------------------------------------------------
  // 1. Carga inicial con TanStack Query
  // -------------------------------------------------------------------------
  const { isLoading: queryLoading, error: queryError } = useQuery({
    queryKey: STICKERS_QUERY_KEY,
    queryFn:  fetchAllStickers,
    // No refetch automático en background — Realtime mantendrá los datos frescos
    refetchOnWindowFocus: false,
  });

  // Sincronizar el resultado de TanStack Query con el store de Zustand
  useEffect(() => {
    setLoading(queryLoading);
  }, [queryLoading, setLoading]);

  useEffect(() => {
    if (queryError) {
      setError((queryError as Error).message);
    }
  }, [queryError, setError]);

  // Cuando TanStack Query termina de cargar, poblar el store
  useEffect(() => {
    const cached = queryClient.getQueryData<StickersMap>(STICKERS_QUERY_KEY);
    if (cached) {
      setStickers(cached);
    }
  }, [queryClient, setStickers, queryLoading]);

  // -------------------------------------------------------------------------
  // 2. Supabase Realtime — actualizaciones colaborativas en tiempo real
  // -------------------------------------------------------------------------
  useEffect(() => {
    // Suscribirse a todos los cambios (INSERT, UPDATE, DELETE) en la tabla stickers
    const channel = supabase
      .channel("stickers-realtime")
      .on(
        "postgres_changes",
        {
          event:  "*",         // Escuchar INSERT, UPDATE y DELETE
          schema: "public",
          table:  "stickers",
        },
        (payload) => {
          if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
            const row = payload.new as Record<string, unknown>;

            // Normalizar estados legacy (R, V) al nuevo modelo F|D
            const rawStatus = row.estado as string;
            const qty = (row.cantidad as number) ?? 0;
            const status: StickerStatus =
              (rawStatus === "D" || rawStatus === "R" || rawStatus === "V")
                ? "D"
                : "F";
            const finalStatus: StickerStatus =
              status === "F" && qty > 0 ? "D" : status;

            const updatedSticker: Sticker = {
              code:       row.codigo     as string,
              team:       row.equipo     as string,
              type:       row.tipo       as string,
              status:     finalStatus,
              quantity:   qty,
              notes:      row.observacion as string | undefined,
              updated_at: row.updated_at as string,
              updated_by: row.updated_by as string | undefined,
            };

            upsertSticker(updatedSticker);
          }
        }
      )
      .subscribe();

    // Limpiar la suscripción al desmontar para evitar memory leaks
    return () => {
      supabase.removeChannel(channel);
    };
  }, [upsertSticker]);

  // -------------------------------------------------------------------------
  // 3. Mutaciones
  // -------------------------------------------------------------------------

  /**
   * @description Mutación para ciclar el estado de una lámina.
   * Actualiza optimistamente el store antes de confirmar con Supabase.
   */
  const cycleMutation = useMutation({
    mutationFn: ({ sticker }: { sticker: Sticker }) =>
      cycleNextStatus(sticker.code, sticker.status, sticker.quantity),

    onSuccess: (updatedSticker) => {
      // Confirmar la actualización en el store con los datos reales del servidor
      upsertSticker(updatedSticker);
    },

    onError: (err) => {
      setError((err as Error).message);
    },
  });

  /**
   * @description Mutación para actualizar campos específicos de una lámina.
   */
  const updateMutation = useMutation({
    mutationFn: ({
      code,
      fields,
    }: {
      code: string;
      fields: Partial<Pick<Sticker, "status" | "quantity" | "notes">>;
    }) => updateSticker(code, fields),

    onSuccess: (updatedSticker) => {
      upsertSticker(updatedSticker);
    },

    onError: (err) => {
      setError((err as Error).message);
    },
  });

  // -------------------------------------------------------------------------
  // 4. Métricas derivadas para el Dashboard
  // -------------------------------------------------------------------------
  const stickersArr = getStickersArray();

  // Contar por estado recorriendo el array una sola vez (O(n))
  let missing = 0, available = 0;
  for (const s of stickersArr) {
    if (s.status === "F") missing++;
    else if (s.status === "D") available++;
  }

  // -------------------------------------------------------------------------
  // Retorno del hook
  // -------------------------------------------------------------------------
  return {
    isLoading: isLoading || queryLoading,
    error,
    stickersArray: stickersArr,
    getStickersByTeam,
    getStickersByStatus,

    cycleStatus: async (sticker) => {
      await cycleMutation.mutateAsync({ sticker });
    },

    updateStickerFields: async (code, fields) => {
      await updateMutation.mutateAsync({ code, fields });
    },

    counts: {
      total:     TOTAL,
      missing,
      available,
    },
  };
}
