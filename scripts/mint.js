const hre = require("hardhat");

async function main() {
  const CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS;
  const RECIPIENT_ADDRESS = process.env.RECIPIENT_ADDRESS;
  // Supply the complete metadata URI; the contract adds no prefix.
  const TOKEN_URI = process.env.TOKEN_URI || "ipfs://QmYourTokenMetadataHash";

  console.log("Network:", hre.network.name);
  console.log("Contract Address:", CONTRACT_ADDRESS);
  console.log("Recipient Address:", RECIPIENT_ADDRESS);

  const [signer] = await hre.ethers.getSigners();
  const FirstProofNFT = await hre.ethers.getContractFactory("FirstProofNFT");
  const nft = FirstProofNFT.attach(CONTRACT_ADDRESS);

  const currentSupply = await nft.totalSupply();
  console.log("Current total supply:", currentSupply.toString());

  console.log("\n⏳ Minting NFT...");
  const tx = await nft.mintNFT(RECIPIENT_ADDRESS, TOKEN_URI);
  console.log("Transaction hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("✅ NFT minted successfully!");
  console.log("Block number:", receipt.blockNumber);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Minting failed:", error);
    process.exit(1);
  });
