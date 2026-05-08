-- =============================================================================
-- Migración 001: Creación de tablas base — App Láminas FIFA World Cup 2026
-- =============================================================================
-- Ejecutar en el SQL Editor de Supabase o via CLI: supabase db push
-- =============================================================================


-- -----------------------------------------------------------------------------
-- TABLA: teams — Catálogo de equipos / categorías
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teams (
  code  TEXT PRIMARY KEY,     -- Sigla del equipo (ej. "MEX", "ARG", "FWC")
  name  TEXT NOT NULL          -- Nombre completo (ej. "México", "Argentina")
);

COMMENT ON TABLE  public.teams       IS 'Catálogo de equipos y categorías de la colección FIFA 2026.';
COMMENT ON COLUMN public.teams.code  IS 'Sigla única del equipo. PK. Ej: MEX, ARG, FWC, CC.';
COMMENT ON COLUMN public.teams.name  IS 'Nombre completo del equipo o categoría en español.';


-- -----------------------------------------------------------------------------
-- TABLA: stickers — Inventario de las 994 láminas
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stickers (
  -- Identificación
  codigo      TEXT         PRIMARY KEY,            -- Clave única. Ej: "FWC1", "MEX10", "CC3"
  equipo      TEXT         NOT NULL
              REFERENCES public.teams(code),        -- FK al catálogo de equipos
  tipo        TEXT         NOT NULL,                -- Clasificación: 'Especial' | 'Selección' | 'Patrocinador'

  -- Estado del inventario
  -- Invariante: si cantidad > 0, estado != 'F'
  estado      TEXT         NOT NULL DEFAULT 'F'
              CHECK (estado IN ('D', 'F', 'R', 'V')),  -- D=Disponible F=Falta R=Repetida V=Vendida
  cantidad    INT          NOT NULL DEFAULT 0
              CHECK (cantidad >= 0),               -- Copias en posesión. No puede ser negativo

  -- Datos opcionales
  observacion TEXT,                                -- Notas del coleccionista

  -- Auditoría colaborativa (quién y cuándo modificó)
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(), -- Timestamp de última modificación
  updated_by  UUID                                 -- FK al usuario que hizo el cambio
              REFERENCES auth.users(id)
              ON DELETE SET NULL                   -- Si el usuario se borra, conservar el sticker
);

COMMENT ON TABLE  public.stickers             IS 'Inventario de las 994 láminas FIFA World Cup 2026.';
COMMENT ON COLUMN public.stickers.codigo      IS 'Identificador único. Ej: FWC1, MEX10, ARG20, CC5.';
COMMENT ON COLUMN public.stickers.equipo      IS 'Sigla del equipo. FK a teams.code.';
COMMENT ON COLUMN public.stickers.tipo        IS 'Categoría de la lámina: Especial | Selección | Patrocinador.';
COMMENT ON COLUMN public.stickers.estado      IS 'Estado: D=Disponible, F=Falta, R=Repetida, V=Vendida.';
COMMENT ON COLUMN public.stickers.cantidad    IS 'Copias en posesión. Invariante: cantidad > 0 implica estado != F.';
COMMENT ON COLUMN public.stickers.observacion IS 'Notas libres del coleccionista.';
COMMENT ON COLUMN public.stickers.updated_at  IS 'Fecha y hora de la última modificación (UTC).';
COMMENT ON COLUMN public.stickers.updated_by  IS 'UUID del usuario que realizó la última modificación.';


-- -----------------------------------------------------------------------------
-- TRIGGER: actualizar updated_at automáticamente al modificar una fila
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Asigna el timestamp actual en cada UPDATE
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stickers_updated_at
  BEFORE UPDATE ON public.stickers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- -----------------------------------------------------------------------------
-- ÍNDICES — Optimización para los filtros más frecuentes de la app
-- -----------------------------------------------------------------------------

-- Filtrar por equipo (Vista Matriz agrupa por equipo)
CREATE INDEX IF NOT EXISTS idx_stickers_equipo   ON public.stickers (equipo);

-- Filtrar por estado (Dashboard cuenta por estado)
CREATE INDEX IF NOT EXISTS idx_stickers_estado   ON public.stickers (estado);

-- Filtrar por tipo (Vista CRUD permite filtrar por tipo)
CREATE INDEX IF NOT EXISTS idx_stickers_tipo     ON public.stickers (tipo);


-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) — Obligatorio con anon_key expuesta en el frontend
-- -----------------------------------------------------------------------------

ALTER TABLE public.teams    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;

-- Política: cualquier usuario autenticado puede leer equipos
CREATE POLICY "Authenticated users can read teams"
  ON public.teams FOR SELECT
  TO authenticated
  USING (true);

-- Política: cualquier usuario autenticado puede leer láminas
CREATE POLICY "Authenticated users can read stickers"
  ON public.stickers FOR SELECT
  TO authenticated
  USING (true);

-- Política: cualquier usuario autenticado puede actualizar láminas
-- (los 4 usuarios colaborativos pueden editar el mismo inventario)
CREATE POLICY "Authenticated users can update stickers"
  ON public.stickers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Nota: INSERT y DELETE no se exponen — el inventario se carga vía seed
-- y no se crean ni eliminan láminas desde la app.


-- -----------------------------------------------------------------------------
-- REALTIME — Habilitar para la tabla stickers (colaboración en tiempo real)
-- -----------------------------------------------------------------------------

-- Añade la tabla stickers a la publicación de Realtime de Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE public.stickers;
