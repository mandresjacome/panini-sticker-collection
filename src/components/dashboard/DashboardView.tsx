/**
 * @fileoverview Vista Dashboard — Métricas de venta en tiempo real.
 *
 * Enfocada en el vendedor, no en el coleccionista.
 * Ruta: /admin/dashboard
 */

import { useMemo, useState, useCallback } from "react";
import { useStickers } from "../../hooks/useStickers";
import { useTeams } from "../../hooks/useTeams";
import { ALBUM_GROUP_ORDER, TEAM_GROUP_LABEL, TEAM_FLAG } from "../../lib/albumOrder";
import { exportAvailableStickersToExcel } from "../../lib/exportUtils";
import type { Sticker } from "../../types";

function MetricCard({ icon, value, label, colorClass, subtitle }: {
  icon: string; value: number | string; label: string; colorClass: string; subtitle?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-2xl leading-none">{icon}</span>
        <span className={`text-3xl font-black tabular-nums ${colorClass}`}>{value}</span>
      </div>
      <p className="text-sm font-semibold text-gray-700 leading-tight">{label}</p>
      {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
}

interface TeamSaleStats { code: string; name: string; group: string; available: number; units: number; }
interface GroupStats { label: string; units: number; max: number; }

export function DashboardView() {
  const { stickersArray, isLoading, error } = useStickers();
  const { teamsMap, teamsLoading } = useTeams();

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
        exportAvailableStickersToExcel(stickersArray);
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard icon="🏷️" value={codigosEnStock} label="Códigos en stock" colorClass="text-green-600" subtitle="Láminas distintas disponibles" />
        <MetricCard icon="📦" value={unidadesTotales} label="Unidades totales" colorClass="text-blue-600" subtitle="Copias físicas para vender" />
        <MetricCard icon="🔥" value={topSticker ? topSticker.code : "—"} label="Lámina más repetida" colorClass="text-orange-500" subtitle={topSticker ? `${topSticker.quantity} copias disponibles` : "Sin stock"} />
        <MetricCard icon="⭐" value={topTeam ? `${TEAM_FLAG[topTeam.code] ?? ""} ${topTeam.code}` : "—"} label="Equipo con más stock" colorClass="text-purple-600" subtitle={topTeam ? `${topTeam.units} unidades · ${topTeam.available} códigos` : "Sin stock"} />
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
