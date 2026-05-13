/**
 * @description Analiza el HTML descargado para encontrar bundles JS
 * y luego busca endpoints de API dentro de ellos.
 */
import { readFileSync, writeFileSync } from "fs";

const html = readFileSync("scripts/page1-raw.html", "utf-8");

// Extraer src de scripts
const srcMatches = html.match(/src="([^"]+\.js[^"]*)"/g) || [];
const scripts = srcMatches.map((s) => s.replace(/src="/, "").replace(/"$/, ""));
console.log("Scripts encontrados:", scripts);

// También buscar cualquier mención a /api/ en el HTML
const apiMentions = html.match(/["'`][^"'`]*\/api\/[^"'`]*["'`]/g) || [];
console.log("Menciones a /api/ en HTML:", apiMentions);

// Intentar descargar el primer bundle JS y buscar patrones de API
if (scripts.length > 0) {
  const baseUrl = "https://paninitrade.com";
  for (const src of scripts.slice(0, 3)) {
    const url = src.startsWith("http") ? src : baseUrl + src;
    console.log(`\nDescargando bundle: ${url}`);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const js = await res.text();
      console.log(`  Tamaño: ${(js.length / 1024).toFixed(1)} KB`);

      // Buscar patrones de API
      const apiPatterns = js.match(/["'`][^"'`]*(\/api\/|supabase|endpoint|fetch)[^"'`]*["'`]/g) || [];
      console.log("  Patrones API encontrados:", apiPatterns.slice(0, 10));

      // Guardar el bundle para inspección manual
      writeFileSync(`scripts/bundle-${src.split("/").pop()}.js`, js, "utf-8");
    } catch (e) {
      console.error("  Error:", e.message);
    }
  }
}
