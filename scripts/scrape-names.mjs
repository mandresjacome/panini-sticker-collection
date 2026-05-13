/**
 * @description Descarga el catálogo completo de stickers del FIFA WC 2026
 * desde la API pública de paninitrade.com y genera:
 *   1. `scripts/sticker-names.json`  — mapa { code → name } para uso en frontend
 *   2. `scripts/sticker-names-full.json` — data completa para auditoría
 *   3. `supabase/migrations/004_add_sticker_names.sql` — migration + UPDATEs
 *
 * @usage node scripts/scrape-names.mjs
 */

import { writeFileSync, mkdirSync } from "fs";

// ---------------------------------------------------------------------------
// 1. Fetch del catálogo completo (un solo request, sin paginación)
// ---------------------------------------------------------------------------
console.log("📥 Descargando catálogo desde paninitrade.com/api/sticker-catalog ...");

const res = await fetch("https://paninitrade.com/api/sticker-catalog", {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
    Accept: "application/json",
    Referer: "https://paninitrade.com/collection",
  },
});

if (!res.ok) {
  console.error(`❌ Error HTTP: ${res.status} ${res.statusText}`);
  process.exit(1);
}

/** @type {Array<{id:string, stickerCode:string, name:string, category:string, stickerNumber:number}>} */
const catalog = await res.json();
console.log(`✅ ${catalog.length} stickers recibidos`);

// ---------------------------------------------------------------------------
// 2. Normalizar stickerCode
//    La API usa "00" para FWC00 y códigos como "FWC1", "MEX10", etc.
//    Nuestros códigos también usan ese formato, pero "00" lo mapeamos a "FWC00"
// ---------------------------------------------------------------------------

/**
 * @description Normaliza el stickerCode de la API al formato usado en nuestra DB.
 * @param {string} code - Código crudo de la API (ej: "00", "FWC1", "MEX10")
 * @returns {string} Código normalizado (ej: "FWC00", "FWC1", "MEX10")
 */
function normalizeCode(code) {
  // "00" es el logo Panini, que en nuestro álbum es FWC00
  if (code === "00") return "FWC00";
  return code.trim().toUpperCase();
}

// ---------------------------------------------------------------------------
// 3. Construir mapa { code → name }
// ---------------------------------------------------------------------------

/** @type {Record<string, string>} */
const codeToName = {};
/** @type {string[]} */
const unknown = [];

for (const item of catalog) {
  if (!item.stickerCode || !item.name) continue;
  const code = normalizeCode(item.stickerCode);
  if (codeToName[code]) {
    // Detectar duplicados en la fuente
    console.warn(`⚠️  Código duplicado en API: ${code} — "${codeToName[code]}" vs "${item.name}"`);
  }
  codeToName[code] = item.name;
}

const totalMapped = Object.keys(codeToName).length;
console.log(`🗺️  Códigos únicos mapeados: ${totalMapped}`);

// ---------------------------------------------------------------------------
// 4. Guardar JSON de nombres
// ---------------------------------------------------------------------------
mkdirSync("scripts", { recursive: true });

writeFileSync(
  "scripts/sticker-names.json",
  JSON.stringify(codeToName, null, 2),
  "utf-8"
);
console.log("💾 scripts/sticker-names.json guardado");

writeFileSync(
  "scripts/sticker-names-full.json",
  JSON.stringify(catalog, null, 2),
  "utf-8"
);
console.log("💾 scripts/sticker-names-full.json guardado");

// ---------------------------------------------------------------------------
// 5. Generar migración SQL
//    - Agrega columna `name TEXT` a la tabla stickers
//    - Genera un UPDATE por cada código conocido
// ---------------------------------------------------------------------------

/**
 * @description Escapa comillas simples en un string para SQL.
 * @param {string} str - Texto a escapar
 * @returns {string} Texto con comillas simples duplicadas
 */
function escapeSql(str) {
  return str.replace(/'/g, "''");
}

const updates = Object.entries(codeToName)
  // Usar `codigo` (nombre de columna en DB) no `code`
  .map(([code, name]) => `  UPDATE public.stickers SET nombre = '${escapeSql(name)}' WHERE codigo = '${escapeSql(code)}';`)
  .join("\n");

const sql = `-- =============================================================================
-- MIGRATION 004: Agregar nombres oficiales a las láminas
-- Fuente: paninitrade.com/api/sticker-catalog (datos oficiales Panini WC 2026)
-- Generado automáticamente por scripts/scrape-names.mjs
-- Fecha: ${new Date().toISOString().split("T")[0]}
-- Stickers con nombre: ${totalMapped}
-- =============================================================================

-- 1. Agregar columna nombre (si no existe)
--    Nombre oficial de la lámina (jugador, logo, foto equipo, etc.)
ALTER TABLE public.stickers
  ADD COLUMN IF NOT EXISTS nombre TEXT;

COMMENT ON COLUMN public.stickers.nombre
  IS 'Nombre oficial de la lámina. Ej: "Mexico - Hirving Lozano". Fuente: paninitrade.com.';

-- 2. Poblar nombres oficiales (solo actualiza los que existen en nuestra DB)
DO $$
BEGIN
${updates}
END $$;

-- 3. Verificación rápida
SELECT COUNT(*) AS con_nombre FROM public.stickers WHERE nombre IS NOT NULL;
`;

writeFileSync("supabase/migrations/004_add_sticker_names.sql", sql, "utf-8");
console.log("💾 supabase/migrations/004_add_sticker_names.sql generado");

// ---------------------------------------------------------------------------
// 6. Resumen final
// ---------------------------------------------------------------------------
console.log("\n--- RESUMEN ---");
console.log(`Total en API:         ${catalog.length}`);
console.log(`Códigos mapeados:     ${totalMapped}`);
console.log(`Ejemplos:`);
const sample = Object.entries(codeToName).slice(0, 5);
sample.forEach(([c, n]) => console.log(`  ${c.padEnd(8)} → ${n}`));
