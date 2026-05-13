/**
 * @description Script de inspección: descarga el HTML crudo de la página 1
 * de paninitrade.com/collection para analizar la estructura antes de parsear.
 * @usage node scripts/inspect-page.mjs
 */

const URL = "https://paninitrade.com/collection?page=1";

const response = await fetch(URL, {
  headers: {
    // Simular un browser real para evitar bloqueos básicos
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "es-ES,es;q=0.9",
  },
});

if (!response.ok) {
  console.error(`Error HTTP: ${response.status} ${response.statusText}`);
  process.exit(1);
}

const html = await response.text();

// Guardar el HTML completo para inspección
import { writeFileSync } from "fs";
writeFileSync("scripts/page1-raw.html", html, "utf-8");

console.log(`✅ HTML guardado en scripts/page1-raw.html`);
console.log(`📏 Tamaño: ${(html.length / 1024).toFixed(1)} KB`);

// Mostrar un fragmento del medio para ver la estructura de las láminas
const snippet = html.slice(5000, 8000);
console.log("\n--- FRAGMENTO (chars 5000–8000) ---");
console.log(snippet);
