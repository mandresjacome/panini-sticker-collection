/**
 * @fileoverview Vista Dashboard — Métricas de venta en tiempo real.
 *
 * Enfocada en el vendedor, no en el coleccionista:
 * - ¿Cuántos códigos distintos tengo para vender?
 * - ¿Cuántas unidades físicas tengo en total?
 * - ¿Qué láminas tengo más repetidas? (las que más urgen vender)
 * - ¿Qué grupos del mundial tengo mejor surtidos?
 *
 * Los datos se actualizan en tiempo real via Supabase Realtime.
 *
 * Ruta: /admin/dashboard
 */

import { useMemo } from "react";
import { useStickers } from "../../hooks/useStickers";
import { useTeams } from "../../hooks/useTeams";
import {
  ALBUM_GROUP_ORDER,
  ALBUM_TEAM_INDEX,
  TEAM_GROUP_LABEL,
  TEAM_FLAG,
} from "../../lib/albumOrder";
import type { Sticker } from "../../types";

// ---------------------------------------------------------------------------
// Sub-componente: MetricCard
// ---------------------------------------------------------------------------

/**
 * @description Tarjeta de métrica con ícono, valor destacado y etiqueta.
 * @param props.icon       - Emoji representativo
 * @param props.value      - Valor principal a mostrar en grande
 * @param props.label      - Etiqueta descriptiva
 * @param props.colorClass - Clases Tailwind de color para el valor
 * @param props.subtitle   - Texto secundario opcional
 * @returns Tarjeta de métrica
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
      {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

/**
 * @description Métricas de venta calculadas por equipo.
 */
interface TeamSaleStats {
  code:       string;   // Sigla del equipo
  name:       string;   // Nombre completo
  group:      string;   // Etiqueta de grupo (ej. "Grupo A")
  available:  number;   // Códigos distintos con estado D
  units:      number;   // Suma de cantidades disponibles
}

/**
 * @description Métricas de unidades disponibles por grupo del álbum.
 */
interface GroupStats {
  label: string;   // Nombre del grupo (ej. "Grupo A")
  units: number;   // Total de unidades disponibles en ese grupo
  max:   number;   // Para calcular el ancho relativo de la barra
}

// ---------------------------------------------------------------------------
// Componente principal: DashboardView
// ---------------------------------------------------------------------------

/**
 * @description Vista de métricas enfocada en ventas del inventario FIFA 2026.
 *
 * Secciones:
 * 1. 4 cards: códigos en stock, unidades totales, lámina más repetida, equipo top
 * 2. Top 10 láminas con más copias
 * 3. Unidades por grupo del mundial (barras horizontales)
 * 4. Tabla de equipos ordenada por unidades disponibles
 *
 * @returns Página completa del Dashboard de ventas
 */
export function DashboardView() {
  const { stickersArray, isLoading, error } = useStickers();
  const { teamsMap, teamsLoading } = useTeams();

  // ── Láminas disponibles (estado D) ───────────────────────────────────────
  const availableStickers: Sticker[] = useMemo(
    () => stickersArray.filter((s) => s.status === "D"),
    [stickersArray]
  );

  // ── Métricas globales ─────────────────────────────────────────────────────

  /**
   * @description Número de códigos distintos disponibles para vender.
   * Un "código" es una lámina única; quantity > 1 significa repetidas.
   */
  const codigosEnStock = availableStickers.length;

  /**
   * @description Suma total de unidades físicas disponibles para vender.
   * Si tengo ARG10 × 3, cuenta como 3 unidades.
   */
  const unidadesTotales = useMemo(
    () => availableStickers.reduce((sum, s) => sum + s.quantity, 0),
    [availableStickers]
  );

  /**
   * @description La lámina con mayor cantidad disponible — la que más urge vender.
   */
  const topSticker = useMemo(() => {
    if (availableStickers.length === 0) return null;
    return availableStickers.reduce((max, s) => (s.quantity > max.quantity ? s : max));
  }, [availableStickers]);

  // ── Top 10 láminas más repetidas ─────────────────────────────────────────

  /**
   * @description Las 10 láminas con más copias, ordenadas de mayor a menor.
   * Son las prioritarias para ofrecer a clientes.
   */
  const top10: Sticker[] = useMemo(
    () => [...availableStickers].sort((a, b) => b.quantity - a.quantity).slice(0, 10),
    [availableStickers]
  );

  // ── Stats por equipo ─────────────────────────────────────────────────────

  /**
   * @description Agrupa las láminas disponibles por equipo y calcula
   * códigos disponibles + unidades. Ordenado por unidades (mayor primero).
   */
  const teamStats: TeamSaleStats[] = useMemo(() => {
    const map: Record<string, Sticker[]> = {};
    for (const s of availableStickers) {
      if (!map[s.team]) map[s.team] = [];
      map[s.team].push(s);
    }
    return Object.entries(map)
      .map(([code, stickers]) => ({
        code,
        name:      teamsMap[code] ?? code,
        group:     TEAM_GROUP_LABEL[code] ?? "—",
        available: stickers.length,
        units:     stickers.reduce((sum, s) => sum + s.quantity, 0),
      }))
      // Ordenar por unidades disponibles descendente
      .sort((a, b) => b.units - a.units);
  }, [availableStickers, teamsMap]);

  /**
   * @description Equipo con más unidades disponibles — el más fácil de vender.
   */
  const topTeam = teamStats[0] ?? null;

  // ── Unidades por grupo del álbum ─────────────────────────────────────────

  /**
   * @description Calcula las unidades disponibles agrupadas por sección del álbum
   * (Grupo A → L, Especiales, Patrocinadores) para ver qué grupos están mejor surtidos.
   */
  const groupStats: GroupStats[] = useMemo(() => {
    // Mapa de equipo → unidades disponibles
    const unitsByTeam: Record<string, number> = {};
    for (const s of availableStickers) {
      unitsByTeam[s.team] = (unitsByTeam[s.team] ?? 0) + s.quantity;
    }

    const stats: GroupStats[] = ALBUM_GROUP_ORDER.map((g) => ({
      label: g.label,
      units: g.teams.reduce((sum, code) => sum + (unitsByTeam[code] ?? 0), 0),
      max:   0, // se rellena abajo
    }));

    // Calcular el máximo para escalar las barras
    const maxUnits = Math.max(...stats.map((g) => g.units), 1);
    return stats.map((g) => ({ ...g, max: maxUnits }));
  }, [availableStickers]);

  // ── Estados de carga y error ──────────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Encabezado ──────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-black text-gray-900">📊 Dashboard de Ventas</h2>
        <p className="text-xs text-gray-400">
          Métricas en tiempo real · enfocado en tu stock disponible
        </p>
      </div>

      {/* ── 4 Métricas globales ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          icon="🏷️"
          value={codigosEnStock}
          label="Códigos en stock"
          colorClass="text-green-600"
          subtitle="Láminas distintas disponibles"
        />
        <MetricCard
          icon="📦"
          value={unidadesTotales}
          label="Unidades totales"
          colorClass="text-blue-600"
          subtitle="Copias físicas para vender"
        />
        <MetricCard
          icon="🔥"
          value={topSticker ? `${topSticker.code}` : "—"}
          label="Lámina más repetida"
          colorClass="text-orange-500"
          subtitle={topSticker ? `${topSticker.quantity} copias disponibles` : "Sin stock"}
        />
        <MetricCard
          icon="⭐"
          value={topTeam ? `${TEAM_FLAG[topTeam.code] ?? ""} ${topTeam.code}` : "—"}
          label="Equipo con más stock"
          colorClass="text-purple-600"
          subtitle={topTeam ? `${topTeam.units} unidades · ${topTeam.available} códigos` : "Sin stock"}
        />
      </div>

      {/* ── Top 10 láminas más repetidas ────────────────────────────────── */}
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
                  <td className="px-4 py-2">
                    <span className="font-mono font-bold text-gray-800">{s.code}</span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none">{TEAM_FLAG[s.team] ?? "🌐"}</span>
                      <span className="text-gray-600 text-xs">{teamsMap[s.team] ?? s.team}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center">
                    {/* Barra proporcional al máximo del top10 */}
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-400 rounded-full"
                          style={{ width: `${(s.quantity / (top10[0]?.quantity || 1)) * 100}%` }}
                        />
                      </div>
                      <span className="font-black text-orange-500 tabular-nums w-6 text-right">{s.quantity}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {top10.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">
                    Sin láminas disponibles
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Unidades por grupo ───────────────────────────────────────────── */}
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
                <div
                  className="h-full bg-[#003DA5] rounded-full transition-all duration-500"
                  style={{ width: `${(g.units / g.max) * 100}%` }}
                />
              </div>
              <span className="text-xs font-bold tabular-nums text-[#003DA5] w-10 text-right">
                {g.units}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabla de equipos por unidades ───────────────────────────────── */}
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
                  <td className="px-4 py-2 hidden sm:table-cell">
                    <span className="text-xs text-gray-400">{ts.group}</span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className="font-bold text-green-600 tabular-nums">{ts.available}</span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className="font-bold text-blue-600 tabular-nums">{ts.units}</span>
                  </td>
                </tr>
              ))}
              {teamStats.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">
                    Sin láminas disponibles
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}


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
