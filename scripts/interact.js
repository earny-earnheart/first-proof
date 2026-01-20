const hre = require("hardhat");

async function main() {
  // Configuration - UPDATE THIS VALUE
  const CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS || "YOUR_DEPLOYED_CONTRACT_ADDRESS";

  console.log("NFT Contract Interaction Tool");
  console.log("Network:", hre.network.name);
  console.log("Contract Address:", CONTRACT_ADDRESS);

  // Get the contract instance
  const FirstProofNFT = await hre.ethers.getContractFactory("FirstProofNFT");
  const nft = FirstProofNFT.attach(CONTRACT_ADDRESS);

  console.log("\n📊 Contract Information:");

  // Get contract details
  const name = await nft.name();
  const symbol = await nft.symbol();
  const totalSupply = await nft.totalSupply();
  const maxSupply = await nft.maxSupply();
  const owner = await nft.owner();

  console.log("Name:", name);
  console.log("Symbol:", symbol);
  console.log("Total Supply:", totalSupply.toString());
  console.log("Max Supply:", maxSupply.toString() === "0" ? "Unlimited" : maxSupply.toString());
  console.log("Owner:", owner);

  // Example: Get token URI for a specific token (if any tokens exist)
  if (totalSupply > 0) {
    console.log("\n🎨 Sample Token Information:");
    const tokenId = 0; // First token
    try {
      const tokenURI = await nft.tokenURI(tokenId);
      const tokenOwner = await nft.ownerOf(tokenId);
      console.log(`Token #${tokenId}:`);
      console.log("  Owner:", tokenOwner);
      console.log("  URI:", tokenURI);
    } catch (error) {
      console.log("No tokens minted yet or token doesn't exist");
    }
  }

  // Check ownership of a specific address (optional)
  const [signer] = await hre.ethers.getSigners();
  const balance = await nft.balanceOf(signer.address);
  console.log("\n👛 Your NFT Balance:", balance.toString());

  console.log("\n✅ Interaction complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Interaction failed:");
    console.error(error);
    process.exit(1);
  });
