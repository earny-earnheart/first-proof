const hre = require("hardhat");

async function main() {
  console.log("Starting FirstProofNFT deployment...");
  console.log("Network:", hre.network.name);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  const NFT_NAME = "First Proof NFT";
  const NFT_SYMBOL = "FPNFT";
  const BASE_TOKEN_URI = "ipfs://";
  const MAX_SUPPLY = 10000;

  console.log("\nNFT Configuration:");
  console.log("- Name:", NFT_NAME);
  console.log("- Symbol:", NFT_SYMBOL);
  console.log("- Base URI:", BASE_TOKEN_URI);
  console.log("- Max Supply:", MAX_SUPPLY);

  console.log("\nDeploying FirstProofNFT contract...");
  const FirstProofNFT = await hre.ethers.getContractFactory("FirstProofNFT");
  const nft = await FirstProofNFT.deploy(NFT_NAME, NFT_SYMBOL, BASE_TOKEN_URI, MAX_SUPPLY);

  await nft.waitForDeployment();
  const contractAddress = await nft.getAddress();

  console.log("\n✅ FirstProofNFT deployed successfully!");
  console.log("Contract address:", contractAddress);
  console.log("Transaction hash:", nft.deploymentTransaction().hash);

  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await nft.deploymentTransaction().wait(6);
    console.log("✅ Confirmed!");

    if (process.env.ETHERSCAN_API_KEY) {
      console.log("\nVerifying contract on Etherscan...");
      try {
        await hre.run("verify:verify", {
          address: contractAddress,
          constructorArguments: [NFT_NAME, NFT_SYMBOL, BASE_TOKEN_URI, MAX_SUPPLY],
        });
        console.log("✅ Contract verified on Etherscan!");
      } catch (error) {
        console.log("❌ Verification failed:", error.message);
      }
    }
  }

  console.log("\n🎉 Deployment Complete!");
  console.log("Contract address:", contractAddress);
  if (hre.network.name === "sepolia") {
    console.log(`View on Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);
  } else if (hre.network.name === "mainnet") {
    console.log(`View on Etherscan: https://etherscan.io/address/${contractAddress}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
