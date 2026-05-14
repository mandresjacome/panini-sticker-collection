/**
 * @fileoverview Panel flotante de cotización — compartido entre CatalogView y MatrixView.
 * Aparece en la parte inferior de la pantalla cuando hay láminas seleccionadas.
 * Permite expandirlo para ver el detalle, copiar el texto y enviar por WhatsApp.
 */

import { useState } from "react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * @description Props del panel flotante de cotización.
 */
export interface QuotePanelProps {
  /** Total de unidades seleccionadas (suma de cantidades, no códigos únicos) */
  count: number;
  /** Suma total de precios (precio_unitario × qty para cada línea) */
  total: number;
  /** Texto pre-formateado para WhatsApp */
  whatsappText: string;
  /** Callback para vaciar la cotización */
  onClear: () => void;
  /** Si el panel está expandido mostrando el detalle */
  expanded: boolean;
  /** Callback para colapsar/expandir */
  onToggleExpand: () => void;  /**
   * Cuando false oculta el total económico en la barra y en el detalle.
   * Usado para inventario AM (Anny/Mario) cuyo sistema de precios es diferente.
   * @default true
   */
  showPrices?: boolean;}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

/**
 * @description Panel flotante sticky en la parte inferior que resume la cotización activa.
 * - Barra resumen siempre visible (count + total).
 * - Expandible para ver el mensaje pre-armado.
 * - Botón WhatsApp abre chat directo con el vendedor (+57 316 6590476).
 * - Botón Copiar copia el texto al portapapeles.
 * - Botón Limpiar vacía la selección.
 *
 * @param props.count          - Unidades totales seleccionadas
 * @param props.total          - Monto total de la cotización
 * @param props.whatsappText   - Mensaje pre-formateado
 * @param props.onClear        - Vacía la selección
 * @param props.expanded       - Estado de expansión del panel
 * @param props.onToggleExpand - Alterna expansión
 * @returns Panel flotante pegado al fondo de la pantalla
 */
export function QuotePanel({
  count,
  total,
  whatsappText,
  onClear,
  expanded,
  onToggleExpand,
  showPrices = true,
}: QuotePanelProps) {
  /** Feedback visual de "copiado al portapapeles" */
  const [copied, setCopied] = useState(false);

  /**
   * @description Copia el texto de la cotización al portapapeles del dispositivo.
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(whatsappText);
      setCopied(true);
      // Resetear el feedback después de 2 segundos
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback silencioso — el clipboard puede no estar disponible en algunos contextos
    }
  };

  /**
   * URL de WhatsApp con número del vendedor fijo y mensaje pre-cargado.
   * Número: +57 316 6590476 (sin espacios ni guiones para la URL).
   */
  const waUrl = `https://wa.me/573166590476?text=${encodeURIComponent(whatsappText)}`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div
        className="w-full max-w-5xl mx-0 sm:mx-4 sm:mb-4 pointer-events-auto
                   bg-[#0a0a14] border border-[#FFC72C]/40 sm:rounded-2xl
                   shadow-2xl overflow-hidden"
      >
        {/* ── Barra resumen — siempre visible ──────────────────────────── */}
        <button
          onClick={onToggleExpand}
          className="w-full flex items-center justify-between px-5 py-3.5
                     hover:bg-white/5 transition-colors"
          aria-expanded={expanded}
          aria-label="Ver detalle de cotización"
        >
          <div className="flex items-center gap-3">
            <span className="text-[#FFC72C] font-black text-lg">🛒</span>
            <span className="text-white font-bold">
              {count} lámina{count !== 1 ? "s" : ""}
            </span>
            {showPrices && total > 0 && (
              <span className="text-[#FFC72C] font-black text-lg">
                ${total.toLocaleString("es-CO")}
              </span>
            )}
          </div>
          <span className="text-gray-400 text-xs">{expanded ? "▼" : "▲"}</span>
        </button>

        {/* ── Detalle expandible ────────────────────────────────────────── */}
        {expanded && (
          <div className="border-t border-white/10 px-5 py-4 space-y-4">
            {/* Vista previa del mensaje */}
            <div className="bg-white/5 rounded-xl p-4 max-h-48 overflow-y-auto">
              <pre className="text-gray-300 text-xs whitespace-pre-wrap font-mono leading-relaxed">
                {whatsappText}
              </pre>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3 flex-wrap">
              {/* Botón WhatsApp — solo para inventario CN (Nicolás/Cristian).
                  AM (Anny/Mario) tiene un flujo de venta diferente sin cotización por WA. */}
              {showPrices && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-0 flex items-center justify-center gap-2
                             bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold
                             py-3 px-4 rounded-xl transition-colors text-sm"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </a>
              )}

              {/* Copiar al portapapeles */}
              <button
                onClick={handleCopy}
                className="flex items-center justify-center gap-2
                           bg-white/10 hover:bg-white/20 text-white font-bold
                           py-3 px-4 rounded-xl transition-colors text-sm"
              >
                {copied ? "✅ Copiado" : "📋 Copiar"}
              </button>

              {/* Limpiar selección */}
              <button
                onClick={onClear}
                className="flex items-center justify-center
                           bg-red-500/20 hover:bg-red-500/40 text-red-400 font-bold
                           py-3 px-4 rounded-xl transition-colors text-sm"
                aria-label="Limpiar cotización"
              >
                🗑️
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
