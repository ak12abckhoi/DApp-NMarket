import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const SAMPLE_URIS = [
  "ipfs://QmSample1",
  "ipfs://QmSample2",
  "ipfs://QmSample3",
  "ipfs://QmSample4",
  "ipfs://QmSample5",
  "ipfs://QmSample6",
];

async function main() {
  const [owner, seller1, seller2, bidder] = await ethers.getSigners();

  // Load địa chỉ đã deploy
  const deploymentPath = path.join(__dirname, "../deployments/localhost.json");
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("Chưa deploy! Chạy: npx hardhat run scripts/deploy.ts --network localhost");
  }

  const addresses = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  const nft    = await ethers.getContractAt("NFTCollection",  addresses.NFTCollection);
  const market = await ethers.getContractAt("NFTMarketplace", addresses.NFTMarketplace);

  console.log("Seeding...");
  console.log("NFTCollection :", addresses.NFTCollection);
  console.log("NFTMarketplace:", addresses.NFTMarketplace);
  console.log("");

  // Bật public mint
  await nft.connect(owner).togglePublicMint();
  console.log("Public mint enabled");

  const mintPrice = await nft.mintPrice();

  // Mint 6 NFT
  console.log("\nMinting 6 NFTs...");
  for (let i = 0; i < 6; i++) {
    const signer = i < 3 ? seller1 : seller2;
    await nft.connect(signer).mint(signer.address, SAMPLE_URIS[i], { value: mintPrice });
    console.log(`  NFT #${i} → ${signer.address.slice(0, 8)}...`);
  }

  const marketAddr = await market.getAddress();

  // List 4 NFT fixed price
  console.log("\nListing 4 NFTs (fixed price)...");
  for (let tokenId = 0; tokenId < 4; tokenId++) {
    const signer = tokenId < 3 ? seller1 : seller2;
    await nft.connect(signer).approve(marketAddr, tokenId);
    const price = ethers.parseEther((0.05 * (tokenId + 1)).toFixed(2));
    await market.connect(signer).listNFT(
      addresses.NFTCollection, tokenId, price, 0, 0
    );
    console.log(`  Listed #${tokenId} at ${ethers.formatEther(price)} ETH`);
  }

  // List 2 NFT auction
  console.log("\nListing 2 NFTs (auction 1 hour)...");
  for (let tokenId = 4; tokenId < 6; tokenId++) {
    await nft.connect(seller2).approve(marketAddr, tokenId);
    await market.connect(seller2).listNFT(
      addresses.NFTCollection, tokenId,
      ethers.parseEther("0.05"),
      1,
      3600
    );
    console.log(`  Listed #${tokenId} at 0.05 ETH (auction)`);
  }

  // Đặt 1 bid
  console.log("\nPlacing bid on listing #4...");
  await market.connect(bidder).placeBid(4n, { value: ethers.parseEther("0.08") });
  console.log("  Bid 0.08 ETH placed!");

  console.log("\n✅ Seed complete!");
  console.log("  6 NFTs minted");
  console.log("  4 fixed price listings");
  console.log("  2 auction listings");
  console.log("  1 bid placed");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });