/**
 * @description Busca en el bundle JS descargado patrones específicos
 * relacionados con stickers, colecciones y endpoints de datos.
 */
import { readFileSync } from "fs";

// Leer el bundle descargado
const files = readdirSync("scripts").filter(f => f.startsWith("bundle-"));
import { readdirSync } from "fs";

const bundleFile = readdirSync("scripts").find(f => f.startsWith("bundle-"));
if (!bundleFile) {
  console.error("No se encontró bundle descargado. Corré find-api.mjs primero.");
  process.exit(1);
}

const js = readFileSync(`scripts/${bundleFile}`, "utf-8");
console.log(`Bundle: ${bundleFile} (${(js.length/1024).toFixed(1)} KB)\n`);

// Buscar URLs absolutas o relativas en el bundle
const urls = js.match(/["'`](https?:\/\/[^"'`\s]{10,}|\/[a-z][a-z0-9\-\/]{5,})['"` ]/g) || [];
const uniqueUrls = [...new Set(urls)].filter(u => 
  !u.includes("font") && !u.includes("schema") && !u.includes("tailwind")
);
console.log("URLs relevantes encontradas:");
uniqueUrls.slice(0, 30).forEach(u => console.log(" ", u));

// Buscar menciones a "sticker" o "collection" cerca de fetch/api
const stickerContext = [];
const regex = /(.{0,100}(?:sticker|collection|album|wc2026|mundial)(?:[\w\/\-\.\?=&]{0,80})).{0,100}/gi;
let m;
while ((m = regex.exec(js)) !== null) {
  stickerContext.push(m[0].slice(0, 200));
  if (stickerContext.length >= 20) break;
}
console.log("\n\nContextos con 'sticker/collection':");
stickerContext.forEach((c, i) => console.log(`[${i}] ${c}\n`));
