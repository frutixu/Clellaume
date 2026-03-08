import ConcertCard from "./ConcertCard";

export default function ConcertList({ concerts }) {
  if (concerts.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-cream/40 text-lg">
          No concerts match your filters.
        </p>
        <p className="text-cream/30 text-sm mt-1">
          Try adjusting your selection.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {concerts.map((concert) => (
        <ConcertCard key={concert.id} concert={concert} />
      ))}
    </div>
  );
}
