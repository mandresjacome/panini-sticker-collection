/**
 * @fileoverview Vista del catálogo público de láminas disponibles.
 * Accesible sin login — cualquier persona con el link puede verla.
 * Solo muestra láminas con estado "D" (Disponible para la venta).
 * El cliente puede buscar láminas y armar una cotización con total.
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAvailableStickers, fetchPublicTeams } from "../../services/catalogService";
import { sortByAlbumOrder, TEAM_GROUP_LABEL, TEAM_FLAG } from "../../lib/albumOrder";
import { getStickerCategory } from "../../lib/stickerCategory";
import { CATEGORY_META } from "../../types";
import { Footer } from "../ui/Footer";
import { QuotePanel } from "../ui/QuotePanel";
import { useCategoryPrices } from "../../hooks/useCategoryPrices";
import { useQuote } from "../../hooks/useQuote";
import type { Sticker } from "../../types";

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

interface CatalogTeamSectionProps {
  teamCode: string;
  teamName: string;
  stickers: Sticker[];
  isSelected: (code: string) => boolean;
  /** Retorna la cantidad seleccionada (0 si no está en cotización) */
  getQuantity: (code: string) => number;
  onToggle: (sticker: Sticker) => void;
}

// ---------------------------------------------------------------------------
// Sub-componente: sección de un equipo
// ---------------------------------------------------------------------------

function CatalogTeamSection({ teamCode, teamName, stickers, isSelected, getQuantity, onToggle }: CatalogTeamSectionProps) {
  const groupLabel = TEAM_GROUP_LABEL[teamCode];
  const flag = TEAM_FLAG[teamCode] ?? "🌐";

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-green-50 border-b border-green-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none" aria-hidden="true">{flag}</span>
          <div>
            <span className="font-bold text-gray-800">{teamName}</span>
            {teamName !== teamCode && (
              <span className="ml-2 text-xs text-gray-400 font-mono">{teamCode}</span>
            )}
            {groupLabel && (
              <span className="ml-2 text-xs text-gray-400">· {groupLabel}</span>
            )}
          </div>
        </div>
        <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {stickers.length} disponible{stickers.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="px-4 py-3 flex flex-wrap gap-2">
        {stickers.map((sticker) => {
          const category = getStickerCategory(sticker);
          const catMeta  = CATEGORY_META[category];
          const selected = isSelected(sticker.code);
          const qty      = getQuantity(sticker.code);
          // Cuando qty === stock, el próximo clic saca la lámina del carrito
          const atMax    = qty >= sticker.quantity;

          return (
            <button
              key={sticker.code}
              onClick={() => onToggle(sticker)}
              className={`
                inline-flex items-center px-2.5 py-1 rounded-lg border
                text-sm font-mono font-semibold transition-all
                ${selected
                  ? "bg-black text-white border-[#FFC72C] border-2 scale-105 shadow-md"
                  : `${catMeta.bg} ${catMeta.text} border-transparent hover:scale-105 hover:shadow-sm`
                }
              `}
              title={
                selected
                  ? atMax
                    ? `Sacar de cotización (máximo: ${sticker.quantity} unidad${sticker.quantity !== 1 ? "es" : ""})`
                    : `Agregar 1 más · ${qty}/${sticker.quantity} unidades`
                  : `Agregar a cotización · ${catMeta.label}`
              }
              aria-pressed={selected}
            >
              {/* Muestra "2×" cuando hay más de 1 unidad seleccionada */}
              {selected && (
                <span className="mr-1 text-[#FFC72C] font-black">
                  {qty}×
                </span>
              )}
              {sticker.code}
              {/* Stock disponible (solo cuando NO está en cotización y hay más de 1 copia) */}
              {!selected && sticker.quantity > 1 && (
                <sup className="ml-0.5 text-[10px] font-bold opacity-70">×{sticker.quantity}</sup>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vista principal del catálogo
// ---------------------------------------------------------------------------

export function CatalogView() {
  const [search, setSearch] = useState("");
  const [quoteExpanded, setQuoteExpanded] = useState(false);

  const {
    data: stickersByTeam,
    isLoading: loadingStickers,
    error: errorStickers,
  } = useQuery({
    queryKey: ["catalog", "stickers"],
    queryFn:  fetchAvailableStickers,
    refetchInterval: 60_000,
    staleTime:       30_000,
  });

  const {
    data: teamsMap,
    isLoading: loadingTeams,
  } = useQuery({
    queryKey: ["catalog", "teams"],
    queryFn:  fetchPublicTeams,
    staleTime: 1000 * 60 * 30,
  });

  const { categoryPrices } = useCategoryPrices();

  const stickersFlat = useMemo<Sticker[]>(() => {
    if (!stickersByTeam) return [];
    return Object.values(stickersByTeam).flat();
  }, [stickersByTeam]);

  const {
    isSelected,
    getQuantity,
    toggle,
    clear,
    total,
    whatsappText,
    selectedCodes,
  } = useQuote(categoryPrices, stickersFlat);

  const filteredTeams = useMemo(() => {
    if (!stickersByTeam) return [];

    const q = search.trim().toUpperCase();
    const sortedCodes = sortByAlbumOrder(Object.keys(stickersByTeam));

    return sortedCodes
      .map((teamCode) => {
        const stickers = stickersByTeam[teamCode];
        const teamName = teamsMap?.[teamCode] ?? teamCode;

        if (!q) return { teamCode, teamName, stickers };

        const teamMatches =
          teamCode.includes(q) ||
          teamName.toUpperCase().includes(q);

        if (teamMatches) return { teamCode, teamName, stickers };

        const matchingStickers = stickers.filter((s) =>
          s.code.toUpperCase().includes(q)
        );

        if (matchingStickers.length === 0) return null;
        return { teamCode, teamName, stickers: matchingStickers };
      })
      .filter(Boolean) as { teamCode: string; teamName: string; stickers: Sticker[] }[];
  }, [stickersByTeam, teamsMap, search]);

  const totalAvailable = useMemo(() => {
    if (!stickersByTeam) return 0;
    return Object.values(stickersByTeam).reduce((acc, s) => acc + s.length, 0);
  }, [stickersByTeam]);

  // Total de unidades (suma de cantidades): lo que se muestra en el panel y botón WA
  const selectedCount = selectedCodes.size;
  const totalUnits = useMemo(
    () => Array.from(selectedCodes).reduce((acc, code) => {
      // getQuantity es estable (useCallback), y selectedCodes cambió así que re-run es correcto
      return acc + getQuantity(code);
    }, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedCodes, getQuantity]
  );
  const isLoading = loadingStickers || loadingTeams;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-[#FFC72C] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Cargando catálogo…</p>
      </div>
    );
  }

  if (errorStickers) {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex flex-col items-center justify-center gap-3 p-6">
        <span className="text-5xl">⚠️</span>
        <p className="text-[#E8192C] font-semibold text-lg">No se pudo cargar el catálogo</p>
        <p className="text-gray-400 text-sm text-center max-w-md">{(errorStickers as Error).message}</p>
      </div>
    );
  }

  if (totalAvailable === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex flex-col items-center justify-center gap-3 p-6">
        <span className="text-5xl">📫</span>
        <p className="text-white font-semibold text-lg">Sin láminas disponibles por ahora</p>
        <p className="text-gray-400 text-sm">Volvé pronto, el stock se actualiza seguido.</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-100"
      style={{ paddingBottom: selectedCount > 0 ? "10rem" : "1.5rem" }}
    >
      <header className="bg-[#0a0a14] sticky top-0 z-10">
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
            <div className="flex-1">
              <h1 className="text-xl font-black leading-tight tracking-tight" style={{ color: "#ffffff" }}>
                🏆 Láminas Panini
              </h1>
              <p className="text-sm mt-0.5">
                <span className="font-black" style={{ color: "#FFC72C" }}>{totalAvailable}</span>
                <span style={{ color: "#9ca3af" }}> láminas disponibles para la venta</span>
              </p>
            </div>

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

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {!search && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Colores por tipo de lámina
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {(["GOAT", "TOP", "METALIZADA", "ESCUDO", "FOTO_EQUIPO", "PATROCINADOR", "BASICA"] as const).map((cat) => {
                const meta = CATEGORY_META[cat];
                return (
                  <span
                    key={cat}
                    className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${meta.bg} ${meta.text}`}
                  >
                    {cat === "GOAT" ? "🐐 " : cat === "TOP" ? "⭐ " : null}
                    {meta.label}
                  </span>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 border-t border-gray-100 pt-2">
              💡 Tocá cualquier lámina para armar tu cotización. El total aparece abajo.
            </p>
          </div>
        )}

        {search && (
          <p className="text-sm text-gray-500">
            {filteredTeams.length === 0
              ? `Sin resultados para "${search}"`
              : `${filteredTeams.reduce((a, t) => a + t.stickers.length, 0)} lámina(s) encontrada(s) para "${search}"`
            }
          </p>
        )}

        {search && filteredTeams.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🔎</p>
            <p>No hay láminas disponibles con ese código o equipo.</p>
          </div>
        )}

        {filteredTeams.map(({ teamCode, teamName, stickers }) => (
          <CatalogTeamSection
            key={teamCode}
            teamCode={teamCode}
            teamName={teamName}
            stickers={stickers}
            isSelected={isSelected}
            getQuantity={getQuantity}
            onToggle={toggle}
          />
        ))}

        <p className="text-center text-xs text-gray-400 py-6">
          El catálogo se actualiza automáticamente cada 60 segundos.
        </p>
      </main>

      <Footer />

      {selectedCount > 0 && (
        <QuotePanel
          count={totalUnits}
          total={total}
          whatsappText={whatsappText}
          onClear={clear}
          expanded={quoteExpanded}
          onToggleExpand={() => setQuoteExpanded((v) => !v)}
        />
      )}
    </div>
  );
}
