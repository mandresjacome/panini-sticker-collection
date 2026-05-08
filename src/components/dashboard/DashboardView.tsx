/**
 * @fileoverview Vista Dashboard — Métricas en tiempo real del inventario.
 *
 * Muestra al vendedor un resumen completo de su colección:
 * - Chips globales: Total / Disponibles / Faltantes / Unidades totales.
 * - Barra de progreso global.
 * - Tabla de desglose por equipo con conteos y progreso individual.
 *
 * Los datos se actualizan en tiempo real via Supabase Realtime (heredado
 * del hook useStickers). No se necesita refetch manual.
 *
 * Ruta: /admin/dashboard
 */

import { useMemo } from "react";
import { useStickers } from "../../hooks/useStickers";
import { useTeams } from "../../hooks/useTeams";
import { ALBUM_TEAM_INDEX, TEAM_GROUP_LABEL, TEAM_FLAG } from "../../lib/albumOrder";
import { TOTAL_STICKERS } from "../../types";
import type { Sticker } from "../../types";

// ---------------------------------------------------------------------------
// Sub-componente: MetricCard
// ---------------------------------------------------------------------------

/**
 * @description Tarjeta de una métrica global con ícono, valor y etiqueta.
 *
 * @param props.icon       - Emoji o ícono representativo
 * @param props.value      - Valor numérico a mostrar en grande
 * @param props.label      - Etiqueta descriptiva debajo del valor
 * @param props.colorClass - Clases Tailwind de color para el valor
 * @param props.subtitle   - Texto secundario opcional (ej. porcentaje)
 * @returns Tarjeta con diseño consistente
 */
function MetricCard({
  icon,
  value,
  label,
  colorClass,
  subtitle,
}: {
  icon:        string;
  value:       number | string;
  label:       string;
  colorClass:  string;
  subtitle?:   string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-2xl leading-none">{icon}</span>
        <span className={`text-3xl font-black tabular-nums ${colorClass}`}>{value}</span>
      </div>
      <p className="text-sm font-semibold text-gray-700 leading-tight">{label}</p>
      {subtitle && (
        <p className="text-xs text-gray-400">{subtitle}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-componente: ProgressBar
// ---------------------------------------------------------------------------

/**
 * @description Barra de progreso horizontal con porcentaje inline.
 *
 * @param props.pct        - Porcentaje (0–100)
 * @param props.colorClass - Color de relleno (clase Tailwind bg-*)
 * @param props.label      - Etiqueta accesible aria-label
 * @returns Barra de progreso accesible
 */
function ProgressBar({
  pct,
  colorClass = "bg-green-400",
  label,
}: {
  pct:         number;
  colorClass?: string;
  label:       string;
}) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div
      className="h-2 w-full bg-gray-100 rounded-full overflow-hidden"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

/**
 * @description Métricas calculadas por equipo para la tabla de desglose.
 */
interface TeamStats {
  /** Sigla del equipo */
  code: string;
  /** Nombre completo del equipo */
  name: string;
  /** Etiqueta del grupo al que pertenece en el álbum. Ej: "Grupo A" */
  group: string;
  /** Total de láminas del equipo */
  total: number;
  /** Láminas con estado D (disponibles para vender) */
  available: number;
  /** Láminas con estado F (faltan) */
  missing: number;
  /** Suma de cantidades de todas las láminas D del equipo */
  totalUnits: number;
  /** Porcentaje de disponibilidad: available / total * 100 */
  pct: number;
}

// ---------------------------------------------------------------------------
// Componente principal: DashboardView
// ---------------------------------------------------------------------------

/**
 * @description Vista de métricas del inventario FIFA 2026.
 *
 * Arquitectura de datos:
 * - `useStickers` provee el array completo y los conteos globales.
 * - Los stats por equipo se derivan con `useMemo` para evitar re-cómputos.
 * - La actualización es reactiva via Supabase Realtime (ya configurado en useStickers).
 *
 * @returns Página completa del Dashboard
 */
export function DashboardView() {
  const { stickersArray, isLoading, error, counts } = useStickers();
  const { teamsMap, teamsLoading } = useTeams();

  // ── Métricas globales adicionales ────────────────────────────────────────

  /**
   * @description Suma total de unidades disponibles (quantity de todas las láminas D).
   * Útil para el vendedor: "¿cuántas láminas físicas tengo para vender en total?".
   */
  const totalUnits = useMemo(() => {
    return stickersArray
      .filter((s) => s.status === "D")
      .reduce((sum, s) => sum + s.quantity, 0);
  }, [stickersArray]);

  /** Porcentaje de la colección cubierta (láminas D / 994) */
  const globalPct = parseFloat(((counts.available / TOTAL_STICKERS) * 100).toFixed(1));

  // ── Stats por equipo ─────────────────────────────────────────────────────

  /**
   * @description Calcula métricas por equipo recorriendo el array una sola vez
   * mediante reduce, agrupando por código de equipo.
   * Se recalcula solo cuando cambia el inventario o el mapa de equipos.
   *
   * @returns Array de TeamStats ordenado de mayor a menor disponibilidad
   */
  const teamStats: TeamStats[] = useMemo(() => {
    // Agrupar stickers por equipo
    const map: Record<string, Sticker[]> = {};
    for (const s of stickersArray) {
      if (!map[s.team]) map[s.team] = [];
      map[s.team].push(s);
    }

    // Calcular métricas por equipo
    const stats: TeamStats[] = Object.entries(map).map(([code, stickers]) => {
      const total      = stickers.length;
      const available  = stickers.filter((s) => s.status === "D").length;
      const missing    = stickers.filter((s) => s.status === "F").length;
      const totalUnits = stickers
        .filter((s) => s.status === "D")
        .reduce((sum, s) => sum + s.quantity, 0);
      const pct = total > 0 ? (available / total) * 100 : 0;

      return {
        code,
        name:  teamsMap[code] ?? code,
        group: TEAM_GROUP_LABEL[code] ?? "—",
        total,
        available,
        missing,
        totalUnits,
        pct,
      };
    });

    // Ordenar según el orden canónico del álbum (igual que en la Vista Matriz)
    return stats.sort((a, b) => {
      const ia = ALBUM_TEAM_INDEX[a.code] ?? Number.MAX_SAFE_INTEGER;
      const ib = ALBUM_TEAM_INDEX[b.code] ?? Number.MAX_SAFE_INTEGER;
      return ia - ib;
    });
  }, [stickersArray, teamsMap]);

  // ── Carga y error ─────────────────────────────────────────────────────────

  if (isLoading || teamsLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center text-red-500 text-sm">
        Error al cargar métricas: {error}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Encabezado ──────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-black text-gray-900">📊 Dashboard</h2>
        <p className="text-xs text-gray-400">
          Métricas en tiempo real · {TOTAL_STICKERS} láminas en la colección
        </p>
      </div>

      {/* ── Chips de métricas globales ───────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          icon="🏷️"
          value={TOTAL_STICKERS}
          label="Total láminas"
          colorClass="text-gray-700"
          subtitle="Colección completa"
        />
        <MetricCard
          icon="✅"
          value={counts.available}
          label="Disponibles"
          colorClass="text-green-600"
          subtitle={`${globalPct}% de la colección`}
        />
        <MetricCard
          icon="❌"
          value={counts.missing}
          label="Faltan"
          colorClass="text-gray-500"
          subtitle={`${(100 - globalPct).toFixed(1)}% sin cubrir`}
        />
        <MetricCard
          icon="📦"
          value={totalUnits}
          label="Unidades para vender"
          colorClass="text-blue-600"
          subtitle="Suma de cantidades D"
        />
      </div>

      {/* ── Barra de progreso global ─────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-gray-700">Progreso global</span>
          <span className="font-black text-green-600 tabular-nums">{globalPct}%</span>
        </div>
        <ProgressBar pct={globalPct} label={`Progreso global ${globalPct}%`} />
        <p className="text-xs text-gray-400">
          {counts.available} de {TOTAL_STICKERS} láminas disponibles para venta
        </p>
      </div>

      {/* ── Tabla de desglose por equipo ─────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">Desglose por Equipo</h3>
          <span className="text-xs text-gray-400">{teamStats.length} equipos</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Equipo</th>                  <th className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Grupo</th>                <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Total</th>
                <th className="px-4 py-2 text-xs font-semibold text-green-600 uppercase tracking-wide text-center">Disp.</th>
                <th className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">Faltan</th>
                <th className="px-4 py-2 text-xs font-semibold text-blue-500 uppercase tracking-wide text-center hidden sm:table-cell">Unidades</th>
                <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-32">Progreso</th>
              </tr>
            </thead>
            <tbody>
              {teamStats.map((ts) => (
                <tr
                  key={ts.code}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                >
                  {/* Nombre del equipo */}
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg leading-none" aria-hidden="true">{TEAM_FLAG[ts.code] ?? "🌐"}</span>
                      <span className="font-mono text-xs text-gray-400 w-10 shrink-0">{ts.code}</span>
                      <span className="font-semibold text-gray-800 truncate">{ts.name}</span>
                    </div>
                  </td>

                  {/* Grupo del álbum */}
                  <td className="px-4 py-2 hidden sm:table-cell">
                    <span className="text-xs text-gray-400">{ts.group}</span>
                  </td>

                  {/* Total */}
                  <td className="px-4 py-2 text-center tabular-nums text-gray-600 font-medium">
                    {ts.total}
                  </td>

                  {/* Disponibles */}
                  <td className="px-4 py-2 text-center tabular-nums">
                    <span className={`font-bold ${ts.available > 0 ? "text-green-600" : "text-gray-300"}`}>
                      {ts.available}
                    </span>
                  </td>

                  {/* Faltan */}
                  <td className="px-4 py-2 text-center tabular-nums">
                    <span className={ts.missing > 0 ? "text-gray-500" : "text-gray-300"}>
                      {ts.missing}
                    </span>
                  </td>

                  {/* Unidades totales disponibles */}
                  <td className="px-4 py-2 text-center tabular-nums hidden sm:table-cell">
                    <span className={ts.totalUnits > 0 ? "text-blue-600 font-semibold" : "text-gray-300"}>
                      {ts.totalUnits}
                    </span>
                  </td>

                  {/* Barra de progreso individual */}
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <ProgressBar
                          pct={ts.pct}
                          colorClass={ts.pct === 100 ? "bg-green-500" : ts.pct > 50 ? "bg-green-400" : ts.pct > 0 ? "bg-yellow-400" : "bg-gray-200"}
                          label={`${ts.name} ${ts.pct.toFixed(0)}%`}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-gray-500 w-10 text-right">
                        {ts.pct.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
