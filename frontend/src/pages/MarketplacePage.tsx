import { useState } from "react";
import { useTotalListings, useListing } from "@/hooks/useMarketplace";
import NFTGrid from "@/components/nft/NFTGrid";
import { Listing, ListingStatus } from "@/types";

function useAllListings(total: number) {
  const ids = Array.from({ length: Math.min(total, 20) }, (_, i) => i);
  return ids;
}

export default function MarketplacePage() {
  const [search, setSearch] = useState("");
  const { data: total = 0n, isLoading, isError, error } = useTotalListings();
  console.log("totalListings:", { total, isLoading, isError, error });
  const ids = useAllListings(Number(total));

  return (
    <div>
      <div className="text-center py-16">
        <h1 className="text-5xl font-bold text-white mb-4">
          Discover & Collect<span className="text-purple-400"> Unique NFTs</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Buy, sell, and auction digital assets on a fully decentralized marketplace.
        </p>
      </div>

      <div className="flex gap-4 mb-8">
        <input
          type="text"
          placeholder="Search NFTs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
        <select className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500">
          <option>All Types</option>
          <option>Fixed Price</option>
          <option>Auction</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Listings", value: total.toString() },
          { label: "Platform Fee", value: "2.5%" },
          { label: "Network", value: "Localhost" },
        ].map((s) => (
          <div key={s.label} className="bg-gray-900 rounded-xl p-4 text-center border border-gray-800">
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-gray-500 text-sm mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <ListingsGrid ids={ids} />
    </div>
  );
}

function ListingsGrid({ ids }: { ids: number[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {ids.map((id) => <ListingLoader key={id} id={id} />)}
    </div>
  );
}

function ListingLoader({ id }: { id: number }) {
  const { data, isLoading } = useListing(id);

  if (isLoading) return <div className="aspect-square bg-gray-900 rounded-2xl animate-pulse border border-gray-800" />;
  if (!data) return null;

  const listing: Listing = {
    listingId:     id,
    nftContract:   data[1] as string,
    tokenId:       Number(data[2]),
    seller:        data[3] as string,
    price:         data[4] as bigint,
    endTime:       Number(data[5]),
    highestBidder: data[6] as string,
    highestBid:    data[7] as bigint,
    listingType:   Number(data[8]),
    status:        Number(data[9]),
  };

  if (listing.status !== ListingStatus.Active) return null;

  return (
    <a href={`/nft/${listing.listingId}`} className="block group bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-purple-500/50 transition-all cursor-pointer">
      <div className="aspect-square bg-gray-800 flex items-center justify-center text-4xl">🖼️</div>
      <div className="p-4">
        <p className="text-white font-semibold text-sm">NFT #{listing.tokenId}</p>
        <p className="text-gray-500 text-xs font-mono mt-1">{listing.seller.slice(0,6)}...{listing.seller.slice(-4)}</p>
        <p className="text-purple-400 font-bold mt-2">
          {listing.listingType === 1 && listing.highestBid > 0n
            ? `${Number(listing.highestBid) / 1e18} ETH (bid)`
            : `${Number(listing.price) / 1e18} ETH`}
        </p>
        {listing.listingType === 1 && (
          <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full mt-1 inline-block">Auction</span>
        )}
      </div>
    </a>
  );
}