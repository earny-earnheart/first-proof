import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployProofStreamFixture, generateContentHash } from "../fixtures/deployFixture";

describe("ProofStream - Project Management", function () {
  describe("Project Creation", function () {
    it("Should create a project with correct parameters", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const projectId = "my-first-project";
      const category = "music";
      const isPublic = true;

      const tx = await proofStream.connect(user1).createProject(
        projectId,
        category,
        isPublic,
        { value: registrationFee }
      );

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

      expect(event).to.not.be.undefined;
      expect(event?.args.creator).to.equal(user1.address);
      expect(event?.args.projectId).to.equal(projectId);

      // Verify project was added to creator's projects
      const [projects, total] = await proofStream.getCreatorProjects(user1.address, 0, 10);
      expect(total).to.equal(1);
      expect(projects.length).to.equal(1);

      // Verify total projects increased
      expect(await proofStream.totalProjects()).to.equal(1);
    });

    it("Should generate unique project hashes with nonce", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      // Create two projects with same projectId
      const tx1 = await proofStream.connect(user1).createProject(
        "same-id",
        "music",
        true,
        { value: registrationFee }
      );
      const receipt1 = await tx1.wait();

      const tx2 = await proofStream.connect(user1).createProject(
        "same-id",
        "art",
        false,
        { value: registrationFee }
      );
      const receipt2 = await tx2.wait();

      // Extract project hashes
      const event1 = receipt1?.logs
        .map((log: any) => {
          try {
            return proofStream.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === "ProjectCreated");

      const event2 = receipt2?.logs
        .map((log: any) => {
          try {
            return proofStream.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === "ProjectCreated");

      // Hashes should be different due to nonce
      expect(event1?.args.projectHash).to.not.equal(event2?.args.projectHash);
    });

    it("Should refund excess payment", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const excessAmount = ethers.parseEther("0.01");
      const totalSent = registrationFee + excessAmount;

      const balanceBefore = await ethers.provider.getBalance(user1.address);

      const tx = await proofStream.connect(user1).createProject(
        "test-project",
        "music",
        true,
        { value: totalSent }
      );
      const receipt = await tx.wait();

      const balanceAfter = await ethers.provider.getBalance(user1.address);

      // Calculate gas cost
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;

      // User should only pay registration fee + gas
      const expectedBalance = balanceBefore - registrationFee - gasCost;
      expect(balanceAfter).to.equal(expectedBalance);

      // Check ExcessRefunded event
      const refundEvent = receipt?.logs
        .map((log: any) => {
          try {
            return proofStream.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === "ExcessRefunded");

      expect(refundEvent).to.not.be.undefined;
      expect(refundEvent?.args.amount).to.equal(excessAmount);
    });

    it("Should reject creation with insufficient fee", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const insufficientFee = registrationFee - 1n;

      await expect(
        proofStream.connect(user1).createProject(
          "test-project",
          "music",
          true,
          { value: insufficientFee }
        )
      ).to.be.revertedWith("Insufficient fee");
    });

    it("Should reject empty project ID", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      await expect(
        proofStream.connect(user1).createProject(
          "",
          "music",
          true,
          { value: registrationFee }
        )
      ).to.be.revertedWith("String cannot be empty");
    });

    it("Should reject project ID exceeding max length", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const longProjectId = "a".repeat(201); // MAX_STRING_LENGTH is 200

      await expect(
        proofStream.connect(user1).createProject(
          longProjectId,
          "music",
          true,
          { value: registrationFee }
        )
      ).to.be.revertedWith("String too long");
    });

    it("Should reject category exceeding max length", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const longCategory = "a".repeat(201);

      await expect(
        proofStream.connect(user1).createProject(
          "test-project",
          longCategory,
          true,
          { value: registrationFee }
        )
      ).to.be.revertedWith("String too long");
    });

    it("Should accept project ID at max length", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const maxLengthId = "a".repeat(200); // Exactly MAX_STRING_LENGTH

      await expect(
        proofStream.connect(user1).createProject(
          maxLengthId,
          "music",
          true,
          { value: registrationFee }
        )
      ).to.not.be.reverted;
    });

    it("Should respect public/private visibility setting", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      // Create public project
      const tx1 = await proofStream.connect(user1).createProject(
        "public-project",
        "music",
        true,
        { value: registrationFee }
      );
      const receipt1 = await tx1.wait();
      const event1 = receipt1?.logs
        .map((log: any) => {
          try {
            return proofStream.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === "ProjectCreated");
      const publicHash = event1?.args.projectHash;

      // Create private project
      const tx2 = await proofStream.connect(user1).createProject(
        "private-project",
        "art",
        false,
        { value: registrationFee }
      );
      const receipt2 = await tx2.wait();
      const event2 = receipt2?.logs
        .map((log: any) => {
          try {
            return proofStream.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === "ProjectCreated");
      const privateHash = event2?.args.projectHash;

      // Verify visibility
      const publicProject = await proofStream.getProject(publicHash);
      const privateProject = await proofStream.getProject(privateHash);

      expect(publicProject.isPublic).to.be.true;
      expect(privateProject.isPublic).to.be.false;
    });

    it("Should not allow creation when paused", async function () {
      const { proofStream, owner, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      // Pause contract
      await proofStream.connect(owner).pause();

      await expect(
        proofStream.connect(user1).createProject(
          "test-project",
          "music",
          true,
          { value: registrationFee }
        )
      ).to.be.revertedWithCustomError(proofStream, "EnforcedPause");
    });
  });

  describe("Project Visibility", function () {
    it("Should allow owner to toggle project visibility", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      // Create project
      const tx = await proofStream.connect(user1).createProject(
        "test-project",
        "music",
        true,
        { value: registrationFee }
      );
      const receipt = await tx.wait();
      const event = receipt?.logs
        .map((log: any) => {
          try {
            return proofStream.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === "ProjectCreated");
      const projectHash = event?.args.projectHash;

      // Initial state: public
      let project = await proofStream.getProject(projectHash);
      expect(project.isPublic).to.be.true;

      // Toggle to private
      await expect(
        proofStream.connect(user1).setProjectVisibility(projectHash, false)
      ).to.emit(proofStream, "ProjectVisibilityChanged")
        .withArgs(projectHash, false);

      project = await proofStream.getProject(projectHash);
      expect(project.isPublic).to.be.false;

      // Toggle back to public
      await expect(
        proofStream.connect(user1).setProjectVisibility(projectHash, true)
      ).to.emit(proofStream, "ProjectVisibilityChanged")
        .withArgs(projectHash, true);

      project = await proofStream.getProject(projectHash);
      expect(project.isPublic).to.be.true;
    });

    it("Should reject visibility change from non-owner", async function () {
      const { proofStream, user1, user2, registrationFee } = await loadFixture(deployProofStreamFixture);

      // User1 creates project
      const tx = await proofStream.connect(user1).createProject(
        "test-project",
        "music",
        true,
        { value: registrationFee }
      );
      const receipt = await tx.wait();
      const event = receipt?.logs
        .map((log: any) => {
          try {
            return proofStream.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === "ProjectCreated");
      const projectHash = event?.args.projectHash;

      // User2 tries to change visibility
      await expect(
        proofStream.connect(user2).setProjectVisibility(projectHash, false)
      ).to.be.revertedWith("Not project owner");
    });

    it("Should reject visibility change for non-existent project", async function () {
      const { proofStream, user1 } = await loadFixture(deployProofStreamFixture);

      const fakeHash = ethers.randomBytes(32);

      await expect(
        proofStream.connect(user1).setProjectVisibility(fakeHash, false)
      ).to.be.revertedWith("Project does not exist");
    });
  });

  describe("Project Retrieval", function () {
    it("Should retrieve project details correctly", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const projectId = "test-project";
      const category = "music";
      const isPublic = true;

      const tx = await proofStream.connect(user1).createProject(
        projectId,
        category,
        isPublic,
        { value: registrationFee }
      );
      const receipt = await tx.wait();
      const event = receipt?.logs
        .map((log: any) => {
          try {
            return proofStream.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === "ProjectCreated");
      const projectHash = event?.args.projectHash;

      const project = await proofStream.getProject(projectHash);

      expect(project.projectId).to.equal(projectId);
      expect(project.creator).to.equal(user1.address);
      expect(project.category).to.equal(category);
      expect(project.isPublic).to.equal(isPublic);
      expect(project.milestoneCount).to.equal(0);
      expect(project.createdAt).to.be.gt(0);
    });

    it("Should return zero milestones for new project", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const tx = await proofStream.connect(user1).createProject(
        "test-project",
        "music",
        true,
        { value: registrationFee }
      );
      const receipt = await tx.wait();
      const event = receipt?.logs
        .map((log: any) => {
          try {
            return proofStream.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === "ProjectCreated");
      const projectHash = event?.args.projectHash;

      const milestoneCount = await proofStream.getProjectMilestoneCount(projectHash);
      expect(milestoneCount).to.equal(0);
    });
  });
});
