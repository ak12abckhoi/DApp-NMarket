import { useParams } from "react-router-dom";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { useState } from "react";
import toast from "react-hot-toast";
import { usePendingWithdrawal, useWithdraw, useListNFT, useApproveNFT } from "@/hooks/useMarketplace";
import contracts from "@/config/contracts.json";

export default function ProfilePage() {
  const { addr }                        = useParams<{ addr?: string }>();
  const { address: connected, isConnected } = useAccount();
  const address                         = addr || connected;
  const isOwn = !addr || addr.toLowerCase() === connected?.toLowerCase();

  const { data: pending }           = usePendingWithdrawal(address);
  const { withdraw, isPending: isWithdrawing } = useWithdraw();
  const { list, isPending: isListing }         = useListNFT();
  const { approve, isPending: isApproving }    = useApproveNFT();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ tokenId: "", price: "", type: "0", duration: "86400" });

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
      await list(contracts.NFTCollection, Number(form.tokenId), form.price, Number(form.type),
        form.type === "1" ? Number(form.duration) : undefined);
      toast.success("Listed! 🎉", { id: "list" });
      setShowModal(false);
    } catch (e: any) { toast.error(e.shortMessage || "Failed", { id: "list" }); }
  };

  if (!address) return <div className="text-center py-20 text-gray-500">Connect your wallet to view profile.</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-8 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl font-bold text-white">
          {address.slice(2, 4).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white font-mono">{address.slice(0,6)}...{address.slice(-4)}</h1>
          <p className="text-gray-500 text-sm mt-1">{isOwn ? "Your Profile" : "Collector"}</p>
        </div>
        {isOwn && (
          <button onClick={() => setShowModal(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
            + List NFT
          </button>
        )}
      </div>

      {isOwn && (
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-8">
          <h2 className="font-semibold text-white mb-4">Pending Earnings</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-white">{pending ? formatEther(pending as bigint) : "0"} ETH</p>
              <p className="text-gray-500 text-sm mt-1">Available to withdraw</p>
            </div>
            <button onClick={handleWithdraw} disabled={isWithdrawing || !pending || (pending as bigint) === 0n}
              className="bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-medium px-5 py-2 rounded-xl transition-colors">
              {isWithdrawing ? "Withdrawing..." : "Withdraw"}
            </button>
          </div>
        </div>
      )}

      <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 text-center text-gray-500">
        <p className="text-4xl mb-3">🖼️</p>
        <p className="text-sm">NFT gallery — connect a subgraph or backend to show owned tokens.</p>
      </div>

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
                { label: "Price (ETH)", key: "price", type: "number", placeholder: "0.1" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm text-gray-400 mb-1">{label}</label>
                  <input type={type} placeholder={placeholder}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500" />
                </div>
              ))}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500">
                  <option value="0">Fixed Price</option>
                  <option value="1">Auction</option>
                </select>
              </div>
              {form.type === "1" && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Duration</label>
                  <select value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500">
                    <option value="3600">1 Hour</option>
                    <option value="86400">1 Day</option>
                    <option value="604800">1 Week</option>
                  </select>
                </div>
              )}
              <button onClick={handleList} disabled={isListing || isApproving}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
                {isApproving ? "Approving..." : isListing ? "Listing..." : "List NFT"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}