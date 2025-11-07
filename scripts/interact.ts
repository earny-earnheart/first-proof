import { ethers } from "hardhat";

/**
 * Helper script for interacting with deployed ProofStream contract
 * Usage: Update CONTRACT_ADDRESS and run with: npx hardhat run scripts/interact.ts --network <network>
 */

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS || "";

  if (!contractAddress) {
    console.error("❌ Please set CONTRACT_ADDRESS environment variable");
    process.exit(1);
  }

  console.log("🔗 Connecting to ProofStream at:", contractAddress, "\n");

  const [signer] = await ethers.getSigners();
  const ProofStream = await ethers.getContractFactory("ProofStream");
  const proofStream = ProofStream.attach(contractAddress);

  // Display contract info
  console.log("📊 Contract Information:");
  console.log("  Owner:", await proofStream.owner());
  console.log("  Registration Fee:", ethers.formatEther(await proofStream.registrationFee()), "ETH");
  console.log("  Witness Fee:", ethers.formatEther(await proofStream.witnessFee()), "ETH");
  console.log("  Total Projects:", (await proofStream.totalProjects()).toString());
  console.log("  Total Milestones:", (await proofStream.totalMilestones()).toString());
  console.log("  Contract Balance:", ethers.formatEther(await proofStream.getBalance()), "ETH");

  // Example: Create a project
  console.log("\n📝 Example: Creating a test project...");
  try {
    const fee = await proofStream.registrationFee();
    const tx = await proofStream.createProject(
      "test-project-" + Date.now(),
      "testing",
      true, // isPublic
      { value: fee }
    );

    console.log("  Transaction hash:", tx.hash);
    const receipt = await tx.wait();

    // Find ProjectCreated event
    const event = receipt?.logs
      .map((log: any) => {
        try {
          return proofStream.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e: any) => e?.name === "ProjectCreated");

    if (event) {
      console.log("  ✅ Project created!");
      console.log("  Project Hash:", event.args.projectHash);
    }
  } catch (error: any) {
    console.log("  ⚠️  Error:", error.message);
  }

  // Get creator's projects
  console.log("\n📚 Fetching creator's projects...");
  try {
    const [projects, total] = await proofStream.getCreatorProjects(signer.address, 0, 10);
    console.log("  Total projects:", total.toString());
    console.log("  First 10 projects:", projects);
  } catch (error: any) {
    console.log("  ⚠️  Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
