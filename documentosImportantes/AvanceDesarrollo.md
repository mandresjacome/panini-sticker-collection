# Avance de Desarrollo — App Láminas FIFA World Cup 2026

**Fecha de última actualización:** 9 de mayo de 2026 — Sesión 5 (tarde)

---

## ¿Qué es esta app?

**No es un álbum personal de seguimiento.** Es una **herramienta de venta de láminas repetidas**.

- Los vendedores marcan qué láminas tienen disponibles para vender.
- Los clientes visitan un catálogo público (sin login) y ven qué códigos están disponibles.
- El cliente contacta al vendedor por fuera (WhatsApp, etc.) para concretar la compra.

---

## Estado General

**App deployada y funcionando en producción.**

- URL pública (catálogo): **https://panini-sticker-collection.vercel.app**
- Panel admin: **https://panini-sticker-collection.vercel.app/admin**
- Repositorio: **https://github.com/mandresjacome/panini-sticker-collection**
- Deploy automático: cada push a `main` → Vercel redespliega

Todas las vistas implementadas: Matriz, CRUD, Dashboard y Catálogo público. Orden de álbum centralizado. Banderas de países. Diseño con identidad visual FIFA 2026 / Panini. **El roadmap original está 100 % completado.**

---

## Stack Instalado y Configurado

| Tecnología | Estado |
|---|---|
| Vite 8.x + React 19.x + TypeScript 5.x | ✅ |
| Tailwind CSS v4 | ✅ |
| Zustand | ✅ |
| TanStack Query | ✅ |
| TanStack Virtual | ✅ instalado (disponible para virtualización futura) |
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
│       │   ├── LoginForm.tsx   ✅ Formulario de login
│       │   └── Footer.tsx      ✅ Footer compartido (AmalfiDev)
│       ├── admin/
│       │   └── AdminLayout.tsx ✅ Layout protegido con navegación
│       ├── matrix/
│       │   ├── StickerCell.tsx        ✅ Celda individual (clic derecho)
│       │   ├── TeamSection.tsx        ✅ Sección colapsable por equipo
│       │   ├── MatrixView.tsx         ✅ Vista inventario admin
│       │   └── StickerContextMenu.tsx ✅ Menú F↔D con selector de cantidad
│       ├── catalog/
│       │   └── CatalogView.tsx        ✅ Catálogo público (ruta /)
│       ├── crud/
│       │   └── CRUDView.tsx           ✅ Tabla + edición inline (ruta /admin/crud)
│       └── dashboard/
│           └── DashboardView.tsx      ✅ Métricas + desglose (ruta /admin/dashboard)
├── vercel.json                 ✅ Rewrite SPA para React Router
├── .env                        ✅ Credenciales reales (en .gitignore)
├── .env.example                ✅ Plantilla pública
└── App.tsx                     ✅ React Router DOM — rutas completas
```

---

## Archivos Implementados

### Dominio y tipos
- **`src/types/index.ts`** ✅ — `StickerStatus = "F" | "D"`, `Sticker`, `Team`, `StickersMap`, `TOTAL_STICKERS = 994`, `STATUS_META` (F: gris, D: verde)

### Orden del álbum (nuevo en sesión 4)
- **`src/lib/albumOrder.ts`** ✅ — fuente de verdad para el orden canónico
  - `ALBUM_GROUP_ORDER` — 14 bloques: Especiales → Grupos A–L → Patrocinadores
  - `ALBUM_TEAM_ORDER` — 50 códigos en orden del álbum físico
  - `ALBUM_TEAM_INDEX` — mapa O(1) de posición por código
  - `TEAM_GROUP_LABEL` — etiqueta de grupo por equipo (ej. `MEX → "Grupo A"`)
  - `TEAM_FLAG` — emoji de bandera por código (50 entradas completas)
  - `sortByAlbumOrder(codes)` — utilidad de ordenamiento

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
- **`src/components/ui/LoginForm.tsx`** ✅ — formulario de login con diseño FIFA 2026
- **`src/components/ui/Footer.tsx`** ✅ — footer compartido con créditos AmalfiDev, franja 7 colores, texto `@n_baez1` en amarillo Panini
- **`src/components/admin/AdminLayout.tsx`** ✅ — layout protegido, header oscuro + franja multicolor + nav amarillo activo
- **`src/components/catalog/CatalogView.tsx`** ✅ — catálogo público, ruta `/`, solo láminas D, ordenado por álbum con banderas y etiqueta de grupo
- **`src/components/matrix/StickerCell.tsx`** ✅ — celda con color de estado, badge cantidad, clic derecho
- **`src/components/matrix/TeamSection.tsx`** ✅ — colapsable, bandera emoji (sin barra de progreso)
- **`src/components/matrix/MatrixView.tsx`** ✅ — grupos del álbum con separadores, chips Faltan/Disponibles
- **`src/components/matrix/StickerContextMenu.tsx`** ✅ — menú Portal F↔D + selector −N+
- **`src/components/crud/CRUDView.tsx`** ✅ — tabla con búsqueda, filtro por equipo/estado, ordenada por álbum, edición inline, validación de invariante *(nav oculto — reservado para feature de fotos)*
- **`src/components/dashboard/DashboardView.tsx`** ✅ — 4 métricas card, barra de progreso global, desglose por equipo ordenado por álbum

---

## Base de Datos (Supabase)

- **URL:** `https://sdoycwmphulkydfguclx.supabase.co`
- **Tablas:** `teams` (50 filas) + `stickers` (994 filas)
- **RLS:** habilitado — `authenticated` puede leer/escribir; `anon` puede leer estado `D`
- **Realtime:** habilitado en tabla `stickers`
- **Usuarios admin:** nicolas, cristian, anny, mario @panini2026.com

---

## Diseño Visual

- **Paleta FIFA 2026 / Panini:**
  - Fondo header: `#0a0a14` (negro)
  - Franja 7 colores: `#E8192C` → `#F7941D` → `#FFC72C` → `#00A651` → `#009EA6` → `#003DA5` → `#8B5CF6`
  - Amarillo Panini `#FFC72C` — nav activo, números destacados, spinners
  - Rojo FIFA `#E8192C` — botón logout, alertas
- **Banderas emoji** para los 50 equipos centralizadas en `albumOrder.ts`
- **Orden canónico del álbum** aplicado en Matriz, CRUD, Dashboard y Catálogo

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
2. Instalación de dependencias completa
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
18. Acceso defensivo a STATUS_META
19. Limpieza DB — SQL de normalización de estados
20. **Vista CRUD** — `CRUDView.tsx` con búsqueda, filtros, orden álbum, edición inline, validación
21. **Dashboard** — `DashboardView.tsx` con 4 métricas, progreso global y desglose por equipo
22. **Orden álbum** — `albumOrder.ts` con grupos, índice O(1), banderas y etiquetas
23. **Banderas emoji** en todas las vistas (Matriz, CRUD, Dashboard, Catálogo)
24. **Diseño FIFA 2026** — paleta Panini aplicada a headers y spinners
25. **Deploy** — GitHub (`mandresjacome/panini-sticker-collection`) + Vercel (URL pública)
26. **`vercel.json`** — rewrite SPA para que React Router funcione en producción
27. **CRUD oculto del nav** — link `✏️ Editar` comentado, ruta `/admin/crud` sigue viva para la feature de fotos
28. **Fix mobile — tap menú contextual** — `StickerCell` ahora responde a `onClick` (antes solo `onContextMenu`); `StickerContextMenu` cierra con `touchstart` además de `mousedown`
29. **Fix mobile — títulos de vista visibles** — todos los textos sobre fondo oscuro usan `style` inline (`color: '#ffffff'`) para no ser sobreescritos por la variable CSS global `color: var(--text)` en modo oscuro del SO
30. **Fix mobile — "Panel Vendedor" visible** — mismo fix inline en `AdminLayout.tsx`
31. **Fix mobile — separadores de grupo visibles** — labels de grupo en `MatrixView` con fondo `bg-gray-200` y texto `text-gray-700`; en `CatalogView` removido `hidden sm:inline`
32. **Título catálogo público** — cambiado de "Láminas FIFA World Cup 2026" a **"Láminas Panini"**
33. **Barra de progreso eliminada** — removida de `TeamSection` (no era necesaria para la herramienta de ventas); limpieza de variables/funciones sin usar (`calcProgress`, `haveCount`, `progress`, `useMemo`)
34. **Footer AmalfiDev** — nuevo componente `Footer.tsx` con franja de 7 colores + créditos “Desarrollado para **@n_baez1** por **AmalfiDev** · 2026”; integrado en `AdminLayout` y `CatalogView`
34. **Footer AmalfiDev** — nuevo componente `Footer.tsx` con franja de 7 colores + créditos "Desarrollado para **@n_baez1** por **AmalfiDev** · 2026"; integrado en `AdminLayout` y `CatalogView`

---

## Tareas Pendientes / Ideas Futuras 💡

### 🖼️ Feature: Foto de lámina (próxima prioridad)

El CRUD (`/admin/crud`) está reservado para esta funcionalidad. Pasos planificados:

1. **Supabase Storage** — crear bucket `sticker-photos` (público, lectura anon)
2. **Migración DB** — agregar columna `foto_url TEXT` a la tabla `stickers`
3. **CRUD admin** — en cada fila, botón para subir imagen → guarda URL en `foto_url`
4. **Catálogo público** — al hover (desktop) o tap (móvil) sobre una lámina → modal con la foto + código + cantidad disponible
5. **Matriz admin** — mismo modal en `StickerCell` para referencia visual
6. **Reactiva el link del nav** — descomentar `AdminNavLink` en `AdminLayout.tsx`

### Otras ideas

| Idea | Descripción |
|---|---|
| Virtualización | Activar TanStack Virtual en MatrixView/CRUDView si la performance lo requiere con 994 ítems |
| Filtro por grupo | En CatalogView y CRUDView, añadir selector de grupo (A–L) además de equipo |
| Notificación WhatsApp | Botón en catálogo que genera mensaje prearmado con la lista de láminas seleccionadas |
| PWA | Agregar manifest + service worker para uso offline |
| Modo oscuro completo | Extender el fondo `#0a0a14` a las vistas internas del admin |

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


