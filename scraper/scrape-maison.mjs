import * as cheerio from "cheerio";
import { writeFileSync } from "fs";

const BASE = "https://www.maisondelaradioetdelamusique.fr";

async function fetchRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; ClellaumerBot/1.0; concert-aggregator)",
          Accept: "text/html, application/json",
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

// French month names to numbers
const MONTHS = {
  janvier: 0, février: 1, mars: 2, avril: 3, mai: 4, juin: 5,
  juillet: 6, août: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11,
};

function parseFrenchDate(day, monthStr, year, timeStr) {
  const month = MONTHS[monthStr.toLowerCase()];
  if (month === undefined) return null;
  const d = parseInt(day, 10);
  const y = parseInt(year, 10);
  // Parse time like "20h00" or "19h30"
  let hours = 20, minutes = 0;
  const tm = timeStr.match(/(\d{1,2})h(\d{2})/);
  if (tm) {
    hours = parseInt(tm[1], 10);
    minutes = parseInt(tm[2], 10);
  }
  return new Date(y, month, d, hours, minutes);
}

// Scrape listing pages from /genre/symphonique
async function fetchListingPages() {
  const events = [];
  let page = 0;

  while (true) {
    const url = `${BASE}/genre/symphonique?page=${page}`;
    console.log(`Fetching listing page ${page}: ${url}`);

    const res = await fetchRetry(url);
    const html = await res.text();
    const $ = cheerio.load(html);

    const cards = $(".card.card--agenda");
    console.log(`  Found ${cards.length} cards`);
    if (cards.length === 0) break;

    cards.each((_, el) => {
      const $card = $(el);
      const wrapper = $card.closest(".observable-event");

      // Title
      const title = $card.find("h2.Bolder-XXL").text().trim();

      // Category
      const category = $card.find(".field_event_type").text().trim();

      // Soloists
      const soloists = [];
      $card.find(".field_soloist .paragraph--type--pg-evt-soloist a").each((_, a) => {
        const name = $(a).text().trim();
        if (name) soloists.push(name);
      });

      // Conductor
      const conductor = $card
        .find(".field_conductor .paragraph--type--pg-evt-condtr span:first-child")
        .text()
        .replace(/\s+/g, " ")
        .trim();

      // Venue
      const venue = $card.find(".Small.location").text().trim();

      // Date
      const day = $card.find(".Event-Day").text().trim();
      const month = $card.find(".Event-Month").text().trim();
      const year = $card.find(".Event-Year").text().trim();

      // Time from the Small div (not location)
      const timeText = $card
        .find(".card-footer-info .Small:not(.location)")
        .text()
        .trim();

      // Formation (orchestra name)
      const formation = $card
        .find(".more-info .c-inerit-a")
        .text()
        .replace(/^_/, "")
        .trim();

      // Detail link & session ID
      const detailHref = $card.find('a[href*="/evenement/"]').attr("href") || "";
      const sessionMatch = detailHref.match(/[?&]s=(\d+)/);
      const sessionId = sessionMatch ? sessionMatch[1] : "";

      // Image
      const imageUrl = $card.find(".card-img img").attr("src") || "";

      // Parse date
      const dateObj = parseFrenchDate(day, month, year, timeText);

      if (title && dateObj) {
        events.push({
          title,
          category,
          soloists,
          conductor,
          venue: venue || "Auditorium de Radio France",
          formation,
          date: dateObj.toISOString(),
          sessionId,
          detailPath: detailHref,
          detailUrl: detailHref ? `${BASE}${detailHref}` : "",
          imageUrl: imageUrl.startsWith("http")
            ? imageUrl
            : imageUrl
              ? `${BASE}${imageUrl}`
              : "",
        });
      }
    });

    // Check if there's a next page
    const hasNext = $('nav[aria-label="pagination-heading"] a[rel="next"]').length > 0;
    if (!hasNext) break;

    page++;
    await new Promise((r) => setTimeout(r, 500));
  }

  return events;
}

// Fetch composers from detail pages
async function fetchDetailData(events) {
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (!event.detailPath) continue;

    console.log(`  Detail ${i + 1}/${events.length}: ${event.detailPath}`);

    try {
      const res = await fetchRetry(`${BASE}${event.detailPath}`);
      const html = await res.text();
      const $ = cheerio.load(html);

      // Extract composers
      const composers = [];
      $(".paragraph--type--pg-evt-composer").each((_, el) => {
        const name = $(el).find(".Bolder-L a, .Bolder-L span").first().text().trim();
        if (name && !composers.includes(name)) composers.push(name);
      });
      event.composers = composers;

      // Extract node ID for pricing
      const settingsScript = $('script[data-drupal-selector="drupal-settings-json"]').text();
      if (settingsScript) {
        try {
          const settings = JSON.parse(settingsScript);
          const nodePath = settings?.path?.currentPath || "";
          const nodeMatch = nodePath.match(/node\/(\d+)/);
          event.nodeId = nodeMatch ? nodeMatch[1] : "";
        } catch {}
      }
    } catch (err) {
      console.warn(`    Failed: ${err.message}`);
      event.composers = [];
    }

    if (i < events.length - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
}

// Fetch pricing from AJAX endpoint
async function fetchPricing(events) {
  for (const event of events) {
    if (!event.nodeId || !event.sessionId) continue;

    try {
      const url = `${BASE}/ajax/evenement/${event.nodeId}/${event.sessionId}`;
      const res = await fetchRetry(url);
      const data = await res.json();

      if (data?.current?.prices) {
        const minMatch = String(data.current.prices.min).match(/[\d,.]+/);
        const maxMatch = String(data.current.prices.max).match(/[\d,.]+/);
        const min = minMatch ? parseFloat(minMatch[0].replace(",", ".")) : null;
        const max = maxMatch ? parseFloat(maxMatch[0].replace(",", ".")) : null;
        event.priceMin = min;
        event.priceMax = max;
        if (min !== null && max !== null) event.prices = [min, max];
        else if (min !== null) event.prices = [min];
        else event.prices = [];
      }

      if (data?.current?.free !== undefined) {
        event.prices = [0];
        event.priceMin = 0;
        event.priceMax = 0;
      }
    } catch {}
  }
}

export async function scrapeMaison() {
  console.log("\n=== Maison de la Radio Scraper ===\n");

  // Step 1: Fetch listings
  const events = await fetchListingPages();
  console.log(`\nTotal events from listings: ${events.length}`);

  // Step 2: Fetch detail pages for composers + node IDs
  console.log("\nFetching detail pages...");
  await fetchDetailData(events);

  // Step 3: Fetch pricing
  console.log("\nFetching pricing...");
  await fetchPricing(events);

  // Step 4: Build output
  const concerts = events.map((e, i) => ({
    id: `maison-${e.sessionId || i}`,
    source: "maison-radio",
    title: e.title,
    date: e.date,
    category: e.category,
    composers: e.composers || [],
    subtitle: [
      ...e.soloists.filter((s) => s !== e.conductor),
      e.conductor ? `${e.conductor} (dir.)` : "",
    ]
      .filter(Boolean)
      .join(", "),
    description: e.formation,
    venue: e.venue,
    prices: e.prices || [],
    seatCategories: [],
    detailUrl: e.detailUrl,
    imageUrl: e.imageUrl,
  }));

  // Deduplicate by session ID
  const unique = [...new Map(concerts.map((c) => [c.id, c])).values()];
  unique.sort((a, b) => new Date(a.date) - new Date(b.date));

  console.log(`\nFinal Maison de la Radio concerts: ${unique.length}`);
  return unique;
}

// Allow running standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeMaison()
    .then((concerts) => {
      writeFileSync("maison-concerts.json", JSON.stringify(concerts, null, 2));
      console.log("Written to maison-concerts.json");
    })
    .catch((err) => {
      console.error("Scraper failed:", err);
      process.exit(1);
    });
}
