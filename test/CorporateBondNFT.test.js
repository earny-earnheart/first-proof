const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("CorporateBondNFT", function () {
  // Fixture to deploy contract
  async function deployCorporateBondFixture() {
    const [owner, issuer, investor1, investor2] = await ethers.getSigners();

    const CorporateBondNFT = await ethers.getContractFactory("CorporateBondNFT");
    const bondContract = await CorporateBondNFT.deploy();

    // Bond parameters
    const principal = ethers.parseEther("1");
    const couponRate = 500; // 5%
    const maturityPeriod = 365 * 24 * 60 * 60; // 1 year
    const couponFrequency = 90 * 24 * 60 * 60; // Quarterly (90 days)
    const bondType = "corporate";
    const tokenURI = "ipfs://QmTest123";
    const proofStreamProject = ethers.ZeroHash;

    return {
      bondContract,
      owner,
      issuer,
      investor1,
      investor2,
      principal,
      couponRate,
      maturityPeriod,
      couponFrequency,
      bondType,
      tokenURI,
      proofStreamProject,
    };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { bondContract, owner } = await loadFixture(deployCorporateBondFixture);
      expect(await bondContract.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      const { bondContract } = await loadFixture(deployCorporateBondFixture);
      expect(await bondContract.name()).to.equal("Corporate Bond NFT");
      expect(await bondContract.symbol()).to.equal("CBOND");
    });

    it("Should initialize with correct platform fee", async function () {
      const { bondContract } = await loadFixture(deployCorporateBondFixture);
      expect(await bondContract.platformFee()).to.equal(50);
    });
  });

  describe("Bond Issuance", function () {
    it("Should issue bond successfully", async function () {
      const {
        bondContract,
        issuer,
        principal,
        couponRate,
        maturityPeriod,
        couponFrequency,
        bondType,
        tokenURI,
        proofStreamProject,
      } = await loadFixture(deployCorporateBondFixture);

      await expect(
        bondContract.connect(issuer).issueBond(
          principal,
          couponRate,
          maturityPeriod,
          couponFrequency,
          bondType,
          tokenURI,
          proofStreamProject,
          { value: principal }
        )
      ).to.emit(bondContract, "BondIssued");

      // Check bond was minted to issuer
      expect(await bondContract.ownerOf(1)).to.equal(issuer.address);
      expect(await bondContract.balanceOf(issuer.address)).to.equal(1);
    });

    it("Should refund overpayment on bond issuance", async function () {
      const {
        bondContract,
        issuer,
        principal,
        couponRate,
        maturityPeriod,
        couponFrequency,
        bondType,
        tokenURI,
        proofStreamProject,
      } = await loadFixture(deployCorporateBondFixture);

      const overpayment = principal + ethers.parseEther("0.5");
      const balanceBefore = await ethers.provider.getBalance(issuer.address);

      const tx = await bondContract.connect(issuer).issueBond(
        principal,
        couponRate,
        maturityPeriod,
        couponFrequency,
        bondType,
        tokenURI,
        proofStreamProject,
        { value: overpayment }
      );

      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(issuer.address);

      expect(balanceBefore - balanceAfter).to.be.closeTo(principal + gasUsed, ethers.parseEther("0.001"));
    });

    it("Should reject bond with principal too low", async function () {
      const {
        bondContract,
        issuer,
        couponRate,
        maturityPeriod,
        couponFrequency,
        bondType,
        tokenURI,
        proofStreamProject,
      } = await loadFixture(deployCorporateBondFixture);

      const lowPrincipal = ethers.parseEther("0.001");

      await expect(
        bondContract.connect(issuer).issueBond(
          lowPrincipal,
          couponRate,
          maturityPeriod,
          couponFrequency,
          bondType,
          tokenURI,
          proofStreamProject,
          { value: lowPrincipal }
        )
      ).to.be.revertedWith("Invalid principal");
    });

    it("Should reject bond with coupon rate too high", async function () {
      const {
        bondContract,
        issuer,
        principal,
        maturityPeriod,
        couponFrequency,
        bondType,
        tokenURI,
        proofStreamProject,
      } = await loadFixture(deployCorporateBondFixture);

      const highCouponRate = 6000; // 60%

      await expect(
        bondContract.connect(issuer).issueBond(
          principal,
          highCouponRate,
          maturityPeriod,
          couponFrequency,
          bondType,
          tokenURI,
          proofStreamProject,
          { value: principal }
        )
      ).to.be.revertedWith("Coupon rate too high");
    });

    it("Should reject bond with insufficient collateral", async function () {
      const {
        bondContract,
        issuer,
        principal,
        couponRate,
        maturityPeriod,
        couponFrequency,
        bondType,
        tokenURI,
        proofStreamProject,
      } = await loadFixture(deployCorporateBondFixture);

      await expect(
        bondContract.connect(issuer).issueBond(
          principal,
          couponRate,
          maturityPeriod,
          couponFrequency,
          bondType,
          tokenURI,
          proofStreamProject,
          { value: principal / 2n }
        )
      ).to.be.revertedWith("Insufficient collateral");
    });

    it("Should emit ProofStreamLinked event when project hash provided", async function () {
      const {
        bondContract,
        issuer,
        principal,
        couponRate,
        maturityPeriod,
        couponFrequency,
        bondType,
        tokenURI,
      } = await loadFixture(deployCorporateBondFixture);

      const projectHash = ethers.keccak256(ethers.toUtf8Bytes("TestProject"));

      await expect(
        bondContract.connect(issuer).issueBond(
          principal,
          couponRate,
          maturityPeriod,
          couponFrequency,
          bondType,
          tokenURI,
          projectHash,
          { value: principal }
        )
      ).to.emit(bondContract, "ProofStreamLinked").withArgs(1, projectHash);
    });
  });

  describe("Coupon Payments", function () {
    async function issueBondFixture() {
      const fixture = await deployCorporateBondFixture();
      const {
        bondContract,
        issuer,
        principal,
        couponRate,
        maturityPeriod,
        couponFrequency,
        bondType,
        tokenURI,
        proofStreamProject,
      } = fixture;

      await bondContract.connect(issuer).issueBond(
        principal,
        couponRate,
        maturityPeriod,
        couponFrequency,
        bondType,
        tokenURI,
        proofStreamProject,
        { value: principal }
      );

      return { ...fixture, bondId: 1 };
    }

    it("Should calculate pending coupon correctly", async function () {
      const { bondContract, bondId, principal, couponRate, couponFrequency } = await loadFixture(issueBondFixture);

      // Initially, no coupon should be pending
      expect(await bondContract.calculatePendingCoupon(bondId)).to.equal(0);

      // Advance time by one coupon period
      await time.increase(couponFrequency);

      // Calculate expected coupon: (principal * rate) / (10000 * periods_per_year)
      const periodsPerYear = (365 * 24 * 60 * 60) / couponFrequency;
      const expectedCoupon = (principal * BigInt(couponRate)) / (10000n * BigInt(periodsPerYear));

      const pendingCoupon = await bondContract.calculatePendingCoupon(bondId);
      expect(pendingCoupon).to.be.closeTo(expectedCoupon, ethers.parseEther("0.001"));
    });

    it("Should allow bond holder to claim coupon", async function () {
      const { bondContract, issuer, bondId, couponFrequency } = await loadFixture(issueBondFixture);

      // Advance time by one coupon period
      await time.increase(couponFrequency);

      const balanceBefore = await ethers.provider.getBalance(issuer.address);

      await expect(
        bondContract.connect(issuer).claimCoupon(bondId)
      ).to.emit(bondContract, "CouponPaid");

      const balanceAfter = await ethers.provider.getBalance(issuer.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should reject coupon claim if no payment is due", async function () {
      const { bondContract, issuer, bondId } = await loadFixture(issueBondFixture);

      await expect(
        bondContract.connect(issuer).claimCoupon(bondId)
      ).to.be.revertedWith("No coupon payment due");
    });

    it("Should reject coupon claim from non-holder", async function () {
      const { bondContract, investor1, bondId, couponFrequency } = await loadFixture(issueBondFixture);

      await time.increase(couponFrequency);

      await expect(
        bondContract.connect(investor1).claimCoupon(bondId)
      ).to.be.revertedWith("Not bond holder");
    });

    it("Should handle multiple coupon periods correctly", async function () {
      const { bondContract, issuer, bondId, couponFrequency, principal, couponRate } = await loadFixture(issueBondFixture);

      // Advance time by 2 coupon periods
      await time.increase(couponFrequency * 2);

      // Should accumulate 2 periods worth of coupons
      const periodsPerYear = (365 * 24 * 60 * 60) / couponFrequency;
      const expectedCoupon = (principal * BigInt(couponRate) * 2n) / (10000n * BigInt(periodsPerYear));

      const pendingCoupon = await bondContract.calculatePendingCoupon(bondId);
      expect(pendingCoupon).to.be.closeTo(expectedCoupon, ethers.parseEther("0.001"));
    });
  });

  describe("Bond Transfer", function () {
    async function issueBondFixture() {
      const fixture = await deployCorporateBondFixture();
      const {
        bondContract,
        issuer,
        principal,
        couponRate,
        maturityPeriod,
        couponFrequency,
        bondType,
        tokenURI,
        proofStreamProject,
      } = fixture;

      await bondContract.connect(issuer).issueBond(
        principal,
        couponRate,
        maturityPeriod,
        couponFrequency,
        bondType,
        tokenURI,
        proofStreamProject,
        { value: principal }
      );

      return { ...fixture, bondId: 1 };
    }

    it("Should transfer bond NFT successfully", async function () {
      const { bondContract, issuer, investor1, bondId } = await loadFixture(issueBondFixture);

      await bondContract.connect(issuer).transferFrom(issuer.address, investor1.address, bondId);

      expect(await bondContract.ownerOf(bondId)).to.equal(investor1.address);
      expect(await bondContract.balanceOf(investor1.address)).to.equal(1);
      expect(await bondContract.balanceOf(issuer.address)).to.equal(0);
    });

    it("Should allow new owner to claim coupons after transfer", async function () {
      const { bondContract, issuer, investor1, bondId, couponFrequency } = await loadFixture(issueBondFixture);

      // Transfer bond
      await bondContract.connect(issuer).transferFrom(issuer.address, investor1.address, bondId);

      // Advance time
      await time.increase(couponFrequency);

      // New owner should be able to claim
      await expect(
        bondContract.connect(investor1).claimCoupon(bondId)
      ).to.emit(bondContract, "CouponPaid");
    });
  });

  describe("Bond Maturity and Redemption", function () {
    async function issueBondFixture() {
      const fixture = await deployCorporateBondFixture();
      const {
        bondContract,
        issuer,
        principal,
        couponRate,
        maturityPeriod,
        couponFrequency,
        bondType,
        tokenURI,
        proofStreamProject,
      } = fixture;

      await bondContract.connect(issuer).issueBond(
        principal,
        couponRate,
        maturityPeriod,
        couponFrequency,
        bondType,
        tokenURI,
        proofStreamProject,
        { value: principal }
      );

      return { ...fixture, bondId: 1 };
    }

    it("Should detect bond maturity correctly", async function () {
      const { bondContract, bondId, maturityPeriod } = await loadFixture(issueBondFixture);

      expect(await bondContract.hasMatured(bondId)).to.be.false;

      await time.increase(maturityPeriod);

      expect(await bondContract.hasMatured(bondId)).to.be.true;
    });

    it("Should allow redemption at maturity", async function () {
      const { bondContract, issuer, bondId, maturityPeriod, principal } = await loadFixture(issueBondFixture);

      await time.increase(maturityPeriod);

      const balanceBefore = await ethers.provider.getBalance(issuer.address);

      await expect(
        bondContract.connect(issuer).redeemBond(bondId)
      ).to.emit(bondContract, "BondRedeemed");

      const balanceAfter = await ethers.provider.getBalance(issuer.address);

      // Should receive principal back (minus gas)
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should reject redemption before maturity", async function () {
      const { bondContract, issuer, bondId } = await loadFixture(issueBondFixture);

      await expect(
        bondContract.connect(issuer).redeemBond(bondId)
      ).to.be.revertedWith("Bond not yet matured");
    });

    it("Should reject double redemption", async function () {
      const { bondContract, issuer, bondId, maturityPeriod } = await loadFixture(issueBondFixture);

      await time.increase(maturityPeriod);

      await bondContract.connect(issuer).redeemBond(bondId);

      await expect(
        bondContract.connect(issuer).redeemBond(bondId)
      ).to.be.revertedWith("Already redeemed");
    });

    it("Should reject redemption from non-holder", async function () {
      const { bondContract, investor1, bondId, maturityPeriod } = await loadFixture(issueBondFixture);

      await time.increase(maturityPeriod);

      await expect(
        bondContract.connect(investor1).redeemBond(bondId)
      ).to.be.revertedWith("Not bond holder");
    });
  });

  describe("View Functions", function () {
    async function issueBondFixture() {
      const fixture = await deployCorporateBondFixture();
      const {
        bondContract,
        issuer,
        principal,
        couponRate,
        maturityPeriod,
        couponFrequency,
        bondType,
        tokenURI,
        proofStreamProject,
      } = fixture;

      await bondContract.connect(issuer).issueBond(
        principal,
        couponRate,
        maturityPeriod,
        couponFrequency,
        bondType,
        tokenURI,
        proofStreamProject,
        { value: principal }
      );

      return { ...fixture, bondId: 1 };
    }

    it("Should return correct bond details", async function () {
      const {
        bondContract,
        issuer,
        bondId,
        principal,
        couponRate,
        bondType,
      } = await loadFixture(issueBondFixture);

      const details = await bondContract.getBondDetails(bondId);

      expect(details.principal).to.equal(principal);
      expect(details.couponRate).to.equal(couponRate);
      expect(details.issuer).to.equal(issuer.address);
      expect(details.bondType).to.equal(bondType);
      expect(details.status).to.equal(0); // BondStatus.Active
    });

    it("Should return correct issuer bonds", async function () {
      const { bondContract, issuer } = await loadFixture(issueBondFixture);

      const issuerBonds = await bondContract.getIssuerBonds(issuer.address);

      expect(issuerBonds.length).to.equal(1);
      expect(issuerBonds[0]).to.equal(1);
    });

    it("Should calculate time until maturity correctly", async function () {
      const { bondContract, bondId, maturityPeriod } = await loadFixture(issueBondFixture);

      const timeUntil = await bondContract.timeUntilMaturity(bondId);

      expect(timeUntil).to.be.closeTo(maturityPeriod, 10);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update platform fee", async function () {
      const { bondContract, owner } = await loadFixture(deployCorporateBondFixture);

      const newFee = 100; // 1%

      await expect(bondContract.connect(owner).setPlatformFee(newFee))
        .to.emit(bondContract, "PlatformFeeUpdated")
        .withArgs(newFee);

      expect(await bondContract.platformFee()).to.equal(newFee);
    });

    it("Should reject platform fee that's too high", async function () {
      const { bondContract, owner } = await loadFixture(deployCorporateBondFixture);

      await expect(
        bondContract.connect(owner).setPlatformFee(2000) // 20%
      ).to.be.revertedWith("Fee too high");
    });

    it("Should allow owner to pause and unpause", async function () {
      const {
        bondContract,
        owner,
        issuer,
        principal,
        couponRate,
        maturityPeriod,
        couponFrequency,
        bondType,
        tokenURI,
        proofStreamProject,
      } = await loadFixture(deployCorporateBondFixture);

      await bondContract.connect(owner).pause();

      await expect(
        bondContract.connect(issuer).issueBond(
          principal,
          couponRate,
          maturityPeriod,
          couponFrequency,
          bondType,
          tokenURI,
          proofStreamProject,
          { value: principal }
        )
      ).to.be.reverted;

      await bondContract.connect(owner).unpause();

      await expect(
        bondContract.connect(issuer).issueBond(
          principal,
          couponRate,
          maturityPeriod,
          couponFrequency,
          bondType,
          tokenURI,
          proofStreamProject,
          { value: principal }
        )
      ).to.not.be.reverted;
    });
  });

  describe("Integration with ProofStream", function () {
    it("Should link bond to ProofStream project", async function () {
      const {
        bondContract,
        issuer,
        principal,
        couponRate,
        maturityPeriod,
        couponFrequency,
        bondType,
        tokenURI,
      } = await loadFixture(deployCorporateBondFixture);

      const projectHash = ethers.keccak256(ethers.toUtf8Bytes("CreativeProject"));

      await bondContract.connect(issuer).issueBond(
        principal,
        couponRate,
        maturityPeriod,
        couponFrequency,
        bondType,
        tokenURI,
        ethers.ZeroHash,
        { value: principal }
      );

      await expect(
        bondContract.connect(issuer).linkProofStreamProject(1, projectHash)
      ).to.emit(bondContract, "ProofStreamLinked").withArgs(1, projectHash);
    });
  });
});
