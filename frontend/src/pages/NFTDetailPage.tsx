import { useParams } from "react-router-dom";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther, parseEther } from "viem";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useListing, useBuyNFT, usePlaceBid } from "@/hooks/useMarketplace";
import { Listing, ListingType, ListingStatus } from "@/types";
import { fetchMetadata, resolveIPFS } from "@/utils/ipfs";
import { MARKETPLACE_ABI } from "@/config/web3";
import contracts from "@/config/contracts.json";

// Hook settle auction
function useSettleAuction() {
  const { writeContractAsync, isPending, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const settle = async (listingId: number) => {
    return writeContractAsync({
      address: contracts.NFTMarketplace as `0x${string}`,
      abi: MARKETPLACE_ABI,
      functionName: "settleAuction",
      args: [BigInt(listingId)],
    });
  };
  return { settle, isPending, isConfirming, isSuccess };
}

export default function NFTDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { address, isConnected } = useAccount();
  const { data, isLoading } = useListing(Number(id));
  const { buy,    isPending: isBuying    } = useBuyNFT();
  const { bid,    isPending: isBidding   } = usePlaceBid();
  const { settle, isPending: isSettling  } = useSettleAuction();

  const [bidAmount, setBidAmount] = useState("");
  const [image, setImage]         = useState<string>("");
  const [nftName, setNftName]     = useState<string>("");

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return <div className="text-center text-gray-500 py-20">Listing not found.</div>;

  const listing: Listing = {
    listingId:     Number(id),
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

  const isAuction     = listing.listingType === ListingType.Auction;
  const isActive      = listing.status === ListingStatus.Active;
  const isSeller      = address?.toLowerCase() === listing.seller.toLowerCase();
  const isAuctionOver = isAuction && listing.endTime > 0 && Date.now() > listing.endTime * 1000;
  const canSettle     = isAuctionOver && isActive;

  // Minimum bid = max(price, highestBid) + 1 wei (contract yêu cầu phải > cả 2)
  const minBid = listing.highestBid > listing.price ? listing.highestBid : listing.price;
  const minBidEth = Number(formatEther(minBid));

  // Fetch ảnh + metadata
  useEffect(() => {
    if (!data) return;
    const load = async () => {
      try {
        const { createPublicClient, http } = await import("viem");
        const { localhost } = await import("viem/chains");
        const client = createPublicClient({ chain: localhost, transport: http() });
        const tokenURI = await client.readContract({
          address: listing.nftContract as `0x${string}`,
          abi: [{ name: "tokenURI", type: "function", stateMutability: "view",
                  inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "string" }] }],
          functionName: "tokenURI",
          args: [BigInt(listing.tokenId)],
        }) as string;
        const metadata = await fetchMetadata(tokenURI);
        if (metadata?.image) setImage(resolveIPFS(metadata.image));
        if (metadata?.name)  setNftName(metadata.name);
      } catch (e) {
        console.error("Failed to load metadata:", e);
      }
    };
    load();
  }, [data]);

  const handleBuy = async () => {
    if (!isConnected) return toast.error("Connect your wallet first");
    try {
      await buy(listing.listingId, listing.price);
      toast.success("Purchase successful! 🎉");
    } catch (e: any) { toast.error(e.shortMessage || "Transaction failed"); }
  };

  const handleBid = async () => {
    if (!bidAmount) return toast.error("Enter bid amount");
    const bidWei = parseEther(bidAmount);
    if (bidWei <= minBid) {
      return toast.error(`Bid must be > ${(minBidEth + 0.001).toFixed(4)} ETH`);
    }
    try {
      await bid(listing.listingId, bidAmount);
      toast.success("Bid placed! 🔥");
      setBidAmount("");
    } catch (e: any) { toast.error(e.shortMessage || "Bid failed"); }
  };

  const handleSettle = async () => {
    try {
      await settle(listing.listingId);
      toast.success("Auction settled! 🏆");
    } catch (e: any) { toast.error(e.shortMessage || "Settle failed"); }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid md:grid-cols-2 gap-10">

        {/* Ảnh NFT */}
        <div className="aspect-square bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden flex items-center justify-center">
          {image ? (
            <img src={image} alt={nftName || `NFT #${listing.tokenId}`}
              className="w-full h-full object-cover" />
          ) : (
            <div className="text-8xl">🖼️</div>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <p className="text-gray-500 text-sm font-mono">{listing.nftContract.slice(0,10)}...</p>
            <h1 className="text-3xl font-bold text-white mt-1">
              {nftName || `NFT #${listing.tokenId}`}
            </h1>
          </div>

          {/* Giá */}
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
            <p className="text-gray-500 text-sm mb-1">
              {isAuction ? (listing.highestBid > 0n ? "Current Bid" : "Starting Price") : "Price"}
            </p>
            <p className="text-3xl font-bold text-white">
              {formatEther(isAuction && listing.highestBid > 0n ? listing.highestBid : listing.price)} ETH
            </p>
            {isAuction && listing.endTime > 0 && (
              <p className="text-orange-400 text-sm mt-2">
                {isAuctionOver
                  ? "⏰ Auction ended"
                  : `⏳ Ends: ${new Date(listing.endTime * 1000).toLocaleString()}`}
              </p>
            )}
          </div>

          {/* Actions */}
          {isActive && !isSeller && isConnected && (
            <div className="flex flex-col gap-3">
              {!isAuction ? (
                <button onClick={handleBuy} disabled={isBuying}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
                  {isBuying ? "Processing..." : "Buy Now"}
                </button>
              ) : !isAuctionOver ? (
                <div className="flex flex-col gap-2">
                  <p className="text-gray-500 text-xs">
                    Min bid: &gt; {minBidEth.toFixed(4)} ETH
                  </p>
                  <div className="flex gap-2">
                    <input type="number" step="0.001" min={minBidEth + 0.001}
                      placeholder={`> ${minBidEth.toFixed(4)} ETH`}
                      value={bidAmount} onChange={(e) => setBidAmount(e.target.value)}
                      className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                    <button onClick={handleBid} disabled={isBidding}
                      className="bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
                      {isBidding ? "Placing..." : "Bid"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Settle auction button — ai cũng có thể gọi sau khi kết thúc */}
          {canSettle && (
            <button onClick={handleSettle} disabled={isSettling}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
              {isSettling ? "Settling..." : "🏆 Settle Auction"}
            </button>
          )}

          {!isConnected && (
            <p className="text-gray-500 text-center text-sm">Connect wallet to buy or bid</p>
          )}

          {/* Chi tiết */}
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 space-y-3">
            <h3 className="font-semibold text-white text-sm">Details</h3>
            {[
              { label: "Token ID", value: `#${listing.tokenId}` },
              { label: "Seller",   value: `${listing.seller.slice(0,10)}...` },
              { label: "Type",     value: isAuction ? "Auction" : "Fixed Price" },
              { label: "Status",   value: ["Active","Sold","Cancelled"][listing.status] },
              ...(isAuction && listing.highestBidder !== "0x0000000000000000000000000000000000000000"
                ? [{ label: "Top Bidder", value: `${listing.highestBidder.slice(0,10)}...` }]
                : []),
            ].map((item) => (
              <div key={item.label} className="flex justify-between text-sm">
                <span className="text-gray-500">{item.label}</span>
                <span className="text-white font-mono">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}