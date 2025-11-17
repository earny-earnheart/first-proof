const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("ProofStream", function () {
  // Fixture to deploy contract
  async function deployProofStreamFixture() {
    const [owner, creator, witness1, witness2, witness3] = await ethers.getSigners();

    const ProofStream = await ethers.getContractFactory("ProofStream");
    const proofStream = await ProofStream.deploy();

    const registrationFee = await proofStream.registrationFee();
    const witnessFee = await proofStream.witnessFee();

    return { proofStream, owner, creator, witness1, witness2, witness3, registrationFee, witnessFee };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { proofStream, owner } = await loadFixture(deployProofStreamFixture);
      expect(await proofStream.owner()).to.equal(owner.address);
    });

    it("Should initialize with correct fees", async function () {
      const { proofStream } = await loadFixture(deployProofStreamFixture);
      expect(await proofStream.registrationFee()).to.equal(ethers.parseEther("0.001"));
      expect(await proofStream.witnessFee()).to.equal(ethers.parseEther("0.0005"));
    });

    it("Should initialize statistics to zero", async function () {
      const { proofStream } = await loadFixture(deployProofStreamFixture);
      expect(await proofStream.totalProjects()).to.equal(0);
      expect(await proofStream.totalMilestones()).to.equal(0);
    });
  });

  describe("Project Creation", function () {
    it("Should create a project successfully", async function () {
      const { proofStream, creator, registrationFee } = await loadFixture(deployProofStreamFixture);

      const tx = await proofStream.connect(creator).createProject(
        "MyFirstProject",
        "music",
        true,
        { value: registrationFee }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return proofStream.interface.parseLog(log).name === "ProjectCreated";
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;
      expect(await proofStream.totalProjects()).to.equal(1);
    });

    it("Should refund overpayment", async function () {
      const { proofStream, creator, registrationFee } = await loadFixture(deployProofStreamFixture);

      const overpayment = registrationFee + ethers.parseEther("0.001");
      const balanceBefore = await ethers.provider.getBalance(creator.address);

      const tx = await proofStream.connect(creator).createProject(
        "MyProject",
        "art",
        true,
        { value: overpayment }
      );

      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(creator.address);

      // Should only pay registration fee, not overpayment
      expect(balanceBefore - balanceAfter).to.be.closeTo(registrationFee + gasUsed, ethers.parseEther("0.0001"));
    });

    it("Should reject project with empty ID", async function () {
      const { proofStream, creator, registrationFee } = await loadFixture(deployProofStreamFixture);

      await expect(
        proofStream.connect(creator).createProject("", "music", true, { value: registrationFee })
      ).to.be.revertedWith("Project ID required");
    });

    it("Should reject project with ID too long", async function () {
      const { proofStream, creator, registrationFee } = await loadFixture(deployProofStreamFixture);

      const longId = "a".repeat(257);
      await expect(
        proofStream.connect(creator).createProject(longId, "music", true, { value: registrationFee })
      ).to.be.revertedWith("Project ID too long");
    });

    it("Should reject project with empty category", async function () {
      const { proofStream, creator, registrationFee } = await loadFixture(deployProofStreamFixture);

      await expect(
        proofStream.connect(creator).createProject("MyProject", "", true, { value: registrationFee })
      ).to.be.revertedWith("Category required");
    });

    it("Should reject project with insufficient fee", async function () {
      const { proofStream, creator } = await loadFixture(deployProofStreamFixture);

      await expect(
        proofStream.connect(creator).createProject("MyProject", "music", true, { value: ethers.parseEther("0.0001") })
      ).to.be.revertedWith("Insufficient fee");
    });
  });

  describe("Milestone Registration", function () {
    async function createProjectFixture() {
      const fixture = await deployProofStreamFixture();
      const { proofStream, creator, registrationFee } = fixture;

      const tx = await proofStream.connect(creator).createProject(
        "TestProject",
        "music",
        true,
        { value: registrationFee }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return proofStream.interface.parseLog(log).name === "ProjectCreated";
        } catch {
          return false;
        }
      });

      const projectHash = proofStream.interface.parseLog(event).args.projectHash;

      return { ...fixture, projectHash };
    }

    it("Should register milestone successfully", async function () {
      const { proofStream, creator, projectHash, registrationFee } = await loadFixture(createProjectFixture);

      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("My first milestone content"));

      await expect(
        proofStream.connect(creator).registerMilestone(
          projectHash,
          contentHash,
          "First Draft",
          "draft",
          "QmTest123",
          false,
          { value: registrationFee }
        )
      ).to.emit(proofStream, "MilestoneRegistered");

      expect(await proofStream.totalMilestones()).to.equal(1);
    });

    it("Should prevent duplicate content hash registration", async function () {
      const { proofStream, creator, projectHash, registrationFee } = await loadFixture(createProjectFixture);

      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("Duplicate content"));

      await proofStream.connect(creator).registerMilestone(
        projectHash,
        contentHash,
        "First",
        "draft",
        "",
        false,
        { value: registrationFee }
      );

      await expect(
        proofStream.connect(creator).registerMilestone(
          projectHash,
          contentHash,
          "Second",
          "draft",
          "",
          false,
          { value: registrationFee }
        )
      ).to.be.revertedWith("Content already registered");
    });

    it("Should reject milestone from non-owner", async function () {
      const { proofStream, witness1, projectHash, registrationFee } = await loadFixture(createProjectFixture);

      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("Test content"));

      await expect(
        proofStream.connect(witness1).registerMilestone(
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

    it("Should validate string lengths", async function () {
      const { proofStream, creator, projectHash, registrationFee } = await loadFixture(createProjectFixture);

      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("Test"));
      const longTitle = "a".repeat(257);

      await expect(
        proofStream.connect(creator).registerMilestone(
          projectHash,
          contentHash,
          longTitle,
          "draft",
          "",
          false,
          { value: registrationFee }
        )
      ).to.be.revertedWith("Title too long");
    });
  });

  describe("Witness Functionality", function () {
    async function createMilestoneFixture() {
      const fixture = await createProjectFixture();
      const { proofStream, creator, projectHash, registrationFee } = fixture;

      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("Milestone content"));

      await proofStream.connect(creator).registerMilestone(
        projectHash,
        contentHash,
        "Test Milestone",
        "draft",
        "",
        false,
        { value: registrationFee }
      );

      return { ...fixture, milestoneIndex: 0 };
    }

    async function createProjectFixture() {
      const fixture = await deployProofStreamFixture();
      const { proofStream, creator, registrationFee } = fixture;

      const tx = await proofStream.connect(creator).createProject(
        "TestProject",
        "music",
        true,
        { value: registrationFee }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return proofStream.interface.parseLog(log).name === "ProjectCreated";
        } catch {
          return false;
        }
      });

      const projectHash = proofStream.interface.parseLog(event).args.projectHash;

      return { ...fixture, projectHash };
    }

    it("Should add witness successfully", async function () {
      const { proofStream, witness1, projectHash, milestoneIndex, witnessFee } = await loadFixture(createMilestoneFixture);

      await expect(
        proofStream.connect(witness1).addWitness(projectHash, milestoneIndex, { value: witnessFee })
      ).to.emit(proofStream, "WitnessAdded");
    });

    it("Should prevent duplicate witness", async function () {
      const { proofStream, witness1, projectHash, milestoneIndex, witnessFee } = await loadFixture(createMilestoneFixture);

      await proofStream.connect(witness1).addWitness(projectHash, milestoneIndex, { value: witnessFee });

      await expect(
        proofStream.connect(witness1).addWitness(projectHash, milestoneIndex, { value: witnessFee })
      ).to.be.revertedWith("Already witnessed");
    });

    it("Should enforce witness limit", async function () {
      const { proofStream, projectHash, milestoneIndex, witnessFee } = await loadFixture(createMilestoneFixture);

      const maxWitnesses = await proofStream.MAX_WITNESSES();
      const witnesses = await ethers.getSigners();

      // Add witnesses up to the limit
      for (let i = 0; i < maxWitnesses; i++) {
        await proofStream.connect(witnesses[i]).addWitness(projectHash, milestoneIndex, { value: witnessFee });
      }

      // Try to add one more witness
      const extraWitness = witnesses[Number(maxWitnesses)];
      await expect(
        proofStream.connect(extraWitness).addWitness(projectHash, milestoneIndex, { value: witnessFee })
      ).to.be.revertedWith("Maximum witnesses reached");
    });

    it("Should authorize and enforce witness authorization for private projects", async function () {
      const { proofStream, creator, witness1, registrationFee, witnessFee } = await loadFixture(deployProofStreamFixture);

      // Create private project
      const tx = await proofStream.connect(creator).createProject(
        "PrivateProject",
        "art",
        false,
        { value: registrationFee }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return proofStream.interface.parseLog(log).name === "ProjectCreated";
        } catch {
          return false;
        }
      });

      const projectHash = proofStream.interface.parseLog(event).args.projectHash;

      // Register milestone
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("Private content"));
      await proofStream.connect(creator).registerMilestone(
        projectHash,
        contentHash,
        "Private Milestone",
        "draft",
        "",
        false,
        { value: registrationFee }
      );

      // Unauthorized witness should fail
      await expect(
        proofStream.connect(witness1).addWitness(projectHash, 0, { value: witnessFee })
      ).to.be.revertedWith("Not authorized to witness private project");

      // Authorize witness
      await proofStream.connect(creator).authorizeWitness(witness1.address);

      // Now witness should succeed
      await expect(
        proofStream.connect(witness1).addWitness(projectHash, 0, { value: witnessFee })
      ).to.emit(proofStream, "WitnessAdded");
    });
  });

  describe("View Functions", function () {
    it("Should verify content correctly", async function () {
      const { proofStream, creator, registrationFee } = await loadFixture(deployProofStreamFixture);

      // Create project
      const tx = await proofStream.connect(creator).createProject(
        "VerifyProject",
        "writing",
        true,
        { value: registrationFee }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return proofStream.interface.parseLog(log).name === "ProjectCreated";
        } catch {
          return false;
        }
      });

      const projectHash = proofStream.interface.parseLog(event).args.projectHash;

      // Register milestone
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("Content to verify"));
      await proofStream.connect(creator).registerMilestone(
        projectHash,
        contentHash,
        "Verify Milestone",
        "final",
        "",
        false,
        { value: registrationFee }
      );

      // Verify content
      const [exists, timestamp, contentCreator] = await proofStream.verifyContent(contentHash);

      expect(exists).to.be.true;
      expect(contentCreator).to.equal(creator.address);
      expect(timestamp).to.be.gt(0);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update fees", async function () {
      const { proofStream, owner } = await loadFixture(deployProofStreamFixture);

      const newFee = ethers.parseEther("0.002");
      await expect(proofStream.connect(owner).setRegistrationFee(newFee))
        .to.emit(proofStream, "FeeUpdated")
        .withArgs(newFee, "registration");

      expect(await proofStream.registrationFee()).to.equal(newFee);
    });

    it("Should prevent non-owner from updating fees", async function () {
      const { proofStream, creator } = await loadFixture(deployProofStreamFixture);

      await expect(
        proofStream.connect(creator).setRegistrationFee(ethers.parseEther("0.002"))
      ).to.be.reverted;
    });

    it("Should allow owner to pause and unpause", async function () {
      const { proofStream, owner, creator, registrationFee } = await loadFixture(deployProofStreamFixture);

      // Pause contract
      await proofStream.connect(owner).pause();

      // Try to create project while paused
      await expect(
        proofStream.connect(creator).createProject("Test", "music", true, { value: registrationFee })
      ).to.be.reverted;

      // Unpause
      await proofStream.connect(owner).unpause();

      // Should work now
      await expect(
        proofStream.connect(creator).createProject("Test", "music", true, { value: registrationFee })
      ).to.not.be.reverted;
    });

    it("Should allow owner to withdraw funds", async function () {
      const { proofStream, owner, creator, registrationFee } = await loadFixture(deployProofStreamFixture);

      // Create a project to add funds to contract
      await proofStream.connect(creator).createProject(
        "FundedProject",
        "music",
        true,
        { value: registrationFee }
      );

      const balanceBefore = await ethers.provider.getBalance(owner.address);
      const tx = await proofStream.connect(owner).withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(owner.address);

      expect(balanceAfter).to.be.gt(balanceBefore - gasUsed);
    });
  });
});
