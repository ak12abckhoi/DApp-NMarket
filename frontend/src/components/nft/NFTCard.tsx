import { Link } from "react-router-dom";
import { formatEther } from "viem";
import { Listing, ListingType, ListingStatus } from "@/types";
import { resolveIPFS } from "@/utils/ipfs";
import { generatePlaceholder } from "@/utils/placeholder";
import { useState, useEffect } from "react";

function useCountdown(endTime: number) {
  const [rem, setRem] = useState(() =>
    endTime > 0 ? endTime * 1000 - Date.now() : -1
  );

  useEffect(() => {
    if (endTime <= 0) return;
    setRem(endTime * 1000 - Date.now());
    const t = setInterval(() => setRem(endTime * 1000 - Date.now()), 1000);
    return () => clearInterval(t);
  }, [endTime]);

  if (endTime <= 0 || rem < 0) {
    return { label: "Ended", isEnded: true, isSoon: false, isVerySoon: false };
  }
  const h = Math.floor(rem / 3_600_000);
  const m = Math.floor((rem % 3_600_000) / 60_000);
  const s = Math.floor((rem % 60_000) / 1_000);
  return {
    label: h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`,
    isEnded: false,
    isSoon: h < 24,
    isVerySoon: h < 1,
  };
}

function EthIcon({ color }: { color: string }) {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 0L0 8.2L5 11L10 8.2L5 0Z" fill={color} />
      <path d="M5 11L0 8.2L5 16L10 8.2L5 11Z" fill={color} opacity="0.65" />
    </svg>
  );
}

export default function NFTCard({ listing }: { listing: Listing }) {
  const isAuction  = listing.listingType === ListingType.Auction;
  const isSold     = listing.status === ListingStatus.Sold;
  const hasBid     = isAuction && listing.highestBid > 0n;
  const rawImage   = resolveIPFS(listing.nft?.metadata?.image || "");
  const image      = rawImage && rawImage !== "/placeholder.png"
    ? rawImage
    : generatePlaceholder(listing.tokenId);

  const countdown   = useCountdown(isAuction ? (listing.endTime ?? 0) : 0);
  const isLive      = isAuction && !countdown.isEnded;
  const isVerySoon  = isLive && countdown.isVerySoon;

  const displayPrice = hasBid ? listing.highestBid : listing.price;
  const priceLabel   = isAuction ? (hasBid ? "Current Bid" : "Starting Bid") : "Price";
  const priceColor   = hasBid ? "#f97316" : "#a78bfa";

  // Border/glow theme
  const borderCls = isVerySoon
    ? "border-red-500/60 hover:border-red-400 hover:shadow-red-900/30"
    : isLive
      ? "border-orange-500/40 hover:border-orange-400/80 hover:shadow-orange-900/25"
      : "border-gray-800 hover:border-purple-500/50 hover:shadow-purple-900/20";

  return (
    <Link to={`/nft/${listing.listingId}`} className="block group">
      <div className={`relative bg-gray-900 rounded-2xl overflow-hidden border transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${borderCls}`}>

        {/* ── Image ── */}
        <div className="aspect-square overflow-hidden bg-gray-800 relative">
          <img
            src={image}
            alt={listing.nft?.metadata?.name || `NFT #${listing.tokenId}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />

          {/* Bottom gradient for countdown readability */}
          {isLive && (
            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          )}

          {/* Live countdown pill */}
          {isLive && (
            <div className="absolute bottom-2 inset-x-0 flex justify-center">
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm border ${
                isVerySoon
                  ? "bg-red-500/85 border-red-400/50 text-white"
                  : "bg-black/65 border-orange-500/30 text-orange-300"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isVerySoon ? "bg-white animate-ping" : "bg-orange-400 animate-pulse"
                }`} />
                {countdown.label}
              </span>
            </div>
          )}

          {/* Token ID chip top-right */}
          <div className="absolute top-2 right-2">
            <span className="bg-black/50 backdrop-blur-sm text-gray-300 text-[10px] font-mono px-1.5 py-0.5 rounded-md border border-white/10">
              #{listing.tokenId}
            </span>
          </div>
        </div>

        {/* ── Badges top-left ── */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {isLive && (
            <span className="flex items-center gap-1 bg-orange-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-lg shadow-orange-900/40">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
          )}
          {isVerySoon && (
            <span className="bg-red-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-lg shadow-red-900/40 animate-pulse">
              Ending Soon
            </span>
          )}
          {isAuction && countdown.isEnded && !isSold && (
            <span className="bg-gray-700/90 text-gray-300 text-[11px] font-semibold px-2 py-0.5 rounded-full">
              Ended
            </span>
          )}
          {isSold && (
            <span className="bg-gray-700/90 text-gray-300 text-[11px] font-semibold px-2 py-0.5 rounded-full">
              Sold
            </span>
          )}
        </div>

        {/* ── Info ── */}
        <div className="p-4">
          <h3 className="font-semibold text-white text-sm truncate leading-tight">
            {listing.nft?.metadata?.name || `NFT #${listing.tokenId}`}
          </h3>
          {listing.nft?.metadata?.description && (
            <p className="text-gray-400 text-xs mt-1 line-clamp-2 leading-relaxed">
              {listing.nft.metadata.description}
            </p>
          )}
          <p className="text-gray-600 text-xs mt-1 font-mono truncate">
            {listing.seller.slice(0, 6)}…{listing.seller.slice(-4)}
          </p>

          <div className="flex items-end justify-between mt-3 gap-2">
            <div className="min-w-0">
              <p className="text-gray-500 text-[10px] uppercase tracking-wider">{priceLabel}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <EthIcon color={priceColor} />
                <p className={`font-bold text-sm ${hasBid ? "text-orange-400" : "text-white"}`}>
                  {formatEther(displayPrice)} TEST
                </p>
              </div>
            </div>

            <div className="shrink-0">
              {!isAuction && (
                <span className="text-xs text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20 font-medium">
                  Buy Now
                </span>
              )}
              {isAuction && hasBid && isLive && (
                <span className="text-xs text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-lg border border-orange-500/20 font-medium">
                  Top Bid
                </span>
              )}
              {isAuction && !hasBid && isLive && (
                <span className="text-xs text-gray-400 bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-700 font-medium">
                  No Bids
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
