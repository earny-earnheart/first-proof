const assert = require("node:assert/strict");
const { ethers } = require("hardhat");

describe("FirstProofNFT metadata URIs", function () {
  let nft, owner;
  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    const FirstProofNFT = await ethers.getContractFactory("FirstProofNFT");
    nft = await FirstProofNFT.deploy("First Proof NFT", "FPNFT", 10000);
    await nft.waitForDeployment();
  });

  it("returns the complete IPFS URI unchanged after minting", async function () {
    const uri = "ipfs://bafybeigdyrzt/metadata/0.json";
    await (await nft.mintNFT(owner.address, uri)).wait();
    assert.equal(await nft.tokenURI(0), uri);
  });

  it("preserves each complete URI in a batch", async function () {
    const uris = ["ipfs://bafybeigdyrzt/1.json", "https://example.com/2.json"];
    await (await nft.batchMint(owner.address, uris)).wait();
    for (let i = 0; i < uris.length; i++) {
      assert.equal(await nft.tokenURI(i), uris[i]);
    }
  });

  it("rejects URI queries for nonexistent tokens", async function () {
    await assert.rejects(nft.tokenURI(0), /ERC721NonexistentToken/);
  });
});
