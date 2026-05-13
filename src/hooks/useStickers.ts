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
import { useInventario } from "./useInventario";
import type { Sticker, StickerStatus, StickerCategoryOverride, StickersMap, Inventario } from "../types";
import { TOTAL_STICKERS as TOTAL } from "../types";

// La clave de caché incluye el inventario para que CN y AM tengan datos separados
function stickerQueryKey(inventario: Inventario | null) {
  return ["stickers", inventario] as const;
}

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

  /** Actualiza campos de una lámina (cantidad, estado, notas, categoria, precio) */
  updateStickerFields: (
    code: string,
    fields: Partial<Pick<Sticker, "status" | "quantity" | "notes" | "categoria" | "precio">>
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

  /**
   * Inventario del usuario autenticado.
   * null = sesion todavía cargando (AdminLayout impide montar antes de que esté listo).
   */
  const inventario = useInventario();

  // Clave de caché específica para este inventario
  const STICKERS_QUERY_KEY = stickerQueryKey(inventario);

  // -------------------------------------------------------------------------
  // 1. Carga inicial con TanStack Query
  // -------------------------------------------------------------------------
  const { isLoading: queryLoading, error: queryError } = useQuery({
    queryKey: STICKERS_QUERY_KEY,
    queryFn:  () => fetchAllStickers(inventario!),
    enabled:  !!inventario,   // Esperar a que el inventario esté determinado
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
    // Solo suscribirse cuando ya sabemos el inventario
    if (!inventario) return;

    // Suscribirse solo a cambios del inventario de este usuario
    const channel = supabase
      .channel(`stickers-realtime-${inventario}`)
      .on(
        "postgres_changes",
        {
          event:  "*",
          schema: "public",
          table:  "stickers",
          filter: `inventario=eq.${inventario}`,  // Filtrar por inventario en Realtime
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
              // Propagar el override manual de categoría desde Realtime
              categoria:  (row.categoria as StickerCategoryOverride | null) ?? null,
              // Propagar el precio individual (override o null para heredar default)
              precio:     (row.precio as number | null) ?? null,
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
  }, [upsertSticker, inventario]);  // Recrear canal si cambia el inventario

  // -------------------------------------------------------------------------
  // 3. Mutaciones
  // -------------------------------------------------------------------------

  /**
   * @description Mutación para ciclar el estado de una lámina.
   * Actualiza optimistamente el store antes de confirmar con Supabase.
   */
  const cycleMutation = useMutation({
    mutationFn: ({ sticker }: { sticker: Sticker }) =>
      cycleNextStatus(sticker.code, sticker.status, sticker.quantity, inventario!),

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
      fields: Partial<Pick<Sticker, "status" | "quantity" | "notes" | "categoria" | "precio">>;
    }) => updateSticker(code, inventario!, fields),

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
