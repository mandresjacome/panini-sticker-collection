-- ============================================================
-- Migración 003: Sistema de precios (dos niveles)
--
-- 1. Tabla `category_prices`
--    Precio base editable por categoría visual (7 filas fijas).
--    Permite ajustar el mercado sin tocar cada lámina individualmente.
--
-- 2. Columna `precio` en `stickers`
--    Override individual por lámina.
--    NULL = heredar el precio default de su categoría.
--    Entero positivo = precio específico de esa lámina.
--
-- Lógica de precio efectivo (aplicada en frontend):
--   precio_efectivo = sticker.precio ?? category_prices[categoria]
-- ============================================================

-- ── 1. Tabla de precios por categoría ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS category_prices (
  -- Clave primaria: nombre de la categoría (coincide con StickerCategory en TS)
  category    TEXT        PRIMARY KEY,

  -- Precio en pesos (COP). 0 indica "por definir"
  price       INTEGER     NOT NULL DEFAULT 0,

  -- Auditoría: última modificación
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed: precios base acordados inicialmente
-- PATROCINADOR queda en 0 (por definir)
INSERT INTO category_prices (category, price) VALUES
  ('BASICA',       1000),
  ('PATROCINADOR', 0),
  ('FOTO_EQUIPO',  2000),
  ('ESCUDO',       3000),
  ('METALIZADA',   5000),
  ('TOP',          5000),
  ('GOAT',         10000)
ON CONFLICT (category) DO NOTHING;

-- ── RLS — category_prices ──────────────────────────────────────────────────

ALTER TABLE category_prices ENABLE ROW LEVEL SECURITY;

-- Los usuarios autenticados (admins) pueden leer y modificar precios
CREATE POLICY "authenticated_rw_category_prices" ON category_prices
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Los visitantes anónimos solo pueden leer (para mostrar precios en catálogo)
CREATE POLICY "anon_read_category_prices" ON category_prices
  FOR SELECT
  TO anon
  USING (true);

-- ── 2. Columna de precio individual en stickers ────────────────────────────

-- NULL = usar el precio default de la categoría de la lámina
-- Valor entero = precio de venta específico para esta lámina
ALTER TABLE stickers
  ADD COLUMN IF NOT EXISTS precio INTEGER DEFAULT NULL;
