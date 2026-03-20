import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // 1. Deploy NFTCollection
  const NFTCollection = await ethers.getContractFactory("NFTCollection");
  const nft = await NFTCollection.deploy(
    "My NFT Collection",
    "MNFT",
    10000,
    ethers.parseEther("0.01"),
    ethers.parseEther("0.005"),
    3,
    deployer.address,
    500
  );
  await nft.waitForDeployment();
  console.log("NFTCollection:", await nft.getAddress());

  // 2. Deploy NFTMarketplace
  const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
  const market = await NFTMarketplace.deploy(250, deployer.address);
  await market.waitForDeployment();
  console.log("NFTMarketplace:", await market.getAddress());

  // 3. Deploy NFTFactory
  const NFTFactory = await ethers.getContractFactory("NFTFactory");
  const factory = await NFTFactory.deploy(
    deployer.address,
    ethers.parseEther("0.005")
  );
  await factory.waitForDeployment();
  console.log("NFTFactory:", await factory.getAddress());

  // 4. Lưu địa chỉ vào file JSON
  const addresses = {
    NFTCollection:  await nft.getAddress(),
    NFTMarketplace: await market.getAddress(),
    NFTFactory:     await factory.getAddress(),
    deployer:       deployer.address,
    deployedAt:     new Date().toISOString(),
  };

  const outDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  fs.writeFileSync(
    path.join(outDir, "localhost.json"),
    JSON.stringify(addresses, null, 2)
  );

  console.log("\nDone! Saved to deployments/localhost.json");
  console.log(addresses);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });