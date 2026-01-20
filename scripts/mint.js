const hre = require("hardhat");

async function main() {
  // Configuration - UPDATE THESE VALUES
  const CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS || "YOUR_DEPLOYED_CONTRACT_ADDRESS";
  const RECIPIENT_ADDRESS = process.env.RECIPIENT_ADDRESS || "YOUR_RECIPIENT_ADDRESS";
  const TOKEN_URI = process.env.TOKEN_URI || "ipfs://QmYourTokenMetadataHash";

  console.log("Starting NFT minting process...");
  console.log("Network:", hre.network.name);
  console.log("Contract Address:", CONTRACT_ADDRESS);
  console.log("Recipient Address:", RECIPIENT_ADDRESS);
  console.log("Token URI:", TOKEN_URI);

  // Get the signer
  const [signer] = await hre.ethers.getSigners();
  console.log("\nMinting with account:", signer.address);

  // Get the contract instance
  const FirstProofNFT = await hre.ethers.getContractFactory("FirstProofNFT");
  const nft = FirstProofNFT.attach(CONTRACT_ADDRESS);

  // Check current supply
  const currentSupply = await nft.totalSupply();
  console.log("Current total supply:", currentSupply.toString());

  // Mint the NFT
  console.log("\n⏳ Minting NFT...");
  const tx = await nft.mintNFT(RECIPIENT_ADDRESS, TOKEN_URI);
  console.log("Transaction hash:", tx.hash);

  // Wait for confirmation
  const receipt = await tx.wait();
  console.log("✅ NFT minted successfully!");
  console.log("Block number:", receipt.blockNumber);
  console.log("Gas used:", receipt.gasUsed.toString());

  // Get the new token ID from the event
  const event = receipt.logs.find(log => {
    try {
      return nft.interface.parseLog(log).name === "NFTMinted";
    } catch (e) {
      return false;
    }
  });

  if (event) {
    const parsedEvent = nft.interface.parseLog(event);
    const tokenId = parsedEvent.args.tokenId;
    console.log("\n🎉 NFT Details:");
    console.log("Token ID:", tokenId.toString());
    console.log("Owner:", RECIPIENT_ADDRESS);
    console.log("Token URI:", TOKEN_URI);

    // View on Etherscan
    if (hre.network.name === "mainnet") {
      console.log(`\nView on Etherscan: https://etherscan.io/token/${CONTRACT_ADDRESS}?a=${tokenId}`);
    } else if (hre.network.name === "sepolia") {
      console.log(`\nView on Etherscan: https://sepolia.etherscan.io/token/${CONTRACT_ADDRESS}?a=${tokenId}`);
    }
  }

  // Get updated supply
  const newSupply = await nft.totalSupply();
  console.log("\nNew total supply:", newSupply.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Minting failed:");
    console.error(error);
    process.exit(1);
  });
