import { run } from "hardhat";

async function main() {
  // Replace with your deployed contract address
  const contractAddress = process.env.CONTRACT_ADDRESS || "";

  if (!contractAddress) {
    console.error("❌ Please set CONTRACT_ADDRESS environment variable");
    console.log("Example: CONTRACT_ADDRESS=0x... npx hardhat run scripts/verify.ts --network sepolia");
    process.exit(1);
  }

  console.log("🔍 Verifying ProofStream contract at:", contractAddress);
  console.log("⏳ This may take a few moments...\n");

  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: [], // ProofStream constructor has no arguments
    });

    console.log("✅ Contract verified successfully!");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("ℹ️  Contract is already verified");
    } else {
      console.error("❌ Verification failed:", error);
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
