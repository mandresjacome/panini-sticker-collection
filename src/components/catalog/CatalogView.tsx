/**
 * @fileoverview Vista del catálogo público de láminas disponibles.
 * Accesible sin login — cualquier persona con el link puede verla.
 * Solo muestra láminas con estado "D" (Disponible para la venta).
 * El cliente puede ver los códigos y buscar las que le interesan.
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAvailableStickers, fetchPublicTeams } from "../../services/catalogService";
import { sortByAlbumOrder, TEAM_GROUP_LABEL, TEAM_FLAG } from "../../lib/albumOrder";
import { getStickerCategory } from "../../lib/stickerCategory";
import { CATEGORY_META } from "../../types";
import { Footer } from "../ui/Footer";
import type { Sticker } from "../../types";

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

/**
 * @description Props del componente de sección de equipo en el catálogo.
 */
interface CatalogTeamSectionProps {
  /** Sigla del equipo */
  teamCode: string;
  /** Nombre completo del equipo (o la sigla si no hay nombre) */
  teamName: string;
  /** Láminas disponibles de este equipo */
  stickers: Sticker[];
}

// ---------------------------------------------------------------------------
// Sub-componente: sección de un equipo
// ---------------------------------------------------------------------------

/**
 * @description Muestra las láminas disponibles de un equipo como chips de código.
 * Diseño limpio y legible para el cliente final.
 *
 * @param props.teamCode - Sigla del equipo
 * @param props.teamName - Nombre completo
 * @param props.stickers - Láminas disponibles del equipo
 * @returns Sección con nombre del equipo y lista de códigos disponibles
 */
function CatalogTeamSection({ teamCode, teamName, stickers }: CatalogTeamSectionProps) {
  /** Etiqueta del grupo al que pertenece este equipo en el álbum */
  const groupLabel = TEAM_GROUP_LABEL[teamCode];
  /** Emoji de bandera del país */
  const flag = TEAM_FLAG[teamCode] ?? "🌐";

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Encabezado del equipo */}
      <div className="px-4 py-3 bg-green-50 border-b border-green-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none" aria-hidden="true">{flag}</span>
          <div>
            <span className="font-bold text-gray-800">{teamName}</span>
            {teamName !== teamCode && (
              <span className="ml-2 text-xs text-gray-400 font-mono">{teamCode}</span>
            )}
            {/* Etiqueta de grupo — visible cuando hay coincidencia de búsqueda */}
            {groupLabel && (
              <span className="ml-2 text-xs text-gray-400">· {groupLabel}</span>
            )}
          </div>
        </div>
        {/* Badge con cantidad disponible */}
        <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {stickers.length} disponible{stickers.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Grid de códigos */}
      <div className="px-4 py-3 flex flex-wrap gap-2">
        {stickers.map((sticker) => {
          // Derivar la categoría visual para colorear el chip
          const category = getStickerCategory(sticker);
          const catMeta  = CATEGORY_META[category];

          return (
            <span
              key={sticker.code}
              className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-sm font-mono font-semibold transition-colors ${catMeta.bg} ${catMeta.text} border-current/20`}
              title={`${catMeta.label}${sticker.quantity > 1 ? ` · ${sticker.quantity} copias` : ""}`}
            >
              {sticker.code}
              {/* Indicar si hay más de 1 copia con un superíndice */}
              {sticker.quantity > 1 && (
                <sup className="ml-0.5 text-[10px] font-bold opacity-70">
                  ×{sticker.quantity}
                </sup>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vista principal del catálogo
// ---------------------------------------------------------------------------

/**
 * @description Página pública del catálogo de láminas disponibles para la venta.
 * - Sin login requerido.
 * - Carga solo láminas con estado "D" via RLS de Supabase.
 * - Buscador en tiempo real por código de lámina o nombre de equipo.
 * - Agrupado por equipo, ordenado alfabéticamente.
 *
 * @returns Página completa del catálogo público
 */
export function CatalogView() {
  /** Texto ingresado en el buscador — filtra en tiempo real */
  const [search, setSearch] = useState("");

  // ── Carga de datos (anon, sin sesión) ──────────────────────────────────
  const {
    data: stickersByTeam,
    isLoading: loadingStickers,
    error: errorStickers,
  } = useQuery({
    queryKey: ["catalog", "stickers"],
    queryFn:  fetchAvailableStickers,
    // Refrescar cada 60 segundos para mostrar cambios del vendedor
    refetchInterval: 60_000,
    staleTime:       30_000,
  });

  const {
    data: teamsMap,
    isLoading: loadingTeams,
  } = useQuery({
    queryKey: ["catalog", "teams"],
    queryFn:  fetchPublicTeams,
    staleTime: 1000 * 60 * 30, // Los nombres raramente cambian
  });

  /**
   * Filtrar los equipos según el texto de búsqueda y ordenarlos según el álbum.
   * Filtra por: código de lámina (ej. "JPN18") o nombre/sigla de equipo (ej. "Japón", "JPN").
   * El orden de los equipos sigue el orden canónico del álbum físico (FWC → Grupos A-L → CC).
   * Se recalcula solo cuando cambia stickersByTeam, teamsMap o search.
   */
  const filteredTeams = useMemo(() => {
    if (!stickersByTeam) return [];

    const q = search.trim().toUpperCase();

    // Obtener los códigos de equipos en orden canónico del álbum
    const sortedCodes = sortByAlbumOrder(Object.keys(stickersByTeam));

    return sortedCodes
      .map((teamCode) => {
        const stickers = stickersByTeam[teamCode];
        const teamName = teamsMap?.[teamCode] ?? teamCode;

        if (!q) {
          // Sin búsqueda: mostrar todos los equipos con sus láminas
          return { teamCode, teamName, stickers };
        }

        // Verificar si el equipo coincide con la búsqueda
        const teamMatches =
          teamCode.includes(q) ||
          teamName.toUpperCase().includes(q);

        if (teamMatches) {
          // Si el equipo coincide, mostrar todas sus láminas disponibles
          return { teamCode, teamName, stickers };
        }

        // Si el equipo no coincide directamente, filtrar láminas por código
        const matchingStickers = stickers.filter((s) =>
          s.code.toUpperCase().includes(q)
        );

        if (matchingStickers.length === 0) return null; // No incluir este equipo
        return { teamCode, teamName, stickers: matchingStickers };
      })
      .filter(Boolean) as { teamCode: string; teamName: string; stickers: Sticker[] }[];
  }, [stickersByTeam, teamsMap, search]);

  /** Total de láminas disponibles en el catálogo */
  const totalAvailable = useMemo(() => {
    if (!stickersByTeam) return 0;
    return Object.values(stickersByTeam).reduce((acc, s) => acc + s.length, 0);
  }, [stickersByTeam]);

  const isLoading = loadingStickers || loadingTeams;

  // ── Pantalla de carga ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-[#FFC72C] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Cargando catálogo…</p>
      </div>
    );
  }

  // ── Error (probablemente RLS no configurado) ─────────────────────────────
  if (errorStickers) {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex flex-col items-center justify-center gap-3 p-6">
        <span className="text-5xl">⚠️</span>
        <p className="text-[#E8192C] font-semibold text-lg">No se pudo cargar el catálogo</p>
        <p className="text-gray-400 text-sm text-center max-w-md">
          {(errorStickers as Error).message}
        </p>
      </div>
    );
  }

  // ── Sin láminas disponibles ──────────────────────────────────────────────
  if (totalAvailable === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex flex-col items-center justify-center gap-3 p-6">
        <span className="text-5xl">📫</span>
        <p className="text-white font-semibold text-lg">Sin láminas disponibles por ahora</p>
        <p className="text-gray-400 text-sm">Volvé pronto, el stock se actualiza seguido.</p>
      </div>
    );
  }

  // ── Catálogo principal ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-100">

      {/* ── Header público ───────────────────────────────────────────────── */}
      <header className="bg-[#0a0a14] sticky top-0 z-10">

        {/* Barra multicolor — paleta FIFA 2026 */}
        <div className="h-1 w-full flex">
          <div className="flex-1 bg-[#E8192C]" />
          <div className="flex-1 bg-[#F7941D]" />
          <div className="flex-1 bg-[#FFC72C]" />
          <div className="flex-1 bg-[#00A651]" />
          <div className="flex-1 bg-[#009EA6]" />
          <div className="flex-1 bg-[#003DA5]" />
          <div className="flex-1 bg-[#8B5CF6]" />
        </div>

        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">

            {/* Título */}
            <div className="flex-1">
              <h1 className="text-xl font-black leading-tight tracking-tight" style={{ color: '#ffffff' }}>
                🏆 Láminas Panini
              </h1>
              <p className="text-sm mt-0.5">
                <span className="font-black" style={{ color: '#FFC72C' }}>{totalAvailable}</span>
                <span style={{ color: '#9ca3af' }}> láminas disponibles para la venta</span>
              </p>
            </div>

            {/* Buscador */}
            <div className="relative sm:w-72">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input
                type="text"
                placeholder="Buscar por código o equipo…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-white/10 bg-white/10 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFC72C] focus:border-transparent transition"
                aria-label="Buscar láminas por código o nombre de equipo"
              />
              {/* Botón para limpiar búsqueda */}
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-lg leading-none"
                  aria-label="Limpiar búsqueda"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Contenido ────────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">

        {/* ── Leyenda de categorías ─────────────────────────────────────── */}
        {!search && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Colores por tipo de lámina
            </p>
            <div className="flex flex-wrap gap-2">
              {(["GOAT", "TOP", "METALIZADA", "ESCUDO", "FOTO_EQUIPO", "PATROCINADOR", "BASICA"] as const).map((cat) => {
                const meta = CATEGORY_META[cat];
                return (
                  <span
                    key={cat}
                    className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${meta.bg} ${meta.text}`}
                  >
                    {cat === "GOAT" ? "🐐" : cat === "TOP" ? "⭐" : null}
                    {cat === "GOAT" || cat === "TOP" ? " " : ""}
                    {meta.label}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Resultado de búsqueda */}
        {search && (
          <p className="text-sm text-gray-500">
            {filteredTeams.length === 0
              ? `Sin resultados para "${search}"`
              : `${filteredTeams.reduce((a, t) => a + t.stickers.length, 0)} lámina(s) encontrada(s) para "${search}"`
            }
          </p>
        )}

        {/* Sin resultados de búsqueda */}
        {search && filteredTeams.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🔎</p>
            <p>No hay láminas disponibles con ese código o equipo.</p>
          </div>
        )}

        {/* Secciones por equipo — en orden del álbum */}
        {filteredTeams.map(({ teamCode, teamName, stickers }) => (
          <CatalogTeamSection
            key={teamCode}
            teamCode={teamCode}
            teamName={teamName}
            stickers={stickers}
          />
        ))}

        {/* Footer con aviso */}
        <p className="text-center text-xs text-gray-400 py-6">
          El catálogo se actualiza automáticamente cada 60 segundos.
        </p>
      </main>

      <Footer />
    </div>
  );
}
