const hre = require("hardhat");

async function main() {
  const CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS;

  console.log("Network:", hre.network.name);
  console.log("Contract Address:", CONTRACT_ADDRESS);

  const FirstProofNFT = await hre.ethers.getContractFactory("FirstProofNFT");
  const nft = FirstProofNFT.attach(CONTRACT_ADDRESS);

  const name = await nft.name();
  const symbol = await nft.symbol();
  const totalSupply = await nft.totalSupply();
  const maxSupply = await nft.maxSupply();
  const owner = await nft.owner();

  console.log("\n📊 Contract Info:");
  console.log("Name:", name);
  console.log("Symbol:", symbol);
  console.log("Total Supply:", totalSupply.toString());
  console.log("Max Supply:", maxSupply.toString() === "0" ? "Unlimited" : maxSupply.toString());
  console.log("Owner:", owner);

  const [signer] = await hre.ethers.getSigners();
  const balance = await nft.balanceOf(signer.address);
  console.log("\nYour NFT Balance:", balance.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
