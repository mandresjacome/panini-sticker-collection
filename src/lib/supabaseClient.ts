/**
 * @fileoverview Cliente singleton de Supabase para toda la aplicación.
 *
 * Las credenciales se leen exclusivamente desde variables de entorno de Vite.
 * NUNCA hardcodear valores reales aquí.
 *
 * Variables requeridas en .env:
 *   VITE_SUPABASE_URL      — URL del proyecto Supabase
 *   VITE_SUPABASE_ANON_KEY — Clave pública anónima (safe para el frontend con RLS activo)
 */

import { createClient } from "@supabase/supabase-js";

// Lee las variables de entorno inyectadas por Vite en tiempo de build
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Valida que las variables estén presentes antes de continuar.
// Falla rápido en desarrollo si falta la configuración.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "[Supabase] Faltan variables de entorno: VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. " +
    "Crea un archivo .env basado en .env.example."
  );
}

/**
 * @description Instancia singleton del cliente de Supabase.
 * Exportar y reutilizar esta instancia en toda la app —
 * no crear múltiples instancias de createClient.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
