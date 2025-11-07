import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployProofStreamFixture, createSampleProject, registerSampleMilestone } from "../fixtures/deployFixture";

describe("ProofStream - Admin Functions", function () {
  describe("Fee Management", function () {
    it("Should allow owner to update registration fee", async function () {
      const { proofStream, owner } = await loadFixture(deployProofStreamFixture);

      const newFee = ethers.parseEther("0.002");

      await expect(
        proofStream.connect(owner).setRegistrationFee(newFee)
      ).to.emit(proofStream, "FeeUpdated")
        .withArgs(newFee, "registration");

      expect(await proofStream.registrationFee()).to.equal(newFee);
    });

    it("Should allow owner to update witness fee", async function () {
      const { proofStream, owner } = await loadFixture(deployProofStreamFixture);

      const newFee = ethers.parseEther("0.001");

      await expect(
        proofStream.connect(owner).setWitnessFee(newFee)
      ).to.emit(proofStream, "FeeUpdated")
        .withArgs(newFee, "witness");

      expect(await proofStream.witnessFee()).to.equal(newFee);
    });

    it("Should reject registration fee exceeding maximum", async function () {
      const { proofStream, owner } = await loadFixture(deployProofStreamFixture);

      const maxFee = await proofStream.MAX_REGISTRATION_FEE();
      const excessiveFee = maxFee + 1n;

      await expect(
        proofStream.connect(owner).setRegistrationFee(excessiveFee)
      ).to.be.revertedWith("Fee exceeds maximum");
    });

    it("Should reject witness fee exceeding maximum", async function () {
      const { proofStream, owner } = await loadFixture(deployProofStreamFixture);

      const maxFee = await proofStream.MAX_WITNESS_FEE();
      const excessiveFee = maxFee + 1n;

      await expect(
        proofStream.connect(owner).setWitnessFee(excessiveFee)
      ).to.be.revertedWith("Fee exceeds maximum");
    });

    it("Should allow setting fee to maximum", async function () {
      const { proofStream, owner } = await loadFixture(deployProofStreamFixture);

      const maxRegistrationFee = await proofStream.MAX_REGISTRATION_FEE();
      const maxWitnessFee = await proofStream.MAX_WITNESS_FEE();

      await expect(
        proofStream.connect(owner).setRegistrationFee(maxRegistrationFee)
      ).to.not.be.reverted;

      await expect(
        proofStream.connect(owner).setWitnessFee(maxWitnessFee)
      ).to.not.be.reverted;

      expect(await proofStream.registrationFee()).to.equal(maxRegistrationFee);
      expect(await proofStream.witnessFee()).to.equal(maxWitnessFee);
    });

    it("Should allow setting fee to zero", async function () {
      const { proofStream, owner } = await loadFixture(deployProofStreamFixture);

      await proofStream.connect(owner).setRegistrationFee(0);
      await proofStream.connect(owner).setWitnessFee(0);

      expect(await proofStream.registrationFee()).to.equal(0);
      expect(await proofStream.witnessFee()).to.equal(0);
    });

    it("Should reject fee update from non-owner", async function () {
      const { proofStream, user1 } = await loadFixture(deployProofStreamFixture);

      await expect(
        proofStream.connect(user1).setRegistrationFee(ethers.parseEther("0.002"))
      ).to.be.revertedWithCustomError(proofStream, "OwnableUnauthorizedAccount");

      await expect(
        proofStream.connect(user1).setWitnessFee(ethers.parseEther("0.001"))
      ).to.be.revertedWithCustomError(proofStream, "OwnableUnauthorizedAccount");
    });
  });

  describe("Pause Mechanism", function () {
    it("Should allow owner to pause contract", async function () {
      const { proofStream, owner } = await loadFixture(deployProofStreamFixture);

      await proofStream.connect(owner).pause();
      expect(await proofStream.paused()).to.be.true;
    });

    it("Should allow owner to unpause contract", async function () {
      const { proofStream, owner } = await loadFixture(deployProofStreamFixture);

      await proofStream.connect(owner).pause();
      expect(await proofStream.paused()).to.be.true;

      await proofStream.connect(owner).unpause();
      expect(await proofStream.paused()).to.be.false;
    });

    it("Should reject pause from non-owner", async function () {
      const { proofStream, user1 } = await loadFixture(deployProofStreamFixture);

      await expect(
        proofStream.connect(user1).pause()
      ).to.be.revertedWithCustomError(proofStream, "OwnableUnauthorizedAccount");
    });

    it("Should reject unpause from non-owner", async function () {
      const { proofStream, owner, user1 } = await loadFixture(deployProofStreamFixture);

      await proofStream.connect(owner).pause();

      await expect(
        proofStream.connect(user1).unpause()
      ).to.be.revertedWithCustomError(proofStream, "OwnableUnauthorizedAccount");
    });

    it("Should block operations when paused", async function () {
      const { proofStream, owner, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      await proofStream.connect(owner).pause();

      // Try to create project
      await expect(
        proofStream.connect(user1).createProject("test", "music", true, { value: registrationFee })
      ).to.be.revertedWithCustomError(proofStream, "EnforcedPause");
    });

    it("Should allow operations after unpausing", async function () {
      const { proofStream, owner, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      // Pause
      await proofStream.connect(owner).pause();

      // Unpause
      await proofStream.connect(owner).unpause();

      // Should work now
      await expect(
        proofStream.connect(user1).createProject("test", "music", true, { value: registrationFee })
      ).to.not.be.reverted;
    });
  });

  describe("Withdrawal", function () {
    it("Should allow owner to withdraw collected fees", async function () {
      const { proofStream, owner, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      // Create project to collect fees
      await proofStream.connect(user1).createProject("test", "music", true, { value: registrationFee });

      const contractBalance = await proofStream.getBalance();
      expect(contractBalance).to.equal(registrationFee);

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

      const tx = await proofStream.connect(owner).withdraw();
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      // Owner should receive the fee minus gas
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + registrationFee - gasCost);

      // Contract balance should be zero
      expect(await proofStream.getBalance()).to.equal(0);
    });

    it("Should reject withdrawal with zero balance", async function () {
      const { proofStream, owner } = await loadFixture(deployProofStreamFixture);

      await expect(
        proofStream.connect(owner).withdraw()
      ).to.be.revertedWith("No funds to withdraw");
    });

    it("Should reject withdrawal from non-owner", async function () {
      const { proofStream, user1, user2, registrationFee } = await loadFixture(deployProofStreamFixture);

      // Create project to collect fees
      await proofStream.connect(user1).createProject("test", "music", true, { value: registrationFee });

      await expect(
        proofStream.connect(user2).withdraw()
      ).to.be.revertedWithCustomError(proofStream, "OwnableUnauthorizedAccount");
    });

    it("Should handle multiple withdrawals", async function () {
      const { proofStream, owner, user1, user2, registrationFee, witnessFee } = await loadFixture(deployProofStreamFixture);

      // Collect some fees
      const projectHash = await createSampleProject(proofStream, user1);
      const milestoneIndex = await registerSampleMilestone(proofStream, user1, projectHash);
      await proofStream.connect(user2).addWitness(projectHash, milestoneIndex, { value: witnessFee });

      const expectedBalance = registrationFee * 2n + witnessFee;
      expect(await proofStream.getBalance()).to.equal(expectedBalance);

      // First withdrawal
      await proofStream.connect(owner).withdraw();
      expect(await proofStream.getBalance()).to.equal(0);

      // Collect more fees
      await proofStream.connect(user1).createProject("test2", "art", true, { value: registrationFee });

      // Second withdrawal
      await proofStream.connect(owner).withdraw();
      expect(await proofStream.getBalance()).to.equal(0);
    });
  });

  describe("Contract Balance", function () {
    it("Should track balance correctly", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      expect(await proofStream.getBalance()).to.equal(0);

      await proofStream.connect(user1).createProject("test", "music", true, { value: registrationFee });

      expect(await proofStream.getBalance()).to.equal(registrationFee);
    });

    it("Should accumulate fees from multiple operations", async function () {
      const { proofStream, user1, user2, registrationFee, witnessFee } = await loadFixture(deployProofStreamFixture);

      // Create project
      const projectHash = await createSampleProject(proofStream, user1);

      // Register milestone
      const milestoneIndex = await registerSampleMilestone(proofStream, user1, projectHash);

      // Add witness
      await proofStream.connect(user2).addWitness(projectHash, milestoneIndex, { value: witnessFee });

      const expectedBalance = registrationFee * 2n + witnessFee;
      expect(await proofStream.getBalance()).to.equal(expectedBalance);
    });

    it("Should allow viewing balance by anyone", async function () {
      const { proofStream, user1, user2, registrationFee } = await loadFixture(deployProofStreamFixture);

      await proofStream.connect(user1).createProject("test", "music", true, { value: registrationFee });

      // User2 can view balance
      const balance = await proofStream.connect(user2).getBalance();
      expect(balance).to.equal(registrationFee);
    });
  });

  describe("Receive Function", function () {
    it("Should accept direct ETH transfers", async function () {
      const { proofStream, user1 } = await loadFixture(deployProofStreamFixture);

      const amount = ethers.parseEther("1");

      await user1.sendTransaction({
        to: await proofStream.getAddress(),
        value: amount
      });

      expect(await proofStream.getBalance()).to.equal(amount);
    });

    it("Should accumulate direct transfers with fees", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      // Create project (fee)
      await proofStream.connect(user1).createProject("test", "music", true, { value: registrationFee });

      // Direct transfer
      const directAmount = ethers.parseEther("0.5");
      await user1.sendTransaction({
        to: await proofStream.getAddress(),
        value: directAmount
      });

      expect(await proofStream.getBalance()).to.equal(registrationFee + directAmount);
    });
  });

  describe("Owner Management", function () {
    it("Should identify correct owner", async function () {
      const { proofStream, owner } = await loadFixture(deployProofStreamFixture);

      expect(await proofStream.owner()).to.equal(owner.address);
    });

    it("Should allow owner to transfer ownership", async function () {
      const { proofStream, owner, user1 } = await loadFixture(deployProofStreamFixture);

      await proofStream.connect(owner).transferOwnership(user1.address);

      expect(await proofStream.owner()).to.equal(user1.address);
    });

    it("Should reject ownership transfer from non-owner", async function () {
      const { proofStream, user1, user2 } = await loadFixture(deployProofStreamFixture);

      await expect(
        proofStream.connect(user1).transferOwnership(user2.address)
      ).to.be.revertedWithCustomError(proofStream, "OwnableUnauthorizedAccount");
    });
  });

  describe("Constants", function () {
    it("Should have correct constant values", async function () {
      const { proofStream } = await loadFixture(deployProofStreamFixture);

      expect(await proofStream.MAX_REGISTRATION_FEE()).to.equal(ethers.parseEther("0.1"));
      expect(await proofStream.MAX_WITNESS_FEE()).to.equal(ethers.parseEther("0.05"));
      expect(await proofStream.MAX_WITNESSES_PER_MILESTONE()).to.equal(50);
      expect(await proofStream.MAX_STRING_LENGTH()).to.equal(200);
      expect(await proofStream.MAX_IPFS_HASH_LENGTH()).to.equal(100);
    });

    it("Should not allow changing constants", async function () {
      const { proofStream } = await loadFixture(deployProofStreamFixture);

      // Constants should be public but immutable
      // This is a compile-time guarantee in Solidity, but we verify values don't change
      const maxRegFee1 = await proofStream.MAX_REGISTRATION_FEE();
      const maxRegFee2 = await proofStream.MAX_REGISTRATION_FEE();

      expect(maxRegFee1).to.equal(maxRegFee2);
    });
  });
});
