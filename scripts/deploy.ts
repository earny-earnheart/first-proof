import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting ProofStream deployment...\n");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying contracts with account:", deployer.address);

  // Get account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy ProofStream
  console.log("📝 Deploying ProofStream contract...");
  const ProofStream = await ethers.getContractFactory("ProofStream");
  const proofStream = await ProofStream.deploy();

  await proofStream.waitForDeployment();
  const address = await proofStream.getAddress();

  console.log("✅ ProofStream deployed to:", address);

  // Get initial contract state
  const registrationFee = await proofStream.registrationFee();
  const witnessFee = await proofStream.witnessFee();
  const owner = await proofStream.owner();

  console.log("\n📊 Contract Configuration:");
  console.log("  Owner:", owner);
  console.log("  Registration Fee:", ethers.formatEther(registrationFee), "ETH");
  console.log("  Witness Fee:", ethers.formatEther(witnessFee), "ETH");
  console.log("  Max Registration Fee:", ethers.formatEther(await proofStream.MAX_REGISTRATION_FEE()), "ETH");
  console.log("  Max Witness Fee:", ethers.formatEther(await proofStream.MAX_WITNESS_FEE()), "ETH");
  console.log("  Max Witnesses Per Milestone:", (await proofStream.MAX_WITNESSES_PER_MILESTONE()).toString());
  console.log("  Max String Length:", (await proofStream.MAX_STRING_LENGTH()).toString());

  console.log("\n✅ Deployment completed successfully!");
  console.log("\n📋 Next steps:");
  console.log("  1. Verify contract on Etherscan:");
  console.log(`     npx hardhat verify --network ${(await ethers.provider.getNetwork()).name} ${address}`);
  console.log("  2. Update frontend with contract address");
  console.log("  3. Test contract functions on testnet");

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    contractAddress: address,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    registrationFee: ethers.formatEther(registrationFee),
    witnessFee: ethers.formatEther(witnessFee),
  };

  console.log("\n💾 Deployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
