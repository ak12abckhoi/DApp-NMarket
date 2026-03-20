import { http, createConfig } from "wagmi";
import { hardhat, sepolia, mainnet } from "wagmi/chains";
import { injected, metaMask } from "wagmi/connectors";
import { parseAbi } from "viem";

export const wagmiConfig = createConfig({
  chains: [hardhat, sepolia, mainnet],
  connectors: [injected(), metaMask()],
  transports: {
    [hardhat.id]:  http("http://127.0.0.1:8545"),
    [sepolia.id]:  http(import.meta.env.VITE_SEPOLIA_RPC_URL || ""),
    [mainnet.id]:  http(import.meta.env.VITE_MAINNET_RPC_URL || ""),
  },
});

export const NFT_COLLECTION_ABI = parseAbi([
  "function mint(address to, string uri) payable returns (uint256)",
  "function whitelistMint(string uri) payable returns (uint256)",
  "function ownerMint(address to, string uri) returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function remaining() view returns (uint256)",
  "function maxSupply() view returns (uint256)",
  "function mintPrice() view returns (uint256)",
  "function whitelistPrice() view returns (uint256)",
  "function publicMintEnabled() view returns (bool)",
  "function whitelistMintEnabled() view returns (bool)",
  "function whitelist(address) view returns (bool)",
  "function approve(address to, uint256 tokenId)",
  "function royaltyInfo(uint256 tokenId, uint256 salePrice) view returns (address, uint256)",
  "event Minted(address indexed to, uint256 indexed tokenId, string tokenURI)",
]);

export const MARKETPLACE_ABI = parseAbi([
  "function listNFT(address nftContract, uint256 tokenId, uint256 price, uint8 listingType, uint256 auctionDuration) returns (uint256)",
  "function buyNFT(uint256 listingId) payable",
  "function placeBid(uint256 listingId) payable",
  "function settleAuction(uint256 listingId)",
  "function cancelListing(uint256 listingId)",
  "function withdraw()",
  "function getListing(uint256 listingId) view returns (uint256, address, uint256, address, uint256, uint256, address, uint256, uint8, uint8)",
  "function totalListings() view returns (uint256)",
  "function platformFeePercent() view returns (uint256)",
  "function pendingWithdrawals(address) view returns (uint256)",
  "event Listed(uint256 indexed listingId, address indexed nftContract, uint256 indexed tokenId, address seller, uint256 price, uint8 listingType)",
  "event Sale(uint256 indexed listingId, address buyer, uint256 price)",
  "event BidPlaced(uint256 indexed listingId, address bidder, uint256 amount)",
]);

export const FACTORY_ABI = parseAbi([
  "function createCollection(string name, string symbol, uint256 maxSupply, uint256 mintPrice, uint256 whitelistPrice, uint256 maxWLPerWallet, uint96 royaltyBps) payable returns (address)",
  "function totalCollections() view returns (uint256)",
  "function deployFee() view returns (uint256)",
  "event CollectionCreated(address indexed collection, address indexed creator, string name, string symbol)",
]);