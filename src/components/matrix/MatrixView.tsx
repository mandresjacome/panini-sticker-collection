/**
 * @fileoverview Vista Matriz — vista principal de la colección.
 * Cuadrícula de 994 láminas agrupadas por equipo.
 * Clic izquierdo: toggle rápido F↔D.
 * Clic derecho: menú contextual con todos los estados + selector de cantidad.
 */

import { useMemo, useState, useCallback } from "react";
import { useStickers } from "../../hooks/useStickers";
import { useTeams } from "../../hooks/useTeams";
import { TeamSection } from "./TeamSection";
import { StickerContextMenu } from "./StickerContextMenu";
import { ALBUM_GROUP_ORDER } from "../../lib/albumOrder";
import { STATUS_META } from "../../types";
import type { Sticker, StickerStatus } from "../../types";

// ---------------------------------------------------------------------------
// Componente de leyenda
// ---------------------------------------------------------------------------

/**
 * @description Leyenda de colores del estado de las láminas.
 * @returns Fila de chips con cada estado y su color
 */
function StatusLegend() {
  // Excluir Vendida (V) — no se usa en el flujo de venta actual
  const entries = (Object.entries(STATUS_META) as [StickerStatus, (typeof STATUS_META)[StickerStatus]][])
    .filter(([status]) => status !== "V");
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-xs text-gray-500 font-medium mr-1">Estados:</span>
      {entries.map(([status, meta]) => (
        <span
          key={status}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${meta.color}`}
        >
          <span className="font-mono">{status}</span>
          <span className="opacity-75">·</span>
          {meta.label}
        </span>
      ))}
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
    <div className="space-y-4">

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
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">
                {group.label}
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Un TeamSection por cada equipo del grupo */}
            {teamsInGroup.map((teamCode) => (
              <TeamSection
                key={teamCode}
                teamCode={teamCode}
                teamName={teamsMap[teamCode] ?? teamCode}
                stickers={stickersByTeam.get(teamCode)!}
                onRightClick={handleRightClick}
              />
            ))}
          </div>
        );
      })}

      {/* Menú contextual — se renderiza en document.body via Portal */}
      {contextMenu && (
        <StickerContextMenu
          sticker={contextMenu.sticker}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={handleCloseMenu}
          onUpdate={updateStickerFields}
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
