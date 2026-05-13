/**
 * @description Prueba el endpoint /api/sticker-catalog para ver qué devuelve.
 */

const BASE = "https://paninitrade.com";

// Intentar varios formatos del endpoint
const endpoints = [
  "/api/sticker-catalog",
  "/api/sticker-catalog?collection=wc2026",
  "/api/sticker-catalog?page=1",
  "/api/collections",
];

for (const ep of endpoints) {
  const url = BASE + ep;
  console.log(`\nGET ${url}`);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0",
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://paninitrade.com/collection",
      },
    });
    console.log(`  Status: ${res.status}`);
    const text = await res.text();
    console.log(`  Tamaño: ${(text.length / 1024).toFixed(1)} KB`);
    // Mostrar los primeros 500 chars
    console.log(`  Preview: ${text.slice(0, 500)}`);
  } catch (e) {
    console.error(`  Error: ${e.message}`);
  }
}
