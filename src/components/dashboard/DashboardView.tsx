/**
 * @fileoverview Vista Dashboard — Métricas de venta en tiempo real.
 *
 * Enfocada en el vendedor, no en el coleccionista.
 * Ruta: /admin/dashboard
 */

import { useMemo, useState, useCallback } from "react";
import { useStickers } from "../../hooks/useStickers";
import { useTeams } from "../../hooks/useTeams";
import { useCategoryPrices } from "../../hooks/useCategoryPrices";
import { ALBUM_GROUP_ORDER, TEAM_GROUP_LABEL, TEAM_FLAG } from "../../lib/albumOrder";
import { exportAvailableStickersToExcel } from "../../lib/exportUtils";
import { getStickerCategory } from "../../lib/stickerCategory";
import { CATEGORY_META } from "../../types";
import type { Sticker, StickerCategory } from "../../types";

function MetricCard({ icon, value, label, colorClass, subtitle }: {
  icon: string; value: number | string; label: string; colorClass: string; subtitle?: string;
}) {
  // Valores monetarios largos se reducen a text-2xl para no desbordar en mobile
  const valueStr = String(value);
  const valueSizeClass = valueStr.length > 8 ? "text-2xl" : "text-3xl";
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-1 shadow-sm min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-2xl leading-none shrink-0">{icon}</span>
        <span className={`${valueSizeClass} font-black tabular-nums ${colorClass} truncate`}>{value}</span>
      </div>
      <p className="text-sm font-semibold text-gray-700 leading-tight">{label}</p>
      {subtitle && <p className="text-xs text-gray-400 break-words">{subtitle}</p>}
    </div>
  );
}

interface TeamSaleStats { code: string; name: string; group: string; available: number; units: number; }
interface GroupStats { label: string; units: number; max: number; }

export function DashboardView() {
  const { stickersArray, isLoading, error } = useStickers();
  const { teamsMap, teamsLoading } = useTeams();
  const { categoryPrices } = useCategoryPrices();

  /** Controla el spinner del botón mientras se genera el Excel */
  const [isExporting, setIsExporting] = useState(false);

  /** Mensaje de error temporal si la exportación falla */
  const [exportError, setExportError] = useState<string | null>(null);

  /**
   * @description Dispara la exportación a Excel.
   * Usa setTimeout(0) para ceder el hilo al navegador y que el spinner
   * se renderice antes de que XLSX bloquee el hilo generando el archivo.
   */
  const handleExport = useCallback(() => {
    setIsExporting(true);
    setExportError(null);

    // Ceder el hilo un tick para que React re-renderice el spinner
    setTimeout(() => {
      try {
        // Pasa los precios reales de Supabase para que el Excel refleje los valores actuales
        exportAvailableStickersToExcel(stickersArray, categoryPrices);
      } catch (err) {
        setExportError(err instanceof Error ? err.message : "Error al exportar");
      } finally {
        setIsExporting(false);
      }
    }, 0);
  }, [stickersArray]);

  const availableStickers: Sticker[] = useMemo(
    () => stickersArray.filter((s) => s.status === "D"),
    [stickersArray]
  );

  const codigosEnStock = availableStickers.length;

  const unidadesTotales = useMemo(
    () => availableStickers.reduce((sum, s) => sum + s.quantity, 0),
    [availableStickers]
  );

  const topSticker = useMemo(() => {
    if (availableStickers.length === 0) return null;
    return availableStickers.reduce((max, s) => (s.quantity > max.quantity ? s : max));
  }, [availableStickers]);

  const top10: Sticker[] = useMemo(
    () => [...availableStickers].sort((a, b) => b.quantity - a.quantity).slice(0, 10),
    [availableStickers]
  );

  const teamStats: TeamSaleStats[] = useMemo(() => {
    const map: Record<string, Sticker[]> = {};
    for (const s of availableStickers) {
      if (!map[s.team]) map[s.team] = [];
      map[s.team].push(s);
    }
    return Object.entries(map)
      .map(([code, stickers]) => ({
        code,
        name: teamsMap[code] ?? code,
        group: TEAM_GROUP_LABEL[code] ?? "—",
        available: stickers.length,
        units: stickers.reduce((sum, s) => sum + s.quantity, 0),
      }))
      .sort((a, b) => b.units - a.units);
  }, [availableStickers, teamsMap]);

  const topTeam = teamStats[0] ?? null;

  /**
   * @description Valor total del inventario disponible.
   * Suma precio_efectivo × cantidad para cada lámina en stock.
   * El precio efectivo usa el override individual si existe, o el default de categoría.
   */
  const valorTotal = useMemo(() => {
    return availableStickers.reduce((sum, s) => {
      const cat   = getStickerCategory(s);
      const price = (s.precio !== null && s.precio !== undefined)
        ? s.precio
        : (categoryPrices[cat] ?? 0);
      return sum + price * s.quantity;
    }, 0);
  }, [availableStickers, categoryPrices]);

  /**
   * @description Precio promedio por unidad de todo el stock disponible.
   * valorTotal ÷ unidadesTotales. Indica cuánto vale en promedio cada lámina.
   */
  const ticketPromedio = unidadesTotales > 0
    ? Math.round(valorTotal / unidadesTotales)
    : 0;

  /**
   * @description Lámina con mayor valor total (precio × cantidad).
   * Indica dónde está concentrado el mayor valor del inventario.
   */
  const laminaMasValiosa = useMemo(() => {
    if (availableStickers.length === 0) return null;
    return availableStickers.reduce((max, s) => {
      const catMax  = getStickerCategory(max);
      const catS    = getStickerCategory(s);
      const priceMax = (max.precio !== null && max.precio !== undefined) ? max.precio : (categoryPrices[catMax] ?? 0);
      const priceS   = (s.precio   !== null && s.precio   !== undefined) ? s.precio   : (categoryPrices[catS]   ?? 0);
      return (priceS * s.quantity) > (priceMax * max.quantity) ? s : max;
    });
  }, [availableStickers, categoryPrices]);

  /**
   * @description Estadísticas agrupadas por categoría de lámina.
   * Ordenadas de mayor a menor valor total para identificar las categorías más rentables.
   */
  const categoryStats = useMemo(() => {
    const map: Record<string, { count: number; units: number; valor: number }> = {};
    for (const s of availableStickers) {
      const cat   = getStickerCategory(s) as StickerCategory;
      const price = (s.precio !== null && s.precio !== undefined)
        ? s.precio
        : (categoryPrices[cat] ?? 0);
      if (!map[cat]) map[cat] = { count: 0, units: 0, valor: 0 };
      map[cat].count += 1;
      map[cat].units += s.quantity;
      map[cat].valor += price * s.quantity;
    }
    return Object.entries(map)
      .map(([cat, stats]) => ({ cat: cat as StickerCategory, ...stats }))
      .sort((a, b) => b.valor - a.valor);
  }, [availableStickers, categoryPrices]);

  const groupStats: GroupStats[] = useMemo(() => {
    const unitsByTeam: Record<string, number> = {};
    for (const s of availableStickers) {
      unitsByTeam[s.team] = (unitsByTeam[s.team] ?? 0) + s.quantity;
    }
    const stats: GroupStats[] = ALBUM_GROUP_ORDER.map((g) => ({
      label: g.label,
      units: g.teams.reduce((sum, code) => sum + (unitsByTeam[code] ?? 0), 0),
      max: 0,
    }));
    const maxUnits = Math.max(...stats.map((g) => g.units), 1);
    return stats.map((g) => ({ ...g, max: maxUnits }));
  }, [availableStickers]);

  if (isLoading || teamsLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-4 border-[#FFC72C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center text-red-500 text-sm">
        Error al cargar métricas: {String(error)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Título de la vista + botón exportar ──────────────────────────── */}
      <div className="bg-[#0a0a14] rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-black leading-tight" style={{ color: '#ffffff' }}>
            📊 Dashboard de Ventas
          </h2>
          <p className="text-xs font-semibold mt-0.5" style={{ color: '#FFC72C' }}>
            Métricas en tiempo real · enfocado en tu stock disponible
          </p>
        </div>

        {/* Botón de exportación — deshabilitado sin stock o mientras exporta */}
        <button
          onClick={handleExport}
          disabled={isExporting || codigosEnStock === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all
            disabled:opacity-40 disabled:cursor-not-allowed
            bg-[#FFC72C] text-[#0a0a14] hover:bg-yellow-300 active:scale-95"
          title={codigosEnStock === 0 ? "No hay láminas disponibles" : "Exportar láminas disponibles a Excel"}
        >
          {isExporting ? (
            // Spinner mientras se genera el archivo
            <>
              <span className="w-4 h-4 border-2 border-[#0a0a14] border-t-transparent rounded-full animate-spin inline-block" />
              <span>Generando…</span>
            </>
          ) : (
            <>
              <span>📥</span>
              <span>Exportar Excel</span>
            </>
          )}
        </button>
      </div>

      {/* Mensaje de error de exportación — se auto-oculta implícitamente al reintentar */}
      {exportError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
          ⚠️ {exportError}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetricCard icon="🏷️" value={codigosEnStock} label="Códigos en stock" colorClass="text-green-600" subtitle="Láminas distintas disponibles" />
        <MetricCard icon="📦" value={unidadesTotales} label="Unidades totales" colorClass="text-blue-600" subtitle="Copias físicas para vender" />
        <MetricCard icon="🔥" value={topSticker ? topSticker.code : "—"} label="Lámina más repetida" colorClass="text-orange-500" subtitle={topSticker ? `${topSticker.quantity} copias disponibles` : "Sin stock"} />
        <MetricCard icon="⭐" value={topTeam ? `${TEAM_FLAG[topTeam.code] ?? ""} ${topTeam.code}` : "—"} label="Equipo con más stock" colorClass="text-purple-600" subtitle={topTeam ? `${topTeam.units} unidades · ${topTeam.available} códigos` : "Sin stock"} />
        {/* Nuevas métricas de valor */}
        <MetricCard
          icon="💰"
          value={`$${valorTotal.toLocaleString("es-CO")}`}
          label="Valor total del inventario"
          colorClass="text-emerald-600"
          subtitle="Precio × cantidad de todo el stock"
        />
        <MetricCard
          icon="📈"
          value={ticketPromedio > 0 ? `$${ticketPromedio.toLocaleString("es-CO")}` : "—"}
          label="Ticket promedio"
          colorClass="text-cyan-600"
          subtitle={
            laminaMasValiosa
              ? (() => {
                  // Limpia prefijo de equipo y sufijos redundantes para que quepa en mobile
                  const rawName = laminaMasValiosa.name
                    ?.replace(/^[^-]+ - /, "")
                    .replace(/\s*\(FOIL\)/gi, "")
                    .replace(/\s*\(Extra Sticker - Gold\)/gi, "")
                    .replace(/\s*\(Variant\)/gi, "")
                    .trim() ?? "";
                  const cat   = getStickerCategory(laminaMasValiosa) as StickerCategory;
                  const price = (laminaMasValiosa.precio !== null && laminaMasValiosa.precio !== undefined)
                    ? laminaMasValiosa.precio
                    : (categoryPrices[cat] ?? 0);
                  // Truncar el nombre a 22 caracteres para no desbordarse en mobile
                  const shortName = rawName.length > 22 ? rawName.slice(0, 20) + "…" : rawName;
                  return `🏆 ${laminaMasValiosa.code}${shortName ? ` — ${shortName}` : ""} · $${(price * laminaMasValiosa.quantity).toLocaleString("es-CO")}`;
                })()
              : "Por unidad vendida"
          }
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800">🔥 Top 10 láminas para vender</h3>
          <p className="text-xs text-gray-400">Las que más copias tenés — ofrecelas primero</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                <th className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide w-8">#</th>
                <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Código</th>
                <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Equipo</th>
                <th className="px-4 py-2 text-xs font-semibold text-orange-500 uppercase tracking-wide text-center">Copias</th>
              </tr>
            </thead>
            <tbody>
              {top10.map((s, i) => (
                <tr key={s.code} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2 text-gray-300 text-xs tabular-nums">{i + 1}</td>
                  <td className="px-4 py-2"><span className="font-mono font-bold text-gray-800">{s.code}</span></td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none">{TEAM_FLAG[s.team] ?? "🌐"}</span>
                      <span className="text-gray-600 text-xs">{teamsMap[s.team] ?? s.team}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-400 rounded-full" style={{ width: `${(s.quantity / (top10[0]?.quantity || 1)) * 100}%` }} />
                      </div>
                      <span className="font-black text-orange-500 tabular-nums w-6 text-right">{s.quantity}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {top10.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">Sin láminas disponibles</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Desglose por categoría ───────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800">💎 Valor por categoría</h3>
          <p className="text-xs text-gray-400">Distribución del inventario valorado por tipo de lámina</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoría</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center hidden sm:table-cell">Códigos</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Unidades</th>
                <th className="px-3 py-2 text-xs font-semibold text-emerald-600 uppercase tracking-wide text-right">Valor</th>
                <th className="px-4 py-2 hidden sm:table-cell w-32" />
              </tr>
            </thead>
            <tbody>
              {categoryStats.map(({ cat, count, units, valor }) => {
                const meta     = CATEGORY_META[cat];
                const maxValor = categoryStats[0]?.valor ?? 1;
                return (
                  <tr key={cat} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold ${meta.bg} ${meta.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} shrink-0`} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center hidden sm:table-cell">
                      <span className="font-mono text-xs text-gray-600 tabular-nums">{count}</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="font-bold tabular-nums text-gray-700">{units}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="font-black tabular-nums text-emerald-600">
                        ${valor.toLocaleString("es-CO")}
                      </span>
                    </td>
                    <td className="px-4 py-2 hidden sm:table-cell">
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        {/* Barra proporcional al valor máximo de categoría */}
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${meta.dot}`}
                          style={{ width: `${(valor / maxValor) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {/* Fila de totales */}
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td className="px-4 py-2 font-bold text-gray-700 text-xs uppercase tracking-wide">Total</td>
                <td className="px-3 py-2 text-center font-bold text-gray-700 tabular-nums hidden sm:table-cell">{codigosEnStock}</td>
                <td className="px-3 py-2 text-center font-bold text-gray-700 tabular-nums">{unidadesTotales}</td>
                <td className="px-3 py-2 text-right font-black text-emerald-700 tabular-nums">${valorTotal.toLocaleString("es-CO")}</td>
                <td className="hidden sm:table-cell" />
              </tr>
              {categoryStats.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">Sin láminas disponibles</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-gray-800">⚽ Stock por grupo del Mundial</h3>
          <p className="text-xs text-gray-400">Unidades disponibles por sección del álbum</p>
        </div>
        <div className="space-y-2">
          {groupStats.map((g) => (
            <div key={g.label} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-28 shrink-0 text-right">{g.label}</span>
              <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#003DA5] rounded-full transition-all duration-500" style={{ width: `${(g.units / g.max) * 100}%` }} />
              </div>
              <span className="text-xs font-bold tabular-nums text-[#003DA5] w-10 text-right">{g.units}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-800">📋 Stock por equipo</h3>
            <p className="text-xs text-gray-400">Ordenado por unidades disponibles</p>
          </div>
          <span className="text-xs text-gray-400">{teamStats.length} equipos con stock</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Equipo</th>
                <th className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Grupo</th>
                <th className="px-4 py-2 text-xs font-semibold text-green-600 uppercase tracking-wide text-center">Códigos</th>
                <th className="px-4 py-2 text-xs font-semibold text-blue-500 uppercase tracking-wide text-center">Unidades</th>
              </tr>
            </thead>
            <tbody>
              {teamStats.map((ts) => (
                <tr key={ts.code} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg leading-none">{TEAM_FLAG[ts.code] ?? "🌐"}</span>
                      <span className="font-mono text-xs text-gray-400 w-10 shrink-0">{ts.code}</span>
                      <span className="font-semibold text-gray-800 truncate">{ts.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 hidden sm:table-cell"><span className="text-xs text-gray-400">{ts.group}</span></td>
                  <td className="px-4 py-2 text-center"><span className="font-bold text-green-600 tabular-nums">{ts.available}</span></td>
                  <td className="px-4 py-2 text-center"><span className="font-bold text-blue-600 tabular-nums">{ts.units}</span></td>
                </tr>
              ))}
              {teamStats.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">Sin láminas disponibles</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
