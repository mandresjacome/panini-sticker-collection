-- =============================================================================
-- MIGRATION 005: Inventarios múltiples + tabla de vendedores (sellers)
--
-- CONTEXTO:
--   Hay dos grupos de vendedores independientes, cada uno con su propio stock:
--     · Inventario 'CN' — Cristian y Nicolás (inventario actual)
--     · Inventario 'AM' — Anny y Mario (inventario nuevo, vacío)
--
-- CAMBIOS EN stickers:
--   1. Agregar columna `inventario` (TEXT, default 'CN')
--   2. Cambiar PK de (codigo) a (codigo, inventario) — mismo código existe en 2 inventarios
--   3. Duplicar las 994 filas CN con inventario='AM', estado='F', cantidad=0
--
-- NUEVA TABLA sellers:
--   Relaciona cada slug de URL con un inventario y un nombre para mostrar.
--
-- Fecha: 2026-05-13
-- =============================================================================


-- =============================================================================
-- SECCIÓN A: Modificar la tabla stickers
-- =============================================================================

-- 1. Agregar columna inventario (default 'CN' para no romper filas existentes)
ALTER TABLE public.stickers
  ADD COLUMN IF NOT EXISTS inventario TEXT NOT NULL DEFAULT 'CN';

COMMENT ON COLUMN public.stickers.inventario
  IS 'Grupo de inventario propietario de la lámina. CN = Cristian/Nicolás · AM = Anny/Mario';

-- 2. Crear índice para los filtros más frecuentes por inventario
CREATE INDEX IF NOT EXISTS idx_stickers_inventario
  ON public.stickers (inventario);

CREATE INDEX IF NOT EXISTS idx_stickers_inventario_estado
  ON public.stickers (inventario, estado);

-- 3. Cambiar PRIMARY KEY de (codigo) a (codigo, inventario)
--    Primero eliminar la PK actual, luego crear la compuesta.
ALTER TABLE public.stickers DROP CONSTRAINT stickers_pkey;
ALTER TABLE public.stickers ADD PRIMARY KEY (codigo, inventario);

-- 4. Duplicar las 994 filas del inventario CN para crear el inventario AM vacío.
--    Las láminas del inventario AM parten en estado F (Falta), cantidad 0.
--    Se copia el nombre oficial para que sea visible en el catálogo futuro.
INSERT INTO public.stickers
  (codigo, equipo, tipo, estado, cantidad, observacion, categoria, precio, nombre, inventario, updated_at)
SELECT
  codigo,
  equipo,
  tipo,
  'F',       -- Inventario AM parte vacío
  0,         -- Sin stock inicial
  NULL,      -- Sin observaciones
  NULL,      -- Sin override de categoría
  NULL,      -- Sin precio individual
  nombre,    -- Conservar nombre oficial Panini
  'AM',
  now()
FROM public.stickers
WHERE inventario = 'CN'
ON CONFLICT (codigo, inventario) DO NOTHING;


-- =============================================================================
-- SECCIÓN B: Crear tabla sellers
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sellers (
  /** Identificador único auto-generado */
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  /** Slug único en la URL. Ej: "anny" → /laminas-anny */
  slug         TEXT UNIQUE NOT NULL,

  /** Nombre visible en el encabezado del catálogo. Ej: "Anny" */
  display_name TEXT NOT NULL,

  /** Inventario que administra este vendedor. 'CN' | 'AM' */
  inventario   TEXT NOT NULL DEFAULT 'CN',

  /** WhatsApp del vendedor (formato internacional). NULL = no configurado aún */
  whatsapp     TEXT DEFAULT NULL,

  /** Fecha de creación */
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Si la tabla ya existía sin la columna inventario, agregarla
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS inventario TEXT NOT NULL DEFAULT 'CN';

COMMENT ON TABLE public.sellers
  IS 'Vendedores con catálogo público propio. Cada seller apunta a un inventario separado.';

-- RLS: visitantes anon pueden leer (necesario para el catálogo público)
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_can_read_sellers"   ON public.sellers;
DROP POLICY IF EXISTS "auth_full_access_sellers" ON public.sellers;

CREATE POLICY "anon_can_read_sellers"
  ON public.sellers
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "auth_full_access_sellers"
  ON public.sellers
  FOR ALL
  TO authenticated
  USING (true);

-- Insertar los sellers (o actualizar si ya existen)
-- AM → un solo link compartido por Anny y Mario
INSERT INTO public.sellers (slug, display_name, inventario) VALUES
  ('replica', 'Láminas Réplica', 'AM'),
  ('cristian', 'Cristian',        'CN'),
  ('nicolas',  'Nicolás',         'CN')
ON CONFLICT (slug) DO UPDATE SET
  inventario   = EXCLUDED.inventario,
  display_name = EXCLUDED.display_name;

-- Eliminar slugs individuales de anny/mario si existían de una versión anterior
DELETE FROM public.sellers WHERE slug IN ('anny', 'mario');


-- =============================================================================
-- SECCIÓN C: Verificación
-- =============================================================================

-- Debe retornar ~994 filas por inventario
SELECT inventario, count(*) AS total_laminas
FROM public.stickers
GROUP BY inventario
ORDER BY inventario;

-- Debe retornar 3 sellers: replica(AM), cristian(CN), nicolas(CN)
SELECT slug, display_name, inventario FROM public.sellers ORDER BY inventario, slug;
