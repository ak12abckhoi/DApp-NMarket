import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { hardhat } from "wagmi/chains";
import { MARKETPLACE_ABI, NFT_COLLECTION_ABI } from "@/config/web3";
import contracts from "@/config/contracts.json";

const MARKETPLACE  = contracts.NFTMarketplace as `0x${string}`;
const NFT_CONTRACT = contracts.NFTCollection  as `0x${string}`;

export function useTotalListings() {
  return useReadContract({
    address: MARKETPLACE,
    abi: MARKETPLACE_ABI,
    functionName: "totalListings",
    chainId: hardhat.id,
    query: { enabled: true, refetchInterval: 3000 },
  });
}

export function useListing(listingId: number) {
  return useReadContract({
    address: MARKETPLACE,
    abi: MARKETPLACE_ABI,
    functionName: "getListing",
    args: [BigInt(listingId)],
    chainId: hardhat.id,
    query: { enabled: true },
  });
}

export function useMintPrice() {
  return useReadContract({
    address: NFT_CONTRACT,
    abi: NFT_COLLECTION_ABI,
    functionName: "mintPrice",
    chainId: hardhat.id,
  });
}

export function usePublicMintEnabled() {
  return useReadContract({
    address: NFT_CONTRACT,
    abi: NFT_COLLECTION_ABI,
    functionName: "publicMintEnabled",
    chainId: hardhat.id,
  });
}

export function usePendingWithdrawal(address?: string) {
  return useReadContract({
    address: MARKETPLACE,
    abi: MARKETPLACE_ABI,
    functionName: "pendingWithdrawals",
    args: address ? [address as `0x${string}`] : undefined,
    chainId: hardhat.id,
    query: { enabled: !!address },
  });
}

export function useMintNFT() {
  const { writeContractAsync, isPending, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const mint = async (to: string, tokenURI: string, mintPrice: bigint) => {
    return writeContractAsync({
      address: NFT_CONTRACT, abi: NFT_COLLECTION_ABI,
      functionName: "mint", args: [to as `0x${string}`, tokenURI], value: mintPrice,
    });
  };
  return { mint, isPending, isConfirming, isSuccess, hash };
}

export function useListNFT() {
  const { writeContractAsync, isPending, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const list = async (nftContract: string, tokenId: number, price: string, listingType: number, auctionDuration?: number) => {
    return writeContractAsync({
      address: MARKETPLACE, abi: MARKETPLACE_ABI,
      functionName: "listNFT",
      args: [nftContract as `0x${string}`, BigInt(tokenId), parseEther(price), listingType, BigInt(auctionDuration ?? 0)],
    });
  };
  return { list, isPending, isConfirming, isSuccess, hash };
}

export function useBuyNFT() {
  const { writeContractAsync, isPending, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const buy = async (listingId: number, price: bigint) => {
    return writeContractAsync({
      address: MARKETPLACE, abi: MARKETPLACE_ABI,
      functionName: "buyNFT", args: [BigInt(listingId)], value: price,
    });
  };
  return { buy, isPending, isConfirming, isSuccess, hash };
}

export function usePlaceBid() {
  const { writeContractAsync, isPending, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const bid = async (listingId: number, bidAmount: string) => {
    return writeContractAsync({
      address: MARKETPLACE, abi: MARKETPLACE_ABI,
      functionName: "placeBid", args: [BigInt(listingId)], value: parseEther(bidAmount),
    });
  };
  return { bid, isPending, isConfirming, isSuccess, hash };
}

export function useWithdraw() {
  const { writeContractAsync, isPending } = useWriteContract();
  const withdraw = async () => {
    return writeContractAsync({ address: MARKETPLACE, abi: MARKETPLACE_ABI, functionName: "withdraw" });
  };
  return { withdraw, isPending };
}

export function useApproveNFT() {
  const { writeContractAsync, isPending } = useWriteContract();
  const approve = async (tokenId: number) => {
    return writeContractAsync({
      address: NFT_CONTRACT, abi: NFT_COLLECTION_ABI,
      functionName: "approve", args: [MARKETPLACE, BigInt(tokenId)],
    });
  };
  return { approve, isPending };
}