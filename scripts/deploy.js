const hre = require("hardhat");

async function main() {
  console.log("Starting FirstProofNFT deployment...");
  console.log("Network:", hre.network.name);

  // Get the deployer's address
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Get account balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // NFT Configuration
  const NFT_NAME = "First Proof NFT";
  const NFT_SYMBOL = "FPNFT";
  const BASE_TOKEN_URI = "ipfs://"; // Update with your IPFS base URI
  const MAX_SUPPLY = 10000; // Set to 0 for unlimited supply

  console.log("\nNFT Configuration:");
  console.log("- Name:", NFT_NAME);
  console.log("- Symbol:", NFT_SYMBOL);
  console.log("- Base URI:", BASE_TOKEN_URI);
  console.log("- Max Supply:", MAX_SUPPLY === 0 ? "Unlimited" : MAX_SUPPLY);

  // Deploy the contract
  console.log("\nDeploying FirstProofNFT contract...");
  const FirstProofNFT = await hre.ethers.getContractFactory("FirstProofNFT");
  const nft = await FirstProofNFT.deploy(
    NFT_NAME,
    NFT_SYMBOL,
    BASE_TOKEN_URI,
    MAX_SUPPLY
  );

  await nft.waitForDeployment();
  const contractAddress = await nft.getAddress();

  console.log("\n✅ FirstProofNFT deployed successfully!");
  console.log("Contract address:", contractAddress);
  console.log("Transaction hash:", nft.deploymentTransaction().hash);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: contractAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    transactionHash: nft.deploymentTransaction().hash,
    config: {
      name: NFT_NAME,
      symbol: NFT_SYMBOL,
      baseURI: BASE_TOKEN_URI,
      maxSupply: MAX_SUPPLY
    }
  };

  console.log("\n📝 Deployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Wait for block confirmations on live networks
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await nft.deploymentTransaction().wait(6);
    console.log("✅ Confirmed!");

    // Verify contract on Etherscan
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
  console.log("\nNext Steps:");
  console.log("1. Save the contract address:", contractAddress);
  console.log("2. Update your frontend with the contract address");
  console.log("3. Start minting NFTs using the mintNFT function");
  console.log("4. View your contract on Etherscan:");

  if (hre.network.name === "mainnet") {
    console.log(`   https://etherscan.io/address/${contractAddress}`);
  } else if (hre.network.name === "sepolia") {
    console.log(`   https://sepolia.etherscan.io/address/${contractAddress}`);
  } else if (hre.network.name === "goerli") {
    console.log(`   https://goerli.etherscan.io/address/${contractAddress}`);
  }

  return deploymentInfo;
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
