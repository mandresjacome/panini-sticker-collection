/**
 * @fileoverview Celda individual de la Vista Matriz.
 * Muestra el código de la lámina con color según estado,
 * un punto de categoría en la esquina superior izquierda,
 * y dispara el menú contextual al hacer clic.
 */

import { STATUS_META, CATEGORY_META } from "../../types";
import { getStickerCategory } from "../../lib/stickerCategory";
import type { Sticker } from "../../types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StickerCellProps {
  /** Lámina a representar en esta celda */
  sticker: Sticker;

  /**
   * @description Clic derecho: abre el menú contextual con todas las opciones.
   * @param sticker - Lámina seleccionada
   * @param x       - Posición X del cursor (clientX)
   * @param y       - Posición Y del cursor (clientY)
   */
  onRightClick: (sticker: Sticker, x: number, y: number) => void;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

/**
 * @description Celda de la cuadrícula que representa una lámina individual.
 * - Clic derecho: abre menú contextual con todos los estados + selector de cantidad.
 * - Color de fondo según estado (STATUS_META).
 * - Punto de color en esquina sup-izq según categoría (CATEGORY_META).
 * - Badge de cantidad cuando hay más de 1 copia.
 *
 * @param props.sticker      - La lámina a renderizar
 * @param props.onRightClick - Abre el menú contextual
 * @returns Elemento <button> con color, código y punto de categoría
 */
export function StickerCell({ sticker, onRightClick }: StickerCellProps) {
  // Fallback defensivo: si el status no está en STATUS_META (dato legacy de DB),
  // tratar como "F" para no crashear el render
  const meta = STATUS_META[sticker.status] ?? STATUS_META["F"];

  // Derivar la categoría visual (auto o manual según campo categoria de la lámina)
  const category     = getStickerCategory(sticker);
  const categoryMeta = CATEGORY_META[category];

  // No mostramos el punto en láminas básicas para no saturar la vista —
  // solo en categorías que aportan información diferencial
  const showCategoryDot = category !== "BASICA";

  /**
   * @description Abre el menú contextual con la posición del cursor/toque.
   * Se usa tanto en clic izquierdo (mobile y desktop) como en clic derecho
   * (desktop), para que en mobile el tap abra el menú normalmente.
   * @param e - Evento de mouse/touch
   */
  function handleOpen(e: React.MouseEvent) {
    e.preventDefault();
    onRightClick(sticker, e.clientX, e.clientY);
  }

  // El código corto es la parte después del prefijo del equipo
  // Ej: "MEX10" → "10", "FWC1" → "1", "CC14" → "14"
  const shortCode = sticker.code.replace(sticker.team, "");

  return (
    <button
      onClick={handleOpen}
      onContextMenu={handleOpen}
      title={`${sticker.code} — ${meta.label} · ${categoryMeta.label}${sticker.quantity > 1 ? ` (x${sticker.quantity})` : ""}\nToca para cambiar estado`}
      aria-label={`Lámina ${sticker.code}, estado ${meta.label}, categoría ${categoryMeta.label}. Toca para opciones.`}
      className={[
        "relative flex items-center justify-center",
        "w-10 h-10 rounded text-xs font-bold",
        "transition-all duration-150 cursor-pointer select-none",
        "hover:scale-110 hover:z-10 hover:shadow-md",
        "active:scale-95",
        "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400",
        meta.color,
      ].join(" ")}
    >
      {shortCode}

      {/* Punto de categoría — esquina superior izquierda, solo en categorías especiales */}
      {showCategoryDot && (
        <span
          className={`absolute top-0.5 left-0.5 w-2 h-2 rounded-full ${categoryMeta.dot}`}
          aria-hidden="true"
        />
      )}

      {/* Badge de cantidad — pegado al borde interior superior-derecho */}
      {sticker.quantity > 1 && (
        <span className="absolute top-0.5 right-0.5 bg-orange-500 text-white text-[8px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
          {sticker.quantity > 9 ? "9+" : sticker.quantity}
        </span>
      )}
    </button>
  );
}
