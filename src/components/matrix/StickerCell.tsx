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
   * @description Clic: abre el menú contextual con todas las opciones.
   * @param sticker - Lámina seleccionada
   * @param x       - Posición X del cursor (clientX)
   * @param y       - Posición Y del cursor (clientY)
   */
  onRightClick: (sticker: Sticker, x: number, y: number) => void;

  /**
   * @description Cuando se provee, activa el "modo cotización".
   * El clic izquierdo llama a esta función en vez de abrir el menú contextual.
   * El clic derecho sigue abriendo el menú contextual normalmente.
   * @param sticker - Lámina a agregar/quitar de la cotización
   */
  onQuoteToggle?: (sticker: Sticker) => void;

  /**
   * Cantidad actualmente seleccionada en la cotización (0 = no está).
   * Se usa para mostrar el badge de cantidad sobre la celda.
   */
  quoteQty?: number;
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
export function StickerCell({ sticker, onRightClick, onQuoteToggle, quoteQty = 0 }: StickerCellProps) {
  // Fallback defensivo: si el status no está en STATUS_META (dato legacy de DB),
  // tratar como "F" para no crashear el render
  const meta = STATUS_META[sticker.status] ?? STATUS_META["F"];

  // Derivar la categoría visual (auto o manual según campo categoria de la lámina)
  const category     = getStickerCategory(sticker);
  const categoryMeta = CATEGORY_META[category];

  /**
   * Color de la celda completa:
   * - Disponible (D): color de la categoría (teal, morado, rojo, etc.)
   *   El color de celda reemplaza al verde genérico — la categoría ES la señal visual.
   * - Falta (F): gris uniforme, sin importar la categoría.
   */
  const cellColor = sticker.status === "D" ? categoryMeta.cellColor : meta.color;

  /**
   * Punto de categoría en esquina sup-izq:
   * Solo se muestra cuando la lámina está en Falta (gris), para que el vendedor
   * igualmente sepa qué categoría es. Cuando está Disponible, la celda completa
   * ya muestra el color de la categoría y el punto sería redundante.
   */
  const showCategoryDot = sticker.status === "F" && category !== "BASICA";

  /**
   * @description Abre el menú contextual con la posición del cursor/toque.
   * Se usa tanto en clic izquierdo (mobile y desktop) como en clic derecho
   * (desktop), para que en mobile el tap abra el menú normalmente.
   * @param e - Evento de mouse/touch
   */
  /**
   * @description Clic izquierdo:
   * - Modo cotización (onQuoteToggle definido): agrega/quita de la cotización.
   * - Modo normal: abre el menú contextual.
   */
  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (onQuoteToggle) {
      onQuoteToggle(sticker);
    } else {
      onRightClick(sticker, e.clientX, e.clientY);
    }
  }

  /** Clic derecho siempre abre el menú contextual, incluso en modo cotización */
  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    onRightClick(sticker, e.clientX, e.clientY);
  }

  // El código corto es la parte después del prefijo del equipo
  // Ej: "MEX10" → "10", "FWC1" → "1", "CC14" → "14"
  const shortCode = sticker.code.replace(sticker.team, "");

  return (
    <button
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      title={
        // Formato limpio: "KOR9 — Myung-jae Lee"
        // Se elimina el prefijo de equipo del nombre (ej: "South Korea - ") porque
        // el contexto del equipo ya es visible en la sección de la matriz.
        sticker.name
          ? `${sticker.code} — ${
              sticker.name.includes(" - ")
                ? sticker.name.split(" - ").slice(1).join(" - ")
                : sticker.name
            }`
          : sticker.code
      }
      aria-label={`Lámina ${sticker.code}, estado ${meta.label}, categoría ${categoryMeta.label}. Toca para opciones.`}
      className={[
        "relative flex items-center justify-center",
        "w-10 h-10 rounded text-xs font-bold",
        "transition-all duration-150 cursor-pointer select-none",
        "hover:scale-110 hover:z-10 hover:shadow-md",
        "active:scale-95",
        "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400",
        cellColor,
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

      {/* Badge de cantidad en cotización — esquina superior-derecha, amarillo */}
      {quoteQty > 0 && (
        <span className="absolute top-0.5 right-0.5 bg-[#FFC72C] text-black text-[8px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
          {quoteQty > 9 ? "9+" : quoteQty}
        </span>
      )}
      {/* Badge de stock — esquina superior-derecha, naranja (solo cuando no hay badge de cotización) */}
      {quoteQty === 0 && sticker.quantity > 1 && (
        <span className="absolute top-0.5 right-0.5 bg-orange-500 text-white text-[8px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
          {sticker.quantity > 9 ? "9+" : sticker.quantity}
        </span>
      )}
    </button>
  );
}
