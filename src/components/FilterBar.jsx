import { useState, useRef, useEffect } from "react";

function formatMonth(key) {
  const [year, month] = key.split("-");
  const d = new Date(year, parseInt(month) - 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function ComposerDropdown({
  allComposers,
  selectedComposers,
  onComposersChange,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = allComposers.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase()),
  );

  function toggle(composer) {
    if (selectedComposers.includes(composer)) {
      onComposersChange(selectedComposers.filter((c) => c !== composer));
    } else {
      onComposersChange([...selectedComposers, composer]);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-2 rounded-lg bg-navy-lighter text-cream text-sm border border-navy-lighter hover:border-gold/40 transition-colors cursor-pointer flex items-center gap-2"
      >
        <span>
          Composers
          {selectedComposers.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gold/20 text-gold text-xs">
              {selectedComposers.length}
            </span>
          )}
        </span>
        <svg
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 w-64 bg-navy-light border border-navy-lighter rounded-lg shadow-xl z-40 overflow-hidden">
          <div className="p-2 border-b border-navy-lighter">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search composers..."
              className="w-full px-2 py-1.5 rounded bg-navy text-cream text-sm border border-navy-lighter focus:outline-none focus:border-gold/50"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <p className="text-cream/40 text-sm px-2 py-2">
                No composers found
              </p>
            )}
            {filtered.map((composer) => (
              <label
                key={composer}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-navy-lighter cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedComposers.includes(composer)}
                  onChange={() => toggle(composer)}
                  className="accent-gold"
                />
                <span className="text-cream/90">{composer}</span>
              </label>
            ))}
          </div>
          {selectedComposers.length > 0 && (
            <div className="p-2 border-t border-navy-lighter">
              <button
                onClick={() => onComposersChange([])}
                className="text-xs text-gold hover:text-gold-light cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FilterBar({
  allVenues,
  venueLabels,
  selectedVenues,
  onVenuesChange,
  allMonths,
  selectedMonths,
  onMonthsChange,
  allComposers,
  selectedComposers,
  onComposersChange,
  priceRange,
  maxPrice,
  onMaxPriceChange,
}) {
  function toggle(list, item, setter) {
    setter(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  }

  const hasActiveFilters =
    selectedVenues.length > 0 ||
    selectedMonths.length > 0 ||
    selectedComposers.length > 0 ||
    maxPrice !== null;

  function clearAll() {
    onVenuesChange([]);
    onMonthsChange([]);
    onComposersChange([]);
    onMaxPriceChange(null);
  }

  return (
    <div className="space-y-3">
      {/* Venue pills */}
      {allVenues.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-cream/50 uppercase tracking-wide mr-1">
            Venue
          </span>
          {allVenues.map((v) => (
            <button
              key={v}
              onClick={() => toggle(selectedVenues, v, onVenuesChange)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors cursor-pointer ${
                selectedVenues.includes(v)
                  ? "bg-gold text-navy font-medium"
                  : "bg-navy-lighter text-cream/70 hover:text-cream"
              }`}
            >
              {venueLabels[v] || v}
            </button>
          ))}
        </div>
      )}

      {/* Month pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-cream/50 uppercase tracking-wide mr-1">
          Month
        </span>
        {allMonths.map((month) => (
          <button
            key={month}
            onClick={() => toggle(selectedMonths, month, onMonthsChange)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors cursor-pointer ${
              selectedMonths.includes(month)
                ? "bg-gold text-navy font-medium"
                : "bg-navy-lighter text-cream/70 hover:text-cream"
            }`}
          >
            {formatMonth(month)}
          </button>
        ))}
      </div>

      {/* Composer dropdown + Price slider */}
      <div className="flex flex-wrap items-center gap-4">
        <ComposerDropdown
          allComposers={allComposers}
          selectedComposers={selectedComposers}
          onComposersChange={onComposersChange}
        />

        {priceRange.max > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-cream/50 uppercase tracking-wide">
              Max price
            </span>
            <input
              type="range"
              min={priceRange.min}
              max={priceRange.max}
              value={maxPrice ?? priceRange.max}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                onMaxPriceChange(val >= priceRange.max ? null : val);
              }}
              className="w-32 accent-gold"
            />
            <span className="text-sm text-cream/70 min-w-[4rem]">
              {maxPrice !== null ? `\u20AC${maxPrice}` : "Any"}
            </span>
          </div>
        )}

        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="text-xs text-lipstick hover:text-lipstick/80 cursor-pointer ml-auto"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
