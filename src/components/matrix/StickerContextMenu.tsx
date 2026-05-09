/**
 * @fileoverview Menú contextual de una lámina (clic derecho en la Vista Matriz).
 * Permite al vendedor establecer el estado de forma precisa sin ciclar:
 * - Falta / Disponible / Vendida → un solo clic
 * - Repetida → selector de cantidad (+/−) antes de confirmar
 *
 * Se renderiza via React Portal en document.body para no ser recortado
 * por los `overflow:hidden` de los contenedores padre.
 */

import { createPortal } from "react-dom";
import { useState, useEffect, useRef } from "react";
import type { Sticker, StickerStatus, StickerCategoryOverride } from "../../types";
import { STATUS_META, CATEGORY_META } from "../../types";
import { getStickerCategory } from "../../lib/stickerCategory";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StickerContextMenuProps {
  /** Lámina sobre la que se abrió el menú */
  sticker: Sticker;

  /** Posición horizontal del cursor en px (clientX) */
  x: number;

  /** Posición vertical del cursor en px (clientY) */
  y: number;

  /** Cierra el menú sin hacer cambios */
  onClose: () => void;

  /**
   * @description Aplica la actualización de estado/cantidad/categoria.
   * @param code    - Código de la lámina
   * @param fields  - Campos a actualizar
   */
  onUpdate: (
    code: string,
    fields: Partial<Pick<Sticker, "status" | "quantity" | "categoria">>
  ) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

/**
 * @description Menú flotante de opciones para una lámina específica.
 * Ajusta automáticamente su posición para no salirse del viewport.
 * Se cierra al hacer clic fuera o presionar Escape.
 *
 * @param props.sticker  - Lámina seleccionada
 * @param props.x        - Posición X del cursor
 * @param props.y        - Posición Y del cursor
 * @param props.onClose  - Callback para cerrar
 * @param props.onUpdate - Callback para aplicar cambios
 * @returns Portal con el menú contextual
 */
export function StickerContextMenu({
  sticker,
  x,
  y,
  onClose,
  onUpdate,
}: StickerContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  /**
   * Cantidad para la opción "Disponible".
   * Si ya está disponible, conservar la cantidad actual; si no, empezar en 1.
   */
  const [availableQty, setAvailableQty] = useState(
    sticker.status === "D" ? Math.max(sticker.quantity, 1) : 1
  );

  /** true mientras se espera respuesta de Supabase */
  const [isApplying, setIsApplying] = useState(false);

  /** Categoría actual derivada de la lámina (para mostrar estado activo en el menú) */
  const currentCategory = getStickerCategory(sticker);

  /**
   * Posición ajustada para no salirse del viewport.
   * Se calcula tras el primer render cuando ya conocemos el tamaño del menú.
   */
  const [pos, setPos] = useState({ top: y, left: x });

  // Ajustar posición al montar (después de que el DOM conozca el tamaño real)
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top  = y;
    let left = x;

    // Empujar hacia arriba si se sale por abajo
    if (top  + rect.height > vh - 8) top  = vh - rect.height - 8;
    // Empujar hacia la izquierda si se sale por la derecha
    if (left + rect.width  > vw - 8) left = vw - rect.width  - 8;
    // Asegurar que no se vaya más allá del borde superior/izquierdo
    if (top  < 8) top  = 8;
    if (left < 8) left = 8;

    setPos({ top, left });
  }, [x, y]);

  // Cerrar al hacer clic/toque fuera del menú
  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      // En TouchEvent, el target viene de changedTouches
      const target =
        e instanceof TouchEvent
          ? (e.changedTouches[0]?.target as Node | null)
          : (e.target as Node);
      if (menuRef.current && target && !menuRef.current.contains(target)) {
        onClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    // mousedown cubre desktop; touchstart cubre mobile
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  /**
   * @description Aplica el nuevo estado con la cantidad correspondiente.
   * - F → cantidad 0 (no la tengo)
   * - D → cantidad del selector (≥ 1, indica cuántas copias hay para vender)
   * @param status - Estado a aplicar
   */
  async function handleSelect(status: StickerStatus) {
    if (isApplying) return;
    setIsApplying(true);
    try {
      const qty = status === "F" ? 0 : availableQty;
      await onUpdate(sticker.code, { status, quantity: qty });
      onClose();
    } finally {
      setIsApplying(false);
    }
  }

  /**
   * @description Asigna o quita el override manual de categoría (TOP / GOAT / null).
   * null = volver a auto-derivado según equipo y número de código.
   * @param categoria - Categoría a asignar, o null para quitar el override
   */
  async function handleSetCategoria(categoria: StickerCategoryOverride | null) {
    if (isApplying) return;
    setIsApplying(true);
    try {
      await onUpdate(sticker.code, { categoria });
      onClose();
    } finally {
      setIsApplying(false);
    }
  }

  return createPortal(
    <div
      ref={menuRef}
      style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
      className="bg-white rounded-xl shadow-2xl border border-gray-200 w-64 overflow-hidden"
      // Evitar que el menú abra el context menu del navegador sobre sí mismo
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="px-3 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
        <span className="font-mono font-black text-gray-800 text-sm">{sticker.code}</span>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${(STATUS_META[sticker.status] ?? STATUS_META["F"]).color}`}
        >
          {(STATUS_META[sticker.status] ?? STATUS_META["F"]).label}
        </span>
        {/* Badge de categoría actual en el encabezado */}
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded font-bold ml-auto ${CATEGORY_META[currentCategory].bg} ${CATEGORY_META[currentCategory].text}`}
        >
          {CATEGORY_META[currentCategory].label}
        </span>
      </div>

      {/* ── Opciones ───────────────────────────────────────────────────── */}
      <div className="p-2 space-y-0.5">

        {/* Falta — no la tengo */}
        <StatusOption
          status="F"
          label="Falta"
          desc="No la tengo"
          isCurrent={sticker.status === "F"}
          isApplying={isApplying}
          onSelect={() => handleSelect("F")}
        />

        {/* Disponible — con selector de cantidad inline */}
        <div
          className={`rounded-lg border-2 transition-colors ${
            sticker.status === "D"
              ? "border-green-300 bg-green-50"
              : "border-transparent"
          }`}
        >
          <div className="flex items-center gap-1.5 px-2 py-1.5">
            {/* Botón principal de la opción */}
            <button
              onClick={() => handleSelect("D")}
              disabled={isApplying}
              className="flex-1 flex items-center gap-2 disabled:opacity-50 text-left"
            >
              <span className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800 leading-tight">Disponible</p>
                <p className="text-xs text-gray-400 leading-tight">Tengo para vender</p>
              </div>
              {sticker.status === "D" && (
                <span className="ml-auto text-xs text-gray-400">actual</span>
              )}
            </button>

            {/* Selector de cantidad +/−
                onMouseDown stopPropagation evita que el listener de document
                interprete el clic como "fuera del menú" y lo cierre. */}
            <div
              className="flex items-center border border-green-200 rounded-lg bg-white overflow-hidden flex-shrink-0"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAvailableQty((q) => Math.max(1, q - 1));
                }}
                disabled={isApplying}
                className="w-6 h-7 flex items-center justify-center text-green-700 hover:bg-green-50 font-bold text-base leading-none disabled:opacity-40"
                aria-label="Reducir cantidad"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={99}
                value={availableQty}
                onChange={(e) =>
                  setAvailableQty(
                    Math.max(1, Math.min(99, parseInt(e.target.value) || 1))
                  )
                }
                onClick={(e) => e.stopPropagation()}
                className="w-8 text-center text-sm font-bold text-gray-800 border-none outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                aria-label="Cantidad disponible"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAvailableQty((q) => Math.min(99, q + 1));
                }}
                disabled={isApplying}
                className="w-6 h-7 flex items-center justify-center text-green-700 hover:bg-green-50 font-bold text-base leading-none disabled:opacity-40"
                aria-label="Aumentar cantidad"
              >
                +
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ── Sección de categoría especial ─────────────────────────────── */}
      <div className="px-2 pb-2 border-t border-gray-100 pt-2">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1 mb-1">
          Categoría especial
        </p>
        <div className="flex gap-1">

          {/* Botón TOP */}
          <button
            onClick={() =>
              handleSetCategoria(sticker.categoria === "TOP" ? null : "TOP")
            }
            disabled={isApplying}
            className={[
              "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold transition-all",
              "disabled:opacity-50",
              sticker.categoria === "TOP"
                ? "bg-purple-500 text-white ring-2 ring-purple-300"
                : "bg-purple-50 text-purple-700 hover:bg-purple-100",
            ].join(" ")}
            title={sticker.categoria === "TOP" ? "Quitar TOP" : "Marcar como TOP"}
          >
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${CATEGORY_META.TOP.dot}`} />
            ⭐ TOP
            {sticker.categoria === "TOP" && (
              <span className="text-[9px] opacity-80">✕ quitar</span>
            )}
          </button>

          {/* Botón GOAT */}
          <button
            onClick={() =>
              handleSetCategoria(sticker.categoria === "GOAT" ? null : "GOAT")
            }
            disabled={isApplying}
            className={[
              "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold transition-all",
              "disabled:opacity-50",
              sticker.categoria === "GOAT"
                ? "bg-yellow-400 text-yellow-900 ring-2 ring-yellow-300"
                : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100",
            ].join(" ")}
            title={sticker.categoria === "GOAT" ? "Quitar GOAT" : "Marcar como GOAT"}
          >
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${CATEGORY_META.GOAT.dot}`} />
            🐐 GOAT
            {sticker.categoria === "GOAT" && (
              <span className="text-[9px] opacity-80">✕ quitar</span>
            )}
          </button>

        </div>
      </div>

      {/* Spinner de carga mientras aplica */}
      {isApplying && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-xl">
          <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Sub-componente: opción de estado simple (sin quantity)
// ---------------------------------------------------------------------------

interface StatusOptionProps {
  status: StickerStatus;
  label: string;
  desc: string;
  isCurrent: boolean;
  isApplying: boolean;
  onSelect: () => void;
}

/** Colores del punto indicador por estado */
const DOT_COLORS: Record<StickerStatus, string> = {
  F: "bg-gray-400",
  D: "bg-green-500",
};

/**
 * @description Botón de opción de estado para el menú contextual.
 * @param props.status    - Estado que representa
 * @param props.label     - Nombre del estado
 * @param props.desc      - Descripción corta
 * @param props.isCurrent - true si es el estado actual de la lámina
 * @param props.isApplying - true mientras hay operación en vuelo
 * @param props.onSelect  - Callback al hacer clic
 * @returns Botón de opción estilizado
 */
function StatusOption({
  status,
  label,
  desc,
  isCurrent,
  isApplying,
  onSelect,
}: StatusOptionProps) {
  return (
    <button
      onClick={onSelect}
      disabled={isApplying}
      className={[
        "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left",
        "transition-colors disabled:opacity-50",
        isCurrent
          ? "bg-gray-100 ring-1 ring-gray-300"
          : "hover:bg-gray-50",
      ].join(" ")}
    >
      <span className={`w-3 h-3 rounded-full flex-shrink-0 ${DOT_COLORS[status]}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 leading-tight">{label}</p>
        <p className="text-xs text-gray-400 leading-tight">{desc}</p>
      </div>
      {isCurrent && (
        <span className="text-[10px] text-gray-400 flex-shrink-0">actual</span>
      )}
    </button>
  );
}
