import { useState, useEffect, useMemo } from "react";
import FilterBar from "./components/FilterBar";
import ConcertList from "./components/ConcertList";

export default function App() {
  const [concerts, setConcerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVenues, setSelectedVenues] = useState([]);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedComposers, setSelectedComposers] = useState([]);
  const [maxPrice, setMaxPrice] = useState(null);

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + "concerts.json")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load concerts");
        return r.json();
      })
      .then(setConcerts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const VENUE_LABELS = {
    philharmonie: "Philharmonie",
    "maison-radio": "Maison de la Radio",
  };

  const allVenues = useMemo(() => {
    const sources = new Set();
    for (const c of concerts) if (c.source) sources.add(c.source);
    return [...sources].sort();
  }, [concerts]);

  const allMonths = useMemo(() => {
    const months = new Set();
    for (const c of concerts) {
      const d = new Date(c.date);
      months.add(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      );
    }
    return [...months].sort();
  }, [concerts]);

  const allComposers = useMemo(() => {
    const composers = new Set();
    for (const c of concerts) {
      for (const comp of c.composers) composers.add(comp);
    }
    return [...composers].sort();
  }, [concerts]);

  const priceRange = useMemo(() => {
    let min = Infinity,
      max = 0;
    for (const c of concerts) {
      for (const p of c.prices) {
        if (p < min) min = p;
        if (p > max) max = p;
      }
    }
    return { min: min === Infinity ? 0 : min, max };
  }, [concerts]);

  const filtered = useMemo(() => {
    return concerts.filter((c) => {
      if (selectedVenues.length) {
        if (!selectedVenues.includes(c.source)) return false;
      }
      if (selectedMonths.length) {
        const d = new Date(c.date);
        const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!selectedMonths.includes(month)) return false;
      }
      if (selectedComposers.length) {
        if (!c.composers.some((comp) => selectedComposers.includes(comp)))
          return false;
      }
      if (maxPrice !== null && c.prices.length) {
        if (Math.min(...c.prices) > maxPrice) return false;
      }
      return true;
    });
  }, [concerts, selectedVenues, selectedMonths, selectedComposers, maxPrice]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gold text-xl animate-pulse">
          Loading concerts...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lipstick text-xl">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-navy-lighter bg-navy-light/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-cream">
            Clellaume
          </h1>
          <p className="text-cream/60 text-sm mt-1">
            Symphonic concerts in Paris
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <FilterBar
          allVenues={allVenues}
          venueLabels={VENUE_LABELS}
          selectedVenues={selectedVenues}
          onVenuesChange={setSelectedVenues}
          allMonths={allMonths}
          selectedMonths={selectedMonths}
          onMonthsChange={setSelectedMonths}
          allComposers={allComposers}
          selectedComposers={selectedComposers}
          onComposersChange={setSelectedComposers}
          priceRange={priceRange}
          maxPrice={maxPrice}
          onMaxPriceChange={setMaxPrice}
        />

        <div className="mt-2 mb-4 text-sm text-cream/50">
          {filtered.length} concert{filtered.length !== 1 ? "s" : ""} found
        </div>

        <ConcertList concerts={filtered} />
      </main>
    </div>
  );
}
