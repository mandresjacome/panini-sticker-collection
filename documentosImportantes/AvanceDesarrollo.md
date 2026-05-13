# Avance de Desarrollo — App Láminas FIFA World Cup 2026

**Fecha de última actualización:** 13 de mayo de 2026 — Sesión 12

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
| `xlsx-js-style` | ✅ instalado — exportación Excel con estilos de celda |
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
├── scripts/
│   ├── scrape-names.mjs        ✅ Scrapea paninitrade.com/api/sticker-catalog → genera JSON + SQL
│   ├── sticker-names.json      ✅ Map { "MEX15": "Mexico - Hirving Lozano", ... } — 1020 entradas
│   └── test-api.mjs            — Utilidad de prueba del endpoint Panini
├── supabase/
│   ├── migrations/001_create_tables.sql  ✅ Ejecutado en Supabase
│   ├── migrations/002_add_categoria_column.sql  ✅ Ejecutado — columna `categoria` TEXT (TOP/GOAT)
│   ├── migrations/003_add_pricing.sql    ✅ Ejecutado — tabla `category_prices` + columna `precio`
│   ├── migrations/004_add_sticker_names.sql  ✅ Ejecutado — columna `nombre` + 1020 UPDATEs oficiales
│   └── seed.sql                          ✅ Ejecutado — 994 láminas en DB
├── src/
│   ├── types/index.ts          ✅ Solo estados F y D (simplificado)
│   ├── lib/supabaseClient.ts   ✅ Cliente singleton de Supabase
│   ├── lib/albumOrder.ts       ✅ Orden canónico, banderas, grupos
│   ├── lib/exportUtils.ts      ✅ Exportación Excel con formato Panini (xlsx-js-style)
│   ├── lib/stickerCategory.ts  ✅ getStickerCategory() — fuente de verdad para categorías visuales
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
│       │   ├── Footer.tsx      ✅ Footer compartido (AmalfiDev)
│       │   └── QuotePanel.tsx  ✅ Panel flotante de cotización (compartido catálogo + admin)
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
- **`src/types/index.ts`** ✅ — `StickerStatus = "F" | "D"`, `Sticker`, `Team`, `StickersMap`, `TOTAL_STICKERS = 994`, `STATUS_META` (F: gris, D: verde), `StickerCategoryOverride = "TOP" | "GOAT"`, `StickerCategory` (7 valores), `CATEGORY_META` (colores bg/text/dot por categoría), **`CategoryPricesMap`**, **`DEFAULT_CATEGORY_PRICES`** (precios base por categoría), **`precio?: number | null`** en `Sticker`, **`name?: string`** en `Sticker` (nombre oficial Panini)

### Orden del álbum (nuevo en sesión 4)
- **`src/lib/albumOrder.ts`** ✅ — fuente de verdad para el orden canónico
  - `ALBUM_GROUP_ORDER` — 14 bloques: Especiales → Grupos A–L → Patrocinadores
  - `ALBUM_TEAM_ORDER` — 50 códigos en orden del álbum físico
  - `ALBUM_TEAM_INDEX` — mapa O(1) de posición por código
  - `TEAM_GROUP_LABEL` — etiqueta de grupo por equipo (ej. `MEX → "Grupo A"`)
  - `TEAM_FLAG` — emoji de bandera por código (50 entradas completas)
  - `sortByAlbumOrder(codes)` — utilidad de ordenamiento

- **`vite.config.ts`** ✅ — `optimizeDeps.include: ['xlsx-js-style']` para forzar pre-bundling del paquete CJS

### Utilidades de exportación
- **`src/lib/exportUtils.ts`** ✅ — (actualizado sesión 11 — ver detalle abajo)
- **`src/lib/stickerCategory.ts`** ✅ — `getStickerCategory(sticker)` — única fuente de verdad para la categoría visual
  - Prioridad: `GOAT` (manual) → `TOP` (manual) → `METALIZADA` (FWC) → `PATROCINADOR` (CC) → `ESCUDO` (num=1) → `FOTO_EQUIPO` (num=13) → `BASICA` (resto)
  - Filtra láminas con estado `D`
  - Ordena por álbum con `naturalSortCode` (orden numérico real: 1, 2… 10, no 1, 10, 2)
  - **Hoja "Matriz"** — una fila por equipo, columnas `0`–`20`; celdas **coloreadas por categoría** (dorado=GOAT, morado=TOP, teal=METALIZADA, rojo=ESCUDO, verde=FOTO_EQUIPO, naranja=PATROCINADOR, azul=BASICA) o grises vacías sin stock; columnas Equipo/Grupo congeladas
  - **Hoja "Por Categoría"** ✨ **NUEVA** — listado completo ordenado por rareza (GOAT→BASICA), columnas `Código · Equipo · Grupo · Categoría · Cant. · Precio Unit. · Valor Total`; celda Categoría coloreada; precio efectivo = override individual o precio base de `category_prices`
  - **Hoja "Resumen por Equipo"** — totales por equipo + nueva columna **`Valor Potencial`** (precio efectivo × cantidad) + fila TOTAL con fondo amarillo Panini
  - Firma actualizada: acepta `categoryPrices: CategoryPricesMap` (con default `DEFAULT_CATEGORY_PRICES`) para usar precios reales de Supabase
  - Helpers nuevos: `makeStickerCellStyle(category)` — estilo xlsx por categoría; `getEffectivePrice(sticker, prices)` — misma lógica de prioridad que `useQuote`
  - Constantes nuevas: `CATEGORY_COLORS` (7 entradas hex) y `CATEGORY_PRIORITY` (orden de rareza para ordenamiento)
  - Paleta visual completa: encabezados `#0A0A14` con borde inferior `#FFC72C`, filas alternas blanco/gris, texto azul/verde en columnas numéricas
  - Nombre de archivo con timestamp: `laminas-disponibles_2026-05-09_1430.xlsx`
  - Metadata del libro (título, autor, fecha)
- **`src/lib/supabaseClient.ts`** ✅ — cliente singleton
- **`supabase/migrations/001_create_tables.sql`** ✅ — esquema ejecutado
- **`supabase/seed.sql`** ✅ — 994 láminas y 50 equipos insertados

### Servicios (lógica de negocio)
- **`src/services/stickerService.ts`** ✅
  - `fetchAllStickers()` → `StickersMap`
  - `rowToSticker(row)` → normaliza estados legacy R/V → D; mapea campos `categoria`, **`precio`** y **`nombre`** (→ `name`)
  - `cycleNextStatus(code, status, quantity)` → F→D (qty=1) / D→F (qty=0)
  - `updateSticker(code, fields)` → acepta `categoria` (TOP/GOAT/null), **`precio` (number|null)** además de status/quantity/notes
  - `validateStickerState(status, quantity)` → lanza error si `status=F && quantity>0`
  - Mapeo DB (snake_case español) ↔ TypeScript (camelCase inglés)
- **`src/services/catalogService.ts`** ✅ — lectura pública, solo `estado = 'D'`, rol anon; incluye campos `categoria`, **`precio`** y **`nombre`** en el SELECT para cotización y nombre en catálogo
- **`src/services/categoryPriceService.ts`** ✅ — **NUEVO** · `fetchCategoryPrices()` → `CategoryPricesMap`; `updateCategoryPrice(category, price)` → UPSERT en tabla `category_prices`; RLS: authenticated rw, anon read

### Estado global
- **`src/store/stickerStore.ts`** ✅ — Zustand con `StickersMap`, `upsertSticker` O(1), selectores derivados

### Hooks
- **`src/hooks/useAuth.ts`** ✅ — sesión reactiva con `onAuthStateChange`
- **`src/hooks/useStickers.ts`** ✅ — TanStack Query + Realtime + mutaciones + métricas derivadas; `updateStickerFields` acepta campo **`precio`**; Realtime handler propaga `precio`
- **`src/hooks/useTeams.ts`** ✅ — nombres completos de equipos (staleTime 30min)
- **`src/hooks/useCategoryPrices.ts`** ✅ — **NUEVO** · TanStack Query sobre `category_prices`; fallback a `DEFAULT_CATEGORY_PRICES` mientras carga; mutación `updateCategoryPrice` con invalidación de caché
- **`src/hooks/useQuote.ts`** ✅ — **NUEVO** · carrito efímero de cotización; `toggle/clear/isSelected`; `quoteLines` con precio efectivo (`sticker.precio ?? categoryPrices[cat]`); `total`; `whatsappText` pre-armado con formato Panini

### Componentes
- **`src/components/ui/LoginForm.tsx`** ✅ — formulario de login con diseño FIFA 2026
- **`src/components/ui/Footer.tsx`** ✅ — footer compartido con créditos AmalfiDev, franja 7 colores, texto `@n_baez1` en amarillo Panini
- **`src/components/admin/AdminLayout.tsx`** ✅ — layout protegido, header oscuro + franja multicolor + nav amarillo activo
- **`src/components/catalog/CatalogView.tsx`** ✅ — catálogo público, ruta `/`, solo láminas D, ordenado por álbum con banderas y etiqueta de grupo; chips de color por categoría con precio debajo (`flex-col`); **leyenda rediseñada** con título, descripción y chips centrados que muestran "Desde $X.XXX" por categoría; **chips seleccionables para cotización**; **barra CTA siempre visible** en la parte inferior ("¡Ya puedes cotizar! Toca una lámina para empezar" cuando el carrito está vacío, se transforma en `QuotePanel` cuando hay ítems); panel flotante `QuotePanel` con contador + total + botón WhatsApp + copia al portapapeles + previsualización del mensaje; indicador de selección en el header; **español colombiano** (puedes/Toca)
- **`src/components/matrix/StickerCell.tsx`** ✅ — celda con color de estado, badge cantidad, clic derecho; punto de color de categoría en esquina sup-izq (solo categorías no-Básicas); **tooltip muestra `CODE — NombreJugador`** (sin prefijo de equipo)
- **`src/components/matrix/TeamSection.tsx`** ✅ — colapsable, bandera emoji (sin barra de progreso)
- **`src/components/matrix/MatrixView.tsx`** ✅ — grupos del álbum con separadores, chips Faltan/Disponibles; leyenda extendida con fila de puntos de categoría; **conecta `useCategoryPrices`** y pasa `categoryPrices` + `onUpdateCategoryPrice` al `StickerContextMenu`
- **`src/components/matrix/StickerContextMenu.tsx`** ✅ — menú Portal F↔D + selector −N+; sección "Categoría especial" con botones toggle ⭐ TOP / 🐐 GOAT; badge de categoría actual en encabezado del menú; **sección "💲 Precio"**: input de precio individual con botón 💾 y botón ↩ reset al default, input de precio default de la categoría con botón 💾 (afecta a todas las láminas sin override); spinner `isPriceApplying` separado del spinner de estado
- **`src/components/crud/CRUDView.tsx`** ✅ — tabla con búsqueda, filtro por equipo/estado, ordenada por álbum, edición inline; columna "Categoría" con badge de color y select TOP/GOAT/Auto; validación de invariante; **columna "Nombre" con nombre oficial Panini truncado**; **búsqueda también filtra por nombre** (ej: buscar "Messi" encuentra `ARG17`)
- **`src/components/dashboard/DashboardView.tsx`** ✅ — 4 métricas card, barra de progreso global, desglose por equipo ordenado por álbum; importa `useCategoryPrices` y pasa los precios reales de Supabase al exportar; **métricas financieras nuevas**: `💰 Valor total` del stock disponible, `📈 Ticket promedio` por lámina; **sección `💎 Valor por categoría`**: tabla GOAT→BASICA con códigos, unidades, valor total y barra proporcional

---

## Base de Datos (Supabase)

- **URL:** `https://sdoycwmphulkydfguclx.supabase.co`
- **Tablas:** `teams` (50 filas) + `stickers` (994 filas) + **`category_prices` (7 filas)**
- **Columna `categoria`:** `TEXT CHECK (IN ('TOP','GOAT')) DEFAULT NULL` — override manual; null = auto-derivado en frontend
- **Columna `precio` en `stickers`:** `INTEGER DEFAULT NULL` — override individual; null = heredar precio default de `category_prices`
- **Columna `nombre` en `stickers`:** `TEXT DEFAULT NULL` — nombre oficial Panini (ej: `"Mexico - Hirving Lozano"`); fuente: paninitrade.com; 1020 de 994 filas con nombre (incluye EX-, CC-, FWC-)
- **RLS:** habilitado — `authenticated` puede leer/escribir; `anon` puede leer estado `D` y tabla `category_prices`
- **Realtime:** habilitado en tabla `stickers`
- **Usuarios admin:** nicolas, cristian, anny, mario @panini2026.com

> ✅ **Migración 003 ya ejecutada** en Supabase Studio. Tabla `category_prices` y columna `precio` activas.
> ✅ **Migración 004 ya ejecutada** en Supabase Studio. Columna `nombre` activa con 1020 nombres oficiales.

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
35. **Exportación a Excel** — `exportUtils.ts` con `xlsx-js-style`; botón "📥 Exportar Excel" en `DashboardView` (amarillo Panini, spinner, deshabilitado sin stock); dos hojas: Matriz horizontal + Resumen por Equipo con fila TOTAL amarilla; orden numérico natural; columna `0` siempre presente para FWC Especiales; `vite.config.ts` actualizado con `optimizeDeps`
36. **Categorías visuales de láminas** — nuevo sistema completo de 7 categorías con auto-derivación en frontend
    - `src/lib/stickerCategory.ts` — `getStickerCategory()` única fuente de verdad (prioridad: GOAT → TOP → METALIZADA → PATROCINADOR → ESCUDO → FOTO_EQUIPO → BASICA)
    - `src/types/index.ts` — `StickerCategoryOverride`, `StickerCategory`, `CATEGORY_META` (colores Tailwind por categoría)
    - `supabase/migrations/002_add_categoria_column.sql` — columna `categoria TEXT CHECK ('TOP','GOAT') DEFAULT NULL`
    - **Vista Matriz** — punto de color en esquina sup-izq de cada celda (salvo Básicas); leyenda extendida con chips de categoría
    - **Menú contextual** — sección "Categoría especial" con botones toggle ⭐ TOP / 🐐 GOAT (clic asigna, segundo clic quita); badge categoría actual en encabezado del menú
    - **Vista CRUD** — columna "Categoría" con badge de color y select `— Auto / ⭐ TOP / 🐐 GOAT`; integrado en sistema dirty/save existente
    - **Catálogo público** — chips de código coloreados por categoría (sin punto); leyenda de categorías visible al tope (se oculta durante búsqueda)
37. **Sistema de precios por lámina** — dos niveles: precio default por categoría + override individual
    - `supabase/migrations/003_add_pricing.sql` — tabla `category_prices` (7 filas, una por StickerCategory) + columna `precio INTEGER DEFAULT NULL` en `stickers`; RLS anon read en `category_prices`
    - `src/types/index.ts` — `CategoryPricesMap`, `DEFAULT_CATEGORY_PRICES` (precios base en pesos), `precio?: number | null` en `Sticker`
    - `src/services/categoryPriceService.ts` — `fetchCategoryPrices()` + `updateCategoryPrice()` con validación
    - `src/hooks/useCategoryPrices.ts` — TanStack Query + mutación con invalidación de caché; fallback a defaults
    - `src/services/stickerService.ts` — `precio` en `StickerRow`, `rowToSticker`, `updateSticker`
    - `src/hooks/useStickers.ts` — `updateStickerFields` y Realtime handler incluyen campo `precio`
    - **Menú contextual** — nueva sección "💲 Precio": input precio lámina (💾 guardar / ↩ reset al default), input precio default categoría (💾 guardar, afecta a todas las sin override)
38. **Exportación Excel — Fase 2 (sesión 11)** — Enriquecida con categorías y precios reales
    - **Hoja "Matriz"** rediseñada: celdas coloreadas por categoría (dorado=GOAT, morado=TOP, teal=METALIZADA, rojo=ESCUDO, verde=FOTO_EQUIPO, naranja=PATROCINADOR, azul=BASICA) en lugar del verde genérico; el Excel ahora luce igual que la app web
    - **Nueva hoja "Por Categoría"**: listado ordenado GOAT→BASICA con columnas `Código / Equipo / Grupo / Categoría / Cant. / Precio Unit. / Valor Total`; celda Categoría coloreada; precio efectivo con misma lógica que `useQuote` (override individual > precio base de categoría)
    - **Hoja "Resumen por Equipo"**: nueva columna `Valor Potencial` (precio efectivo × cantidad); fila TOTAL incluye el valor total vendible del inventario completo
    - `exportAvailableStickersToExcel` acepta `categoryPrices: CategoryPricesMap` — `DashboardView` pasa los precios reales de Supabase vía `useCategoryPrices`
    - Helpers internos: `makeStickerCellStyle(category)`, `getEffectivePrice(sticker, prices)`, `CATEGORY_COLORS`, `CATEGORY_PRIORITY`

---

## Tareas Pendientes / Ideas Futuras 💡

### 💰 Feature: Cotizaciones ✅ IMPLEMENTADO (Catálogo público + Admin)

Funciona en ambas vistas. Ideas de mejora futura:
- ~~Mostrar el precio de cada lámina en el chip del catálogo~~ ✅ Implementado (sesión 10)
- Historial de cotizaciones guardadas en localStorage

38. **Cotizaciones desde el catálogo público** — feature completa para que el cliente arme su lista de láminas con total
    - `src/hooks/useQuote.ts` — carrito efímero: `toggle` cicla cantidades (0→1→2→stock→0), `getQuantity`, `clear`; precio efectivo = `sticker.precio ?? categoryPrices[cat]`; `total = Σ(precio × qty)`; `whatsappText` pre-armado con cantidad cuando qty>1 (`MEX5 ×2 — $2.000`)
    - `src/services/catalogService.ts` — SELECT incluye campo `precio`
    - `src/components/ui/QuotePanel.tsx` — componente compartido entre catálogo y admin; número WA fijo `+57 316 6590476`
    - `src/components/catalog/CatalogView.tsx` — chips seleccionables que muestran `2×` cuando hay más de 1 unidad; panel flotante `QuotePanel`; padding-bottom dinámico
39. **Cotizaciones desde el admin (MatrixView)** — el vendedor también puede armar cotizaciones
    - `src/components/matrix/StickerCell.tsx` — nuevo prop `onQuoteToggle` (modo cotización) + `quoteQty`; clic izquierdo togglea cotización, clic derecho siempre abre menú; badge amarillo `#FFC72C` para cantidad en cotización
    - `src/components/matrix/TeamSection.tsx` — nuevos props opcionales `onQuoteToggle` y `getQuoteQty`, los pasa a cada `StickerCell`
    - `src/components/matrix/MatrixView.tsx` — botón **💰 Cotizar** en el header del panel; al activarlo las celdas entran en modo selección; `QuotePanel` compartido aparece en la parte inferior; al desactivar limpia la selección

40. **Barra CTA siempre visible en CatalogView** — reemplaza el `QuotePanel` condicional por un ternario: cuando `selectedCount === 0` muestra una barra fija `fixed bottom-0` con el mensaje "¡Ya puedes cotizar! Toca una lámina para empezar" (con emojis animados `animate-bounce`); cuando hay ítems seleccionados muestra el `QuotePanel` como antes
41. **Leyenda de categorías rediseñada** — nuevo bloque con título grande (`text-sm font-bold uppercase tracking-widest`), descripción explicativa, chips centrados con `flex flex-wrap justify-center gap-3`; cada chip muestra la etiqueta de la categoría y su precio "Desde $X.XXX" tomado de `categoryPrices` en tiempo real (fallback "Consultar" si precio = 0)
42. **Precio por lámina en el botón del catálogo** — cada chip de lámina usa `inline-flex flex-col items-center` para mostrar el código en la fila superior y el precio (`$X.XXX`) en una segunda línea debajo, con separación `mt-0.5`; el precio se toma de `sticker.precio ?? categoryPrices[cat]`; solo se muestra cuando la lámina no está seleccionada y `price > 0`
43. **Español colombiano en toda la UI del catálogo** — reemplazados todos los voseos ("podés"/"Tocá") por tuteo colombiano ("puedes"/"Toca")

---

### 🏷️ Sesión 12 — Nombres oficiales + Dashboard financiero

44. **Scraping de nombres oficiales Panini** — script `scripts/scrape-names.mjs` que consulta `https://paninitrade.com/api/sticker-catalog` (endpoint descubierto en el bundle JS de la SPA), descarga 1080 láminas y genera `scripts/sticker-names.json` (1020 entradas únicas en formato `{ "MEX15": "Mexico - Hirving Lozano", ... }`)

45. **Migración 004 — columna `nombre`** — `supabase/migrations/004_add_sticker_names.sql`:
    - `ALTER TABLE public.stickers ADD COLUMN IF NOT EXISTS nombre TEXT`
    - 1020 `UPDATE` statements dentro de un bloque `DO $$` (logos FOIL, fotos equipo, jugadores, láminas EX-/CC-)
    - Ejecutada exitosamente en Supabase Studio

46. **Tipos + servicios — campo `name`**
    - `src/types/index.ts` — `name?: string` añadido a la interfaz `Sticker`
    - `src/services/stickerService.ts` — `nombre: string | null` en `StickerRow`; `name: row.nombre ?? undefined` en `rowToSticker()`
    - `src/services/catalogService.ts` — `nombre` añadido a `PublicStickerRow`, al string `.select()` y al mapper público

47. **Vista Matriz — tooltip con nombre** — `StickerCell.tsx`: tooltip cambia de solo `CODE` a `CODE — NombreJugador`, eliminando el prefijo de equipo con regex `/^[^-]+ - /` para mostrar solo el nombre del jugador

48. **Vista CRUD — columna Nombre + búsqueda por nombre** — `CRUDView.tsx`:
    - Nueva columna `Nombre` en la cabecera de la tabla
    - Celda en `EditableRow` muestra `sticker.name` truncado con `max-w-[160px] truncate`
    - Búsqueda (`filterText`) también aplica contra `sticker.name?.toLowerCase()`
    - Placeholder actualizado: `"Buscar por código, equipo, nombre (ej: Messi)…"`

49. **Vista Catálogo — nombre entre código y precio** — `CatalogView.tsx`:
    - Cada botón usa `flex-col` con 3 filas: código (arriba) → nombre sin prefijo de equipo (`max-w-[80px] truncate`, `text-[9px]`) → precio (abajo)
    - Nombre visible solo cuando `sticker.name` existe, limpiando el prefijo `"Team - "` con la misma regex que `StickerCell`

50. **Dashboard — métricas financieras y desglose por categoría** — `DashboardView.tsx`:
    - `valorTotal` = suma de `precio efectivo × cantidad` de todas las láminas con estado `D`
    - `ticketPromedio` = `valorTotal / totalDisponibles` (con guarda contra división por cero)
    - Dos `MetricCard` nuevas: `💰 Valor total` y `📈 Ticket promedio`
    - `laminaValiosa` = la lámina D con mayor precio efectivo (código + nombre + precio)
    - Nueva sección `💎 Valor por categoría`: tabla con filas GOAT → BASICA; columnas Categoría / Láminas / Unidades / Valor Total / barra proporcional relativa al máximo

---

### 🖼️ Feature: Foto de lámina

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


