import { ethers } from "hardhat";
import { ProofStream } from "../../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

export interface ProofStreamFixture {
  proofStream: ProofStream;
  owner: HardhatEthersSigner;
  user1: HardhatEthersSigner;
  user2: HardhatEthersSigner;
  user3: HardhatEthersSigner;
  registrationFee: bigint;
  witnessFee: bigint;
}

/**
 * Deploy ProofStream contract and return fixture with signers
 * Use with loadFixture from @nomicfoundation/hardhat-network-helpers
 */
export async function deployProofStreamFixture(): Promise<ProofStreamFixture> {
  // Get signers
  const [owner, user1, user2, user3] = await ethers.getSigners();

  // Deploy contract
  const ProofStream = await ethers.getContractFactory("ProofStream");
  const proofStream = await ProofStream.deploy();
  await proofStream.waitForDeployment();

  // Get fees
  const registrationFee = await proofStream.registrationFee();
  const witnessFee = await proofStream.witnessFee();

  return {
    proofStream,
    owner,
    user1,
    user2,
    user3,
    registrationFee,
    witnessFee,
  };
}

/**
 * Helper function to create a sample project
 */
export async function createSampleProject(
  proofStream: ProofStream,
  creator: HardhatEthersSigner,
  projectId: string = "test-project"
) {
  const fee = await proofStream.registrationFee();
  const tx = await proofStream.connect(creator).createProject(
    projectId,
    "music",
    true,
    { value: fee }
  );
  const receipt = await tx.wait();

  // Extract projectHash from event
  const event = receipt?.logs
    .map((log: any) => {
      try {
        return proofStream.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((e: any) => e?.name === "ProjectCreated");

  return event?.args.projectHash;
}

/**
 * Helper function to register a sample milestone
 */
export async function registerSampleMilestone(
  proofStream: ProofStream,
  creator: HardhatEthersSigner,
  projectHash: string,
  contentHash?: string
) {
  const fee = await proofStream.registrationFee();
  const hash = contentHash || ethers.randomBytes(32);

  const tx = await proofStream.connect(creator).registerMilestone(
    projectHash,
    hash,
    "Sample Milestone",
    "draft",
    "",
    false,
    { value: fee }
  );
  await tx.wait();

  // Get milestone index (should be last one)
  const milestoneCount = await proofStream.getProjectMilestoneCount(projectHash);
  return Number(milestoneCount) - 1;
}

/**
 * Helper to generate unique content hash
 */
export function generateContentHash(seed: string = ""): string {
  return ethers.keccak256(ethers.toUtf8Bytes(seed + Date.now() + Math.random()));
}
