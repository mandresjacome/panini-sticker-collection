/**
 * @description Formulario de inicio de sesión.
 * Usa el hook useAuth para manejar el estado y la lógica de autenticación.
 * @returns Formulario centrado de login con manejo de errores y loading state.
 */

import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function LoginForm() {
  const { login, authError, loading } = useAuth();
  const navigate = useNavigate();

  // Estado local del formulario — no va al store global porque es temporal
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /**
   * @description Maneja el envío del formulario.
   * Previene el comportamiento default del form y delega al hook de auth.
   * Si el login es exitoso, redirige al panel de administración.
   * @param e - Evento del formulario
   */
  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (submitting) return; // Evitar doble submit

    setSubmitting(true);
    await login(email, password);
    setSubmitting(false);
    // Si no hubo error de auth, el hook actualizó el usuario → redirigir al admin
    // authError se actualiza reactivamente; si está vacío tras el intento = éxito
    navigate("/admin", { replace: true });
  }

  // Mientras se verifica la sesión inicial no renderizamos el form
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-lg">Verificando sesión...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-sm p-8">

        {/* Encabezado */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">🏆</h1>
          <h2 className="text-xl font-semibold text-gray-700 mt-2">
            Láminas FIFA 2026
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Ingresa con tu cuenta para continuar
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Campo email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-green-400
                         disabled:bg-gray-100"
              placeholder="usuario@correo.com"
              disabled={submitting}
            />
          </div>

          {/* Campo contraseña */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-green-400
                         disabled:bg-gray-100"
              placeholder="••••••••"
              disabled={submitting}
            />
          </div>

          {/* Mensaje de error */}
          {authError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200
                          rounded-lg px-3 py-2">
              {authError}
            </p>
          )}

          {/* Botón de submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold
                       rounded-lg py-2 text-sm transition-colors
                       disabled:bg-green-300 disabled:cursor-not-allowed"
          >
            {submitting ? "Ingresando..." : "Ingresar"}
          </button>

        </form>
      </div>
    </div>
  );
}
