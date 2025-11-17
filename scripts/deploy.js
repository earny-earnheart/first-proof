const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying contracts with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Deploy ProofStream
  console.log("📝 Deploying ProofStream contract...");
  const ProofStream = await hre.ethers.getContractFactory("ProofStream");
  const proofStream = await ProofStream.deploy();
  await proofStream.waitForDeployment();
  const proofStreamAddress = await proofStream.getAddress();

  console.log("✅ ProofStream deployed to:", proofStreamAddress);
  console.log("   - Registration Fee:", hre.ethers.formatEther(await proofStream.registrationFee()), "ETH");
  console.log("   - Witness Fee:", hre.ethers.formatEther(await proofStream.witnessFee()), "ETH");
  console.log("   - Max Witnesses:", (await proofStream.MAX_WITNESSES()).toString());
  console.log("   - Max String Length:", (await proofStream.MAX_STRING_LENGTH()).toString(), "\n");

  // Deploy CorporateBondNFT
  console.log("📝 Deploying CorporateBondNFT contract...");
  const CorporateBondNFT = await hre.ethers.getContractFactory("CorporateBondNFT");
  const bondContract = await CorporateBondNFT.deploy();
  await bondContract.waitForDeployment();
  const bondAddress = await bondContract.getAddress();

  console.log("✅ CorporateBondNFT deployed to:", bondAddress);
  console.log("   - Name:", await bondContract.name());
  console.log("   - Symbol:", await bondContract.symbol());
  console.log("   - Platform Fee:", (await bondContract.platformFee()).toString(), "basis points");
  console.log("   - Min Principal:", hre.ethers.formatEther(await bondContract.MIN_PRINCIPAL()), "ETH");
  console.log("   - Max Principal:", hre.ethers.formatEther(await bondContract.MAX_PRINCIPAL()), "ETH\n");

  // Save deployment addresses
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      ProofStream: proofStreamAddress,
      CorporateBondNFT: bondAddress,
    },
  };

  console.log("📄 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Verification instructions
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n📌 To verify contracts on Etherscan, run:");
    console.log(`npx hardhat verify --network ${hre.network.name} ${proofStreamAddress}`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${bondAddress}`);
  }

  console.log("\n✨ Deployment complete!\n");

  return deploymentInfo;
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
