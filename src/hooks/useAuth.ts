/**
 * @fileoverview Hook de autenticación — gestiona el estado de sesión
 * de Supabase en tiempo real y lo expone a toda la app.
 */

import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { signIn, signOut } from "../services/authService";

// ---------------------------------------------------------------------------
// Tipo de retorno del hook
// ---------------------------------------------------------------------------

/**
 * @description Estado y acciones de autenticación disponibles para los componentes.
 */
export interface UseAuthReturn {
  /** Usuario autenticado actualmente, o null si no hay sesión */
  user: User | null;
  /** true mientras se verifica la sesión inicial (evita flash de login) */
  loading: boolean;
  /** Mensaje de error del último intento de login, o null */
  authError: string | null;
  /** Inicia sesión con email y contraseña */
  login: (email: string, password: string) => Promise<void>;
  /** Cierra la sesión actual */
  logout: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * @description Hook principal de autenticación.
 * Se suscribe a los cambios de sesión de Supabase (onAuthStateChange)
 * para mantener el estado sincronizado automáticamente.
 * @returns Estado de auth y funciones de login/logout
 */
export function useAuth(): UseAuthReturn {
  // Estado del usuario activo
  const [user, setUser] = useState<User | null>(null);

  // true durante la verificación inicial de sesión (al montar la app)
  const [loading, setLoading] = useState(true);

  // Último mensaje de error de autenticación
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // --- Verificar sesión existente al montar ---
    // Supabase guarda la sesión en localStorage; esto la recupera sin red
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // --- Suscribirse a cambios de sesión en tiempo real ---
    // Se dispara en: login, logout, refresh de token, cambio de pestaña
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        // Una vez que llega el primer evento, ya no estamos cargando
        setLoading(false);
      }
    );

    // Limpiar la suscripción al desmontar para evitar memory leaks
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  /**
   * @description Intenta iniciar sesión y actualiza el estado de error.
   * @param email - Correo del usuario
   * @param password - Contraseña del usuario
   */
  async function login(email: string, password: string): Promise<void> {
    setAuthError(null); // Limpiar error previo antes de intentar
    const { error } = await signIn(email, password);
    if (error) {
      setAuthError(error);
    }
    // Si el login fue exitoso, onAuthStateChange actualiza `user` automáticamente
  }

  /**
   * @description Cierra la sesión y limpia el estado.
   */
  async function logout(): Promise<void> {
    const error = await signOut();
    if (error) {
      setAuthError(error);
    }
    // onAuthStateChange pondrá user = null automáticamente
  }

  return { user, loading, authError, login, logout };
}
