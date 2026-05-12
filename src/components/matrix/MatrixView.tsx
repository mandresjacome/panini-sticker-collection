/**
 * @fileoverview Vista Matriz — vista principal de la colección.
 * Cuadrícula de 994 láminas agrupadas por equipo.
 * Clic izquierdo: toggle rápido F↔D.
 * Clic derecho: menú contextual con todos los estados + selector de cantidad.
 */

import { useMemo, useState, useCallback } from "react";
import { useStickers } from "../../hooks/useStickers";
import { useTeams } from "../../hooks/useTeams";
import { useCategoryPrices } from "../../hooks/useCategoryPrices";
import { useQuote } from "../../hooks/useQuote";
import { TeamSection } from "./TeamSection";
import { StickerContextMenu } from "./StickerContextMenu";
import { QuotePanel } from "../ui/QuotePanel";
import { ALBUM_GROUP_ORDER } from "../../lib/albumOrder";
import { CATEGORY_META } from "../../types";
import type { Sticker, StickerCategory } from "../../types";

// ---------------------------------------------------------------------------
// Componente de leyenda
// ---------------------------------------------------------------------------

/**
 * @description Leyenda de categorías de láminas.
 * Muestra el color real de celda por categoría + gris para Falta.
 * La fila de "Estados" se eliminó: Disponible ya no tiene un color fijo,
 * cada categoría usa su propio color cuando está disponible.
 * @returns Fila de chips con cada categoría y su color
 */
function StatusLegend() {
  // Todas las categorías en el orden visual correcto (manuales primero)
  const categoryOrder: StickerCategory[] = [
    "GOAT", "TOP", "METALIZADA", "ESCUDO", "FOTO_EQUIPO", "PATROCINADOR", "BASICA",
  ];

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {categoryOrder.map((cat) => {
        const meta = CATEGORY_META[cat];
        return (
          <span
            key={cat}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${meta.cellColor}`}
          >
            {meta.label}
            {meta.manual && <span className="opacity-60 text-[9px]">manual</span>}
          </span>
        );
      })}
      {/* Gris = Falta (único estado con color fijo) */}
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-gray-300 text-gray-700">
        Falta
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vista Matriz principal
// ---------------------------------------------------------------------------

/**
 * @description Vista que muestra todas las láminas de la colección FIFA 2026
 * agrupadas por equipo. Carga el inventario con useStickers (TanStack Query +
 * Supabase Realtime) y renderiza un TeamSection por cada equipo.
 *
 * @returns Página completa de la Vista Matriz
 */
export function MatrixView() {
  const { stickersArray, updateStickerFields, isLoading, error, counts } = useStickers();
  const { teamsMap, teamsLoading } = useTeams();
  const { categoryPrices, updateCategoryPrice } = useCategoryPrices();

  /** Si true, los clics en las celdas agregan/quitan de la cotización */
  const [quoteMode, setQuoteMode] = useState(false);
  /** Controla si el panel de cotización está expandido */
  const [quoteExpanded, setQuoteExpanded] = useState(false);

  /**
   * Lista plana de todas las láminas del inventario.
   * useQuote necesita resolver stickers por código para calcular precios.
   */
  const stickersFlat = stickersArray;

  const {
    getQuantity,
    toggle: quoteToggle,
    clear: quoteClear,
    total: quoteTotal,
    whatsappText,
    selectedCodes,
  } = useQuote(categoryPrices, stickersFlat);

  /**
   * Estado del menú contextual.
   * null = menú cerrado. Con datos = menú abierto en esa posición.
   */
  const [contextMenu, setContextMenu] = useState<{
    sticker: Sticker;
    x: number;
    y: number;
  } | null>(null);

  const handleRightClick = useCallback((sticker: Sticker, x: number, y: number) => {
    setContextMenu({ sticker, x, y });
  }, []);

  /** Cierra el menú contextual */
  const handleCloseMenu = useCallback(() => setContextMenu(null), []);

  /**
   * Alterna el modo cotización. Al desactivarlo limpia la selección.
   */
  const handleToggleQuoteMode = useCallback(() => {
    setQuoteMode((prev) => {
      if (prev) {
        quoteClear();
        setQuoteExpanded(false);
      }
      return !prev;
    });
  }, [quoteClear]);

  /** Total de unidades en la cotización (suma de cantidades) */
  const quoteTotalUnits = useMemo(
    () => Array.from(selectedCodes).reduce((acc, code) => acc + getQuantity(code), 0),
    [selectedCodes, getQuantity]
  );

  /**
   * Construye un mapa de stickers indexado por equipo.
   * La clave es el código de equipo; el valor es el array de sus láminas.
   * El orden de iteración NO importa aquí — el render usa ALBUM_GROUP_ORDER.
   */
  const stickersByTeam = useMemo(() => {
    const map = new Map<string, Sticker[]>();
    for (const sticker of stickersArray) {
      if (!map.has(sticker.team)) map.set(sticker.team, []);
      map.get(sticker.team)!.push(sticker);
    }
    return map;
  }, [stickersArray]);

  // ── Pantalla de carga ─────────────────────────────────────────────────────
  if (isLoading || teamsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Cargando {994} láminas…</p>
      </div>
    );
  }

  // ── Pantalla de error ─────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <span className="text-4xl">⚠️</span>
        <p className="text-red-600 font-semibold">Error al cargar las láminas</p>
        <p className="text-gray-500 text-sm max-w-md text-center">{error}</p>
      </div>
    );
  }

  // ── Sin datos (sesión sin permisos o tabla vacía) ─────────────────────────
  if (stickersArray.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <span className="text-4xl">📭</span>
        <p className="text-gray-500">No se encontraron láminas. Verificá los permisos de la base de datos.</p>
      </div>
    );
  }

  // ── Vista principal ───────────────────────────────────────────────────────
  return (
    <div
      className="space-y-4"
      style={{ paddingBottom: selectedCodes.size > 0 ? "9rem" : undefined }}
    >

      {/* ── Título de la vista ────────────────────────────────────────── */}
      <div className="bg-[#0a0a14] rounded-xl px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black leading-tight" style={{ color: '#ffffff' }}>
            📋 Vista Matriz
          </h2>
          <p className="text-xs font-semibold mt-0.5" style={{ color: '#FFC72C' }}>
            FIFA World Cup 2026 · {stickersArray.length} láminas
          </p>
        </div>

        {/* Botón toggle modo cotización */}
        <button
          onClick={handleToggleQuoteMode}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all ${
            quoteMode
              ? "bg-[#FFC72C] text-black shadow-lg scale-105"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
          title={quoteMode ? "Salir del modo cotización" : "Activar modo cotización"}
        >
          💰 {quoteMode ? (selectedCodes.size > 0 ? `Cotizando (${quoteTotalUnits})` : "Cotizando") : "Cotizar"}
        </button>
      </div>

      {/* ── Resumen de inventario ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">

        {/* Contadores por estado */}
        <div className="flex gap-3 flex-wrap">
          <Chip label="Faltan"      value={counts.missing}   color="bg-gray-200 text-gray-700" />
          <Chip label="Disponibles" value={counts.available} color="bg-green-100 text-green-800" />
        </div>

        {/* Leyenda de colores */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <StatusLegend />
        </div>
      </div>

      {/* ── Secciones por grupo y equipo — orden canónico del álbum ──── */}
      {ALBUM_GROUP_ORDER.map((group) => {
        // Filtrar los equipos del grupo que tienen láminas cargadas
        const teamsInGroup = group.teams.filter((code) => stickersByTeam.has(code));
        if (teamsInGroup.length === 0) return null;

        return (
          <div key={group.label} className="space-y-2">
            {/* Encabezado de grupo */}
            <div className="flex items-center gap-3 pt-2">
              <span className="text-xs font-black text-gray-700 uppercase tracking-widest whitespace-nowrap bg-gray-200 px-2 py-0.5 rounded">
                {group.label}
              </span>
              <div className="flex-1 h-px bg-gray-300" />
            </div>

            {/* Un TeamSection por cada equipo del grupo */}
            {teamsInGroup.map((teamCode) => (
              <TeamSection
                key={teamCode}
                teamCode={teamCode}
                teamName={teamsMap[teamCode] ?? teamCode}
                stickers={stickersByTeam.get(teamCode)!}
                onRightClick={handleRightClick}
                // Modo cotización: pasar handlers solo cuando está activo
                onQuoteToggle={quoteMode ? quoteToggle : undefined}
                getQuoteQty={quoteMode ? getQuantity : undefined}
              />
            ))}
          </div>
        );
      })}

      {/* Cotización activa */}
      {quoteMode && selectedCodes.size > 0 && (
        <QuotePanel
          count={quoteTotalUnits}
          total={quoteTotal}
          whatsappText={whatsappText}
          onClear={() => { quoteClear(); setQuoteExpanded(false); }}
          expanded={quoteExpanded}
          onToggleExpand={() => setQuoteExpanded((v) => !v)}
        />
      )}

      {/* Menú contextual — se renderiza en document.body via Portal */}
      {contextMenu && (
        <StickerContextMenu
          sticker={contextMenu.sticker}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={handleCloseMenu}
          onUpdate={updateStickerFields}
          categoryPrices={categoryPrices}
          onUpdateCategoryPrice={updateCategoryPrice}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-componente auxiliar
// ---------------------------------------------------------------------------

/**
 * @description Chip de métrica para la barra de resumen.
 * @param props.label - Etiqueta descriptiva
 * @param props.value - Número a mostrar
 * @param props.color - Clases Tailwind de color de fondo/texto
 * @returns Elemento visual de métrica
 */
function Chip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`flex flex-col items-center px-3 py-1.5 rounded-lg ${color}`}>
      <span className="text-xl font-black leading-none">{value}</span>
      <span className="text-[10px] font-medium leading-tight opacity-75 mt-0.5">{label}</span>
    </div>
  );
}
