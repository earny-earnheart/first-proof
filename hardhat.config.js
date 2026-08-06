require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

// Hardhat validates accounts at config load, so a placeholder key would break
// even commands that never sign (compile, clean).
const rawKey = (process.env.PRIVATE_KEY || "").trim().replace(/^0x/, "");
const accounts = /^[0-9a-fA-F]{64}$/.test(rawKey) ? [`0x${rawKey}`] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    mainnet: {
      url: process.env.ETHEREUM_MAINNET_RPC_URL || "",
      accounts,
      chainId: 1
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts,
      chainId: 11155111
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || ""
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
