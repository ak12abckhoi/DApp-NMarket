import { useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { getWalletClient, switchChain } from "wagmi/actions";
import { parseEther } from "viem";
import { useState } from "react";
import { oasisSapphireTestnet, wagmiConfig } from "@/config/web3";
import { MARKETPLACE_ABI, NFT_COLLECTION_ABI } from "@/config/web3";
import contracts from "@/config/contracts.json";

const MARKETPLACE  = contracts.NFTMarketplace as `0x${string}`;
const NFT_CONTRACT = contracts.NFTCollection  as `0x${string}`;
const CHAIN_ID     = oasisSapphireTestnet.id;

// ─── Read hooks (không ảnh hưởng) ────────────────────────────────────────────

export function useTotalListings() {
  return useReadContract({
    address: MARKETPLACE,
    abi: MARKETPLACE_ABI,
    functionName: "totalListings",
    chainId: CHAIN_ID,
    query: { enabled: true, refetchInterval: 3000 },
  });
}

export function useListing(listingId: number) {
  return useReadContract({
    address: MARKETPLACE,
    abi: MARKETPLACE_ABI,
    functionName: "getListing",
    args: [BigInt(listingId)],
    chainId: CHAIN_ID,
    query: { enabled: true, refetchInterval: 3000 },
  });
}

export function useMintPrice() {
  return useReadContract({
    address: NFT_CONTRACT,
    abi: NFT_COLLECTION_ABI,
    functionName: "mintPrice",
    chainId: CHAIN_ID,
  });
}

export function usePublicMintEnabled() {
  return useReadContract({
    address: NFT_CONTRACT,
    abi: NFT_COLLECTION_ABI,
    functionName: "publicMintEnabled",
    chainId: CHAIN_ID,
  });
}

export function usePendingWithdrawal(address?: string) {
  return useReadContract({
    address: MARKETPLACE,
    abi: MARKETPLACE_ABI,
    functionName: "pendingWithdrawals",
    args: address ? [address as `0x${string}`] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: !!address },
  });
}

// ─── Write hook helper ────────────────────────────────────────────────────────
// Dùng walletClient.writeContract trực tiếp để bỏ qua wagmi simulateContract
// (wagmi v3 gọi simulateContract → eth_call trực tiếp đến Sapphire RPC → lỗi)

function useDirectWrite() {
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [isPending, setIsPending] = useState(false);
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const write = async (params: any) => {
    await switchChain(wagmiConfig, { chainId: oasisSapphireTestnet.id });
    const walletClient = await getWalletClient(wagmiConfig, { chainId: oasisSapphireTestnet.id });
    if (!walletClient) throw new Error("Wallet not connected");
    setIsPending(true);
    try {
      const h = await walletClient.writeContract(params);
      setHash(h);
      return h;
    } finally {
      setIsPending(false);
    }
  };

  return { write, isPending, isConfirming, isSuccess, hash };
}

// ─── Write hooks ──────────────────────────────────────────────────────────────

export function useMintNFT() {
  const { write, isPending, isConfirming, isSuccess, hash } = useDirectWrite();
  const mint = async (to: string, tokenURI: string, mintPrice: bigint) =>
    write({
      address: NFT_CONTRACT, abi: NFT_COLLECTION_ABI,
      functionName: "mint", args: [to as `0x${string}`, tokenURI],
      value: mintPrice, gas: BigInt(500_000),
    });
  return { mint, isPending, isConfirming, isSuccess, hash };
}

export function useListNFT() {
  const { write, isPending, isConfirming, isSuccess, hash } = useDirectWrite();
  const list = async (nftContract: string, tokenId: number, price: string, listingType: number, auctionDuration?: number) =>
    write({
      address: MARKETPLACE, abi: MARKETPLACE_ABI,
      functionName: "listNFT",
      args: [nftContract as `0x${string}`, BigInt(tokenId), parseEther(price), listingType, BigInt(auctionDuration ?? 0)],
      gas: BigInt(300_000),
    });
  return { list, isPending, isConfirming, isSuccess, hash };
}

export function useBuyNFT() {
  const { write, isPending, isConfirming, isSuccess, hash } = useDirectWrite();
  const buy = async (listingId: number, price: bigint) =>
    write({
      address: MARKETPLACE, abi: MARKETPLACE_ABI,
      functionName: "buyNFT", args: [BigInt(listingId)],
      value: price, gas: BigInt(200_000),
    });
  return { buy, isPending, isConfirming, isSuccess, hash };
}

export function usePlaceBid() {
  const { write, isPending, isConfirming, isSuccess, hash } = useDirectWrite();
  const bid = async (listingId: number, bidAmount: string) =>
    write({
      address: MARKETPLACE, abi: MARKETPLACE_ABI,
      functionName: "placeBid", args: [BigInt(listingId)],
      value: parseEther(bidAmount), gas: BigInt(200_000),
    });
  return { bid, isPending, isConfirming, isSuccess, hash };
}

export function useWithdraw() {
  const { write, isPending } = useDirectWrite();
  const withdraw = async () =>
    write({ address: MARKETPLACE, abi: MARKETPLACE_ABI, functionName: "withdraw", gas: BigInt(100_000) });
  return { withdraw, isPending };
}

export function useApproveNFT() {
  const { write, isPending } = useDirectWrite();
  const approve = async (tokenId: number) =>
    write({
      address: NFT_CONTRACT, abi: NFT_COLLECTION_ABI,
      functionName: "approve", args: [MARKETPLACE, BigInt(tokenId)],
      gas: BigInt(100_000),
    });
  return { approve, isPending };
}
