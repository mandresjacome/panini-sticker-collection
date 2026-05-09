/**
 * @fileoverview Utilidades de exportación de datos para el panel de ventas.
 *
 * Genera archivos Excel (.xlsx) con formato profesional y paleta visual
 * FIFA 2026 / Panini (negro, amarillo, azul) a partir de los datos en memoria,
 * sin necesidad de llamadas al servidor.
 *
 * Dependencia: xlsx-js-style — fork de SheetJS que añade soporte completo
 * de estilos de celda (colores, negrita, bordes, alineación).
 * Usado SOLO para generar archivos, no para parsear entrada externa.
 */

import * as XLSX from "xlsx-js-style";
import { ALBUM_TEAM_INDEX, TEAM_GROUP_LABEL } from "./albumOrder";
import type { Sticker } from "../types";

// ---------------------------------------------------------------------------
// Paleta de colores (hex sin '#' — formato requerido por xlsx-js-style)
// ---------------------------------------------------------------------------

/**
 * @description Colores de la identidad visual FIFA 2026 / Panini usados en el Excel.
 * Mismo sistema de diseño que la app web.
 */
const C = {
  /** Negro principal de cabeceras */
  FIFA_BLACK:    "0A0A14",
  /** Amarillo Panini — highlights y fila de totales */
  PANINI_YELLOW: "FFC72C",
  /** Blanco puro */
  WHITE:         "FFFFFF",
  /** Gris muy claro — filas alternas */
  GRAY_50:       "F9FAFB",
  /** Gris borde */
  GRAY_200:      "E5E7EB",
  /** Gris texto secundario (grupos) */
  GRAY_500:      "6B7280",
  /** Gris texto principal */
  GRAY_800:      "1F2937",
  /** Azul para valores numéricos (unidades) */
  BLUE_700:      "1D4ED8",
  /** Verde para conteos de códigos disponibles */
  GREEN_700:     "15803D",
} as const;

// ---------------------------------------------------------------------------
// Utilidades de ordenamiento
// ---------------------------------------------------------------------------

/**
 * @description Compara dos códigos de lámina usando orden natural numérico.
 *
 * Los códigos tienen la forma `<PREFIJO><NÚMERO>` (ej. "PAN1", "PAN10", "FWC3").
 * `localeCompare` los ordenaría como texto: PAN1, PAN10, PAN2…
 * Esta función extrae el sufijo numérico y compara como entero para obtener:
 * PAN1, PAN2, PAN3 … PAN10, PAN11
 *
 * @param a - Primer código de lámina
 * @param b - Segundo código de lámina
 * @returns Número negativo, 0 o positivo (contrato de Array.sort)
 */
function naturalSortCode(a: string, b: string): number {
  // Extraer el prefijo alfabético y el sufijo numérico de cada código
  const matchA = a.match(/^([A-Za-z]+)(\d+)$/);
  const matchB = b.match(/^([A-Za-z]+)(\d+)$/);

  // Si ambos tienen el mismo prefijo, ordenar numéricamente por el sufijo
  if (matchA && matchB && matchA[1] === matchB[1]) {
    return parseInt(matchA[2], 10) - parseInt(matchB[2], 10);
  }

  // Fallback: orden lexicográfico estándar (cubre códigos sin número)
  return a.localeCompare(b);
}

// ---------------------------------------------------------------------------
// Fábrica de estilos de celda
// ---------------------------------------------------------------------------

/**
 * @description Estilo de celda de encabezado.
 * Fondo negro FIFA, texto blanco negrita, borde inferior amarillo Panini.
 */
const S_HEADER = {
  font:      { bold: true, color: { rgb: C.WHITE }, sz: 11, name: "Calibri" },
  fill:      { patternType: "solid", fgColor: { rgb: C.FIFA_BLACK } },
  alignment: { horizontal: "center", vertical: "center", wrapText: false },
  border: {
    top:    { style: "thin",   color: { rgb: C.GRAY_200 } },
    left:   { style: "thin",   color: { rgb: C.GRAY_200 } },
    right:  { style: "thin",   color: { rgb: C.GRAY_200 } },
    // Borde inferior amarillo — firma visual Panini
    bottom: { style: "medium", color: { rgb: C.PANINI_YELLOW } },
  },
};

/**
 * @description Estilo de celda de fila TOTAL en la hoja Resumen.
 * Fondo amarillo Panini, texto negro negrita.
 *
 * @param align - Alineación horizontal de la celda
 * @returns Objeto de estilo para xlsx-js-style
 */
const makeTotalStyle = (align: "left" | "right" | "center") => ({
  font:      { bold: true, color: { rgb: C.FIFA_BLACK }, sz: 10, name: "Calibri" },
  fill:      { patternType: "solid", fgColor: { rgb: C.PANINI_YELLOW } },
  alignment: { horizontal: align, vertical: "center" },
  border: {
    top:    { style: "medium", color: { rgb: C.FIFA_BLACK } },
    bottom: { style: "medium", color: { rgb: C.FIFA_BLACK } },
    left:   { style: "thin",   color: { rgb: C.GRAY_200 } },
    right:  { style: "thin",   color: { rgb: C.GRAY_200 } },
  },
});

/**
 * @description Estilo de celda de dato regular.
 * Filas alternas blanco / gris muy claro para facilitar la lectura.
 *
 * @param isEvenRow - true = fila de índice par (blanca), false = fila impar (gris claro)
 * @param align     - Alineación horizontal del contenido
 * @param color     - Color del texto en hex sin '#' (usar constantes de C)
 * @returns Objeto de estilo para xlsx-js-style
 */
const makeDataStyle = (
  isEvenRow: boolean,
  align:     "left" | "center" | "right",
  color:     string = C.GRAY_800
) => ({
  font:      { color: { rgb: color }, sz: 10, name: "Calibri" },
  fill:      { patternType: "solid", fgColor: { rgb: isEvenRow ? C.WHITE : C.GRAY_50 } },
  alignment: { horizontal: align, vertical: "center" },
  border: {
    top:    { style: "thin", color: { rgb: C.GRAY_200 } },
    bottom: { style: "thin", color: { rgb: C.GRAY_200 } },
    left:   { style: "thin", color: { rgb: C.GRAY_200 } },
    right:  { style: "thin", color: { rgb: C.GRAY_200 } },
  },
});

// ---------------------------------------------------------------------------
// Helpers de aplicación de estilos
// ---------------------------------------------------------------------------

/**
 * @description Aplica el estilo de encabezado a todas las celdas de la fila 0
 * y fija la altura de esa fila a 22pt para mayor visibilidad.
 *
 * @param ws      - Hoja de cálculo a estilizar
 * @param numCols - Número de columnas en la hoja
 */
function applyHeaderStyle(ws: XLSX.WorkSheet, numCols: number): void {
  for (let c = 0; c < numCols; c++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[ref]) (ws[ref] as XLSX.CellObject & { s: unknown }).s = S_HEADER;
  }
  // Altura de fila del encabezado en puntos tipográficos
  ws["!rows"] = [{ hpt: 22 }];
}

/**
 * @description Estilo de celda de lámina disponible en la Matriz.
 * Fondo verde claro, texto verde oscuro negrita, con cantidad visible.
 */
const S_STICKER_AVAILABLE = {
  font:      { bold: true, color: { rgb: C.GREEN_700 }, sz: 9, name: "Calibri" },
  fill:      { patternType: "solid", fgColor: { rgb: "DCFCE7" } }, // green-100
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top:    { style: "thin", color: { rgb: C.GRAY_200 } },
    bottom: { style: "thin", color: { rgb: C.GRAY_200 } },
    left:   { style: "thin", color: { rgb: C.GRAY_200 } },
    right:  { style: "thin", color: { rgb: C.GRAY_200 } },
  },
};

/**
 * @description Estilo de celda de lámina NO disponible en la Matriz.
 * Fondo gris muy claro, sin contenido — comunica ausencia visualmente.
 */
const S_STICKER_EMPTY = {
  font:      { color: { rgb: C.GRAY_200 }, sz: 9, name: "Calibri" },
  fill:      { patternType: "solid", fgColor: { rgb: "F3F4F6" } }, // gray-100
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top:    { style: "thin", color: { rgb: C.GRAY_200 } },
    bottom: { style: "thin", color: { rgb: C.GRAY_200 } },
    left:   { style: "thin", color: { rgb: C.GRAY_200 } },
    right:  { style: "thin", color: { rgb: C.GRAY_200 } },
  },
};

/**
 * @description Aplica estilos alternados a todas las filas de datos (desde fila 1),
 * diferenciando columnas de texto y numéricas por color y alineación.
 * Opcionalmente estiliza la última fila como TOTAL (fondo amarillo).
 *
 * @param ws          - Hoja de cálculo a estilizar
 * @param numRows     - Total de filas incluyendo encabezado (datos.length + 1)
 * @param numCols     - Número de columnas
 * @param colConfig   - Configuración visual por índice de columna
 * @param lastIsTotal - Si true, aplica estilo TOTAL a la última fila de datos
 */
function applyDataStyles(
  ws:          XLSX.WorkSheet,
  numRows:     number,
  numCols:     number,
  colConfig:   Array<{ align: "left" | "center" | "right"; color?: string }>,
  lastIsTotal = false
): void {
  for (let r = 1; r < numRows; r++) {
    const isLastRow = r === numRows - 1;
    // Alternancia: r=1 (primer dato) → isEven=true → fondo blanco
    const isEven    = r % 2 === 1;

    for (let c = 0; c < numCols; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) continue;

      let style: unknown;

      if (lastIsTotal && isLastRow) {
        // Primera columna de la fila TOTAL lleva la etiqueta "TOTAL" → izquierda
        style = makeTotalStyle(c === 0 ? "left" : "right");
      } else {
        const { align, color } = colConfig[c] ?? { align: "left" };
        style = makeDataStyle(isEven, align, color);
      }

      (ws[ref] as XLSX.CellObject & { s: unknown }).s = style;
    }
  }
}

/**
 * @description Aplica anchos de columna en caracteres y congela la primera fila.
 *
 * @param ws        - Hoja de cálculo a modificar
 * @param colWidths - Array de anchos en caracteres, uno por columna
 */
function applyLayout(ws: XLSX.WorkSheet, colWidths: number[]): void {
  ws["!cols"] = colWidths.map((w) => ({ wch: w }));
  // Congela los encabezados para que sean visibles al hacer scroll vertical
  ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft" };
}

// ---------------------------------------------------------------------------
// Tipos internos de filas
// ---------------------------------------------------------------------------

/** @description Fila de la hoja "Resumen por Equipo" */
interface ExcelSummaryRow {
  Equipo:                string;
  Grupo:                 string;
  "Códigos Disponibles": number;
  "Unidades Totales":    number;
}

// ---------------------------------------------------------------------------
// Constructor de la hoja Matriz (layout horizontal)
// ---------------------------------------------------------------------------

/**
 * @description Construye la hoja "Matriz" en formato horizontal.
 *
 * Cada fila representa un equipo. Las columnas 1..maxNum representan los
 * números de lámina. La celda muestra la cantidad si está disponible (D)
 * o queda vacía si no hay stock.
 *
 * Formato visual:
 * - Celda verde claro  → lámina disponible, muestra la cantidad
 * - Celda gris claro   → lámina no disponible (sin stock)
 * - Columnas fijas (Equipo, Grupo) congeladas + primera fila congelada
 *
 * @param available        - Láminas filtradas con estado D (para rellenar celdas)
 * @param allStickers      - Todos los stickers del álbum (para calcular el rango de columnas)
 * @param sortedTeamCodes  - Equipos con stock, ordenados por álbum
 * @returns Hoja de cálculo lista para agregar al libro
 */
function buildMatrixSheet(
  available:       Sticker[],
  allStickers:     Sticker[],
  sortedTeamCodes: string[]
): XLSX.WorkSheet {
  // ── Paso 1: Calcular rango global con TODOS los stickers (no solo D) ─────
  // Así FWC00 siempre genera la columna "0" aunque no esté disponible,
  // porque el álbum físico empieza en 00 independientemente del stock.
  let maxNum = 0;
  let minNum = Infinity;

  for (const s of allStickers) {
    const match = s.code.match(/^[A-Za-z]+?(\d+)$/);
    if (!match) continue;
    const num = parseInt(match[1], 10);
    if (num > maxNum) maxNum = num;
    if (num < minNum) minNum = num;
  }

  if (minNum === Infinity) minNum = 1;

  // ── Paso 2: Construir mapa equipo → (número → cantidad) solo con disponibles
  const teamMatrix = new Map<string, Map<number, number>>();

  for (const s of available) {
    const match = s.code.match(/^[A-Za-z]+?(\d+)$/);
    if (!match) continue;
    const num = parseInt(match[1], 10);
    if (!teamMatrix.has(s.team)) teamMatrix.set(s.team, new Map());
    teamMatrix.get(s.team)!.set(num, s.quantity);
  }

  // ── Paso 3: Construir encabezado dinámico ────────────────────────────────
  // Columnas fijas: Equipo, Grupo; luego minNum, minNum+1 … maxNum
  // FWC: 00, 01 … 19 → minNum=0  |  resto: 1, 2 … 20 → minNum=1
  const numRange  = maxNum - minNum + 1;
  const headers = ["Equipo", "Grupo", ...Array.from({ length: numRange }, (_, i) => String(i + minNum))];
  const totalCols = headers.length;

  // ── Paso 3: Construir objeto de hoja manualmente para control total ──────
  //            (json_to_sheet no permite mezclar tipos y estilos por celda)
  const ws: XLSX.WorkSheet = {};

  // Fila 0: encabezados
  headers.forEach((h, c) => {
    const ref = XLSX.utils.encode_cell({ r: 0, c });
    ws[ref] = { v: h, t: "s", s: S_HEADER };
  });

  // Filas de datos: una por equipo
  sortedTeamCodes.forEach((code, rowIdx) => {
    const r         = rowIdx + 1; // fila 0 = encabezado
    const stickerMap = teamMatrix.get(code) ?? new Map<number, number>();
    const isEven    = r % 2 === 1; // alternancia de fondo para columnas fijas

    // Columna 0: código de equipo
    ws[XLSX.utils.encode_cell({ r, c: 0 })] = {
      v: code, t: "s",
      s: makeDataStyle(isEven, "left", C.GRAY_800),
    };

    // Columna 1: grupo del álbum
    ws[XLSX.utils.encode_cell({ r, c: 1 })] = {
      v: TEAM_GROUP_LABEL[code] ?? "—", t: "s",
      s: makeDataStyle(isEven, "left", C.GRAY_500),
    };

    // Columnas 2..totalCols-1: cantidad por número de lámina
    // El índice de columna c = (n - minNum) + 2  (offset de 2 columnas fijas)
    for (let n = minNum; n <= maxNum; n++) {
      const c   = (n - minNum) + 2;
      const qty = stickerMap.get(n);
      const ref = XLSX.utils.encode_cell({ r, c });

      if (qty !== undefined && qty > 0) {
        // Lámina disponible → valor numérico + celda verde
        ws[ref] = { v: qty, t: "n", s: S_STICKER_AVAILABLE };
      } else {
        // Sin stock → celda vacía estilizada en gris claro
        ws[ref] = { v: "", t: "s", s: S_STICKER_EMPTY };
      }
    }
  });

  // ── Paso 4: Definir rango de la hoja ────────────────────────────────────
  ws["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: sortedTeamCodes.length, c: totalCols - 1 },
  });

  // ── Paso 5: Anchos de columna ────────────────────────────────────────────
  // Columnas fijas anchas; columnas numéricas estrechas (4 chars)
  ws["!cols"] = [
    { wch: 9  }, // Equipo
    { wch: 14 }, // Grupo
    ...Array(numRange).fill({ wch: 4 }), // minNum … maxNum
  ];

  // ── Paso 6: Altura de filas ──────────────────────────────────────────────
  // Encabezado más alto; filas de datos a 16pt para que las celdas respiren
  ws["!rows"] = [
    { hpt: 22 }, // fila 0: encabezado
    ...Array(sortedTeamCodes.length).fill({ hpt: 16 }),
  ];

  // ── Paso 7: Congela fila de encabezado y las 2 columnas fijas ───────────
  ws["!freeze"] = { xSplit: 2, ySplit: 1, topLeftCell: "C2", activePane: "bottomRight" };

  return ws;
}



/**
 * @description Genera y descarga un archivo Excel (.xlsx) con todas las láminas
 * en estado Disponible (D), formateado con la paleta visual FIFA 2026 / Panini.
 *
 * ### Hojas generadas
 * - **Detalle** — Una fila por lámina: `Código · Equipo · Grupo · Cantidad`
 * - **Resumen por Equipo** — Totales por equipo con fila TOTAL al pie
 *
 * ### Formato visual aplicado
 * | Elemento           | Estilo                                              |
 * |--------------------|-----------------------------------------------------|
 * | Encabezados        | Fondo `#0A0A14`, texto blanco negrita, borde amarillo |
 * | Filas de datos     | Alternas blanco / gris claro `#F9FAFB`              |
 * | Columna Cantidad   | Texto azul `#1D4ED8`, alineado a la derecha         |
 * | Columna Códigos    | Texto verde `#15803D`, alineado a la derecha        |
 * | Fila TOTAL         | Fondo amarillo `#FFC72C`, texto negro negrita       |
 * | Primera fila       | Congelada para scroll cómodo                        |
 *
 * ### Orden de filas
 * Orden canónico del álbum físico: Especiales → Grupos A–L → Patrocinadores
 *
 * @param stickers - Array completo de stickers del store (todos los estados)
 * @param filename - Nombre base del archivo sin extensión.
 *                   Se añade timestamp automáticamente.
 *                   Default: `"laminas-disponibles"`
 *
 * @returns void — dispara la descarga directamente en el navegador
 *
 * @throws {Error} Si no hay láminas con estado `D` para exportar
 */
export function exportAvailableStickersToExcel(
  stickers: Sticker[],
  filename = "laminas-disponibles"
): void {
  // ── 1. Filtrar solo láminas disponibles para venta ───────────────────────
  const available = stickers.filter((s) => s.status === "D");

  if (available.length === 0) {
    throw new Error("No hay láminas disponibles para exportar.");
  }

  // ── 2. Acumular totales por equipo para la hoja "Resumen" ────────────────
  // Recorrido único O(n) usando Map para evitar múltiples filter/reduce
  const teamTotals = new Map<string, { disponibles: number; unidades: number }>();

  for (const s of available) {
    const prev = teamTotals.get(s.team) ?? { disponibles: 0, unidades: 0 };
    teamTotals.set(s.team, {
      disponibles: prev.disponibles + 1,
      unidades:    prev.unidades + s.quantity,
    });
  }

  // Ordenar equipos según el álbum antes de volcar al Excel
  const sortedTeamCodes = [...teamTotals.keys()].sort((a, b) => {
    const ia = ALBUM_TEAM_INDEX[a] ?? 999;
    const ib = ALBUM_TEAM_INDEX[b] ?? 999;
    return ia !== ib ? ia - ib : naturalSortCode(a, b);
  });

  const summaryRows: ExcelSummaryRow[] = sortedTeamCodes.map((code) => {
    const t = teamTotals.get(code)!;
    return {
      Equipo:                code,
      Grupo:                 TEAM_GROUP_LABEL[code] ?? "—",
      "Códigos Disponibles": t.disponibles,
      "Unidades Totales":    t.unidades,
    };
  });

  // ── 5. Fila de totales globales al pie del Resumen ───────────────────────
  const totalCodigos  = summaryRows.reduce((acc, r) => acc + r["Códigos Disponibles"], 0);
  const totalUnidades = summaryRows.reduce((acc, r) => acc + r["Unidades Totales"], 0);
  summaryRows.push({
    Equipo:                "TOTAL",
    Grupo:                 "",
    "Códigos Disponibles": totalCodigos,
    "Unidades Totales":    totalUnidades,
  });

  // ── 6. Crear libro y hojas con estilos ───────────────────────────────────
  const workbook = XLSX.utils.book_new();

  // ·· Hoja 1: Matriz horizontal (equipo × número de lámina) ··
  // sortedTeamCodes ya fue calculado en el paso 4 del Resumen
  // Pasa stickers completos para que el rango de columnas sea siempre correcto
  const matrixSheet = buildMatrixSheet(available, stickers, sortedTeamCodes);
  XLSX.utils.book_append_sheet(workbook, matrixSheet, "Matriz");

  // ·· Hoja 2: Resumen por equipo ··
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  applyLayout(summarySheet, [10, 18, 22, 18]);
  applyHeaderStyle(summarySheet, 4);
  applyDataStyles(
    summarySheet,
    summaryRows.length + 1, // +1 por fila de encabezado
    4,
    [
      { align: "left",  color: C.GRAY_800  }, // Equipo
      { align: "left",  color: C.GRAY_500  }, // Grupo
      { align: "right", color: C.GREEN_700 }, // Códigos Disponibles (verde)
      { align: "right", color: C.BLUE_700  }, // Unidades Totales (azul)
    ],
    true // última fila = TOTAL → fondo amarillo Panini
  );
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen por Equipo");

  // ── 7. Metadata del libro ────────────────────────────────────────────────
  workbook.Props = {
    Title:       "Láminas Panini FIFA 2026 — Disponibles para Venta",
    Author:      "AmalfiDev",
    Subject:     "Inventario de láminas disponibles",
    Keywords:    "panini fifa 2026 laminas stickers",
    CreatedDate: new Date(),
  };

  // ── 8. Nombre de archivo con timestamp ──────────────────────────────────
  const d       = new Date();
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const timeStr = `${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;

  // ── 9. Disparar descarga en el navegador ─────────────────────────────────
  XLSX.writeFile(workbook, `${filename}_${dateStr}_${timeStr}.xlsx`);
}
