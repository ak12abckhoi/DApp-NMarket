import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const ETH = (n: string) => ethers.parseEther(n);
const MINT_PRICE  = ETH("0.01");
const LIST_PRICE  = ETH("0.1");
const PLATFORM_FEE = 250n;
const ROYALTY_BPS  = 500n;
const ONE_DAY = 86400;

async function deployAll() {
  const [owner, creator, seller, buyer, bidder1, bidder2] = await ethers.getSigners();

  const nft = await (await ethers.getContractFactory("NFTCollection")).deploy(
    "TestNFT", "TNFT", 1000n, MINT_PRICE, ETH("0.005"), 3n, creator.address, ROYALTY_BPS
  );

  const market = await (await ethers.getContractFactory("NFTMarketplace")).deploy(
    PLATFORM_FEE, owner.address
  );

  const factory = await (await ethers.getContractFactory("NFTFactory")).deploy(
    owner.address, ETH("0.005")
  );

  return { nft, market, factory, owner, creator, seller, buyer, bidder1, bidder2 };
}

// ─── NFTCollection ────────────────────────────────────────────────────────────

describe("NFTCollection", () => {
  it("has correct initial state", async () => {
    const { nft } = await deployAll();
    expect(await nft.name()).to.equal("TestNFT");
    expect(await nft.mintPrice()).to.equal(MINT_PRICE);
    expect(await nft.maxSupply()).to.equal(1000n);
  });

  it("owner can mint for free", async () => {
    const { nft, owner, buyer } = await deployAll();
    await nft.connect(owner).ownerMint(buyer.address, "ipfs://uri1");
    expect(await nft.ownerOf(0n)).to.equal(buyer.address);
  });

  it("public mint works with correct payment", async () => {
    const { nft, owner, seller } = await deployAll();
    await nft.connect(owner).togglePublicMint();
    await nft.connect(seller).mint(seller.address, "ipfs://uri1", { value: MINT_PRICE });
    expect(await nft.ownerOf(0n)).to.equal(seller.address);
    expect(await nft.totalSupply()).to.equal(1n);
  });

  it("public mint reverts when disabled", async () => {
    const { nft, seller } = await deployAll();
    await expect(
      nft.connect(seller).mint(seller.address, "ipfs://uri", { value: MINT_PRICE })
    ).to.be.revertedWith("Public mint closed");
  });

  it("public mint reverts on insufficient payment", async () => {
    const { nft, owner, seller } = await deployAll();
    await nft.connect(owner).togglePublicMint();
    await expect(
      nft.connect(seller).mint(seller.address, "ipfs://uri", { value: ETH("0.001") })
    ).to.be.revertedWith("Insufficient payment");
  });

  it("whitelist mint works", async () => {
    const { nft, owner, buyer } = await deployAll();
    await nft.connect(owner).toggleWhitelistMint();
    await nft.connect(owner).setWhitelist(buyer.address, true);
    await nft.connect(buyer).whitelistMint("ipfs://uri1", { value: ETH("0.005") });
    expect(await nft.ownerOf(0n)).to.equal(buyer.address);
  });

  it("whitelist mint reverts if not whitelisted", async () => {
    const { nft, owner, seller } = await deployAll();
    await nft.connect(owner).toggleWhitelistMint();
    await expect(
      nft.connect(seller).whitelistMint("ipfs://uri", { value: ETH("0.005") })
    ).to.be.revertedWith("Not whitelisted");
  });

  it("returns correct royalty info", async () => {
    const { nft, owner, creator } = await deployAll();
    await nft.connect(owner).ownerMint(owner.address, "ipfs://uri");
    const [receiver, amount] = await nft.royaltyInfo(0n, ETH("1"));
    expect(receiver).to.equal(creator.address);
    expect(amount).to.equal(ETH("0.05"));
  });
});

// ─── NFTMarketplace Fixed Price ───────────────────────────────────────────────

describe("NFTMarketplace — Fixed Price", () => {
  async function setup() {
    const ctx = await deployAll();
    await ctx.nft.connect(ctx.owner).ownerMint(ctx.seller.address, "ipfs://uri");
    await ctx.nft.connect(ctx.seller).approve(await ctx.market.getAddress(), 0n);
    return ctx;
  }

  it("seller can list NFT", async () => {
    const { nft, market, seller } = await setup();
    await market.connect(seller).listNFT(await nft.getAddress(), 0n, LIST_PRICE, 0, 0);
    expect(await nft.ownerOf(0n)).to.equal(await market.getAddress());
  });

  it("buyer can purchase NFT", async () => {
    const { nft, market, seller, buyer } = await setup();
    await market.connect(seller).listNFT(await nft.getAddress(), 0n, LIST_PRICE, 0, 0);
    await market.connect(buyer).buyNFT(0n, { value: LIST_PRICE });
    expect(await nft.ownerOf(0n)).to.equal(buyer.address);
  });

  it("distributes fee + royalty + seller proceeds correctly", async () => {
    const { nft, market, owner, seller, buyer } = await setup();
    await market.connect(seller).listNFT(await nft.getAddress(), 0n, LIST_PRICE, 0, 0);
    await market.connect(buyer).buyNFT(0n, { value: LIST_PRICE });

    const fee     = LIST_PRICE * PLATFORM_FEE / 10000n;
    const royalty = LIST_PRICE * ROYALTY_BPS  / 10000n;
    const proceeds= LIST_PRICE - fee - royalty;

    expect(await market.pendingWithdrawals(owner.address)).to.equal(fee);
    expect(await market.pendingWithdrawals(seller.address)).to.equal(proceeds);
  });

  it("seller can withdraw proceeds", async () => {
    const { nft, market, seller, buyer } = await setup();
    await market.connect(seller).listNFT(await nft.getAddress(), 0n, LIST_PRICE, 0, 0);
    await market.connect(buyer).buyNFT(0n, { value: LIST_PRICE });
    const before = await ethers.provider.getBalance(seller.address);
    await market.connect(seller).withdraw();
    expect(await ethers.provider.getBalance(seller.address)).to.be.gt(before);
  });

  it("reverts on insufficient payment", async () => {
    const { nft, market, seller, buyer } = await setup();
    await market.connect(seller).listNFT(await nft.getAddress(), 0n, LIST_PRICE, 0, 0);
    await expect(
      market.connect(buyer).buyNFT(0n, { value: ETH("0.01") })
    ).to.be.revertedWith("Insufficient payment");
  });

  it("seller can cancel listing", async () => {
    const { nft, market, seller } = await setup();
    await market.connect(seller).listNFT(await nft.getAddress(), 0n, LIST_PRICE, 0, 0);
    await market.connect(seller).cancelListing(0n);
    expect(await nft.ownerOf(0n)).to.equal(seller.address);
  });
});

// ─── NFTMarketplace Auction ───────────────────────────────────────────────────

describe("NFTMarketplace — Auction", () => {
  async function setup() {
    const ctx = await deployAll();
    await ctx.nft.connect(ctx.owner).ownerMint(ctx.seller.address, "ipfs://uri");
    await ctx.nft.connect(ctx.seller).approve(await ctx.market.getAddress(), 0n);
    await ctx.market.connect(ctx.seller).listNFT(
      await ctx.nft.getAddress(), 0n, LIST_PRICE, 1, ONE_DAY
    );
    return ctx;
  }

  it("accepts first bid", async () => {
    const { market, bidder1 } = await setup();
    await expect(market.connect(bidder1).placeBid(0n, { value: LIST_PRICE }))
      .to.emit(market, "BidPlaced");
  });

  it("refunds previous bidder when outbid", async () => {
    const { market, bidder1, bidder2 } = await setup();
    await market.connect(bidder1).placeBid(0n, { value: LIST_PRICE });
    await market.connect(bidder2).placeBid(0n, { value: ETH("0.2") });
    expect(await market.pendingWithdrawals(bidder1.address)).to.equal(LIST_PRICE);
  });

  it("rejects bid below current highest", async () => {
    const { market, bidder1, bidder2 } = await setup();
    await market.connect(bidder1).placeBid(0n, { value: ETH("0.2") });
    await expect(
      market.connect(bidder2).placeBid(0n, { value: ETH("0.15") })
    ).to.be.revertedWith("Bid too low");
  });

  it("winner receives NFT after settlement", async () => {
    const { nft, market, bidder1 } = await setup();
    await market.connect(bidder1).placeBid(0n, { value: LIST_PRICE });
    await time.increase(ONE_DAY + 1);
    await market.settleAuction(0n);
    expect(await nft.ownerOf(0n)).to.equal(bidder1.address);
  });

  it("NFT returns to seller if no bids", async () => {
    const { nft, market, seller } = await setup();
    await time.increase(ONE_DAY + 1);
    await market.settleAuction(0n);
    expect(await nft.ownerOf(0n)).to.equal(seller.address);
  });

  it("cannot settle before auction ends", async () => {
    const { market } = await setup();
    await expect(market.settleAuction(0n)).to.be.revertedWith("Auction still running");
  });
});

// ─── NFTFactory ───────────────────────────────────────────────────────────────

describe("NFTFactory", () => {
  it("deploys a new collection", async () => {
    const { factory, creator } = await deployAll();
    await factory.connect(creator).createCollection(
      "My Art", "ART", 500n, MINT_PRICE, ETH("0.005"), 3n, 300n,
      { value: ETH("0.005") }
    );
    expect(await factory.totalCollections()).to.equal(1n);
  });

  it("sets creator as owner of new collection", async () => {
    const { factory, creator } = await deployAll();
    await factory.connect(creator).createCollection(
      "My Art", "ART", 500n, MINT_PRICE, ETH("0.005"), 3n, 300n,
      { value: ETH("0.005") }
    );
    const cols = await factory.getCollectionsByCreator(creator.address);
    const col  = await ethers.getContractAt("NFTCollection", cols[0]);
    expect(await col.owner()).to.equal(creator.address);
  });

  it("reverts on insufficient deploy fee", async () => {
    const { factory, creator } = await deployAll();
    await expect(
      factory.connect(creator).createCollection(
        "X", "X", 10n, MINT_PRICE, ETH("0.005"), 1n, 0n,
        { value: ETH("0.001") }
      )
    ).to.be.revertedWith("Insufficient deploy fee");
  });
});