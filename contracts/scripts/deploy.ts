import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const CHAIN_IDS: Record<string, number> = {
  localhost:               31337,
  oasis_sapphire_testnet:  23295,
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = network.name;
  const chainId = CHAIN_IDS[networkName] ?? Number((await ethers.provider.getNetwork()).chainId);

  console.log(`Network:  ${networkName} (chainId ${chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance:  ${ethers.formatEther(balance)} tokens\n`);

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

  // 4. Lưu địa chỉ vào deployments/<network>.json
  const addresses = {
    NFTCollection:  await nft.getAddress(),
    NFTMarketplace: await market.getAddress(),
    NFTFactory:     await factory.getAddress(),
    deployer:       deployer.address,
    chainId,
    deployedAt:     new Date().toISOString(),
  };

  const outDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const deployFile = path.join(outDir, `${networkName}.json`);
  fs.writeFileSync(deployFile, JSON.stringify(addresses, null, 2));
  console.log(`\nSaved to deployments/${networkName}.json`);

  // 5. Sync lên frontend/src/config/contracts.json
  const frontendConfig = {
    NFTCollection:  await nft.getAddress(),
    NFTMarketplace: await market.getAddress(),
    NFTFactory:     await factory.getAddress(),
    deployer:       deployer.address,
    chainId,
  };

  const frontendPath = path.join(__dirname, "../../frontend/src/config/contracts.json");
  fs.writeFileSync(frontendPath, JSON.stringify(frontendConfig, null, 2));
  console.log("Synced to frontend/src/config/contracts.json");
  console.log(addresses);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
