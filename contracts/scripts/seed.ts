import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const SEED_NFTS = [
  {
    name:        "Cosmic Wanderer #001",
    description: "A lone wanderer traversing the infinite cosmos, collecting stardust and forgotten dreams.",
    image:       "https://picsum.photos/seed/cosmic001/600/600",
  },
  {
    name:        "Neon Jungle",
    description: "Where nature meets technology — a cyberpunk forest alive with bioluminescent creatures.",
    image:       "https://picsum.photos/seed/neonjungle/600/600",
  },
  {
    name:        "Ocean Dreams",
    description: "Beneath the waves lies a world untouched by time, shimmering with ancient light.",
    image:       "https://picsum.photos/seed/oceandream/600/600",
  },
  {
    name:        "Golden Hour",
    description: "Captured in a single fleeting moment — the world bathed in perfect golden light.",
    image:       "https://picsum.photos/seed/goldenhour/600/600",
  },
  {
    name:        "Ice Kingdom",
    description: "A frozen realm where crystals grow to the sky and auroras dance in endless night.",
    image:       "https://picsum.photos/seed/icekingdom/600/600",
  },
  {
    name:        "Crimson Bloom",
    description: "Life erupts in brilliant crimson — a single flower defying the void with fierce beauty.",
    image:       "https://picsum.photos/seed/crimsonbloom/600/600",
  },
];

function toDataURI(metadata: object): string {
  const json = JSON.stringify(metadata);
  const b64  = Buffer.from(json).toString("base64");
  return `data:application/json;base64,${b64}`;
}

async function main() {
  const networkName    = network.name;
  const deploymentPath = path.join(__dirname, `../deployments/${networkName}.json`);

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`No deployment found for network "${networkName}". Run deploy first.`);
  }

  const addresses = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  const [owner]   = await ethers.getSigners();

  const nft    = await ethers.getContractAt("NFTCollection",  addresses.NFTCollection);
  const market = await ethers.getContractAt("NFTMarketplace", addresses.NFTMarketplace);

  console.log(`Seeding on ${networkName}...`);
  console.log("NFTCollection :", addresses.NFTCollection);
  console.log("NFTMarketplace:", addresses.NFTMarketplace);
  console.log("Signer        :", owner.address);
  console.log("");

  // Bật public mint
  await nft.connect(owner).togglePublicMint();
  console.log("Public mint enabled");

  const mintPrice = await nft.mintPrice();
  console.log("Mint price    :", ethers.formatEther(mintPrice), "tokens\n");

  // Mint 6 NFT
  console.log("Minting 6 NFTs...");
  for (let i = 0; i < SEED_NFTS.length; i++) {
    const tokenURI = toDataURI(SEED_NFTS[i]);
    const tx = await nft.connect(owner).mint(owner.address, tokenURI, { value: mintPrice });
    await tx.wait();
    console.log(`  NFT #${i} "${SEED_NFTS[i].name}"`);
  }

  const marketAddr = await market.getAddress();

  // List 4 NFT fixed price
  console.log("\nListing 4 NFTs (fixed price)...");
  for (let tokenId = 0; tokenId < 4; tokenId++) {
    const approveTx = await nft.connect(owner).approve(marketAddr, tokenId);
    await approveTx.wait();
    const price   = ethers.parseEther((0.05 * (tokenId + 1)).toFixed(2));
    const listTx  = await market.connect(owner).listNFT(
      addresses.NFTCollection, tokenId, price, 0, 0
    );
    await listTx.wait();
    console.log(`  Listed #${tokenId} "${SEED_NFTS[tokenId].name}" at ${ethers.formatEther(price)} TEST`);
  }

  // List 2 NFT auction (1 giờ)
  console.log("\nListing 2 NFTs (auction 1 hour)...");
  for (let tokenId = 4; tokenId < 6; tokenId++) {
    const approveTx = await nft.connect(owner).approve(marketAddr, tokenId);
    await approveTx.wait();
    const listTx = await market.connect(owner).listNFT(
      addresses.NFTCollection, tokenId,
      ethers.parseEther("0.05"),
      1,
      3600
    );
    await listTx.wait();
    console.log(`  Listed #${tokenId} "${SEED_NFTS[tokenId].name}" at 0.05 TEST (auction)`);
  }

  console.log("\n✅ Seed complete!");
  console.log("  6 NFTs minted");
  console.log("  4 fixed price listings");
  console.log("  2 auction listings");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
