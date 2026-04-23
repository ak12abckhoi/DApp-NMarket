import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const accounts = process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    oasis_sapphire_testnet: {
      url: process.env.OASIS_RPC_URL ?? "https://testnet.sapphire.oasis.io",
      accounts,
      chainId: 23295,
    },
  },
};

export default config;