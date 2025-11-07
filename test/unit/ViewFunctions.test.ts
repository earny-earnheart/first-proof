import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployProofStreamFixture, createSampleProject, registerSampleMilestone, generateContentHash } from "../fixtures/deployFixture";

describe("ProofStream - View Functions", function () {
  describe("Creator Projects Pagination", function () {
    it("Should return empty array for creator with no projects", async function () {
      const { proofStream, user1 } = await loadFixture(deployProofStreamFixture);

      const [projects, total] = await proofStream.getCreatorProjects(user1.address, 0, 10);

      expect(projects.length).to.equal(0);
      expect(total).to.equal(0);
    });

    it("Should return all projects within limit", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      // Create 3 projects
      for (let i = 0; i < 3; i++) {
        await proofStream.connect(user1).createProject(`project-${i}`, "music", true, { value: registrationFee });
      }

      const [projects, total] = await proofStream.getCreatorProjects(user1.address, 0, 10);

      expect(projects.length).to.equal(3);
      expect(total).to.equal(3);
    });

    it("Should paginate correctly with offset and limit", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      // Create 10 projects
      for (let i = 0; i < 10; i++) {
        await proofStream.connect(user1).createProject(`project-${i}`, "music", true, { value: registrationFee });
      }

      // Get first 5
      const [projects1, total1] = await proofStream.getCreatorProjects(user1.address, 0, 5);
      expect(projects1.length).to.equal(5);
      expect(total1).to.equal(10);

      // Get next 5
      const [projects2, total2] = await proofStream.getCreatorProjects(user1.address, 5, 5);
      expect(projects2.length).to.equal(5);
      expect(total2).to.equal(10);

      // Hashes should be different
      expect(projects1[0]).to.not.equal(projects2[0]);
    });

    it("Should handle offset beyond total", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      await proofStream.connect(user1).createProject("project", "music", true, { value: registrationFee });

      const [projects, total] = await proofStream.getCreatorProjects(user1.address, 10, 5);

      expect(projects.length).to.equal(0);
      expect(total).to.equal(1);
    });

    it("Should limit results when total exceeds limit", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      // Create 5 projects
      for (let i = 0; i < 5; i++) {
        await proofStream.connect(user1).createProject(`project-${i}`, "music", true, { value: registrationFee });
      }

      // Request only 3
      const [projects, total] = await proofStream.getCreatorProjects(user1.address, 0, 3);

      expect(projects.length).to.equal(3);
      expect(total).to.equal(5);
    });

    it("Should return correct total across multiple queries", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      for (let i = 0; i < 7; i++) {
        await proofStream.connect(user1).createProject(`project-${i}`, "music", true, { value: registrationFee });
      }

      const [_, total1] = await proofStream.getCreatorProjects(user1.address, 0, 3);
      const [__, total2] = await proofStream.getCreatorProjects(user1.address, 3, 3);
      const [___, total3] = await proofStream.getCreatorProjects(user1.address, 6, 3);

      expect(total1).to.equal(7);
      expect(total2).to.equal(7);
      expect(total3).to.equal(7);
    });
  });

  describe("Creator Project Count", function () {
    it("Should return zero for new creator", async function () {
      const { proofStream, user1 } = await loadFixture(deployProofStreamFixture);

      expect(await proofStream.getCreatorProjectCount(user1.address)).to.equal(0);
    });

    it("Should increment with each project", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      expect(await proofStream.getCreatorProjectCount(user1.address)).to.equal(0);

      await proofStream.connect(user1).createProject("project1", "music", true, { value: registrationFee });
      expect(await proofStream.getCreatorProjectCount(user1.address)).to.equal(1);

      await proofStream.connect(user1).createProject("project2", "art", false, { value: registrationFee });
      expect(await proofStream.getCreatorProjectCount(user1.address)).to.equal(2);
    });

    it("Should track counts separately per creator", async function () {
      const { proofStream, user1, user2, registrationFee } = await loadFixture(deployProofStreamFixture);

      await proofStream.connect(user1).createProject("user1-project", "music", true, { value: registrationFee });
      await proofStream.connect(user2).createProject("user2-project1", "art", true, { value: registrationFee });
      await proofStream.connect(user2).createProject("user2-project2", "writing", false, { value: registrationFee });

      expect(await proofStream.getCreatorProjectCount(user1.address)).to.equal(1);
      expect(await proofStream.getCreatorProjectCount(user2.address)).to.equal(2);
    });
  });

  describe("Project Details", function () {
    it("Should return correct project details", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const projectId = "my-project";
      const category = "music";
      const isPublic = true;

      const tx = await proofStream.connect(user1).createProject(projectId, category, isPublic, { value: registrationFee });
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

    it("Should update milestone count", async function () {
      const { proofStream, user1 } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);

      let project = await proofStream.getProject(projectHash);
      expect(project.milestoneCount).to.equal(0);

      await registerSampleMilestone(proofStream, user1, projectHash);

      project = await proofStream.getProject(projectHash);
      expect(project.milestoneCount).to.equal(1);
    });
  });

  describe("Milestone Details", function () {
    it("Should return correct milestone details", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);
      const contentHash = generateContentHash("test");
      const title = "My Work";
      const stage = "final";
      const ipfsHash = "QmTest123";
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

    it("Should reflect witness count changes", async function () {
      const { proofStream, user1, user2, witnessFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);
      const milestoneIndex = await registerSampleMilestone(proofStream, user1, projectHash);

      let milestone = await proofStream.getMilestone(projectHash, milestoneIndex);
      expect(milestone.witnessCount).to.equal(0);

      await proofStream.connect(user2).addWitness(projectHash, milestoneIndex, { value: witnessFee });

      milestone = await proofStream.getMilestone(projectHash, milestoneIndex);
      expect(milestone.witnessCount).to.equal(1);
    });
  });

  describe("Milestone Count", function () {
    it("Should return zero for new project", async function () {
      const { proofStream, user1 } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);

      expect(await proofStream.getProjectMilestoneCount(projectHash)).to.equal(0);
    });

    it("Should increment with each milestone", async function () {
      const { proofStream, user1, registrationFee } = await loadFixture(deployProofStreamFixture);

      const projectHash = await createSampleProject(proofStream, user1);

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

      expect(await proofStream.getProjectMilestoneCount(projectHash)).to.equal(5);
    });
  });

  describe("Statistics", function () {
    it("Should track total projects", async function () {
      const { proofStream, user1, user2, registrationFee } = await loadFixture(deployProofStreamFixture);

      expect(await proofStream.totalProjects()).to.equal(0);

      await proofStream.connect(user1).createProject("project1", "music", true, { value: registrationFee });
      expect(await proofStream.totalProjects()).to.equal(1);

      await proofStream.connect(user2).createProject("project2", "art", false, { value: registrationFee });
      expect(await proofStream.totalProjects()).to.equal(2);
    });

    it("Should track total milestones", async function () {
      const { proofStream, user1, user2, registrationFee } = await loadFixture(deployProofStreamFixture);

      expect(await proofStream.totalMilestones()).to.equal(0);

      const projectHash1 = await createSampleProject(proofStream, user1);
      await registerSampleMilestone(proofStream, user1, projectHash1);
      expect(await proofStream.totalMilestones()).to.equal(1);

      const projectHash2 = await createSampleProject(proofStream, user2, "project2");
      await registerSampleMilestone(proofStream, user2, projectHash2);
      expect(await proofStream.totalMilestones()).to.equal(2);
    });

    it("Should track statistics across multiple users", async function () {
      const { proofStream, user1, user2, user3, registrationFee } = await loadFixture(deployProofStreamFixture);

      // User1: 2 projects, 3 milestones
      const p1 = await createSampleProject(proofStream, user1, "p1");
      await registerSampleMilestone(proofStream, user1, p1);
      await registerSampleMilestone(proofStream, user1, p1);
      const p2 = await createSampleProject(proofStream, user1, "p2");
      await registerSampleMilestone(proofStream, user1, p2);

      // User2: 1 project, 2 milestones
      const p3 = await createSampleProject(proofStream, user2, "p3");
      await registerSampleMilestone(proofStream, user2, p3);
      await registerSampleMilestone(proofStream, user2, p3);

      // User3: 1 project, 0 milestones
      await createSampleProject(proofStream, user3, "p4");

      expect(await proofStream.totalProjects()).to.equal(4);
      expect(await proofStream.totalMilestones()).to.equal(5);
    });
  });
});
