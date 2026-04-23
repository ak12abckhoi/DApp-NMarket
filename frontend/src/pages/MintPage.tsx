import { useState } from "react";
import { useAccount } from "wagmi";
import toast from "react-hot-toast";
import { useMintNFT, useMintPrice, usePublicMintEnabled } from "@/hooks/useMarketplace";
import { uploadFileToIPFS, uploadMetadataToIPFS } from "@/utils/ipfs";

export default function MintPage() {
  const { address, isConnected } = useAccount();
  const { data: mintPrice } = useMintPrice();
  const { data: mintEnabled } = usePublicMintEnabled();
  const { mint, isPending, isConfirming, isSuccess } = useMintNFT();

  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [preview, setPreview]         = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleMint = async () => {
    if (!isConnected)  return toast.error("Connect your wallet first");
    if (!name.trim())  return toast.error("Name is required");
    if (!imageFile)    return toast.error("Upload an image");
    if (!mintPrice)    return toast.error("Could not fetch mint price");
    if (!mintEnabled)  return toast.error("Public mint is not open yet");

    setIsUploading(true);
    const toastId = toast.loading("Uploading to IPFS...");

    try {
      const imageURI    = await uploadFileToIPFS(imageFile);
      const metadataURI = await uploadMetadataToIPFS({ name, description, image: imageURI, attributes: [] });

      setIsUploading(false);
      toast.loading("Minting NFT...", { id: toastId });
      await mint(address!, metadataURI, mintPrice as bigint);
      toast.success("NFT minted! 🎉", { id: toastId });

      setName(""); setDescription(""); setImageFile(null); setPreview(null);
    } catch (e: any) {
      setIsUploading(false);
      toast.error(e.message || "Minting failed", { id: toastId });
    }
  };

  const isBusy = isUploading || isPending || isConfirming;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Create NFT</h1>
        <p className="text-gray-400 mt-2">Upload your artwork and mint it on-chain.</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Artwork *</label>
          <div className="border-2 border-dashed border-gray-700 rounded-2xl p-8 text-center cursor-pointer hover:border-gray-600 transition-colors">
            <input type="file" accept="image/*" onChange={handleFile} className="hidden" id="file-input" />
            <label htmlFor="file-input" className="cursor-pointer">
              {preview ? (
                <div className="flex flex-col items-center gap-3">
                  <img src={preview} alt="preview" className="max-h-48 rounded-xl object-contain" />
                  <p className="text-gray-400 text-sm">Click to replace</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-gray-500">
                  <span className="text-5xl">🖼️</span>
                  <p className="text-sm">Click to upload image</p>
                  <p className="text-xs">PNG, JPG, GIF, WEBP</p>
                </div>
              )}
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="My Awesome NFT"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell the story of your NFT..." rows={4}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none" />
        </div>

        {mintPrice && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex justify-between">
            <span className="text-gray-400 text-sm">Mint Price</span>
            <span className="text-white font-semibold">{Number(mintPrice) / 1e18} TEST + gas</span>
          </div>
        )}

        <button onClick={handleMint} disabled={isBusy || !isConnected}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors text-lg">
          {isUploading ? "Uploading..." : isPending ? "Confirm in Wallet..." : isConfirming ? "Minting..." : isSuccess ? "✅ Minted!" : "Mint NFT"}
        </button>
      </div>
    </div>
  );
}