/**
 * @fileoverview Servicio de autenticación — encapsula todas las llamadas
 * a Supabase Auth para mantener la lógica fuera de los componentes UI.
 */

import { supabase } from "../lib/supabaseClient";
import type { User, AuthError } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Tipos de respuesta del servicio
// ---------------------------------------------------------------------------

/**
 * @description Resultado genérico para operaciones de auth.
 * Evita propagar excepciones directamente a la UI.
 */
export interface AuthResult {
  /** Usuario autenticado, o null si hubo error */
  user: User | null;
  /** Mensaje de error legible, o null si fue exitoso */
  error: string | null;
}

// ---------------------------------------------------------------------------
// Funciones del servicio
// ---------------------------------------------------------------------------

/**
 * @description Inicia sesión con email y contraseña.
 * @param email - Correo electrónico del usuario
 * @param password - Contraseña del usuario
 * @returns Resultado con el usuario autenticado o un mensaje de error
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    // Traduce los errores más comunes de Supabase a mensajes en español
    return { user: null, error: translateAuthError(error) };
  }

  return { user: data.user, error: null };
}

/**
 * @description Cierra la sesión del usuario actual.
 * @returns null si fue exitoso, o un mensaje de error
 */
export async function signOut(): Promise<string | null> {
  const { error } = await supabase.auth.signOut();
  return error ? translateAuthError(error) : null;
}

/**
 * @description Obtiene la sesión activa actual (sin hacer fetch a la red).
 * @returns El usuario autenticado, o null si no hay sesión
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

// ---------------------------------------------------------------------------
// Utilidades internas
// ---------------------------------------------------------------------------

/**
 * @description Traduce mensajes de error de Supabase Auth al español.
 * @param error - Error original de Supabase
 * @returns Mensaje de error legible para el usuario
 */
function translateAuthError(error: AuthError): string {
  // Mapeo de mensajes técnicos de Supabase a mensajes amigables
  const errorMap: Record<string, string> = {
    "Invalid login credentials":
      "Correo o contraseña incorrectos.",
    "Email not confirmed":
      "Debes confirmar tu correo antes de ingresar.",
    "User not found":
      "No existe una cuenta con ese correo.",
    "Too many requests":
      "Demasiados intentos. Espera unos minutos e intenta de nuevo.",
  };

  return errorMap[error.message] ?? `Error de autenticación: ${error.message}`;
}
