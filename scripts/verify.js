const hre = require("hardhat");

async function main() {
  // Replace these with your deployed contract addresses
  const PROOFSTREAM_ADDRESS = process.env.PROOFSTREAM_ADDRESS || "";
  const BOND_ADDRESS = process.env.BOND_ADDRESS || "";

  if (!PROOFSTREAM_ADDRESS || !BOND_ADDRESS) {
    console.error("❌ Please set PROOFSTREAM_ADDRESS and BOND_ADDRESS environment variables");
    process.exit(1);
  }

  console.log("🔍 Verifying contracts on Etherscan...\n");

  // Verify ProofStream
  console.log("📝 Verifying ProofStream at:", PROOFSTREAM_ADDRESS);
  try {
    await hre.run("verify:verify", {
      address: PROOFSTREAM_ADDRESS,
      constructorArguments: [],
    });
    console.log("✅ ProofStream verified!\n");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("ℹ️  ProofStream already verified\n");
    } else {
      console.error("❌ ProofStream verification failed:", error.message, "\n");
    }
  }

  // Verify CorporateBondNFT
  console.log("📝 Verifying CorporateBondNFT at:", BOND_ADDRESS);
  try {
    await hre.run("verify:verify", {
      address: BOND_ADDRESS,
      constructorArguments: [],
    });
    console.log("✅ CorporateBondNFT verified!\n");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("ℹ️  CorporateBondNFT already verified\n");
    } else {
      console.error("❌ CorporateBondNFT verification failed:", error.message, "\n");
    }
  }

  console.log("✨ Verification complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
