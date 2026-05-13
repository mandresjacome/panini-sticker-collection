/**
 * @fileoverview Punto de entrada principal de la aplicación.
 *
 * Rutas:
 *   /                  → CatalogView    (público, sin login — catálogo genérico)
 *   /laminas-:slug     → CatalogView    (público, catálogo personalizado por vendedor)
 *   /admin             → AdminLayout → MatrixView
 *   /admin/crud        → AdminLayout → CRUDView
 *   /admin/dashboard   → AdminLayout → DashboardView
 *   /admin/login       → LoginForm
 *   *                  → Redirige a /
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CatalogView } from "./components/catalog/CatalogView";
import { AdminLayout } from "./components/admin/AdminLayout";
import { MatrixView } from "./components/matrix/MatrixView";
import { CRUDView } from "./components/crud/CRUDView";
import { DashboardView } from "./components/dashboard/DashboardView";
import { LoginForm } from "./components/ui/LoginForm";

/**
 * @description Instancia global del QueryClient de TanStack Query.
 * staleTime generoso porque Supabase Realtime mantiene los datos frescos
 * para el panel admin, y el catálogo hace refetch cada 60s.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,   // 1 minuto
      retry: 2,
    },
  },
});

/**
 * @description Componente raíz con providers globales y árbol de rutas.
 * @returns Árbol completo de la aplicación
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* ── Ruta pública: catálogo genérico (sin vendedor) ────────── */}
          <Route path="/" element={<CatalogView />} />

          {/* ── Ruta pública: catálogo personalizado por vendedor ──────── */}
          {/* Ej: /laminas/replica  →  muestra "Láminas Réplica" en el header */}
          <Route path="/laminas/:slug" element={<CatalogView />} />

          {/* ── Rutas del panel admin (requieren login) ────────────────── */}
          <Route path="/admin" element={<AdminLayout />}>
            {/* Índice: Vista Matriz */}
            <Route index element={<MatrixView />} />

            {/* CRUD — vista de edición detallada */}
            <Route path="crud"      element={<CRUDView />} />

            {/* Dashboard — métricas en tiempo real */}
            <Route path="dashboard" element={<DashboardView />} />
          </Route>

          {/* ── Login de admin ─────────────────────────────────────────── */}
          <Route path="/admin/login" element={<LoginForm />} />

          {/* ── Cualquier ruta desconocida → catálogo público ──────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;


