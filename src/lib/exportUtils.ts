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
import { getStickerCategory } from "./stickerCategory";
import type { Sticker, StickerCategory, CategoryPricesMap } from "../types";
import { CATEGORY_META, DEFAULT_CATEGORY_PRICES } from "../types";

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
// Colores de categorías (hex sin '#' — alineados con CATEGORY_META en types/index.ts)
// ---------------------------------------------------------------------------

/**
 * @description Colores de fondo y texto para cada categoría de lámina en el Excel.
 * Alineados con `cellColor` de `CATEGORY_META` para coherencia visual app ↔ Excel.
 *
 * | Categoría    | BG       | Texto   | Equivalente Tailwind       |
 * |--------------|----------|---------|----------------------------|
 * | GOAT         | FFC72C   | 713F12  | yellow-400 / yellow-900    |
 * | TOP          | 8B5CF6   | FFFFFF  | purple-500 / white         |
 * | METALIZADA   | 2DD4BF   | 134E4A  | teal-400 / teal-900        |
 * | ESCUDO       | EF4444   | FFFFFF  | red-500 / white            |
 * | FOTO_EQUIPO  | 22C55E   | FFFFFF  | green-500 / white          |
 * | PATROCINADOR | FB923C   | FFFFFF  | orange-400 / white         |
 * | BASICA       | 60A5FA   | FFFFFF  | blue-400 / white           |
 */
const CATEGORY_COLORS: Record<StickerCategory, { bg: string; text: string }> = {
  GOAT:         { bg: "FFC72C", text: "713F12" }, // Dorado Panini / marrón oscuro
  TOP:          { bg: "8B5CF6", text: "FFFFFF" }, // Morado / blanco
  METALIZADA:   { bg: "2DD4BF", text: "134E4A" }, // Teal / verde muy oscuro
  ESCUDO:       { bg: "EF4444", text: "FFFFFF" }, // Rojo / blanco
  FOTO_EQUIPO:  { bg: "22C55E", text: "FFFFFF" }, // Verde / blanco
  PATROCINADOR: { bg: "FB923C", text: "FFFFFF" }, // Naranja / blanco
  BASICA:       { bg: "60A5FA", text: "FFFFFF" }, // Azul claro / blanco
};

/**
 * @description Orden de prioridad de categorías para la hoja "Por Categoría".
 * Empieza por las más valiosas/raras (GOAT=0) y termina con las más comunes (BASICA=6).
 */
const CATEGORY_PRIORITY: Record<StickerCategory, number> = {
  GOAT:         0,
  TOP:          1,
  METALIZADA:   2,
  PATROCINADOR: 3,
  ESCUDO:       4,
  FOTO_EQUIPO:  5,
  BASICA:       6,
};

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
 * @description Genera el estilo de celda para una lámina disponible en la Matriz,
 * coloreada según su categoría visual. Alineado con `StickerCell.tsx` en la app web:
 * la celda entera toma el color de la categoría cuando el estado es `D`.
 *
 * @param category - Categoría derivada de la lámina
 * @returns Objeto de estilo xlsx-js-style para la celda
 */
function makeStickerCellStyle(category: StickerCategory) {
  const { bg, text } = CATEGORY_COLORS[category];
  return {
    font:      { bold: true, color: { rgb: text }, sz: 9, name: "Calibri" },
    fill:      { patternType: "solid", fgColor: { rgb: bg } },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top:    { style: "thin", color: { rgb: C.GRAY_200 } },
      bottom: { style: "thin", color: { rgb: C.GRAY_200 } },
      left:   { style: "thin", color: { rgb: C.GRAY_200 } },
      right:  { style: "thin", color: { rgb: C.GRAY_200 } },
    },
  };
}

/**
 * @description Calcula el precio efectivo de venta de una lámina.
 * Aplica la misma lógica de prioridad que `useQuote.ts` y el catálogo:
 *   1. Precio individual (`sticker.precio`) si fue definido manualmente.
 *   2. Precio base de la categoría en `category_prices` como fallback.
 *
 * @param sticker        - Lámina a valorar
 * @param categoryPrices - Mapa de precios base por categoría (desde Supabase o defaults)
 * @returns Precio entero en pesos COP, >= 0
 */
function getEffectivePrice(sticker: Sticker, categoryPrices: CategoryPricesMap): number {
  if (sticker.precio != null) return sticker.precio;
  return categoryPrices[getStickerCategory(sticker)] ?? 0;
}

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
  /** Valor potencial = suma de (precio efectivo × cantidad) para cada lámina del equipo */
  "Valor Potencial":     number;
}

// ---------------------------------------------------------------------------
// Constructor de la hoja Por Categoría
// ---------------------------------------------------------------------------

/**
 * @description Construye la hoja "Por Categoría" con todas las láminas disponibles
 * ordenadas de mayor a menor rareza (GOAT → TOP → METALIZADA → … → BASICA).
 *
 * Incluye precio unitario efectivo y valor potencial de venta por fila, lo que
 * permite al vendedor identificar rápidamente sus láminas más valiosas.
 *
 * ### Columnas
 * `Código · Equipo · Grupo · Categoría · Cant. · Precio Unit. · Valor Total`
 *
 * ### Ordenamiento
 * 1. Por prioridad de categoría (GOAT=0 … BASICA=6)
 * 2. Dentro de cada categoría: orden canónico del álbum físico
 *
 * ### Visual
 * La celda "Categoría" se colorea con el color de fondo de la categoría,
 * igual que en la app. Las demás columnas usan filas alternas blanco/gris.
 *
 * @param available       - Láminas filtradas con estado D
 * @param categoryPrices  - Mapa de precios base por categoría (de Supabase o defaults)
 * @returns Hoja de cálculo lista para agregar al libro
 */
function buildCategorySheet(
  available:      Sticker[],
  categoryPrices: CategoryPricesMap
): XLSX.WorkSheet {
  // ── Paso 1: Enriquecer cada lámina con su categoría y precio efectivo ─────
  const enriched = available.map((s) => {
    const cat   = getStickerCategory(s);
    const price = getEffectivePrice(s, categoryPrices);
    return { sticker: s, cat, price, valor: price * s.quantity };
  });

  // ── Paso 2: Ordenar por prioridad de categoría, luego por álbum ──────────
  enriched.sort((a, b) => {
    // Primero por rareza descendente (GOAT antes que BASICA)
    const catDiff = CATEGORY_PRIORITY[a.cat] - CATEGORY_PRIORITY[b.cat];
    if (catDiff !== 0) return catDiff;
    // Dentro de la misma categoría: orden canónico del álbum por equipo
    const ia = ALBUM_TEAM_INDEX[a.sticker.team] ?? 999;
    const ib = ALBUM_TEAM_INDEX[b.sticker.team] ?? 999;
    if (ia !== ib) return ia - ib;
    // Dentro del mismo equipo: orden numérico real (MEX1, MEX2 … MEX20)
    return naturalSortCode(a.sticker.code, b.sticker.code);
  });

  // ── Paso 3: Construir la hoja celda por celda ─────────────────────────────
  const HEADERS = [
    "Código", "Equipo", "Grupo", "Categoría", "Cant.", "Precio Unit.", "Valor Total",
  ];
  const ws: XLSX.WorkSheet = {};

  // Fila 0: encabezados con estilo FIFA / Panini
  HEADERS.forEach((h, c) => {
    ws[XLSX.utils.encode_cell({ r: 0, c })] = { v: h, t: "s", s: S_HEADER };
  });

  // Filas de datos: una por lámina disponible
  enriched.forEach(({ sticker: s, cat, price, valor }, rowIdx) => {
    const r      = rowIdx + 1; // fila 0 = encabezado
    const isEven = r % 2 === 1;

    // Estilo de la celda "Categoría": coloreada con el color de la categoría
    // igual que en StickerCell.tsx de la app web
    const { bg, text } = CATEGORY_COLORS[cat];
    const sCat = {
      font:      { bold: true, color: { rgb: text }, sz: 9, name: "Calibri" },
      fill:      { patternType: "solid", fgColor: { rgb: bg } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top:    { style: "thin", color: { rgb: C.GRAY_200 } },
        bottom: { style: "thin", color: { rgb: C.GRAY_200 } },
        left:   { style: "thin", color: { rgb: C.GRAY_200 } },
        right:  { style: "thin", color: { rgb: C.GRAY_200 } },
      },
    };

    // Col 0: Código de la lámina (ej. "ARG7", "FWC3")
    ws[XLSX.utils.encode_cell({ r, c: 0 })] = {
      v: s.code, t: "s", s: makeDataStyle(isEven, "left", C.GRAY_800),
    };
    // Col 1: Sigla del equipo
    ws[XLSX.utils.encode_cell({ r, c: 1 })] = {
      v: s.team, t: "s", s: makeDataStyle(isEven, "left", C.GRAY_800),
    };
    // Col 2: Grupo del álbum (Grupo A, Especiales, etc.)
    ws[XLSX.utils.encode_cell({ r, c: 2 })] = {
      v: TEAM_GROUP_LABEL[s.team] ?? "—", t: "s",
      s: makeDataStyle(isEven, "left", C.GRAY_500),
    };
    // Col 3: Categoría — celda coloreada con el color de la categoría
    ws[XLSX.utils.encode_cell({ r, c: 3 })] = {
      v: CATEGORY_META[cat].label, t: "s", s: sCat,
    };
    // Col 4: Cantidad de copias disponibles (azul)
    ws[XLSX.utils.encode_cell({ r, c: 4 })] = {
      v: s.quantity, t: "n", s: makeDataStyle(isEven, "center", C.BLUE_700),
    };
    // Col 5: Precio unitario efectivo (precio individual o precio base de categoría)
    ws[XLSX.utils.encode_cell({ r, c: 5 })] = {
      v: price, t: "n", s: makeDataStyle(isEven, "right", C.GREEN_700),
    };
    // Col 6: Valor total = precio × cantidad (verde — ingreso potencial)
    ws[XLSX.utils.encode_cell({ r, c: 6 })] = {
      v: valor, t: "n", s: makeDataStyle(isEven, "right", C.GREEN_700),
    };
  });

  // ── Paso 4: Rango, anchos de columna y filas ─────────────────────────────
  ws["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: enriched.length, c: HEADERS.length - 1 },
  });
  ws["!cols"] = [
    { wch: 10 }, // Código
    { wch: 8  }, // Equipo
    { wch: 14 }, // Grupo
    { wch: 14 }, // Categoría
    { wch: 7  }, // Cant.
    { wch: 14 }, // Precio Unit.
    { wch: 14 }, // Valor Total
  ];
  ws["!rows"] = [
    { hpt: 22 }, // encabezado
    ...Array(enriched.length).fill({ hpt: 16 }),
  ];
  // Congela la primera fila para scroll cómodo en listas largas
  ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft" };

  return ws;
}

// ---------------------------------------------------------------------------
// Función pública de exportación
// ---------------------------------------------------------------------------

/**
 * @description Genera y descarga un archivo Excel (.xlsx) con todas las láminas
 * en estado Disponible (D), formateado con la paleta visual FIFA 2026 / Panini.
 *
 * ### Hojas generadas
 * - **Matriz** — Cuadrícula equipo × número; celdas coloreadas por categoría
 * - **Por Categoría** — Listado ordenado por rareza con precio y valor potencial
 * - **Resumen por Equipo** — Totales por equipo + valor potencial + fila TOTAL
 *
 * @param stickers        - Array completo de stickers del store (todos los estados)
 * @param categoryPrices  - Precios base por categoría (de `useCategoryPrices`).
 *                          Default: `DEFAULT_CATEGORY_PRICES` si no se pasa nada.
 * @param filename        - Nombre base sin extensión (se agrega timestamp automático).
 *                          Default: `"laminas-disponibles"`.
 *
 * @returns void — dispara la descarga directamente en el navegador
 *
 * @throws {Error} Si no hay láminas con estado `D` para exportar
 */
/**
 * @description Construye la hoja "Matriz" en formato horizontal.
 *
 * Cada fila representa un equipo. Las columnas 1..maxNum representan los
 * números de lámina. La celda muestra la cantidad si está disponible (D)
 * coloreada con el color de su categoría, o queda vacía en gris si no hay stock.
 *
 * Formato visual:
 * - Celda coloreada por categoría → lámina disponible, muestra la cantidad
 *   (dorado=GOAT, morado=TOP, teal=METALIZADA, azul=BASICA, etc.)
 * - Celda gris claro   → lámina no disponible (sin stock)
 * - Columnas fijas (Equipo, Grupo) congeladas + primera fila congelada
 *
 * @param available        - Láminas filtradas con estado D (para rellenar celdas)
 * @param allStickers      - Todos los stickers del álbum (para calcular el rango de columnas)
 * @param sortedTeamCodes  - Equipos con stock, ordenados por álbum
 * @param categoryPrices   - Mapa de precios (no usado aquí, reservado para futuras columnas)
 * @returns Hoja de cálculo lista para agregar al libro
 */
function buildMatrixSheet(
  available:       Sticker[],
  allStickers:     Sticker[],
  sortedTeamCodes: string[],
  _categoryPrices: CategoryPricesMap
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

  // ── Paso 2: Construir mapa equipo → (número → sticker) solo con disponibles
  // Guardamos el sticker completo (no solo la cantidad) para poder derivar
  // la categoría y aplicar el color correcto en cada celda.
  const teamMatrix = new Map<string, Map<number, Sticker>>();

  for (const s of available) {
    const match = s.code.match(/^[A-Za-z]+?(\d+)$/);
    if (!match) continue;
    const num = parseInt(match[1], 10);
    if (!teamMatrix.has(s.team)) teamMatrix.set(s.team, new Map());
    teamMatrix.get(s.team)!.set(num, s);
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
    const stickerMap = teamMatrix.get(code) ?? new Map<number, Sticker>();
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

    // Columnas 2..totalCols-1: cantidad por número de lámina, coloreada por categoría
    // El índice de columna c = (n - minNum) + 2  (offset de 2 columnas fijas)
    for (let n = minNum; n <= maxNum; n++) {
      const c       = (n - minNum) + 2;
      const sticker = stickerMap.get(n);
      const ref     = XLSX.utils.encode_cell({ r, c });

      if (sticker !== undefined && sticker.quantity > 0) {
        // Lámina disponible → valor numérico + celda coloreada por su categoría
        const category = getStickerCategory(sticker);
        ws[ref] = { v: sticker.quantity, t: "n", s: makeStickerCellStyle(category) };
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
  categoryPrices: CategoryPricesMap = DEFAULT_CATEGORY_PRICES,
  filename = "laminas-disponibles"
): void {
  // ── 1. Filtrar solo láminas disponibles para venta ───────────────────────
  const available = stickers.filter((s) => s.status === "D");

  if (available.length === 0) {
    throw new Error("No hay láminas disponibles para exportar.");
  }

  // ── 2. Acumular totales por equipo para la hoja "Resumen" ────────────────
  // Recorrido único O(n) usando Map para evitar múltiples filter/reduce.
  // También calcula el valor potencial (precio efectivo × cantidad) por equipo.
  const teamTotals = new Map<string, { disponibles: number; unidades: number; valor: number }>();

  for (const s of available) {
    const prev = teamTotals.get(s.team) ?? { disponibles: 0, unidades: 0, valor: 0 };
    // Precio efectivo: override individual si existe, sino precio base de la categoría
    const precioEfectivo = getEffectivePrice(s, categoryPrices);
    teamTotals.set(s.team, {
      disponibles: prev.disponibles + 1,
      unidades:    prev.unidades + s.quantity,
      valor:       prev.valor + (precioEfectivo * s.quantity),
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
      "Valor Potencial":     t.valor,
    };
  });

  // ── 5. Fila de totales globales al pie del Resumen ───────────────────────
  const totalCodigos  = summaryRows.reduce((acc, r) => acc + r["Códigos Disponibles"], 0);
  const totalUnidades = summaryRows.reduce((acc, r) => acc + r["Unidades Totales"], 0);
  const totalValor    = summaryRows.reduce((acc, r) => acc + r["Valor Potencial"], 0);
  summaryRows.push({
    Equipo:                "TOTAL",
    Grupo:                 "",
    "Códigos Disponibles": totalCodigos,
    "Unidades Totales":    totalUnidades,
    "Valor Potencial":     totalValor,
  });

  // ── 6. Crear libro y hojas con estilos ───────────────────────────────────
  const workbook = XLSX.utils.book_new();

  // ·· Hoja 1: Matriz horizontal (equipo × número de lámina, celdas coloreadas por categoría) ··
  const matrixSheet = buildMatrixSheet(available, stickers, sortedTeamCodes, categoryPrices);
  XLSX.utils.book_append_sheet(workbook, matrixSheet, "Matriz");

  // ·· Hoja 2: Por Categoría — listado ordenado por rareza con precios ··
  const categorySheet = buildCategorySheet(available, categoryPrices);
  XLSX.utils.book_append_sheet(workbook, categorySheet, "Por Categoría");

  // ·· Hoja 3: Resumen por equipo (incluye valor potencial de venta) ··
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  applyLayout(summarySheet, [10, 18, 22, 18, 18]);
  applyHeaderStyle(summarySheet, 5);
  applyDataStyles(
    summarySheet,
    summaryRows.length + 1, // +1 por fila de encabezado
    5,
    [
      { align: "left",  color: C.GRAY_800  }, // Equipo
      { align: "left",  color: C.GRAY_500  }, // Grupo
      { align: "right", color: C.GREEN_700 }, // Códigos Disponibles (verde)
      { align: "right", color: C.BLUE_700  }, // Unidades Totales (azul)
      { align: "right", color: C.GREEN_700 }, // Valor Potencial (verde — es dinero)
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
