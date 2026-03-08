const SOURCE_LABELS = {
  philharmonie: "Philharmonie",
  "maison-radio": "Maison de la Radio",
};

const SOURCE_COLORS = {
  philharmonie: "bg-lipstick/20 text-lipstick",
  "maison-radio": "bg-blue-500/20 text-blue-400",
};

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function ConcertCard({ concert }) {
  const {
    title,
    date,
    source,
    composers,
    venue,
    prices,
    seatCategories,
    detailUrl,
    imageUrl,
  } = concert;

  return (
    <a
      href={detailUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-navy-light rounded-xl overflow-hidden border border-navy-lighter hover:border-gold/30 transition-all hover:shadow-lg hover:shadow-gold/5"
    >
      {imageUrl && (
        <div className="aspect-[16/9] overflow-hidden bg-navy-lighter relative">
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {source && (
            <span
              className={`absolute top-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-full ${SOURCE_COLORS[source] || "bg-navy/80 text-cream/70"}`}
            >
              {SOURCE_LABELS[source] || source}
            </span>
          )}
        </div>
      )}

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="px-2 py-0.5 rounded bg-gold/15 text-gold font-medium">
            {formatDate(date)}
          </span>
          <span className="text-cream/50">{formatTime(date)}</span>
        </div>

        <h3 className="font-serif text-lg font-semibold text-cream leading-snug group-hover:text-gold-light transition-colors">
          {title}
        </h3>

        {composers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {composers.map((c) => (
              <span
                key={c}
                className="text-xs px-2 py-0.5 rounded-full bg-navy-lighter text-cream/70"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        <p className="text-xs text-cream/40">{venue}</p>

        {prices.length > 0 && (
          <div className="pt-2 border-t border-navy-lighter">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-cream/40 mr-1">From</span>
              <span className="text-sm font-medium text-gold">
                &euro;{Math.min(...prices)}
              </span>
              <span className="text-xs text-cream/40 mx-1">to</span>
              <span className="text-sm font-medium text-gold">
                &euro;{Math.max(...prices)}
              </span>
            </div>
            {seatCategories.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {seatCategories.map((cat) => (
                  <span
                    key={cat.name}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-navy text-cream/50"
                    title={cat.name}
                  >
                    {cat.name}: &euro;{cat.price}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </a>
  );
}
