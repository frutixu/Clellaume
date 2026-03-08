# Clellaume

A static web app displaying symphonic concerts at the **Philharmonie de Paris**, hosted on GitHub Pages.

## Architecture

- **Scraper** (`scraper/scrape.mjs`) — Node.js script that fetches concert data from the Philharmonie de Paris website and writes `public/concerts.json`
- **Frontend** (Vite + React + Tailwind CSS) — Reads `concerts.json` and displays an interactive, filterable concert listing
- **GitHub Actions** — Daily cron job runs the scraper, commits updates, and deploys to GitHub Pages

## Local Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
npm install
```

### Run the scraper

```bash
npm run scrape
```

This fetches the latest concert data and writes it to `public/concerts.json`.

### Start the dev server

```bash
npm run dev
```

Opens a local Vite dev server (usually at `http://localhost:5173`).

### Build for production

```bash
npm run build
```

Output goes to `dist/`.

## Deployment

Push to `main` and the GitHub Actions workflow will:

1. Run the scraper and commit any data changes
2. Build the Vite app
3. Deploy to GitHub Pages

The scraper also runs daily at 6 AM UTC via cron.

### GitHub Pages Setup

1. Go to **Settings > Pages** in your repository
2. Set **Source** to **GitHub Actions**

### Important: Base URL

The `vite.config.js` sets `base: "/Clellaume/"` to match the GitHub Pages URL pattern (`username.github.io/Clellaume`). If your repo name differs, update this value.

## Filters

- **Month** — Filter by month (pill buttons)
- **Composer** — Searchable multi-select dropdown
- **Max Price** — Slider to filter concerts by the cheapest available ticket
