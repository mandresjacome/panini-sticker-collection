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
import type { Sticker, StickerStatus, StickerCategoryOverride, StickerCategory, CategoryPricesMap } from "../../types";
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
   * @description Aplica la actualización de estado/cantidad/categoria/precio.
   * @param code    - Código de la lámina
   * @param fields  - Campos a actualizar
   */
  onUpdate: (
    code: string,
    fields: Partial<Pick<Sticker, "status" | "quantity" | "categoria" | "precio">>
  ) => Promise<void>;

  /**
   * Mapa de precio base por cada categoría.
   * Se usa como fallback cuando la lámina no tiene precio individual.
   */
  categoryPrices: CategoryPricesMap;

  /**
   * @description Actualiza el precio default de una categoría completa.
   * Afecta a todas las láminas de esa categoría que no tengan precio propio.
   * @param category - Categoría a actualizar
   * @param price    - Nuevo precio base en pesos COP
   */
  onUpdateCategoryPrice: (category: StickerCategory, price: number) => Promise<void>;
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
 * @param props.onUpdate - Callback para aplicar cambios de estado/cantidad/categoria/precio
 * @param props.categoryPrices        - Mapa de precio base por categoría
 * @param props.onUpdateCategoryPrice - Callback para cambiar el precio default de una categoría
 * @returns Portal con el menú contextual
 */
export function StickerContextMenu({
  sticker,
  x,
  y,
  onClose,
  onUpdate,
  categoryPrices,
  onUpdateCategoryPrice,
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

  // ── Estado de precio ────────────────────────────────────────────────────
  // true si la lámina tiene un precio individual distinto al default de su categoría
  const hasOverride = sticker.precio !== null && sticker.precio !== undefined;

  // Precio efectivo: propio de la lámina si existe, o el default de la categoría
  const effectivePrice = hasOverride
    ? sticker.precio!
    : (categoryPrices[currentCategory] ?? 0);

  /**
   * Input de precio individual.
   * Vacío ("") significa "sin override — usar default de la categoría".
   * Se pre-rellena con el override actual si existe.
   */
  const [stickerPriceInput, setStickerPriceInput] = useState(
    hasOverride ? String(sticker.precio) : ""
  );

  /** Input de precio default de la categoría actual */
  const [catPriceInput, setCatPriceInput] = useState(
    String(categoryPrices[currentCategory] ?? 0)
  );

  /** true mientras hay una operación de precio en vuelo */
  const [isPriceApplying, setIsPriceApplying] = useState(false);

  /**
   * @description Guarda el precio individual de esta lámina (override).
   * No cierra el menú para que el usuario pueda seguir ajustando.
   */
  async function handleSaveStickerPrice() {
    const price = parseInt(stickerPriceInput, 10);
    if (isNaN(price) || price < 0 || isPriceApplying) return;
    setIsPriceApplying(true);
    try {
      await onUpdate(sticker.code, { precio: price });
    } finally {
      setIsPriceApplying(false);
    }
  }

  /**
   * @description Borra el override individual y vuelve al precio default de la categoría.
   * Establece `precio = null` en la DB.
   */
  async function handleResetStickerPrice() {
    if (isPriceApplying) return;
    setIsPriceApplying(true);
    try {
      await onUpdate(sticker.code, { precio: null });
      // Limpiar el input para reflejar que ahora usa el default
      setStickerPriceInput("");
    } finally {
      setIsPriceApplying(false);
    }
  }

  /**
   * @description Guarda el nuevo precio default de toda la categoría.
   * Afecta a TODAS las láminas de esa categoría que no tengan precio propio.
   * No cierra el menú.
   */
  async function handleSaveCatPrice() {
    const price = parseInt(catPriceInput, 10);
    if (isNaN(price) || price < 0 || isPriceApplying) return;
    setIsPriceApplying(true);
    try {
      await onUpdateCategoryPrice(currentCategory, price);
    } finally {
      setIsPriceApplying(false);
    }
  }

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

      {/* ── Sección de precio ─────────────────────────────────────── */}
      <div className="px-2 pb-2 border-t border-gray-100 pt-2">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1 mb-2">
          💲 Precio
        </p>

        {/* Precio de esta lámina (override individual) */}
        <div className="mb-2">
          <p className="text-[10px] text-gray-500 px-1 mb-1 flex items-center gap-1">
            Esta lámina
            {hasOverride
              ? <span className="text-blue-500 font-bold">(personalizado)</span>
              : <span className="text-gray-400">(default {CATEGORY_META[currentCategory].label})</span>
            }
          </p>
          <div
            className="flex items-center gap-1"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <span className="text-xs text-gray-500 pl-1 flex-shrink-0">$</span>
            <input
              type="number"
              min={0}
              value={stickerPriceInput}
              onChange={(e) => setStickerPriceInput(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder={String(effectivePrice)}
              className="flex-1 text-sm font-bold text-gray-800 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-blue-400 min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label="Precio individual de esta lámina"
            />
            {/* Guardar precio individual */}
            <button
              onClick={(e) => { e.stopPropagation(); handleSaveStickerPrice(); }}
              disabled={isPriceApplying || stickerPriceInput === "" || parseInt(stickerPriceInput, 10) === sticker.precio}
              className="px-2 py-1 text-xs font-bold rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 flex-shrink-0"
              title="Guardar precio para esta lámina"
            >
              💾
            </button>
            {/* Botón reset: solo visible cuando hay override — vuelve al default */}
            {hasOverride && (
              <button
                onClick={(e) => { e.stopPropagation(); handleResetStickerPrice(); }}
                disabled={isPriceApplying}
                className="px-2 py-1 text-xs font-bold rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 flex-shrink-0"
                title="Volver al precio default de la categoría"
              >
                ↩
              </button>
            )}
          </div>
        </div>

        {/* Precio default de la categoría — editable, afecta a todas sus láminas */}
        <div>
          <p className="text-[10px] text-gray-500 px-1 mb-1">
            Default <span className={`font-bold ${CATEGORY_META[currentCategory].text}`}>{CATEGORY_META[currentCategory].label}</span>
          </p>
          <div
            className="flex items-center gap-1"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <span className="text-xs text-gray-500 pl-1 flex-shrink-0">$</span>
            <input
              type="number"
              min={0}
              value={catPriceInput}
              onChange={(e) => setCatPriceInput(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 text-sm font-bold text-gray-800 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-yellow-400 min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label={`Precio default para todas las láminas ${CATEGORY_META[currentCategory].label}`}
            />
            {/* Guardar precio de categoría */}
            <button
              onClick={(e) => { e.stopPropagation(); handleSaveCatPrice(); }}
              disabled={
                isPriceApplying ||
                catPriceInput === "" ||
                parseInt(catPriceInput, 10) === (categoryPrices[currentCategory] ?? 0)
              }
              className="px-2 py-1 text-xs font-bold rounded-lg bg-yellow-400 text-yellow-900 hover:bg-yellow-500 disabled:opacity-40 flex-shrink-0"
              title={`Cambiar el precio base para TODAS las ${CATEGORY_META[currentCategory].label}`}
            >
              💾
            </button>
          </div>
          {/* Aviso de alcance: el usuario sabe que afecta a toda la categoría */}
          <p className="text-[9px] text-gray-400 px-1 mt-0.5">
            Aplica a todas las {CATEGORY_META[currentCategory].label.toLowerCase()} sin precio propio
          </p>
        </div>

        {/* Spinner de precio en vuelo */}
        {isPriceApplying && (
          <div className="flex items-center gap-1.5 mt-1.5 px-1">
            <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <span className="text-[10px] text-blue-500">Guardando precio…</span>
          </div>
        )}
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
