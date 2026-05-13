/**
 * @fileoverview Hook para obtener el catálogo de equipos desde Supabase.
 * Retorna un mapa teamCode → teamName para resolver nombres en la Vista Matriz.
 * Se cachea con TanStack Query — raramente cambia, staleTime largo.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./useAuth";

// ---------------------------------------------------------------------------
// Tipo de fila de la tabla teams
// ---------------------------------------------------------------------------

interface TeamRow {
  /** Sigla del equipo (PK). Ej: "MEX", "ARG", "FWC" */
  codigo: string;

  /** Nombre completo. Ej: "México", "Argentina" */
  nombre: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * @description Obtiene todos los equipos de la colección y los expone
 * como un mapa para búsqueda O(1) por código.
 *
 * @returns Mapa Record<teamCode, teamName> y estado de carga
 */
export function useTeams(): { teamsMap: Record<string, string>; teamsLoading: boolean } {
  const { user, loading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["teams"],
    // Esperar a que el hook de auth haya resuelto la sesión Y tenga usuario.
    // Sin esto, si useAuth() aún está en loading:true en esta instancia,
    // la petición llega sin JWT → Supabase RLS devuelve 400.
    enabled: !loading && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("codigo, nombre")
        .order("codigo");

      if (error) throw new Error(`Error al cargar equipos: ${error.message}`);
      return data as TeamRow[];
    },
    // Los equipos prácticamente no cambian; cachear por 30 minutos
    staleTime: 1000 * 60 * 30,
  });

  // Construir el mapa { "MEX": "México", "ARG": "Argentina", ... }
  const teamsMap: Record<string, string> = {};
  if (data) {
    for (const row of data) {
      teamsMap[row.codigo] = row.nombre;
    }
  }

  return { teamsMap, teamsLoading: isLoading };
}
