import { useTotalListings, useListing } from "@/hooks/useMarketplace";
import { Listing, ListingStatus, ListingType } from "@/types";
import { useState, useEffect, useCallback, useRef } from "react";
import { fetchMetadata } from "@/utils/ipfs";
import NFTCard from "@/components/nft/NFTCard";
import { useAccount } from "wagmi";
import { formatEther } from "viem";

type FilterType = "all" | "fixed" | "auction" | "ending_soon";
type SortBy     = "newest" | "oldest" | "price_asc" | "price_desc";

const MAX_LISTINGS = 50;

function useAllListingIds(total: number) {
  const count = Math.min(total, MAX_LISTINGS);
  return Array.from({ length: count }, (_, i) => total - 1 - i);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarketplacePage() {
  const { address } = useAccount();
  const { data: total = 0n, isLoading: totalLoading } = useTotalListings();
  const ids = useAllListingIds(Number(total));

  // Collected listing data from async loaders
  const [listings, setListings]     = useState<Record<number, Listing>>({});
  const [loadedCount, setLoadedCount] = useState(0);

  // Filter / sort state
  const [search,     setSearch]     = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [sort,       setSort]       = useState<SortBy>("newest");
  const [minPrice,   setMinPrice]   = useState("");
  const [maxPrice,   setMaxPrice]   = useState("");
  const [excludeOwn, setExcludeOwn] = useState(false);

  // Stable callback for child loaders to report loaded listings
  const handleLoad = useCallback((id: number, listing: Listing | null) => {
    setLoadedCount(c => c + 1);
    if (listing) setListings(prev => ({ ...prev, [id]: listing }));
  }, []);

  const now = Date.now();
  const allActive = Object.values(listings).filter(l => l.status === ListingStatus.Active);

  // Derived stats
  const auctionCount     = allActive.filter(l => l.listingType === ListingType.Auction).length;
  const endingSoonCount  = allActive.filter(l => {
    if (l.listingType !== ListingType.Auction) return false;
    const rem = l.endTime * 1000 - now;
    return rem > 0 && rem <= 24 * 3_600_000;
  }).length;

  // Filter + sort pipeline
  const ethOf = (l: Listing) =>
    parseFloat(formatEther(l.listingType === ListingType.Auction && l.highestBid > 0n
      ? l.highestBid
      : l.price));

  const filtered = allActive
    .filter(l => {
      if (search) {
        const name = (l.nft?.metadata?.name || `NFT #${l.tokenId}`).toLowerCase();
        if (!name.includes(search.toLowerCase())) return false;
      }
      if (filterType === "fixed"   && l.listingType !== ListingType.FixedPrice) return false;
      if (filterType === "auction" && l.listingType !== ListingType.Auction)    return false;
      if (filterType === "ending_soon") {
        if (l.listingType !== ListingType.Auction) return false;
        const rem = l.endTime * 1000 - now;
        if (rem <= 0 || rem > 24 * 3_600_000) return false;
      }
      if (excludeOwn && address && l.seller.toLowerCase() === address.toLowerCase()) return false;
      const p = ethOf(l);
      if (minPrice && !isNaN(parseFloat(minPrice)) && p < parseFloat(minPrice)) return false;
      if (maxPrice && !isNaN(parseFloat(maxPrice)) && p > parseFloat(maxPrice)) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sort) {
        case "oldest":    return a.listingId - b.listingId;
        case "price_asc": return ethOf(a) - ethOf(b);
        case "price_desc":return ethOf(b) - ethOf(a);
        default:          return b.listingId - a.listingId;
      }
    });

  const isLoading = totalLoading || (ids.length > 0 && loadedCount < ids.length);
  const hasActiveFilters = search || filterType !== "all" || minPrice || maxPrice || excludeOwn;

  const clearFilters = () => {
    setSearch(""); setFilterType("all"); setMinPrice(""); setMaxPrice(""); setExcludeOwn(false);
  };

  return (
    <div className="max-w-7xl mx-auto">

      {/* ── Hero ── */}
      <div className="text-center py-14">
        <h1 className="text-5xl font-bold text-white mb-4">
          Discover & Collect<span className="text-purple-400"> Unique NFTs</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Buy, sell, and auction digital assets on a fully decentralized marketplace.
        </p>
      </div>

      {/* ── Search ── */}
      <div className="relative mb-4">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-11 pr-10 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>

      {/* ── Filters row ── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">

        {/* Type tabs */}
        {(["all", "fixed", "auction", "ending_soon"] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilterType(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              filterType === f
                ? "bg-purple-600 text-white shadow-lg shadow-purple-900/30"
                : "bg-gray-900 text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-white"
            }`}
          >
            {f === "all"          && "All"}
            {f === "fixed"        && "Fixed Price"}
            {f === "auction"      && "Auction"}
            {f === "ending_soon"  && `Ending Soon${endingSoonCount > 0 ? ` (${endingSoonCount})` : ""}`}
          </button>
        ))}

        {/* Right-side controls */}
        <div className="ml-auto flex flex-wrap items-center gap-2">

          {/* Sort */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortBy)}
            className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 cursor-pointer"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
          </select>

          {/* Price range */}
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2">
            <input
              type="number"
              placeholder="Min TEST"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              className="w-20 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
              min="0"
              step="0.001"
            />
            <span className="text-gray-600 select-none">–</span>
            <input
              type="number"
              placeholder="Max TEST"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              className="w-20 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
              min="0"
              step="0.001"
            />
          </div>

          {/* Exclude my NFTs — only when wallet connected */}
          {address && (
            <button
              onClick={() => setExcludeOwn(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                excludeOwn
                  ? "bg-indigo-600 text-white border border-indigo-500 shadow shadow-indigo-900/30"
                  : "bg-gray-900 text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-white"
              }`}
            >
              {excludeOwn && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              Exclude Mine
            </button>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 rounded-xl p-4 text-center border border-gray-800">
          <p className="text-2xl font-bold text-white">{allActive.length}</p>
          <p className="text-gray-500 text-sm mt-1">Active Listings</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 text-center border border-gray-800">
          <p className="text-2xl font-bold text-orange-400">{auctionCount}</p>
          <p className="text-gray-500 text-sm mt-1">Live Auctions</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 text-center border border-gray-800">
          <p className={`text-2xl font-bold ${endingSoonCount > 0 ? "text-red-400" : "text-gray-600"}`}>
            {endingSoonCount}
          </p>
          <p className="text-gray-500 text-sm mt-1">Ending in 24h</p>
        </div>
      </div>

      {/* ── Results bar ── */}
      <div className="flex items-center justify-between mb-5 min-h-5">
        <p className="text-gray-400 text-sm">
          {isLoading
            ? `Loading… ${loadedCount}/${ids.length}`
            : `Showing ${filtered.length} result${filtered.length !== 1 ? "s" : ""}`}
        </p>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            Clear filters ×
          </button>
        )}
      </div>

      {/* ── Hidden data fetchers (wagmi hooks in components) ── */}
      {ids.map(id => (
        <ListingDataFetcher key={id} id={id} onLoad={handleLoad} />
      ))}

      {/* ── Grid ── */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map(l => <NFTCard key={l.listingId} listing={l} />)}
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-900 rounded-2xl animate-pulse border border-gray-800" />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 text-gray-500">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-lg font-medium text-gray-400">No NFTs found</p>
          <p className="text-sm mt-1">
            {hasActiveFilters ? "Try adjusting your filters or search term." : "No active listings yet."}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Pure data fetcher — renders nothing, calls onLoad when ready ─────────────

function ListingDataFetcher({
  id,
  onLoad,
}: {
  id: number;
  onLoad: (id: number, listing: Listing | null) => void;
}) {
  const { data } = useListing(id);
  const doneRef  = useRef(false);

  useEffect(() => {
    if (!data || doneRef.current) return;

    const base: Listing = {
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

    if (base.status !== ListingStatus.Active) {
      doneRef.current = true;
      onLoad(id, null);
      return;
    }

    (async () => {
      try {
        const { createPublicClient, http } = await import("viem");
        const { oasisSapphireTestnet }     = await import("@/config/web3");
        const client = createPublicClient({
          chain:     oasisSapphireTestnet,
          transport: http("https://testnet.sapphire.oasis.io"),
        });

        const tokenURI = await client.readContract({
          address: base.nftContract as `0x${string}`,
          abi: [{
            name: "tokenURI", type: "function", stateMutability: "view",
            inputs:  [{ name: "tokenId", type: "uint256" }],
            outputs: [{ type: "string" }],
          }],
          functionName: "tokenURI",
          args: [BigInt(base.tokenId)],
        }) as string;

        const metadata = await fetchMetadata(tokenURI);

        doneRef.current = true;
        onLoad(id, {
          ...base,
          nft: {
            tokenId:         base.tokenId,
            contractAddress: base.nftContract,
            owner:           base.seller,
            tokenURI,
            metadata: {
              name:        metadata?.name        || `NFT #${base.tokenId}`,
              description: metadata?.description || "",
              image:       metadata?.image       || "",
            },
          },
        });
      } catch {
        doneRef.current = true;
        onLoad(id, base);
      }
    })();
  }, [data, id]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
