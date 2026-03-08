import * as cheerio from "cheerio";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = "https://philharmoniedeparis.fr";
const LANG = "en";

// Fetch with retry and delay
async function fetchRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; ClellaumerBot/1.0; concert-aggregator)",
          Accept: "application/json, text/html",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      console.warn(`  Retry ${i + 1} for ${url}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

// Fetch all symphonic events from the AJAX endpoint
async function fetchEvents() {
  const events = [];
  let lastDate = "1";
  let lastGroup = "";
  let hasMore = true;
  let page = 0;

  while (hasMore) {
    const params = new URLSearchParams({
      genreGps: "2",
      types: "1",
      isFilteredCalendar: "1",
      op: page === 0 ? "init" : "next",
      lastDate,
    });
    if (lastGroup) params.set("lastGroup", lastGroup);

    const url = `${BASE}/${LANG}/agenda-ajax?${params}`;
    console.log(`Fetching page ${page + 1}: ${url}`);

    const res = await fetchRetry(url);
    const data = await res.json();

    const $ = cheerio.load(data.content);
    const articles = $("article.EventCard");

    console.log(`  Found ${articles.length} events`);
    if (articles.length === 0) break;

    articles.each((_, el) => {
      const $el = $(el);
      const id = String($el.attr("data-performance-eid") || "");
      const timestamp = parseInt($el.attr("data-timestamp") || "0", 10);
      const category = $el
        .find(".EventCard-category")
        .text()
        .replace(/\s+/g, " ")
        .trim();
      const title = $el.find(".EventCard-title").text().trim();
      const subtitle = $el.find(".EventCard-subtitle").text().trim();
      const description = $el.find(".EventCard-description").text().trim();
      const venue = $el
        .find(".EventCard-place")
        .contents()
        .filter(function () {
          return this.type === "text";
        })
        .text()
        .trim();
      const detailPath = $el.find("a.EventCard-button").attr("href") || "";
      const imageUrl = $el.find(".Card-image img").attr("src") || "";

      if (id) {
        events.push({
          id,
          timestamp,
          date: new Date(timestamp * 1000).toISOString(),
          category,
          title,
          subtitle,
          description,
          venue,
          prices: [],
          detailUrl: detailPath.startsWith("http")
            ? detailPath
            : `${BASE}${detailPath}`,
          imageUrl: imageUrl.startsWith("http")
            ? imageUrl
            : imageUrl
              ? `${BASE}${imageUrl}`
              : "",
        });
      }
    });

    hasMore = data.moreEvents === true;
    lastDate = data.lastDate || "";
    lastGroup = String(data.lastGroup || "");
    page++;

    if (hasMore) await new Promise((r) => setTimeout(r, 500));
  }

  return events;
}

// Fetch prices for a batch of events
async function fetchPrices(events) {
  const BATCH_SIZE = 20;
  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE);
    const eids = batch.map((e) => e.id).join("+");

    console.log(
      `Fetching prices for events ${i + 1}-${Math.min(i + BATCH_SIZE, events.length)}...`,
    );

    try {
      const url = `${BASE}/${LANG}/async/performances/availabilities?prices=1&eids=${eids}&onlyActivities=false`;
      const res = await fetchRetry(url);
      const data = await res.json();

      for (const event of batch) {
        const avail = data[event.id];
        if (avail?.content) {
          const $ = cheerio.load(avail.content);
          const prices = [];
          $(".Prices-price").each((_, el) => {
            const text = $(el).text().trim();
            const match = text.match(/[\d,.]+/);
            if (match) prices.push(parseFloat(match[0].replace(",", ".")));
          });
          event.prices = prices;
        }
      }
    } catch (err) {
      console.warn(`  Failed to fetch prices: ${err.message}`);
    }

    if (i + BATCH_SIZE < events.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
}

// Keep only symphonic orchestral concerts and concertos
const ALLOWED_CATEGORIES = ["Symphonic Concert", "Concert"];

function isRelevantConcert(event) {
  if (event.timestamp === 0) return false;
  const cat = event.category.toLowerCase();
  if (ALLOWED_CATEGORIES.some((a) => cat === a.toLowerCase())) return true;
  // Also include if title/subtitle mentions concerto
  const text = `${event.title} ${event.subtitle}`.toLowerCase();
  if (text.includes("concerto") || text.includes("symphon")) return true;
  return false;
}

// Parse composers from subtitle: "Soloist1 - Soloist2 - Composer1, Composer2"
function parseComposers(subtitle) {
  if (!subtitle) return [];
  // Composers are typically after the last " - " separator
  const parts = subtitle.split(" - ");
  const composerPart = parts[parts.length - 1].trim();
  if (!composerPart) return [];
  return composerPart
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

// Build seat categories from prices (standard Philharmonie naming)
function buildSeatCategories(prices) {
  if (!prices.length) return [];
  const sorted = [...prices].sort((a, b) => a - b);
  const total = sorted.length;
  return sorted.map((price, i) => ({
    name: `Category ${total - i}`,
    price,
  }));
}

export async function scrapePhilharmonie() {
  console.log("=== Philharmonie de Paris Scraper ===\n");

  // Step 1: Fetch events
  const events = await fetchEvents();
  console.log(`\nTotal events fetched: ${events.length}`);

  // Step 2: Filter to relevant concerts
  const relevant = events.filter(isRelevantConcert);
  console.log(`After filtering: ${relevant.length} relevant concerts`);

  // Step 3: Fetch prices
  await fetchPrices(relevant);

  // Step 4: Enrich with composers and seat categories
  const concerts = relevant.map((e) => ({
    id: e.id,
    source: "philharmonie",
    title: e.title,
    date: e.date,
    category: e.category,
    composers: parseComposers(e.subtitle),
    subtitle: e.subtitle,
    description: e.description,
    venue: e.venue,
    prices: e.prices,
    seatCategories: buildSeatCategories(e.prices),
    detailUrl: e.detailUrl,
    imageUrl: e.imageUrl,
  }));

  // Deduplicate by id
  const unique = [...new Map(concerts.map((c) => [c.id, c])).values()];

  // Sort by date
  unique.sort((a, b) => new Date(a.date) - new Date(b.date));

  console.log(`\nFinal Philharmonie concerts: ${unique.length}`);
  return unique;
}

// Allow running standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapePhilharmonie()
    .then((concerts) => {
      const outDir = join(__dirname, "..", "public");
      mkdirSync(outDir, { recursive: true });
      const outPath = join(outDir, "concerts.json");
      writeFileSync(outPath, JSON.stringify(concerts, null, 2));
      console.log(`\nWritten to ${outPath}`);
    })
    .catch((err) => {
      console.error("Scraper failed:", err);
      process.exit(1);
    });
}
