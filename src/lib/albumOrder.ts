/**
 * @fileoverview Orden canónico del álbum FIFA World Cup 2026.
 *
 * Define la secuencia exacta de equipos tal como aparecen en el álbum físico:
 *   1. Láminas especiales FWC
 *   2. Grupos A–L (cada uno con 4 selecciones en el orden del torneo)
 *   3. Patrocinadores Coca-Cola (CC)
 *
 * Este módulo es la fuente de verdad para el ordenamiento visual en
 * MatrixView, CRUDView y DashboardView.
 */

// ---------------------------------------------------------------------------
// Tipo de grupo del álbum
// ---------------------------------------------------------------------------

/**
 * @description Representa un bloque del álbum (ej. "Grupo A") con sus equipos.
 */
export interface AlbumGroup {
  /** Etiqueta visible al usuario. Ej: "Grupo A", "Especiales", "Patrocinadores" */
  label: string;

  /**
   * Códigos de equipo en el orden en que aparecen dentro del bloque.
   * Deben coincidir exactamente con la columna `equipo` de la tabla `stickers`.
   */
  teams: string[];
}

// ---------------------------------------------------------------------------
// Orden canónico del álbum
// ---------------------------------------------------------------------------

/**
 * @description Array ordenado de bloques del álbum FIFA 2026.
 * Cada entrada corresponde a una sección del álbum físico.
 *
 * Grupos A–L extraídos del sorteo oficial de la Copa Mundial 2026.
 * Orden dentro de cada grupo: posición 1 → 4 según el fixture del torneo.
 */
export const ALBUM_GROUP_ORDER: AlbumGroup[] = [
  // ── Láminas especiales FIFA World Cup ──────────────────────────────────
  { label: "Especiales",     teams: ["FWC"] },

  // ── Fase de grupos ─────────────────────────────────────────────────────
  { label: "Grupo A",        teams: ["MEX", "RSA", "KOR", "CZE"] },
  { label: "Grupo B",        teams: ["CAN", "BIH", "QAT", "SUI"] },
  { label: "Grupo C",        teams: ["BRA", "MAR", "HAI", "SCO"] },
  { label: "Grupo D",        teams: ["USA", "PAR", "AUS", "TUR"] },
  { label: "Grupo E",        teams: ["GER", "CUW", "CIV", "ECU"] },
  { label: "Grupo F",        teams: ["NED", "JPN", "SWE", "TUN"] },
  { label: "Grupo G",        teams: ["BEL", "EGY", "IRN", "NZL"] },
  { label: "Grupo H",        teams: ["ESP", "CPV", "KSA", "URU"] },
  { label: "Grupo I",        teams: ["FRA", "SEN", "IRQ", "NOR"] },
  { label: "Grupo J",        teams: ["ARG", "ALG", "AUT", "JOR"] },
  { label: "Grupo K",        teams: ["POR", "COD", "UZB", "COL"] },
  { label: "Grupo L",        teams: ["ENG", "CRO", "GHA", "PAN"] },

  // ── Patrocinadores ─────────────────────────────────────────────────────
  { label: "Patrocinadores", teams: ["CC"] },
];

// ---------------------------------------------------------------------------
// Utilidades derivadas
// ---------------------------------------------------------------------------

/**
 * @description Array plano de todos los códigos de equipo en orden de álbum.
 * Útil para ordenar listas y selectores de equipos.
 * @example ["FWC", "MEX", "RSA", ..., "PAN", "CC"]
 */
export const ALBUM_TEAM_ORDER: string[] = ALBUM_GROUP_ORDER.flatMap((g) => g.teams);

/**
 * @description Mapa de código de equipo → índice de posición en el álbum.
 * Permite ordenamiento O(1) por código de equipo.
 * @example { FWC: 0, MEX: 1, RSA: 2, ... }
 */
export const ALBUM_TEAM_INDEX: Record<string, number> = Object.fromEntries(
  ALBUM_TEAM_ORDER.map((code, i) => [code, i])
);

/**
 * @description Mapa de código de equipo → etiqueta del grupo al que pertenece.
 * @example { MEX: "Grupo A", RSA: "Grupo A", ..., CC: "Patrocinadores" }
 */
export const TEAM_GROUP_LABEL: Record<string, string> = Object.fromEntries(
  ALBUM_GROUP_ORDER.flatMap((g) => g.teams.map((code) => [code, g.label]))
);

/**
 * @description Ordena un array de códigos de equipo según el orden del álbum.
 * Los códigos no encontrados se colocan al final en orden alfabético.
 *
 * @param codes - Códigos de equipo a ordenar
 * @returns Nuevo array ordenado según el álbum
 */
export function sortByAlbumOrder(codes: string[]): string[] {
  return [...codes].sort((a, b) => {
    const ia = ALBUM_TEAM_INDEX[a] ?? Number.MAX_SAFE_INTEGER;
    const ib = ALBUM_TEAM_INDEX[b] ?? Number.MAX_SAFE_INTEGER;
    return ia !== ib ? ia - ib : a.localeCompare(b);
  });
}

// ---------------------------------------------------------------------------
// Banderas
// ---------------------------------------------------------------------------

/**
 * @description Mapa de código de equipo → emoji de bandera nacional.
 * Cubre los 48 países del Mundial 2026 + FWC (trofeo) + CC (Coca-Cola).
 * Fuente canónica para todas las vistas.
 *
 * @example TEAM_FLAG["ARG"] → "🇦🇷"
 */
export const TEAM_FLAG: Record<string, string> = {
  FWC: "🏆",
  // Grupo A
  MEX: "🇲🇽", RSA: "🇿🇦", KOR: "🇰🇷", CZE: "🇨🇿",
  // Grupo B
  CAN: "🇨🇦", BIH: "🇧🇦", QAT: "🇶🇦", SUI: "🇨🇭",
  // Grupo C
  BRA: "🇧🇷", MAR: "🇲🇦", HAI: "🇭🇹", SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  // Grupo D
  USA: "🇺🇸", PAR: "🇵🇾", AUS: "🇦🇺", TUR: "🇹🇷",
  // Grupo E
  GER: "🇩🇪", CUW: "🇨🇼", CIV: "🇨🇮", ECU: "🇪🇨",
  // Grupo F
  NED: "🇳🇱", JPN: "🇯🇵", SWE: "🇸🇪", TUN: "🇹🇳",
  // Grupo G
  BEL: "🇧🇪", EGY: "🇪🇬", IRN: "🇮🇷", NZL: "🇳🇿",
  // Grupo H
  ESP: "🇪🇸", CPV: "🇨🇻", KSA: "🇸🇦", URU: "🇺🇾",
  // Grupo I
  FRA: "🇫🇷", SEN: "🇸🇳", IRQ: "🇮🇶", NOR: "🇳🇴",
  // Grupo J
  ARG: "🇦🇷", ALG: "🇩🇿", AUT: "🇦🇹", JOR: "🇯🇴",
  // Grupo K
  POR: "🇵🇹", COD: "🇨🇩", UZB: "🇺🇿", COL: "🇨🇴",
  // Grupo L
  ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", CRO: "🇭🇷", GHA: "🇬🇭", PAN: "🇵🇦",
  // Patrocinadores
  CC:  "🥤",
};
