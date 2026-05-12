/**
 * @fileoverview Sección de un equipo en la Vista Matriz.
 * Agrupa todas las celdas de un equipo con su nombre, bandera (emoji)
 * y barra de progreso. Colapsable para manejar el espacio en pantalla.
 */

import { useState } from "react";
import { StickerCell } from "./StickerCell";
import { TEAM_FLAG } from "../../lib/albumOrder";
import type { Sticker } from "../../types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TeamSectionProps {
  teamCode: string;
  teamName: string;
  stickers: Sticker[];
  /** Clic derecho: abre el menú contextual en esas coordenadas */
  onRightClick: (sticker: Sticker, x: number, y: number) => void;
  /** Cuando se define, activa modo cotización en las celdas */
  onQuoteToggle?: (sticker: Sticker) => void;
  /** Retorna la cantidad en cotización de un código (0 = no está) */
  getQuoteQty?: (code: string) => number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

/**
 * @description Sección colapsable de un equipo dentro de la Vista Matriz.
 * Muestra: nombre + bandera, mini barra de progreso, y la cuadrícula de celdas.
 *
 * @param props.teamCode    - Sigla del equipo
 * @param props.teamName    - Nombre completo
 * @param props.stickers    - Láminas del equipo (pre-ordenadas)
 * @param props.onRightClick - Abre el menú contextual
 * @returns Sección con encabezado colapsable y cuadrícula de celdas
 */
export function TeamSection({ teamCode, teamName, stickers, onRightClick, onQuoteToggle, getQuoteQty }: TeamSectionProps) {
  /** Controla si la sección está expandida o colapsada */
  const [expanded, setExpanded] = useState(true);

  const flag = TEAM_FLAG[teamCode] ?? "🌐";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

      {/* ── Encabezado (clic para colapsar) ─────────────────────────────── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
        aria-expanded={expanded}
        aria-controls={`team-${teamCode}-grid`}
      >
        {/* Bandera */}
        <span className="text-2xl leading-none" aria-hidden="true">{flag}</span>

        {/* Nombre del equipo */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-gray-800 truncate">{teamName}</span>
              <span className="text-xs text-gray-400 font-mono flex-shrink-0">{teamCode}</span>
            </div>
          </div>

        {/* Ícono chevron */}
        <span
          className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ${
            expanded ? "" : "-rotate-90"
          }`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      {/* ── Cuadrícula de celdas ─────────────────────────────────────────── */}
      {expanded && (
        <div
          id={`team-${teamCode}-grid`}
          className="px-4 pb-4 pt-1 flex flex-wrap gap-1.5"
        >
          {stickers.map((sticker) => (
            <StickerCell
              key={sticker.code}
              sticker={sticker}
              onRightClick={onRightClick}
              onQuoteToggle={onQuoteToggle}
              quoteQty={getQuoteQty?.(sticker.code) ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
