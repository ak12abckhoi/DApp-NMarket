import { useParams } from "react-router-dom";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { usePendingWithdrawal, useWithdraw, useListNFT, useApproveNFT } from "@/hooks/useMarketplace";
import contracts from "@/config/contracts.json";
import { resolveIPFS, fetchMetadata } from "@/utils/ipfs";
import { generatePlaceholder } from "@/utils/placeholder";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface OwnedNFT {
  token_id: number;
  token_uri: string;
  nft_contract: string;
  listed: boolean;
  listing_id?: number;
  price?: string;
  // resolved after metadata fetch
  name?: string;
  image?: string;
}

export default function ProfilePage() {
  const { addr }                            = useParams<{ addr?: string }>();
  const { address: connected }              = useAccount();
  const address                             = addr || connected;
  const isOwn = !addr || addr.toLowerCase() === connected?.toLowerCase();

  const { data: pending }                          = usePendingWithdrawal(address);
  const { withdraw, isPending: isWithdrawing }     = useWithdraw();
  const { list, isPending: isListing }             = useListNFT();
  const { approve, isPending: isApproving }        = useApproveNFT();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ tokenId: "", price: "", type: "0", duration: "86400" });

  const [ownedNFTs, setOwnedNFTs]     = useState<OwnedNFT[]>([]);
  const [loadingNFTs, setLoadingNFTs] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoadingNFTs(true);
    fetch(`${API}/nfts/owned/${address}`)
      .then((r) => r.json())
      .then(async (d) => {
        const items: OwnedNFT[] = d.owned ?? [];
        // fetch metadata for each token in parallel
        const resolved = await Promise.all(
          items.map(async (nft) => {
            if (!nft.token_uri) return nft;
            const meta = await fetchMetadata(nft.token_uri);
            return {
              ...nft,
              name:  meta?.name  as string | undefined,
              image: meta?.image as string | undefined,
            };
          })
        );
        setOwnedNFTs(resolved);
      })
      .catch(() => {})
      .finally(() => setLoadingNFTs(false));
  }, [address]);

  const handleWithdraw = async () => {
    try { await withdraw(); toast.success("Withdrawn!"); }
    catch (e: any) { toast.error(e.shortMessage || "Failed"); }
  };

  const handleList = async () => {
    if (!form.tokenId || !form.price) return toast.error("Fill all fields");
    try {
      toast.loading("Approving...", { id: "list" });
      await approve(Number(form.tokenId));
      toast.loading("Listing...", { id: "list" });
      await list(
        contracts.NFTCollection,
        Number(form.tokenId),
        form.price,
        Number(form.type),
        form.type === "1" ? Number(form.duration) : undefined,
      );
      toast.success("Listed!", { id: "list" });
      setShowModal(false);
    } catch (e: any) { toast.error(e.shortMessage || "Failed", { id: "list" }); }
  };

  if (!address) return (
    <div className="text-center py-20 text-gray-500">Connect your wallet to view profile.</div>
  );

  return (
    <div className="max-w-4xl mx-auto">

      {/* Profile header */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-8 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl font-bold text-white">
          {address.slice(2, 4).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white font-mono">
            {address.slice(0, 6)}...{address.slice(-4)}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{isOwn ? "Your Profile" : "Collector"}</p>
        </div>
        {isOwn && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            + List NFT
          </button>
        )}
      </div>

      {/* Pending earnings */}
      {isOwn && (
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-8">
          <h2 className="font-semibold text-white mb-4">Pending Earnings</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-white">
                {pending ? formatEther(pending as bigint) : "0"} TEST
              </p>
              <p className="text-gray-500 text-sm mt-1">Available to withdraw</p>
            </div>
            <button
              onClick={handleWithdraw}
              disabled={isWithdrawing || !pending || (pending as bigint) === 0n}
              className="bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-medium px-5 py-2 rounded-xl transition-colors"
            >
              {isWithdrawing ? "Withdrawing..." : "Withdraw"}
            </button>
          </div>
        </div>
      )}

      {/* NFT collection */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="font-semibold text-white">My Collection</h2>
          {!loadingNFTs && (
            <span className="text-gray-500 text-sm">{ownedNFTs.length} item{ownedNFTs.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        {loadingNFTs ? (
          <div className="p-12 text-center text-gray-500 text-sm">Loading collection...</div>
        ) : ownedNFTs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-5xl mb-4">🖼️</p>
            <p className="text-sm">No NFTs in this wallet yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-6">
            {ownedNFTs.map((nft) => {
              const rawImg = nft.image ? resolveIPFS(nft.image) : "";
              const imgSrc = rawImg && rawImg !== "/placeholder.png"
                ? rawImg
                : generatePlaceholder(nft.token_id);
              const label  = nft.name || `NFT #${nft.token_id}`;
              return (
                <div
                  key={nft.token_id}
                  className={`group relative bg-gray-800 rounded-xl overflow-hidden border transition-all ${
                    nft.listed
                      ? "border-purple-500/40"
                      : "border-gray-700 hover:border-purple-500/60"
                  }`}
                >
                  {/* Listed badge */}
                  {nft.listed && (
                    <div className="absolute top-2 left-2 z-10 bg-purple-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                      Listed
                    </div>
                  )}

                  {/* Image */}
                  <div className="aspect-square bg-gray-700 overflow-hidden">
                    <img
                      src={imgSrc}
                      alt={label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <p className="text-white text-sm font-medium truncate">{label}</p>
                    <p className="text-gray-500 text-xs mt-0.5">Token #{nft.token_id}</p>
                    {nft.listed && nft.price && (
                      <p className="text-purple-400 text-xs mt-1 font-medium">
                        {Number(formatEther(BigInt(nft.price))).toFixed(4)} TEST
                      </p>
                    )}
                  </div>

                  {/* List for Sale button — only if not listed yet */}
                  {isOwn && !nft.listed && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => {
                          setForm((f) => ({ ...f, tokenId: String(nft.token_id) }));
                          setShowModal(true);
                        }}
                        className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                      >
                        List for Sale
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* List NFT modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-700 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">List NFT for Sale</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <div className="space-y-4">
              {[
                { label: "Token ID", key: "tokenId", type: "number", placeholder: "0" },
                { label: "Price (TEST)", key: "price", type: "number", placeholder: "0.1" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm text-gray-400 mb-1">{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="0">Fixed Price</option>
                  <option value="1">Auction</option>
                </select>
              </div>
              {form.type === "1" && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Duration</label>
                  <select
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="3600">1 Hour</option>
                    <option value="86400">1 Day</option>
                    <option value="604800">1 Week</option>
                  </select>
                </div>
              )}
              <button
                onClick={handleList}
                disabled={isListing || isApproving}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {isApproving ? "Approving..." : isListing ? "Listing..." : "List NFT"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
