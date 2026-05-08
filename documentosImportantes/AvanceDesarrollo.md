# Avance de Desarrollo — App Láminas FIFA World Cup 2026

**Fecha de última actualización:** 8 de mayo de 2026 — Sesión 3

---

## ¿Qué es esta app?

**No es un álbum personal de seguimiento.** Es una **herramienta de venta de láminas repetidas**.

- Los vendedores marcan qué láminas tienen disponibles para vender.
- Los clientes visitan un catálogo público (sin login) y ven qué códigos están disponibles.
- El cliente contacta al vendedor por fuera (WhatsApp, etc.) para concretar la compra.

---

## Estado General

App funcionando en `http://localhost:5174/`. Login de vendedores operativo. Capa de datos (service + store + hook) implementada. Vista Matriz completa con menú contextual (clic derecho) para cambiar estado F↔D y ajustar cantidad. React Router DOM instalado. Catálogo público y AdminLayout implementados. **Próximo paso: Vista CRUD y Dashboard.**

---

## Stack Instalado y Configurado

| Tecnología | Estado |
|---|---|
| Vite 8.x + React 19.x + TypeScript 5.x | ✅ |
| Tailwind CSS v4 | ✅ |
| Zustand | ✅ |
| TanStack Query | ✅ |
| TanStack Virtual | ✅ instalado, pendiente de usar |
| Supabase JS | ✅ |
| React Router DOM | ✅ |

---

## Estructura de Carpetas Actual

```
panini-sticker-collection/
├── documentosImportantes/
│   ├── ArquitecturaStack.md    ✅ Arquitectura actualizada
│   ├── SKILL.md                — Skill original de Copilot
│   └── AvanceDesarrollo.md     ← Este archivo
├── supabase/
│   ├── migrations/001_create_tables.sql  ✅ Ejecutado en Supabase
│   └── seed.sql                          ✅ Ejecutado — 994 láminas en DB
├── src/
│   ├── types/index.ts          ✅ Solo estados F y D (simplificado)
│   ├── lib/supabaseClient.ts   ✅ Cliente singleton de Supabase
│   ├── services/
│   │   ├── stickerService.ts   ✅ fetchAllStickers, cycleNextStatus, updateSticker, rowToSticker (normaliza R/V→D)
│   │   └── catalogService.ts   ✅ Lectura pública solo estado D
│   ├── store/
│   │   └── stickerStore.ts     ✅ Zustand store normalizado
│   ├── hooks/
│   │   ├── useAuth.ts          ✅ Gestión de sesión reactiva
│   │   ├── useStickers.ts      ✅ TanStack Query + Realtime (normaliza legacy R/V)
│   │   └── useTeams.ts         ✅ Catálogo de equipos (nombre completo)
│   └── components/
│       ├── ui/
│       │   └── LoginForm.tsx   ✅ Formulario de login
│       ├── admin/
│       │   └── AdminLayout.tsx ✅ Layout protegido con navegación
│       ├── matrix/
│       │   ├── StickerCell.tsx        ✅ Celda individual (clic derecho)
│       │   ├── TeamSection.tsx        ✅ Sección colapsable por equipo
│       │   ├── MatrixView.tsx         ✅ Vista inventario admin
│       │   └── StickerContextMenu.tsx ✅ Menú F↔D con selector de cantidad
│       ├── catalog/
│       │   └── CatalogView.tsx ✅ Catálogo público (ruta /)
│       ├── crud/               🔲 Por crear
│       └── dashboard/          🔲 Por crear
├── .env                        ✅ Credenciales reales (en .gitignore)
├── .env.example                ✅ Plantilla pública
└── App.tsx                     ✅ React Router DOM — rutas completas
```

---

## Archivos Implementados

### Dominio y tipos
- **`src/types/index.ts`** ✅ — `StickerStatus = "F" | "D"` (solo dos estados), `Sticker`, `Team`, `StickersMap`, `TOTAL_STICKERS = 994`, `STATUS_META` (F: gris, D: verde)

### Supabase
- **`src/lib/supabaseClient.ts`** ✅ — cliente singleton
- **`supabase/migrations/001_create_tables.sql`** ✅ — esquema ejecutado
- **`supabase/seed.sql`** ✅ — 994 láminas y 50 equipos insertados

### Servicios (lógica de negocio)
- **`src/services/stickerService.ts`** ✅
  - `fetchAllStickers()` → `StickersMap`
  - `rowToSticker(row)` → normaliza estados legacy `R`/`V` → `D` antes de entrar al store
  - `cycleNextStatus(code, status, quantity)` → F→D (qty=1) / D→F (qty=0)
  - `updateSticker(code, fields)` → actualización parcial con validación de invariante
  - `validateStickerState(status, quantity)` → lanza error si `status=F && quantity>0`
  - Mapeo DB (snake_case español) ↔ TypeScript (camelCase inglés)
- **`src/services/catalogService.ts`** ✅ — lectura pública, solo `estado = 'D'`, rol anon

### Estado global
- **`src/store/stickerStore.ts`** ✅ — Zustand con `StickersMap`, `upsertSticker` O(1), selectores derivados

### Hooks
- **`src/hooks/useAuth.ts`** ✅ — sesión reactiva con `onAuthStateChange`
- **`src/hooks/useStickers.ts`** ✅ — TanStack Query + Realtime + mutaciones + métricas derivadas
- **`src/hooks/useTeams.ts`** ✅ — nombres completos de equipos (staleTime 30min)

### Componentes
- **`src/components/ui/LoginForm.tsx`** ✅
- **`src/components/admin/AdminLayout.tsx`** ✅ — layout protegido, redirige a `/admin/login` si no hay sesión
- **`src/components/catalog/CatalogView.tsx`** ✅ — catálogo público, ruta `/`, solo láminas D
- **`src/components/matrix/StickerCell.tsx`** ✅ — celda con color de estado, badge cantidad, solo clic derecho
- **`src/components/matrix/TeamSection.tsx`** ✅ — colapsable, barra de progreso por equipo
- **`src/components/matrix/MatrixView.tsx`** ✅ — chips Faltan/Disponibles, grid de equipos
- **`src/components/matrix/StickerContextMenu.tsx`** ✅ — menú Portal, opciones Falta / Disponible con selector −N+

---

## Base de Datos (Supabase)

- **URL:** `https://sdoycwmphulkydfguclx.supabase.co`
- **Tablas:** `teams` (50 filas) + `stickers` (994 filas)
- **RLS:** habilitado. Políticas actuales: solo `authenticated` puede leer/escribir stickers.
- **⚠️ Pendiente:** agregar política `anon` para que el catálogo público funcione sin login:
  ```sql
  CREATE POLICY "public_can_read_available"
    ON stickers FOR SELECT TO anon
    USING (estado = 'D');
  ```
- **Realtime:** habilitado en tabla `stickers`
- **Usuarios:** nicolas, cristian, anny, mario @panini2026.com

---

## Invariantes de Negocio Implementadas

| Regla | Dónde se valida |
|-------|-----------------|
| `cantidad > 0` → `estado ≠ 'F'` | `stickerService.ts → validateStickerState()` |
| `F → D`: cantidad = 1 automático | `stickerService.ts → cycleNextStatus()` |
| `D → F`: cantidad = 0 automático | `stickerService.ts → cycleNextStatus()` |
| `estado = 'R'` o `'V'` (legacy DB) → normalizar a `'D'` | `rowToSticker()` + Realtime handler en `useStickers.ts` |
| Acceso defensivo a `STATUS_META` | `StickerCell.tsx` y `StickerContextMenu.tsx` — fallback a `"F"` |

---

## Tareas Completadas ✅

1. Scaffold Vite + React + TS
2. Instalación de dependencias completa (incluye React Router DOM)
3. Estructura de carpetas
4. Tipos TypeScript del dominio — simplificado a F/D
5. Cliente Supabase
6. Schema SQL + seed (994 láminas)
7. Auth: `useAuth` + `LoginForm`
8. Tailwind CSS v4
9. 4 usuarios Supabase creados
10. Capa de datos: `stickerService` + `catalogService` + `stickerStore` + `useStickers` + `useTeams`
11. Vista Matriz (panel admin): `StickerCell` + `TeamSection` + `MatrixView`
12. React Router DOM — rutas `/`, `/admin`, `/admin/crud`, `/admin/dashboard`, `/admin/login`
13. RLS anon para catálogo público
14. Catálogo público: `CatalogView`
15. `AdminLayout` protegido
16. Menú contextual: `StickerContextMenu` — F↔D + selector cantidad
17. Normalización de estados legacy R/V→D en service y Realtime
18. Acceso defensivo a STATUS_META (evita crashes con datos legacy)

---

## Tareas Pendientes 🔲

| # | Tarea | Descripción |
|---|---|---|
| 19 | **Limpieza de DB (recomendado)** | `UPDATE stickers SET estado = 'D' WHERE estado IN ('R', 'V');` en SQL Editor Supabase |
| 20 | **Vista CRUD** | Tabla con filtros (código, equipo, estado) + formulario inline (cantidad + observaciones) — ruta `/admin/crud` |
| 21 | **Dashboard** | Chips Faltan/Disponibles, suma de unidades disponibles, desglose por equipo — ruta `/admin/dashboard` |
| 22 | **Deploy** | GitHub repo privado + Vercel + variables `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` |

---

## Comandos Útiles

```bash
# Levantar servidor de desarrollo
npm run dev

# Verificar tipos TypeScript sin compilar
npx tsc --noEmit

# Build de producción
npm run build
```


