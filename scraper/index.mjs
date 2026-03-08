import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { scrapePhilharmonie } from "./scrape.mjs";
import { scrapeMaison } from "./scrape-maison.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("=== Concert Scraper ===\n");

  // Run both scrapers
  const [philharmonie, maison] = await Promise.all([
    scrapePhilharmonie(),
    scrapeMaison(),
  ]);

  // Merge and sort by date
  const all = [...philharmonie, ...maison];
  all.sort((a, b) => new Date(a.date) - new Date(b.date));

  console.log(`\n=== Summary ===`);
  console.log(`Philharmonie: ${philharmonie.length}`);
  console.log(`Maison de la Radio: ${maison.length}`);
  console.log(`Total: ${all.length}`);

  // Write output
  const outDir = join(__dirname, "..", "public");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "concerts.json");
  writeFileSync(outPath, JSON.stringify(all, null, 2));
  console.log(`\nWritten to ${outPath}`);
}

main().catch((err) => {
  console.error("Scraper failed:", err);
  process.exit(1);
});
