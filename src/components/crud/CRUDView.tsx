/**
 * @fileoverview Vista CRUD — Edición detallada del inventario de láminas.
 *
 * Permite al vendedor buscar, filtrar y editar cada lámina:
 * - Búsqueda por código (ej. "MEX10") o texto libre.
 * - Filtro por equipo y por estado (F / D / Todos).
 * - Edición inline de cantidad y observaciones.
 * - Cambio de estado directo (toggle F ↔ D).
 * - Validación de invariantes de negocio antes de guardar.
 *
 * Ruta: /admin/crud
 */

import { useState, useMemo, useCallback, useRef } from "react";
import { useStickers } from "../../hooks/useStickers";
import { useTeams } from "../../hooks/useTeams";
import { sortByAlbumOrder, TEAM_GROUP_LABEL, TEAM_FLAG, ALBUM_TEAM_INDEX } from "../../lib/albumOrder";
import { getStickerCategory } from "../../lib/stickerCategory";
import { STATUS_META, CATEGORY_META, TOTAL_STICKERS } from "../../types";
import type { Sticker, StickerStatus, StickerCategoryOverride } from "../../types";

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

/**
 * @description Campos editables de una fila en la tabla CRUD.
 */
interface EditableFields {
  /** Estado que se va a guardar (puede diferir del persistido) */
  status: StickerStatus;
  /** Cantidad que se va a guardar */
  quantity: number;
  /** Observación/notas */
  notes: string;
  /**
   * Override manual de categoría. null = sin override (se auto-deriva).
   * Solo se persiste cuando el usuario elige TOP o GOAT explicitamente.
   */
  categoria: StickerCategoryOverride | null;
}

/**
 * @description Mapa de filas con cambios pendientes de guardar.
 * Clave: código de lámina. Valor: campos editados.
 */
type DirtyRows = Record<string, EditableFields>;

// ---------------------------------------------------------------------------
// Sub-componente: FilaEditable
// ---------------------------------------------------------------------------

/**
 * @description Fila de la tabla CRUD que permite edición inline.
 * Muestra los campos editables (cantidad, observaciones) con validación local.
 * El guardado llama a `updateStickerFields` del servicio.
 *
 * @param props.sticker       - Datos actuales de la lámina (desde el store)
 * @param props.teamName      - Nombre completo del equipo para mostrar
 * @param props.dirty         - Campos editados pendientes de guardar (o undefined si está limpio)
 * @param props.isSaving      - true mientras se ejecuta la mutación de guardado
 * @param props.onEdit        - Callback cuando el usuario edita un campo
 * @param props.onSave        - Callback cuando el usuario presiona Guardar
 * @param props.onDiscard     - Callback cuando el usuario descarta cambios
 * @returns Fila <tr> con celdas editables
 */
function EditableRow({
  sticker,
  teamName,
  dirty,
  isSaving,
  onEdit,
  onSave,
  onDiscard,
}: {
  sticker:   Sticker;
  teamName:  string;
  dirty?:    EditableFields;
  isSaving:  boolean;
  onEdit:    (code: string, fields: Partial<EditableFields>) => void;
  onSave:    (code: string) => void;
  onDiscard: (code: string) => void;
}) {
  // Los valores mostrados son los editados (dirty) si existen,
  // o los valores originales del store.
  const currentStatus   = dirty?.status   ?? sticker.status;
  const currentQuantity = dirty?.quantity ?? sticker.quantity;
  const currentNotes    = dirty?.notes    ?? (sticker.notes ?? "");
  // categoria dirty: si existe en dirty la usamos, si no, tomamos la del store
  const currentCategoria: StickerCategoryOverride | null =
    dirty !== undefined ? dirty.categoria : (sticker.categoria ?? null);

  // Categoría visual actual (auto-derivada o manual)
  // Se calcula sobre un sticker temporal con el override dirty para preview en tiempo real
  const previewSticker: Sticker = { ...sticker, categoria: currentCategoria };
  const category     = getStickerCategory(previewSticker);
  const categoryMeta = CATEGORY_META[category];

  // Determina si la fila tiene cambios sin guardar
  const hasPendingChanges = !!dirty;

  // Validación de invariante de negocio en la UI (el servicio también valida).
  // Si status=F y quantity>0 → error visual antes de intentar guardar.
  const validationError: string | null =
    currentStatus === "F" && currentQuantity > 0
      ? `Cantidad ${currentQuantity} > 0 requiere estado Disponible.`
      : null;

  // Alterna entre F y D
  const handleToggleStatus = () => {
    const next: StickerStatus = currentStatus === "F" ? "D" : "F";
    // Al pasar a F automáticamente resetear cantidad a 0
    if (next === "F") {
      onEdit(sticker.code, { status: next, quantity: 0 });
    } else {
      // Al pasar a D, si la cantidad era 0 subir a 1 automáticamente
      onEdit(sticker.code, { status: next, quantity: Math.max(currentQuantity, 1) });
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(0, parseInt(e.target.value, 10) || 0);
    onEdit(sticker.code, { quantity: val });
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onEdit(sticker.code, { notes: e.target.value });
  };

  /**
   * @description Maneja el cambio del selector de categoría manual (TOP / GOAT / —).
   * "" en el select significa "sin override" → se guarda null en DB.
   * @param e - Evento de cambio del select
   */
  const handleCategoriaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as StickerCategoryOverride | "";
    onEdit(sticker.code, { categoria: val === "" ? null : val });
  };

  const statusMeta = STATUS_META[currentStatus] ?? STATUS_META["F"];

  return (
    <tr
      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
        hasPendingChanges ? "bg-yellow-50 hover:bg-yellow-100" : ""
      }`}
    >
      {/* Código */}
      <td className="px-3 py-2 font-mono text-sm font-semibold text-gray-800 whitespace-nowrap">
        {sticker.code}
      </td>

      {/* Equipo */}
      <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">
        <span className="mr-1" aria-hidden="true">{TEAM_FLAG[sticker.team] ?? "🌐"}</span>
        <span className="font-mono text-xs text-gray-400 mr-1">{sticker.team}</span>
        <span className="hidden sm:inline">{teamName}</span>
      </td>

      {/* Tipo + Categoría visual */}
      <td className="px-3 py-2 whitespace-nowrap hidden md:table-cell">
        {/* Badge de categoría con color — muestra la categoría actual (auto o manual) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${categoryMeta.bg} ${categoryMeta.text}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${categoryMeta.dot} shrink-0`} />
            {categoryMeta.label}
          </span>

          {/* Select para asignar TOP o GOAT manualmente — siempre visible */}
          <select
            value={currentCategoria ?? ""}
            onChange={handleCategoriaChange}
            title="Asignar categoría especial (TOP o GOAT) manualmente"
            className="text-[10px] border border-gray-200 rounded px-1 py-0.5 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-400 cursor-pointer"
          >
            <option value="">— Auto</option>
            <option value="TOP">⭐ TOP</option>
            <option value="GOAT">🐐 GOAT</option>
          </select>
        </div>
      </td>

      {/* Estado — botón toggle */}
      <td className="px-3 py-2">
        <button
          onClick={handleToggleStatus}
          className={`
            px-2 py-1 rounded text-xs font-bold transition-all
            ${statusMeta.color}
            hover:opacity-80 active:scale-95
          `}
          title="Clic para alternar entre Falta ↔ Disponible"
        >
          {currentStatus}
        </button>
      </td>

      {/* Cantidad */}
      <td className="px-3 py-2">
        <input
          type="number"
          min={0}
          max={99}
          value={currentQuantity}
          onChange={handleQuantityChange}
          className={`
            w-16 text-center text-sm font-mono border rounded px-1 py-0.5 focus:outline-none focus:ring-1
            ${validationError
              ? "border-red-400 focus:ring-red-400 bg-red-50"
              : "border-gray-300 focus:ring-green-400"
            }
          `}
        />
      </td>

      {/* Observaciones */}
      <td className="px-3 py-2">
        <input
          type="text"
          value={currentNotes}
          onChange={handleNotesChange}
          placeholder="Notas opcionales…"
          maxLength={200}
          className="w-full text-sm border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-green-400 bg-transparent"
        />
      </td>

      {/* Acciones */}
      <td className="px-3 py-2 whitespace-nowrap">
        {hasPendingChanges ? (
          <div className="flex items-center gap-1">
            {/* Error de validación inline */}
            {validationError && (
              <span
                className="text-red-500 text-xs mr-1 hidden lg:block max-w-40 leading-tight"
                title={validationError}
              >
                ⚠ {validationError}
              </span>
            )}
            <button
              onClick={() => onSave(sticker.code)}
              disabled={isSaving || !!validationError}
              className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
              title={validationError ?? "Guardar cambios"}
            >
              {isSaving ? "…" : "Guardar"}
            </button>
            <button
              onClick={() => onDiscard(sticker.code)}
              disabled={isSaving}
              className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300 disabled:opacity-50 transition-colors"
              title="Descartar cambios"
            >
              ✕
            </button>
          </div>
        ) : (
          // Sin cambios pendientes → indicador visual neutro
          <span className="text-xs text-gray-300 select-none">—</span>
        )}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Componente principal: CRUDView
// ---------------------------------------------------------------------------

/**
 * @description Vista de edición detallada del inventario de láminas FIFA 2026.
 *
 * Flujo de edición:
 * 1. El usuario edita campos en una fila → los cambios quedan en `dirtyRows` (local state).
 * 2. Al presionar "Guardar", se llama `updateStickerFields` del servicio con validación.
 * 3. Si la operación tiene éxito, se limpia la fila del mapa `dirtyRows`.
 * 4. Supabase Realtime propaga el cambio a los demás usuarios.
 *
 * @returns Página completa de la Vista CRUD
 */
export function CRUDView() {
  const { stickersArray, updateStickerFields, isLoading, error } = useStickers();
  const { teamsMap, teamsLoading } = useTeams();

  // ── Filtros ──────────────────────────────────────────────────────────────

  /** Texto de búsqueda libre — filtra por código, equipo o tipo */
  const [searchText, setSearchText] = useState("");

  /** Filtro de equipo — cadena vacía = todos los equipos */
  const [filterTeam, setFilterTeam] = useState("");

  /** Filtro de estado — "" = todos */
  const [filterStatus, setFilterStatus] = useState<"" | StickerStatus>("");

  // ── Edición en vuelo ─────────────────────────────────────────────────────

  /**
   * Mapa de filas con cambios pendientes de guardar.
   * Se elimina la clave una vez que se guarda o se descarta.
   */
  const [dirtyRows, setDirtyRows] = useState<DirtyRows>({});

  /**
   * Códigos de láminas que están siendo guardados en este momento.
   * Evita doble clic en el botón Guardar.
   */
  const [savingCodes, setSavingCodes] = useState<Set<string>>(new Set());

  /** Mensajes de error por código de lámina */
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});

  // ── Ref para el input de búsqueda (foco automático) ─────────────────────
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Lista de equipos para el selector de filtro — en orden del álbum ──
  const teamOptions = useMemo(() => {
    const codes = [...new Set(stickersArray.map((s) => s.team))];
    return sortByAlbumOrder(codes);
  }, [stickersArray]);

  // ── Filtrado reactivo ────────────────────────────────────────────────────

  /**
   * @description Aplica los tres filtros sobre el array completo de stickers.
   * Recalcula solo cuando cambian los filtros o el array de stickers.
   * @returns Subconjunto filtrado de stickers a renderizar
   */
  const filteredStickers = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    const filtered = stickersArray.filter((s) => {
      // Filtro de texto: busca en código, equipo y tipo
      if (search) {
        const inCode  = s.code.toLowerCase().includes(search);
        const inTeam  = s.team.toLowerCase().includes(search);
        const inType  = s.type.toLowerCase().includes(search);
        const inName  = (teamsMap[s.team] ?? "").toLowerCase().includes(search);
        if (!inCode && !inTeam && !inType && !inName) return false;
      }

      // Filtro de equipo exacto
      if (filterTeam && s.team !== filterTeam) return false;

      // Filtro de estado
      if (filterStatus && s.status !== filterStatus) return false;

      return true;
    });

    // Ordenar según el álbum: primero por posición de equipo, luego por número de código
    return filtered.sort((a, b) => {
      const ia = ALBUM_TEAM_INDEX[a.team] ?? Number.MAX_SAFE_INTEGER;
      const ib = ALBUM_TEAM_INDEX[b.team] ?? Number.MAX_SAFE_INTEGER;
      if (ia !== ib) return ia - ib;
      // Dentro del mismo equipo, orden numérico del código (MEX1 < MEX2 < MEX10)
      const numA = parseInt(a.code.replace(/\D+/, ""), 10) || 0;
      const numB = parseInt(b.code.replace(/\D+/, ""), 10) || 0;
      return numA - numB;
    });
  }, [stickersArray, searchText, filterTeam, filterStatus, teamsMap]);

  // ── Handlers de edición ──────────────────────────────────────────────────

  /**
   * @description Registra un cambio en un campo de una fila sin persistir.
   * Crea o actualiza la entrada en `dirtyRows` usando los valores actuales como base.
   * @param code   - Código de la lámina editada
   * @param fields - Campos que cambiaron
   */
  const handleEdit = useCallback(
    (code: string, fields: Partial<EditableFields>) => {
      setDirtyRows((prev) => {
        // Base: los valores dirty previos, o los originales del array
        const sticker = stickersArray.find((s) => s.code === code);
        const base: EditableFields = prev[code] ?? {
          status:    sticker?.status   ?? "F",
          quantity:  sticker?.quantity ?? 0,
          notes:     sticker?.notes    ?? "",
          // Preservar el override actual de la DB como base al editar por primera vez
          categoria: sticker?.categoria ?? null,
        };
        return { ...prev, [code]: { ...base, ...fields } };
      });
      // Limpiar error previo de guardado al editar de nuevo
      setSaveErrors((prev) => {
        const next = { ...prev };
        delete next[code];
        return next;
      });
    },
    [stickersArray]
  );

  /**
   * @description Persiste los cambios de una fila en Supabase.
   * Valida la invariante de negocio antes de llamar al servicio.
   * @param code - Código de la lámina a guardar
   */
  const handleSave = useCallback(
    async (code: string) => {
      const dirty = dirtyRows[code];
      if (!dirty) return;

      // Validación previa en la UI (el servicio también valida, pero así
      // evitamos un round-trip innecesario)
      if (dirty.status === "F" && dirty.quantity > 0) {
        setSaveErrors((prev) => ({
          ...prev,
          [code]: `Cantidad ${dirty.quantity} > 0 no es válida con estado F.`,
        }));
        return;
      }

      // Marcar la fila como "guardando"
      setSavingCodes((prev) => new Set(prev).add(code));

      try {
        await updateStickerFields(code, {
          status:    dirty.status,
          quantity:  dirty.quantity,
          notes:     dirty.notes || undefined,
          // null = borrar override manual (volver a auto-derivado)
          categoria: dirty.categoria,
        });

        // Éxito → limpiar la fila del mapa de cambios pendientes
        setDirtyRows((prev) => {
          const next = { ...prev };
          delete next[code];
          return next;
        });
      } catch (err) {
        // Mostrar el error del servicio directamente en la fila
        setSaveErrors((prev) => ({
          ...prev,
          [code]: (err as Error).message,
        }));
      } finally {
        setSavingCodes((prev) => {
          const next = new Set(prev);
          next.delete(code);
          return next;
        });
      }
    },
    [dirtyRows, updateStickerFields]
  );

  /**
   * @description Descarta los cambios pendientes de una fila, restaurando los
   * valores originales del store.
   * @param code - Código de la lámina a revertir
   */
  const handleDiscard = useCallback((code: string) => {
    setDirtyRows((prev) => {
      const next = { ...prev };
      delete next[code];
      return next;
    });
    setSaveErrors((prev) => {
      const next = { ...prev };
      delete next[code];
      return next;
    });
  }, []);

  /** Cuenta de filas con cambios pendientes para el badge de la cabecera */
  const pendingCount = Object.keys(dirtyRows).length;

  // ── Estados de carga y error ─────────────────────────────────────────────

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
        Error al cargar las láminas: {error}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Encabezado ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-gray-900">✏️ Editar Inventario</h2>
          <p className="text-xs text-gray-400">
            {TOTAL_STICKERS} láminas en total · edición inline directa
          </p>
        </div>

        {/* Badge de cambios pendientes */}
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 bg-yellow-100 border border-yellow-300 text-yellow-800 text-xs font-semibold px-3 py-1.5 rounded-lg">
            <span className="animate-pulse">●</span>
            {pendingCount} {pendingCount === 1 ? "cambio pendiente" : "cambios pendientes"}
          </div>
        )}
      </div>

      {/* ── Barra de filtros ─────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col sm:flex-row gap-2">

        {/* Búsqueda libre */}
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
            🔍
          </span>
          <input
            ref={searchRef}
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Buscar por código, equipo o tipo… (ej. MEX10)"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          {/* Botón limpiar búsqueda */}
          {searchText && (
            <button
              onClick={() => { setSearchText(""); searchRef.current?.focus(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              title="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>

        {/* Selector de equipo */}
        <select
          value={filterTeam}
          onChange={(e) => setFilterTeam(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
        >
          <option value="">Todos los equipos</option>
          {teamOptions.map((code) => (
            <option key={code} value={code}>
              {TEAM_FLAG[code] ?? "🌐"} {TEAM_GROUP_LABEL[code] ? `[${TEAM_GROUP_LABEL[code]}] ` : ""}{code} — {teamsMap[code] ?? code}
            </option>
          ))}
        </select>

        {/* Selector de estado */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as "" | StickerStatus)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
        >
          <option value="">Todos los estados</option>
          <option value="F">F — Falta</option>
          <option value="D">D — Disponible</option>
        </select>

        {/* Indicador de resultados */}
        <div className="flex items-center px-2 text-xs text-gray-500 whitespace-nowrap">
          {filteredStickers.length} resultado{filteredStickers.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ── Tabla de láminas ─────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {filteredStickers.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            No se encontraron láminas con esos filtros.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                  <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Código</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Equipo</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Categoría</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cantidad</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Observaciones</th>
                  <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredStickers.map((sticker) => (
                  <EditableRow
                    key={sticker.code}
                    sticker={sticker}
                    teamName={teamsMap[sticker.team] ?? sticker.team}
                    dirty={dirtyRows[sticker.code]}
                    isSaving={savingCodes.has(sticker.code)}
                    onEdit={handleEdit}
                    onSave={handleSave}
                    onDiscard={handleDiscard}
                  />
                ))}
              </tbody>
            </table>

            {/* Error de guardado por fila (copia visible debajo si hay muchos) */}
            {Object.keys(saveErrors).length > 0 && (
              <div className="px-4 py-2 bg-red-50 border-t border-red-200">
                {Object.entries(saveErrors).map(([code, msg]) => (
                  <p key={code} className="text-xs text-red-600">
                    <span className="font-mono font-bold">{code}:</span> {msg}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Nota sobre rendimiento ─────────────────────────────────────────── */}
      {filteredStickers.length > 200 && (
        <p className="text-xs text-gray-400 text-center">
          Mostrando {filteredStickers.length} filas — usa los filtros para acotar la lista.
        </p>
      )}
    </div>
  );
}
