-- =============================================================================
-- Migración 002: Agregar columna `categoria` a la tabla stickers
-- =============================================================================
-- Propósito:
--   Permite marcar manualmente láminas como TOP (jugadores destacados)
--   o GOAT (las más valiosas/raras). El resto de categorías visuales
--   (Metalizada, Escudo, Foto Equipo, Patrocinador, Básica) se derivan
--   automáticamente en frontend a partir del equipo y código de la lámina.
--
-- Ejecutar en el SQL Editor de Supabase:
--   Pegar este archivo y presionar "Run"
-- =============================================================================

ALTER TABLE public.stickers
  ADD COLUMN IF NOT EXISTS categoria TEXT
    CHECK (categoria IN ('TOP', 'GOAT'))
    DEFAULT NULL;  -- NULL = categoría se auto-deriva en frontend

COMMENT ON COLUMN public.stickers.categoria
  IS 'Override manual de categoría especial. NULL = auto-deriv. TOP = jugador destacado. GOAT = la más valiosa.';
