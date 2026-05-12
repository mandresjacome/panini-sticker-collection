/**
 * @fileoverview Hook para gestionar los precios base por categoría.
 *
 * Responsabilidades:
 * 1. Carga los precios desde `category_prices` via TanStack Query.
 * 2. Expone mutación para actualizar el precio de una categoría.
 * 3. Mientras carga, devuelve DEFAULT_CATEGORY_PRICES para que la UI
 *    nunca quede sin datos.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCategoryPrices, updateCategoryPrice } from "../services/categoryPriceService";
import type { StickerCategory, CategoryPricesMap } from "../types";
import { DEFAULT_CATEGORY_PRICES } from "../types";

/** Clave de caché de TanStack Query para los precios de categoría */
const PRICES_QUERY_KEY = ["category_prices"] as const;

// ---------------------------------------------------------------------------
// Tipo de retorno
// ---------------------------------------------------------------------------

/**
 * @description Todo lo que expone el hook a los componentes.
 */
export interface UseCategoryPricesReturn {
  /**
   * Mapa con el precio base de cada categoría.
   * Mientras carga, devuelve DEFAULT_CATEGORY_PRICES.
   */
  categoryPrices: CategoryPricesMap;

  /** true mientras se realiza la carga inicial desde Supabase */
  isLoadingPrices: boolean;

  /**
   * @description Actualiza el precio base de una categoría en Supabase.
   * Invalida el caché automáticamente al completarse.
   * @param category - Categoría a actualizar
   * @param price    - Nuevo precio en pesos COP
   */
  updateCategoryPrice: (category: StickerCategory, price: number) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * @description Hook que conecta TanStack Query con la tabla `category_prices`.
 * Los precios se cachean 5 minutos (staleTime) ya que no cambian frecuentemente.
 * @returns Precios actuales, estado de carga y mutación de actualización
 */
export function useCategoryPrices(): UseCategoryPricesReturn {
  const queryClient = useQueryClient();

  // ── Carga inicial ────────────────────────────────────────────────────────
  const { data: categoryPrices, isLoading: isLoadingPrices } = useQuery({
    queryKey: PRICES_QUERY_KEY,
    queryFn:  fetchCategoryPrices,
    // Los precios no cambian frecuentemente — 5 minutos sin refetch automático
    staleTime:            5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // ── Mutación de actualización ────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: ({
      category,
      price,
    }: {
      category: StickerCategory;
      price:    number;
    }) => updateCategoryPrice(category, price),

    // Al guardar, invalidar el caché para que todos los componentes vean el nuevo precio
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRICES_QUERY_KEY });
    },
  });

  return {
    // Fallback a defaults mientras carga, para que la UI nunca quede vacía
    categoryPrices: categoryPrices ?? DEFAULT_CATEGORY_PRICES,
    isLoadingPrices,
    updateCategoryPrice: (category, price) =>
      mutation.mutateAsync({ category, price }),
  };
}
