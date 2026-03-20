import { Link } from "react-router-dom";
import { formatEther } from "viem";
import { Listing, ListingType, ListingStatus } from "@/types";
import { resolveIPFS } from "@/utils/ipfs";

export default function NFTCard({ listing }: { listing: Listing }) {
  const isAuction = listing.listingType === ListingType.Auction;
  const isSold    = listing.status === ListingStatus.Sold;
  const image     = resolveIPFS(listing.nft?.metadata?.image || "");

  const timeLeft = () => {
    if (!isAuction || !listing.endTime) return null;
    const rem = listing.endTime * 1000 - Date.now();
    if (rem <= 0) return "Ended";
    const h = Math.floor(rem / 3_600_000);
    const m = Math.floor((rem % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
  };

  return (
    <Link to={`/nft/${listing.listingId}`}>
      <div className="relative group bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-900/20">
        <div className="aspect-square overflow-hidden bg-gray-800">
          {image ? (
            <img src={image} alt={listing.nft?.metadata?.name || `NFT #${listing.tokenId}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600 text-5xl">🖼️</div>
          )}
        </div>

        <div className="absolute top-3 left-3 flex gap-2">
          {isAuction && <span className="bg-orange-500 text-white text-xs font-semibold px-2 py-1 rounded-full">Auction</span>}
          {isSold    && <span className="bg-gray-700 text-gray-300 text-xs font-semibold px-2 py-1 rounded-full">Sold</span>}
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-white text-sm truncate">
            {listing.nft?.metadata?.name || `NFT #${listing.tokenId}`}
          </h3>
          <p className="text-gray-500 text-xs mt-0.5 font-mono truncate">
            {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
          </p>
          <div className="flex items-end justify-between mt-3">
            <div>
              <p className="text-gray-500 text-xs">
                {isAuction ? (listing.highestBid > 0n ? "Current Bid" : "Starting Bid") : "Price"}
              </p>
              <p className="text-white font-bold">
                {formatEther(isAuction && listing.highestBid > 0n ? listing.highestBid : listing.price)} ETH
              </p>
            </div>
            {isAuction && <p className="text-orange-400 text-xs font-medium">{timeLeft()}</p>}
          </div>
        </div>
      </div>
    </Link>
  );
}