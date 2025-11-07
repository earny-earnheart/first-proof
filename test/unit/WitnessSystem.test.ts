import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployProofStreamFixture, createSampleProject, registerSampleMilestone } from "../fixtures/deployFixture";

describe("ProofStream - Witness System", function () {
  describe("Add Witness", function () {
    it("Should add a witness successfully", async function () {
      const { proofStream, user1, user2, witnessFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);
      const milestoneIndex = await registerSampleMilestone(proofStream, user1, projectHash);

      await expect(
        proofStream.connect(user2).addWitness(projectHash, milestoneIndex, { value: witnessFee })
      ).to.emit(proofStream, "WitnessAdded")
        .withArgs(projectHash, milestoneIndex, user2.address, await ethers.provider.getBlock('latest').then(b => b!.timestamp + 1));

      // Verify witness was added
      const milestone = await proofStream.getMilestone(projectHash, milestoneIndex);
      expect(milestone.witnessCount).to.equal(1);
    });

    it("Should refund excess payment", async function () {
      const { proofStream, user1, user2, witnessFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);
      const milestoneIndex = await registerSampleMilestone(proofStream, user1, projectHash);

      const excessAmount = ethers.parseEther("0.01");
      const totalSent = witnessFee + excessAmount;

      const balanceBefore = await ethers.provider.getBalance(user2.address);

      const tx = await proofStream.connect(user2).addWitness(
        projectHash,
        milestoneIndex,
        { value: totalSent }
      );
      const receipt = await tx.wait();

      const balanceAfter = await ethers.provider.getBalance(user2.address);
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;

      const expectedBalance = balanceBefore - witnessFee - gasCost;
      expect(balanceAfter).to.equal(expectedBalance);
    });

    it("Should prevent duplicate witness (O(1) check)", async function () {
      const { proofStream, user1, user2, witnessFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);
      const milestoneIndex = await registerSampleMilestone(proofStream, user1, projectHash);

      // Add witness first time
      await proofStream.connect(user2).addWitness(projectHash, milestoneIndex, { value: witnessFee });

      // Try to add same witness again
      await expect(
        proofStream.connect(user2).addWitness(projectHash, milestoneIndex, { value: witnessFee })
      ).to.be.revertedWith("Already witnessed");
    });

    it("Should allow multiple different witnesses", async function () {
      const { proofStream, user1, user2, user3, witnessFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);
      const milestoneIndex = await registerSampleMilestone(proofStream, user1, projectHash);

      // Add three different witnesses
      await proofStream.connect(user2).addWitness(projectHash, milestoneIndex, { value: witnessFee });
      await proofStream.connect(user3).addWitness(projectHash, milestoneIndex, { value: witnessFee });
      await proofStream.connect(user1).addWitness(projectHash, milestoneIndex, { value: witnessFee });

      const milestone = await proofStream.getMilestone(projectHash, milestoneIndex);
      expect(milestone.witnessCount).to.equal(3);
    });

    it("Should enforce maximum witness limit", async function () {
      const { proofStream, user1, witnessFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);
      const milestoneIndex = await registerSampleMilestone(proofStream, user1, projectHash);

      const maxWitnesses = await proofStream.MAX_WITNESSES_PER_MILESTONE();

      // Add maximum number of witnesses
      for (let i = 0; i < Number(maxWitnesses); i++) {
        const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
        // Fund the wallet
        await user1.sendTransaction({
          to: wallet.address,
          value: ethers.parseEther("1")
        });
        await proofStream.connect(wallet).addWitness(projectHash, milestoneIndex, { value: witnessFee });
      }

      // Try to add one more (should fail)
      const extraWitness = ethers.Wallet.createRandom().connect(ethers.provider);
      await user1.sendTransaction({
        to: extraWitness.address,
        value: ethers.parseEther("1")
      });

      await expect(
        proofStream.connect(extraWitness).addWitness(projectHash, milestoneIndex, { value: witnessFee })
      ).to.be.revertedWith("Max witnesses reached");
    });

    it("Should reject witness with insufficient fee", async function () {
      const { proofStream, user1, user2, witnessFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);
      const milestoneIndex = await registerSampleMilestone(proofStream, user1, projectHash);

      await expect(
        proofStream.connect(user2).addWitness(projectHash, milestoneIndex, { value: witnessFee - 1n })
      ).to.be.revertedWith("Insufficient witness fee");
    });

    it("Should reject witness for invalid milestone index", async function () {
      const { proofStream, user1, user2, witnessFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);

      // No milestones registered yet
      await expect(
        proofStream.connect(user2).addWitness(projectHash, 0, { value: witnessFee })
      ).to.be.revertedWith("Invalid milestone");
    });

    it("Should reject witness for non-existent project", async function () {
      const { proofStream, user2, witnessFee } = await loadFixture(deployProofStreamFixture);

      const fakeHash = ethers.randomBytes(32);

      await expect(
        proofStream.connect(user2).addWitness(fakeHash, 0, { value: witnessFee })
      ).to.be.revertedWith("Project does not exist");
    });

    it("Should not allow witnessing when paused", async function () {
      const { proofStream, owner, user1, user2, witnessFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);
      const milestoneIndex = await registerSampleMilestone(proofStream, user1, projectHash);

      // Pause contract
      await proofStream.connect(owner).pause();

      await expect(
        proofStream.connect(user2).addWitness(projectHash, milestoneIndex, { value: witnessFee })
      ).to.be.revertedWithCustomError(proofStream, "EnforcedPause");
    });
  });

  describe("Witness Retrieval", function () {
    it("Should retrieve witnesses with pagination", async function () {
      const { proofStream, user1, user2, user3, witnessFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);
      const milestoneIndex = await registerSampleMilestone(proofStream, user1, projectHash);

      // Add three witnesses
      await proofStream.connect(user1).addWitness(projectHash, milestoneIndex, { value: witnessFee });
      await proofStream.connect(user2).addWitness(projectHash, milestoneIndex, { value: witnessFee });
      await proofStream.connect(user3).addWitness(projectHash, milestoneIndex, { value: witnessFee });

      // Get first 2 witnesses
      const [witnesses1, total1] = await proofStream.getMilestoneWitnesses(projectHash, milestoneIndex, 0, 2);
      expect(total1).to.equal(3);
      expect(witnesses1.length).to.equal(2);
      expect(witnesses1[0]).to.equal(user1.address);
      expect(witnesses1[1]).to.equal(user2.address);

      // Get last witness
      const [witnesses2, total2] = await proofStream.getMilestoneWitnesses(projectHash, milestoneIndex, 2, 10);
      expect(total2).to.equal(3);
      expect(witnesses2.length).to.equal(1);
      expect(witnesses2[0]).to.equal(user3.address);
    });

    it("Should handle pagination beyond available witnesses", async function () {
      const { proofStream, user1, user2, witnessFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);
      const milestoneIndex = await registerSampleMilestone(proofStream, user1, projectHash);

      await proofStream.connect(user2).addWitness(projectHash, milestoneIndex, { value: witnessFee });

      // Request offset beyond available witnesses
      const [witnesses, total] = await proofStream.getMilestoneWitnesses(projectHash, milestoneIndex, 10, 10);
      expect(total).to.equal(1);
      expect(witnesses.length).to.equal(0);
    });

    it("Should check if address has witnessed", async function () {
      const { proofStream, user1, user2, user3, witnessFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);
      const milestoneIndex = await registerSampleMilestone(proofStream, user1, projectHash);

      // Add only user2 as witness
      await proofStream.connect(user2).addWitness(projectHash, milestoneIndex, { value: witnessFee });

      // Check witnessing status
      expect(await proofStream.hasWitnessed(projectHash, milestoneIndex, user2.address)).to.be.true;
      expect(await proofStream.hasWitnessed(projectHash, milestoneIndex, user3.address)).to.be.false;
      expect(await proofStream.hasWitnessed(projectHash, milestoneIndex, user1.address)).to.be.false;
    });

    it("Should reject getting witnesses for invalid milestone", async function () {
      const { proofStream, user1 } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);

      await expect(
        proofStream.getMilestoneWitnesses(projectHash, 0, 0, 10)
      ).to.be.revertedWith("Invalid milestone");
    });
  });

  describe("Witness Authorization", function () {
    it("Should authorize a witness", async function () {
      const { proofStream, user1, user2 } = await loadFixture(deployProofStreamFixture);

      await expect(
        proofStream.connect(user1).authorizeWitness(user2.address)
      ).to.emit(proofStream, "WitnessAuthorized")
        .withArgs(user1.address, user2.address, await ethers.provider.getBlock('latest').then(b => b!.timestamp + 1));

      // Verify authorization
      expect(await proofStream.authorizedWitnesses(user1.address, user2.address)).to.be.true;
    });

    it("Should revoke witness authorization", async function () {
      const { proofStream, user1, user2 } = await loadFixture(deployProofStreamFixture);

      // Authorize first
      await proofStream.connect(user1).authorizeWitness(user2.address);
      expect(await proofStream.authorizedWitnesses(user1.address, user2.address)).to.be.true;

      // Revoke
      await expect(
        proofStream.connect(user1).revokeWitness(user2.address)
      ).to.emit(proofStream, "WitnessRevoked")
        .withArgs(user1.address, user2.address, await ethers.provider.getBlock('latest').then(b => b!.timestamp + 1));

      // Verify revocation
      expect(await proofStream.authorizedWitnesses(user1.address, user2.address)).to.be.false;
    });

    it("Should reject authorizing zero address", async function () {
      const { proofStream, user1 } = await loadFixture(deployProofStreamFixture);

      await expect(
        proofStream.connect(user1).authorizeWitness(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid witness address");
    });

    it("Should reject authorizing self", async function () {
      const { proofStream, user1 } = await loadFixture(deployProofStreamFixture);

      await expect(
        proofStream.connect(user1).authorizeWitness(user1.address)
      ).to.be.revertedWith("Cannot authorize self");
    });

    it("Should reject revoking zero address", async function () {
      const { proofStream, user1 } = await loadFixture(deployProofStreamFixture);

      await expect(
        proofStream.connect(user1).revokeWitness(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid witness address");
    });

    it("Should allow revoking non-authorized witness", async function () {
      const { proofStream, user1, user2 } = await loadFixture(deployProofStreamFixture);

      // Revoke without authorizing first (should not revert)
      await expect(
        proofStream.connect(user1).revokeWitness(user2.address)
      ).to.not.be.reverted;

      expect(await proofStream.authorizedWitnesses(user1.address, user2.address)).to.be.false;
    });

    it("Should maintain separate authorization per creator", async function () {
      const { proofStream, user1, user2, user3 } = await loadFixture(deployProofStreamFixture);

      // User1 authorizes user3
      await proofStream.connect(user1).authorizeWitness(user3.address);

      // User2 does not authorize user3
      expect(await proofStream.authorizedWitnesses(user1.address, user3.address)).to.be.true;
      expect(await proofStream.authorizedWitnesses(user2.address, user3.address)).to.be.false;
    });
  });

  describe("Gas Efficiency", function () {
    it("Should handle checking witness status efficiently", async function () {
      const { proofStream, user1, user2, witnessFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);
      const milestoneIndex = await registerSampleMilestone(proofStream, user1, projectHash);

      // Add 10 witnesses
      const witnesses = [];
      for (let i = 0; i < 10; i++) {
        const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
        await user1.sendTransaction({
          to: wallet.address,
          value: ethers.parseEther("1")
        });
        witnesses.push(wallet);
        await proofStream.connect(wallet).addWitness(projectHash, milestoneIndex, { value: witnessFee });
      }

      // Check if user2 has witnessed (should be O(1) with mapping)
      const hasWitnessed = await proofStream.hasWitnessed(projectHash, milestoneIndex, user2.address);
      expect(hasWitnessed).to.be.false;

      // This should complete quickly regardless of number of witnesses
      // In the old implementation, this would require iterating through all witnesses
    });
  });
});
