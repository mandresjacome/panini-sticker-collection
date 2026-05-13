/**
 * @fileoverview Hook que determina el inventario que administra el usuario autenticado.
 *
 * REGLA DE NEGOCIO:
 *   Cada usuario autenticado pertenece a exactamente un grupo de inventario:
 *     · Inventario 'AM' → anny@panini2026.com, mario@panini2026.com
 *     · Inventario 'CN' → todos los demás (cristian@panini2026.com, nicolas@panini2026.com)
 *
 *   Si el usuario no ha cargado aún, retorna null (estado de carga).
 */

import { useAuth } from "./useAuth";
import type { Inventario } from "../types";

// ---------------------------------------------------------------------------
// Mapa email → inventario
// ---------------------------------------------------------------------------

/**
 * @description Usuarios que pertenecen al inventario AM.
 * Se usa un Set para O(1) en la búsqueda.
 */
const AM_EMAILS = new Set<string>([
  "anny@panini2026.com",
  "mario@panini2026.com",
]);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * @description Retorna el inventario asignado al usuario autenticado actualmente.
 *
 * - `'CN'` — Cristian / Nicolás (inventario original)
 * - `'AM'` — Anny / Mario (inventario independiente)
 * - `null`  — El usuario aún no ha cargado (estado transitorio inicial)
 *
 * @returns Código de inventario del usuario, o null si no está listo
 */
export function useInventario(): Inventario | null {
  const { user, loading } = useAuth();

  // Mientras se verifica la sesión, no sabemos a qué inventario pertenece
  if (loading || !user) return null;

  // El email del usuario determina su inventario
  const email = user.email?.toLowerCase() ?? "";
  return AM_EMAILS.has(email) ? "AM" : "CN";
}
