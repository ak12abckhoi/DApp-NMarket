import NFTCard from "./NFTCard";
import { Listing } from "@/types";

interface Props {
  listings: Listing[];
  isLoading?: boolean;
}

export default function NFTGrid({ listings, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square bg-gray-900 rounded-2xl animate-pulse border border-gray-800" />
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="text-5xl mb-4">🎨</p>
        <p className="text-lg">No listings yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {listings.map((l) => (
        <NFTCard key={l.listingId} listing={l} />
      ))}
    </div>
  );
}