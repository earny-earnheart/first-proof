import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployProofStreamFixture, createSampleProject, generateContentHash } from "../fixtures/deployFixture";

describe("ProofStream - Milestone Registration", function () {
  describe("Register Milestone", function () {
    it("Should register a milestone successfully", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);
      const contentHash = generateContentHash("test-content");

      await expect(
        proofStream.connect(user1).registerMilestone(
          projectHash,
          contentHash,
          "First Draft",
          "draft",
          "QmTest123",
          false,
          { value: registrationFee }
        )
      ).to.emit(proofStream, "MilestoneRegistered")
        .withArgs(projectHash, contentHash, user1.address, 0, await ethers.provider.getBlock('latest').then(b => b!.timestamp + 1));

      // Verify milestone count increased
      const milestoneCount = await proofStream.getProjectMilestoneCount(projectHash);
      expect(milestoneCount).to.equal(1);

      // Verify total milestones increased
      expect(await proofStream.totalMilestones()).to.equal(1);
    });

    it("Should store milestone data correctly", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);
      const contentHash = generateContentHash("test-content");
      const title = "My Masterpiece Draft 1";
      const stage = "revision";
      const ipfsHash = "QmABC123XYZ";
      const isEncrypted = true;

      await proofStream.connect(user1).registerMilestone(
        projectHash,
        contentHash,
        title,
        stage,
        ipfsHash,
        isEncrypted,
        { value: registrationFee }
      );

      const milestone = await proofStream.getMilestone(projectHash, 0);

      expect(milestone.contentHash).to.equal(contentHash);
      expect(milestone.title).to.equal(title);
      expect(milestone.stage).to.equal(stage);
      expect(milestone.ipfsHash).to.equal(ipfsHash);
      expect(milestone.isEncrypted).to.equal(isEncrypted);
      expect(milestone.witnessCount).to.equal(0);
      expect(milestone.timestamp).to.be.gt(0);
    });

    it("Should refund excess payment", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);
      const contentHash = generateContentHash("test");

      const excessAmount = ethers.parseEther("0.01");
      const totalSent = registrationFee + excessAmount;

      const balanceBefore = await ethers.provider.getBalance(user1.address);

      const tx = await proofStream.connect(user1).registerMilestone(
        projectHash,
        contentHash,
        "Title",
        "draft",
        "",
        false,
        { value: totalSent }
      );
      const receipt = await tx.wait();

      const balanceAfter = await ethers.provider.getBalance(user1.address);
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;

      const expectedBalance = balanceBefore - registrationFee - gasCost;
      expect(balanceAfter).to.equal(expectedBalance);
    });

    it("Should reject registration with insufficient fee", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);
      const contentHash = generateContentHash("test");

      await expect(
        proofStream.connect(user1).registerMilestone(
          projectHash,
          contentHash,
          "Title",
          "draft",
          "",
          false,
          { value: registrationFee - 1n }
        )
      ).to.be.revertedWith("Insufficient fee");
    });

    it("Should reject zero content hash", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);
      const zeroHash = ethers.ZeroHash;

      await expect(
        proofStream.connect(user1).registerMilestone(
          projectHash,
          zeroHash,
          "Title",
          "draft",
          "",
          false,
          { value: registrationFee }
        )
      ).to.be.revertedWith("Content hash required");
    });

    it("Should reject duplicate content hash", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);
      const contentHash = generateContentHash("unique-content");

      // Register first milestone
      await proofStream.connect(user1).registerMilestone(
        projectHash,
        contentHash,
        "First",
        "draft",
        "",
        false,
        { value: registrationFee }
      );

      // Try to register with same content hash
      await expect(
        proofStream.connect(user1).registerMilestone(
          projectHash,
          contentHash,
          "Second",
          "revision",
          "",
          false,
          { value: registrationFee }
        )
      ).to.be.revertedWith("Content already registered");
    });

    it("Should reject non-owner registration", async function () {
      const { proofStream, user1, user2, registrationFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);
      const contentHash = generateContentHash("test");

      await expect(
        proofStream.connect(user2).registerMilestone(
          projectHash,
          contentHash,
          "Title",
          "draft",
          "",
          false,
          { value: registrationFee }
        )
      ).to.be.revertedWith("Not project owner");
    });

    it("Should reject registration for non-existent project", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const fakeHash = ethers.randomBytes(32);
      const contentHash = generateContentHash("test");

      await expect(
        proofStream.connect(user1).registerMilestone(
          fakeHash,
          contentHash,
          "Title",
          "draft",
          "",
          false,
          { value: registrationFee }
        )
      ).to.be.revertedWith("Project does not exist");
    });

    it("Should reject empty title", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);
      const contentHash = generateContentHash("test");

      await expect(
        proofStream.connect(user1).registerMilestone(
          projectHash,
          contentHash,
          "",
          "draft",
          "",
          false,
          { value: registrationFee }
        )
      ).to.be.revertedWith("String cannot be empty");
    });

    it("Should reject title exceeding max length", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);
      const contentHash = generateContentHash("test");
      const longTitle = "a".repeat(201);

      await expect(
        proofStream.connect(user1).registerMilestone(
          projectHash,
          contentHash,
          longTitle,
          "draft",
          "",
          false,
          { value: registrationFee }
        )
      ).to.be.revertedWith("String too long");
    });

    it("Should reject IPFS hash exceeding max length", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);
      const contentHash = generateContentHash("test");
      const longIpfsHash = "Qm" + "a".repeat(99); // 101 characters (MAX_IPFS_HASH_LENGTH is 100)

      await expect(
        proofStream.connect(user1).registerMilestone(
          projectHash,
          contentHash,
          "Title",
          "draft",
          longIpfsHash,
          false,
          { value: registrationFee }
        )
      ).to.be.revertedWith("IPFS hash too long");
    });

    it("Should accept IPFS hash at max length", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);
      const contentHash = generateContentHash("test");
      const maxIpfsHash = "Qm" + "a".repeat(98); // Exactly 100 characters

      await expect(
        proofStream.connect(user1).registerMilestone(
          projectHash,
          contentHash,
          "Title",
          "draft",
          maxIpfsHash,
          false,
          { value: registrationFee }
        )
      ).to.not.be.reverted;
    });

    it("Should allow empty IPFS hash", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);
      const contentHash = generateContentHash("test");

      await expect(
        proofStream.connect(user1).registerMilestone(
          projectHash,
          contentHash,
          "Title",
          "draft",
          "",
          false,
          { value: registrationFee }
        )
      ).to.not.be.reverted;
    });

    it("Should not allow registration when paused", async function () {
      const { proofStream, owner, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);
      const contentHash = generateContentHash("test");

      // Pause contract
      await proofStream.connect(owner).pause();

      await expect(
        proofStream.connect(user1).registerMilestone(
          projectHash,
          contentHash,
          "Title",
          "draft",
          "",
          false,
          { value: registrationFee }
        )
      ).to.be.revertedWithCustomError(proofStream, "EnforcedPause");
    });
  });

  describe("Content Verification", function () {
    it("Should verify registered content", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);
      const contentHash = generateContentHash("my-content");

      await proofStream.connect(user1).registerMilestone(
        projectHash,
        contentHash,
        "Title",
        "draft",
        "",
        false,
        { value: registrationFee }
      );

      const [exists, timestamp, creator] = await proofStream.verifyContent(contentHash);

      expect(exists).to.be.true;
      expect(timestamp).to.be.gt(0);
      expect(creator).to.equal(user1.address);
    });

    it("Should return false for unregistered content", async function () {
      const { proofStream } = await loadFixture(deployProofStreamFixture);

      const unregisteredHash = generateContentHash("never-registered");
      const [exists, timestamp, creator] = await proofStream.verifyContent(unregisteredHash);

      expect(exists).to.be.false;
      expect(timestamp).to.equal(0);
      expect(creator).to.equal(ethers.ZeroAddress);
    });

    it("Should preserve registration info across queries", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);
      const contentHash = generateContentHash("persistent");

      await proofStream.connect(user1).registerMilestone(
        projectHash,
        contentHash,
        "Title",
        "draft",
        "",
        false,
        { value: registrationFee }
      );

      // Query multiple times
      const [exists1, timestamp1, creator1] = await proofStream.verifyContent(contentHash);
      const [exists2, timestamp2, creator2] = await proofStream.verifyContent(contentHash);

      expect(exists1).to.equal(exists2);
      expect(timestamp1).to.equal(timestamp2);
      expect(creator1).to.equal(creator2);
    });
  });

  describe("Multiple Milestones", function () {
    it("Should allow multiple milestones in one project", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);

      // Register 5 milestones
      for (let i = 0; i < 5; i++) {
        const contentHash = generateContentHash(`content-${i}`);
        await proofStream.connect(user1).registerMilestone(
          projectHash,
          contentHash,
          `Milestone ${i}`,
          "draft",
          "",
          false,
          { value: registrationFee }
        );
      }

      const milestoneCount = await proofStream.getProjectMilestoneCount(projectHash);
      expect(milestoneCount).to.equal(5);
    });

    it("Should maintain correct milestone indices", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);

      const titles = ["First", "Second", "Third"];
      for (let i = 0; i < titles.length; i++) {
        const contentHash = generateContentHash(`content-${i}`);
        await proofStream.connect(user1).registerMilestone(
          projectHash,
          contentHash,
          titles[i],
          "draft",
          "",
          false,
          { value: registrationFee }
        );
      }

      // Verify each milestone
      for (let i = 0; i < titles.length; i++) {
        const milestone = await proofStream.getMilestone(projectHash, i);
        expect(milestone.title).to.equal(titles[i]);
      }
    });

    it("Should reject getting milestone with invalid index", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);

      const contentHash = generateContentHash("test");
      await proofStream.connect(user1).registerMilestone(
        projectHash,
        contentHash,
        "Title",
        "draft",
        "",
        false,
        { value: registrationFee }
      );

      // Try to get milestone at index 1 (only index 0 exists)
      await expect(
        proofStream.getMilestone(projectHash, 1)
      ).to.be.revertedWith("Invalid milestone");
    });
  });
});
