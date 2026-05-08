# Arquitectura y Stack Tecnológico: App Mundial Panini 2026

## 1. Visión General del Negocio

Esta aplicación **no es un álbum de seguimiento personal**. Es una **herramienta de venta/intercambio de láminas repetidas** del Mundial FIFA 2026.

### Modelo de negocio
- Los vendedores (hasta ahora 4: nicolas, cristian, anny, mario) gestionan un inventario compartido de láminas.
- Las láminas en estado **`D` (Disponible)** son las que están a la venta.
- Los **clientes** acceden a un catálogo público (sin registro) para ver qué láminas pueden comprar.
- El cliente ve el código de la lámina (ej. `JPN18`, `MEX10`) y contacta al vendedor por otro medio.

### Dos tipos de usuarios
| Tipo | Acceso | Puede hacer |
|------|--------|-------------|
| **Vendedor** | `/admin` — requiere login | Gestionar inventario: cambiar estados, ajustar cantidades, ver métricas |
| **Cliente** | `/` — público, sin login | Ver catálogo de láminas disponibles (solo lectura) |

### Fases de crecimiento
- **Fase 1 (actual):** Un solo inventario compartido entre los 4 vendedores. Catálogo público.
- **Fase 2 (futura):** Multi-vendedor. Cada vendedor tiene su propio inventario con `vendedor_id`. El catálogo muestra láminas por vendedor o todas juntas.

---

## 2. Stack Tecnológico

### 2.1. Frontend
| Tecnología | Rol |
|------------|-----|
| Vite 8.x + React 19.x + TypeScript 5.x | Base del frontend |
| Tailwind CSS v4 | Estilos — tema verde para la marca |
| React Router DOM | Rutas `/` (catálogo público) y `/admin` (panel vendedor) |
| Zustand | Estado global normalizado `Record<string, Sticker>` — O(1) para 994 ítems |
| TanStack Query | Carga inicial, caché, loading/error states |
| TanStack Virtual | Virtualización opcional de la Vista Matriz |
| Supabase JS | Cliente BaaS: DB, Auth, Realtime |

### 2.2. Backend / BaaS — Supabase
- **PostgreSQL:** Tabla `stickers` (994 registros) + tabla `teams` (50 equipos).
- **RLS (Row Level Security):**
  - `anon` (sin sesión) → solo puede leer `stickers` con `estado = 'D'` ← **catálogo público**
  - `authenticated` → lectura y escritura total ← **panel admin**
- **Supabase Auth:** Email/Password para los vendedores.
- **Supabase Realtime:** Canal `stickers-realtime` — los cambios de un vendedor se propagan al resto en tiempo real.

**Schema de la tabla `stickers`:**
```sql
codigo      TEXT PRIMARY KEY,             -- Identificador único (ej. "MEX10", "JPN18")
equipo      TEXT NOT NULL,                -- Sigla del equipo (ej. "MEX", "JPN")
tipo        TEXT NOT NULL,                -- "Especial" | "Selección" | "Patrocinador"
estado      TEXT NOT NULL DEFAULT 'F',    -- "D" | "F" | "R" | "V"
cantidad    INT  NOT NULL DEFAULT 0,      -- Copias en posesión (>= 0)
observacion TEXT,                         -- Notas opcionales del vendedor
updated_at  TIMESTAMPTZ DEFAULT now(),    -- Auditoría: cuándo se modificó
updated_by  UUID REFERENCES auth.users   -- Auditoría: quién lo modificó
```

**Política RLS para catálogo público:**
```sql
-- Clientes sin login solo ven láminas disponibles
CREATE POLICY "public_can_read_available"
  ON stickers FOR SELECT TO anon
  USING (estado = 'D');
```

### 2.3. Routing (React Router DOM)
```
/          → CatalogView   (público, sin login) — láminas con estado "D"
/admin     → AdminLayout   (requiere login)
  /admin   → MatrixView    — gestión del inventario completo
  /admin/crud      → CRUDView    — búsqueda y edición detallada
  /admin/dashboard → DashboardView — métricas en tiempo real
```

### 2.4. CI/CD
- Repositorio privado en GitHub.
- Deploy automático en Vercel al hacer push a `main`.
- Variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) configuradas en Vercel.

---

## 3. Invariantes de Negocio

Validar **siempre en la capa de servicio** (`src/services/stickerService.ts`), nunca solo en la UI:

1. `cantidad > 0` → `estado !== "F"` ← lanzar error descriptivo si se viola
2. Al ciclar estado en la Vista Matriz: `F → D → R → V → F`
   - `F → D`: cantidad se pone en 1 automáticamente
   - `V → F`: cantidad se pone en 0 automáticamente

---

## 4. Directrices para GitHub Copilot

1. **TypeScript estricto** — usar tipos de `src/types/index.ts`. Nunca `any`.
2. **Solo Supabase JS** — nunca Express, SQL directo ni fetch manual a la DB.
3. **Zustand normalizado** — no `useState` para datos globales de láminas.
4. **TanStack Query** para fetches + Supabase Realtime para cambios en vivo.
5. **RLS consciente** — el catálogo público usa el cliente anon; el admin usa sesión autenticada.
6. **JSDoc obligatorio** en cada función, hook y componente. Sin excepciones.
7. **Seguridad** — credenciales solo en `.env`, nunca en código fuente.

---

## 5. Fase 2 — Multi-vendedor (planificado, no implementado)

Cuando se incorpore un nuevo vendedor externo, el modelo escala así:

```sql
-- Nueva tabla
CREATE TABLE vendedores (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre  TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id)
);

-- Columna nueva en stickers
ALTER TABLE stickers ADD COLUMN vendedor_id UUID REFERENCES vendedores(id);
```

Cada vendedor tendrá sus propias 994 filas. El catálogo público podrá filtrar por vendedor o mostrar el inventario consolidado.