import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployProofStreamFixture, generateContentHash } from "../fixtures/deployFixture";

describe("ProofStream - End-to-End Integration", function () {
  describe("Complete Creative Workflow", function () {
    it("Should handle full creative project lifecycle", async function () {
      const { proofStream, user1, user2, user3, registrationFee, witnessFee } = await loadFixture(deployProofStreamFixture);

      // ===== PHASE 1: Project Creation =====
      const projectId = "my-album-2024";
      const tx = await proofStream.connect(user1).createProject(
        projectId,
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

      // Verify project creation
      const [projects, total] = await proofStream.getCreatorProjects(user1.address, 0, 10);
      expect(total).to.equal(1);

      // ===== PHASE 2: Early Draft =====
      const draftHash = generateContentHash("song-draft-v1");
      await proofStream.connect(user1).registerMilestone(
        projectHash,
        draftHash,
        "First Draft - Rough Recording",
        "draft",
        "QmDraft123",
        false,
        { value: registrationFee }
      );

      // Verify content registration
      const [exists1, timestamp1, creator1] = await proofStream.verifyContent(draftHash);
      expect(exists1).to.be.true;
      expect(creator1).to.equal(user1.address);

      // ===== PHASE 3: Revision with Witnesses =====
      const revisionHash = generateContentHash("song-revision-v2");
      await proofStream.connect(user1).registerMilestone(
        projectHash,
        revisionHash,
        "Second Revision - Studio Recording",
        "revision",
        "QmRevision456",
        false,
        { value: registrationFee }
      );

      // Add witnesses to revision
      await proofStream.connect(user2).addWitness(projectHash, 1, { value: witnessFee });
      await proofStream.connect(user3).addWitness(projectHash, 1, { value: witnessFee });

      const milestone1 = await proofStream.getMilestone(projectHash, 1);
      expect(milestone1.witnessCount).to.equal(2);

      // ===== PHASE 4: Final Version =====
      const finalHash = generateContentHash("song-final-master");
      await proofStream.connect(user1).registerMilestone(
        projectHash,
        finalHash,
        "Final Master - Ready for Release",
        "final",
        "QmFinal789",
        false,
        { value: registrationFee }
      );

      // Multiple witnesses for final version
      await proofStream.connect(user2).addWitness(projectHash, 2, { value: witnessFee });
      await proofStream.connect(user3).addWitness(projectHash, 2, { value: witnessFee });
      await proofStream.connect(user1).addWitness(projectHash, 2, { value: witnessFee });

      // ===== VERIFICATION =====
      const project = await proofStream.getProject(projectHash);
      expect(project.milestoneCount).to.equal(3);
      expect(project.creator).to.equal(user1.address);

      // Verify all milestones are registered
      const [draft, draftTime, draftCreator] = await proofStream.verifyContent(draftHash);
      const [revision, revTime, revCreator] = await proofStream.verifyContent(revisionHash);
      const [final, finalTime, finalCreator] = await proofStream.verifyContent(finalHash);

      expect(draft && revision && final).to.be.true;
      expect(draftTime).to.be.lt(revTime);
      expect(revTime).to.be.lt(finalTime);

      // Verify timeline progression
      const m0 = await proofStream.getMilestone(projectHash, 0);
      const m1 = await proofStream.getMilestone(projectHash, 1);
      const m2 = await proofStream.getMilestone(projectHash, 2);

      expect(m0.stage).to.equal("draft");
      expect(m1.stage).to.equal("revision");
      expect(m2.stage).to.equal("final");

      expect(m0.timestamp).to.be.lt(m1.timestamp);
      expect(m1.timestamp).to.be.lt(m2.timestamp);
    });

    it("Should handle multiple concurrent projects", async function () {
      const { proofStream, user1, user2, registrationFee } = await loadFixture(deployProofStreamFixture);

      // User1 creates Album project
      const albumTx = await proofStream.connect(user1).createProject(
        "album-project",
        "music",
        true,
        { value: registrationFee }
      );
      const albumReceipt = await albumTx.wait();
      const albumEvent = albumReceipt?.logs
        .map((log: any) => {
          try {
            return proofStream.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === "ProjectCreated");
      const albumHash = albumEvent?.args.projectHash;

      // User1 creates Novel project
      const novelTx = await proofStream.connect(user1).createProject(
        "novel-project",
        "writing",
        false,
        { value: registrationFee }
      );
      const novelReceipt = await novelTx.wait();
      const novelEvent = novelReceipt?.logs
        .map((log: any) => {
          try {
            return proofStream.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === "ProjectCreated");
      const novelHash = novelEvent?.args.projectHash;

      // User2 creates Painting project
      const paintingTx = await proofStream.connect(user2).createProject(
        "painting-project",
        "art",
        true,
        { value: registrationFee }
      );
      const paintingReceipt = await paintingTx.wait();
      const paintingEvent = paintingReceipt?.logs
        .map((log: any) => {
          try {
            return proofStream.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === "ProjectCreated");
      const paintingHash = paintingEvent?.args.projectHash;

      // Add milestones to different projects
      await proofStream.connect(user1).registerMilestone(
        albumHash,
        generateContentHash("song1"),
        "Track 1",
        "draft",
        "",
        false,
        { value: registrationFee }
      );

      await proofStream.connect(user1).registerMilestone(
        novelHash,
        generateContentHash("chapter1"),
        "Chapter 1",
        "draft",
        "",
        false,
        { value: registrationFee }
      );

      await proofStream.connect(user2).registerMilestone(
        paintingHash,
        generateContentHash("sketch1"),
        "Initial Sketch",
        "draft",
        "",
        false,
        { value: registrationFee }
      );

      // Verify project separation
      const [user1Projects, user1Total] = await proofStream.getCreatorProjects(user1.address, 0, 10);
      const [user2Projects, user2Total] = await proofStream.getCreatorProjects(user2.address, 0, 10);

      expect(user1Total).to.equal(2);
      expect(user2Total).to.equal(1);

      // Verify milestone counts
      expect(await proofStream.getProjectMilestoneCount(albumHash)).to.equal(1);
      expect(await proofStream.getProjectMilestoneCount(novelHash)).to.equal(1);
      expect(await proofStream.getProjectMilestoneCount(paintingHash)).to.equal(1);

      // Verify global statistics
      expect(await proofStream.totalProjects()).to.equal(3);
      expect(await proofStream.totalMilestones()).to.equal(3);
    });
  });

  describe("Collaboration Workflows", function () {
    it("Should support collaborative verification", async function () {
      const { proofStream, user1, user2, user3, registrationFee, witnessFee } = await loadFixture(deployProofStreamFixture);

      // Creator starts project
      const tx = await proofStream.connect(user1).createProject(
        "collaborative-song",
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

      // Register milestone
      await proofStream.connect(user1).registerMilestone(
        projectHash,
        generateContentHash("collab-v1"),
        "Collaborative Version 1",
        "draft",
        "",
        false,
        { value: registrationFee }
      );

      // Multiple collaborators witness
      await proofStream.connect(user2).addWitness(projectHash, 0, { value: witnessFee });
      await proofStream.connect(user3).addWitness(projectHash, 0, { value: witnessFee });

      // Verify witnesses
      expect(await proofStream.hasWitnessed(projectHash, 0, user2.address)).to.be.true;
      expect(await proofStream.hasWitnessed(projectHash, 0, user3.address)).to.be.true;
      expect(await proofStream.hasWitnessed(projectHash, 0, user1.address)).to.be.false;

      // Get witness list
      const [witnesses, total] = await proofStream.getMilestoneWitnesses(projectHash, 0, 0, 10);
      expect(total).to.equal(2);
      expect(witnesses).to.include(user2.address);
      expect(witnesses).to.include(user3.address);
    });

    it("Should support witness authorization workflow", async function () {
      const { proofStream, user1, user2, user3 } = await loadFixture(deployProofStreamFixture);

      // User1 authorizes user2 and user3 as trusted witnesses
      await proofStream.connect(user1).authorizeWitness(user2.address);
      await proofStream.connect(user1).authorizeWitness(user3.address);

      // Verify authorizations
      expect(await proofStream.authorizedWitnesses(user1.address, user2.address)).to.be.true;
      expect(await proofStream.authorizedWitnesses(user1.address, user3.address)).to.be.true;

      // Later, revoke user3
      await proofStream.connect(user1).revokeWitness(user3.address);

      expect(await proofStream.authorizedWitnesses(user1.address, user2.address)).to.be.true;
      expect(await proofStream.authorizedWitnesses(user1.address, user3.address)).to.be.false;
    });
  });

  describe("Admin Operations", function () {
    it("Should handle fee updates mid-lifecycle", async function () {
      const { proofStream, owner, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      // Create project with initial fee
      await proofStream.connect(user1).createProject("project1", "music", true, { value: registrationFee });

      // Owner updates fee
      const newFee = ethers.parseEther("0.002");
      await proofStream.connect(owner).setRegistrationFee(newFee);

      // New project uses new fee
      await proofStream.connect(user1).createProject("project2", "art", true, { value: newFee });

      const [projects, total] = await proofStream.getCreatorProjects(user1.address, 0, 10);
      expect(total).to.equal(2);
    });

    it("Should handle pause and resume workflow", async function () {
      const { proofStream, owner, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      // Normal operation
      const projectHash = (await (await proofStream.connect(user1).createProject(
        "project",
        "music",
        true,
        { value: registrationFee }
      )).wait())?.logs
        .map((log: any) => {
          try {
            return proofStream.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === "ProjectCreated")?.args.projectHash;

      // Owner pauses
      await proofStream.connect(owner).pause();

      // Operations blocked
      await expect(
        proofStream.connect(user1).registerMilestone(
          projectHash,
          generateContentHash("test"),
          "Title",
          "draft",
          "",
          false,
          { value: registrationFee }
        )
      ).to.be.revertedWithCustomError(proofStream, "EnforcedPause");

      // Owner resumes
      await proofStream.connect(owner).unpause();

      // Operations work again
      await expect(
        proofStream.connect(user1).registerMilestone(
          projectHash,
          generateContentHash("test"),
          "Title",
          "draft",
          "",
          false,
          { value: registrationFee }
        )
      ).to.not.be.reverted;
    });

    it("Should handle withdrawal of accumulated fees", async function () {
      const { proofStream, owner, user1, user2, registrationFee, witnessFee } = await loadFixture(deployProofStreamFixture);

      // Accumulate fees through various operations
      const projectHash = (await (await proofStream.connect(user1).createProject(
        "project",
        "music",
        true,
        { value: registrationFee }
      )).wait())?.logs
        .map((log: any) => {
          try {
            return proofStream.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === "ProjectCreated")?.args.projectHash;

      await proofStream.connect(user1).registerMilestone(
        projectHash,
        generateContentHash("m1"),
        "M1",
        "draft",
        "",
        false,
        { value: registrationFee }
      );

      await proofStream.connect(user2).addWitness(projectHash, 0, { value: witnessFee });

      const expectedBalance = registrationFee * 2n + witnessFee;
      expect(await proofStream.getBalance()).to.equal(expectedBalance);

      // Owner withdraws
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const tx = await proofStream.connect(owner).withdraw();
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + expectedBalance - gasCost);
      expect(await proofStream.getBalance()).to.equal(0);
    });
  });

  describe("Privacy and Access Control", function () {
    it("Should respect project visibility settings", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      // Create public project
      const publicTx = await proofStream.connect(user1).createProject(
        "public-project",
        "music",
        true,
        { value: registrationFee }
      );
      const publicReceipt = await publicTx.wait();
      const publicEvent = publicReceipt?.logs
        .map((log: any) => {
          try {
            return proofStream.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === "ProjectCreated");
      const publicHash = publicEvent?.args.projectHash;

      // Create private project
      const privateTx = await proofStream.connect(user1).createProject(
        "private-project",
        "art",
        false,
        { value: registrationFee }
      );
      const privateReceipt = await privateTx.wait();
      const privateEvent = privateReceipt?.logs
        .map((log: any) => {
          try {
            return proofStream.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === "ProjectCreated");
      const privateHash = privateEvent?.args.projectHash;

      // Verify visibility
      const publicProject = await proofStream.getProject(publicHash);
      const privateProject = await proofStream.getProject(privateHash);

      expect(publicProject.isPublic).to.be.true;
      expect(privateProject.isPublic).to.be.false;

      // Owner can toggle visibility
      await proofStream.connect(user1).setProjectVisibility(publicHash, false);
      const updatedProject = await proofStream.getProject(publicHash);
      expect(updatedProject.isPublic).to.be.false;
    });

    it("Should enforce project ownership for milestone registration", async function () {
      const { proofStream, user1, user2, registrationFee } = await loadFixture(deployProofStreamFixture);

      const tx = await proofStream.connect(user1).createProject(
        "user1-project",
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

      // User2 cannot register milestone in user1's project
      await expect(
        proofStream.connect(user2).registerMilestone(
          projectHash,
          generateContentHash("unauthorized"),
          "Title",
          "draft",
          "",
          false,
          { value: registrationFee }
        )
      ).to.be.revertedWith("Not project owner");
    });
  });

  describe("Edge Cases and Stress Tests", function () {
    it("Should handle rapid succession of operations", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = (await (await proofStream.connect(user1).createProject(
        "rapid-project",
        "music",
        true,
        { value: registrationFee }
      )).wait())?.logs
        .map((log: any) => {
          try {
            return proofStream.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === "ProjectCreated")?.args.projectHash;

      // Register 10 milestones rapidly
      for (let i = 0; i < 10; i++) {
        await proofStream.connect(user1).registerMilestone(
          projectHash,
          generateContentHash(`rapid-${i}`),
          `Milestone ${i}`,
          "draft",
          "",
          false,
          { value: registrationFee }
        );
      }

      expect(await proofStream.getProjectMilestoneCount(projectHash)).to.equal(10);

      // Verify all timestamps are in order
      const timestamps: bigint[] = [];
      for (let i = 0; i < 10; i++) {
        const milestone = await proofStream.getMilestone(projectHash, i);
        timestamps.push(milestone.timestamp);
      }

      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).to.be.gte(timestamps[i - 1]);
      }
    });

    it("Should handle max witnesses scenario", async function () {
      const { proofStream, user1, witnessFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = (await (await proofStream.connect(user1).createProject(
        "max-witness-project",
        "music",
        true,
        { value: await proofStream.registrationFee() }
      )).wait())?.logs
        .map((log: any) => {
          try {
            return proofStream.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === "ProjectCreated")?.args.projectHash;

      await proofStream.connect(user1).registerMilestone(
        projectHash,
        generateContentHash("popular"),
        "Popular Track",
        "final",
        "",
        false,
        { value: await proofStream.registrationFee() }
      );

      const maxWitnesses = await proofStream.MAX_WITNESSES_PER_MILESTONE();

      // Add max witnesses
      for (let i = 0; i < Number(maxWitnesses); i++) {
        const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
        await user1.sendTransaction({
          to: wallet.address,
          value: ethers.parseEther("1")
        });
        await proofStream.connect(wallet).addWitness(projectHash, 0, { value: witnessFee });
      }

      const milestone = await proofStream.getMilestone(projectHash, 0);
      expect(milestone.witnessCount).to.equal(maxWitnesses);
    });
  });
});
