// ─── NFT ─────────────────────────────────────────────────────────────────────

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  attributes: NFTAttribute[];
}

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
}

export interface NFT {
  tokenId: number;
  contractAddress: string;
  owner: string;
  tokenURI: string;
  metadata?: NFTMetadata;
}

// ─── Listing ──────────────────────────────────────────────────────────────────

export enum ListingType {
  FixedPrice = 0,
  Auction    = 1,
}

export enum ListingStatus {
  Active    = 0,
  Sold      = 1,
  Cancelled = 2,
}

export interface Listing {
  listingId:     number;
  nftContract:   string;
  tokenId:       number;
  seller:        string;
  price:         bigint;
  endTime:       number;
  highestBidder: string;
  highestBid:    bigint;
  listingType:   ListingType;
  status:        ListingStatus;
  nft?:          NFT;
}

// ─── Filter ───────────────────────────────────────────────────────────────────

export type SortOption = "newest" | "oldest" | "price_asc" | "price_desc";

export interface MarketplaceFilters {
  listingType?: ListingType;
  minPrice?:    string;
  maxPrice?:    string;
  sort:         SortOption;
  search?:      string;
}