# First Proof NFT - Solidity ERC-721 Smart Contract

A complete NFT (Non-Fungible Token) smart contract built with Solidity and ready for deployment on the Ethereum blockchain. This project uses Hardhat for development and OpenZeppelin contracts for secure, audited ERC-721 implementation.

## Features

- **ERC-721 Compliant**: Fully compatible with the ERC-721 standard
- **Metadata Support**: Token URI storage for linking to off-chain metadata (IPFS)
- **Owner-Controlled Minting**: Only contract owner can mint new NFTs
- **Batch Minting**: Mint multiple NFTs in a single transaction
- **Supply Cap**: Optional maximum supply limit
- **Gas Optimized**: Efficient contract design to minimize gas costs
- **Complete Metadata URIs**: Store fully qualified URIs unchanged, without a base prefix
- **Etherscan Verification**: Automated contract verification

### Metadata URI convention

Pass a fully qualified metadata URI to `mintNFT` and every entry in `batchMint`, such as `ipfs://<CID>` or `https://example.com/metadata/0.json`. Do not pass a bare CID. The contract uses an empty inherited base URI and returns the stored URI unchanged; there is no base URI constructor argument or setter. Deployment and verification take only name, symbol, and maximum supply.

Run `npm test` to check single and batch token URI round trips and nonexistent-token behavior.

## Smart Contract Overview

**Contract Name**: `FirstProofNFT`
**Standard**: ERC-721 (NFT)
**Language**: Solidity ^0.8.20

### Key Functions

- `mintNFT(address to, string memory tokenURI)`: Mint a single NFT
- `batchMint(address to, string[] memory tokenURIs)`: Mint multiple NFTs
- `totalSupply()`: Get the current number of minted tokens
- `tokenURI(uint256 tokenId)`: Get the metadata URI for a token

## Prerequisites (macOS/Linux Bash Terminal)

### 1. Install Node.js and npm

```bash
# Check if Node.js is installed
node --version

# Check if npm is installed
npm --version

# If not installed, install using Homebrew (macOS)
brew install node

# Or download from https://nodejs.org/ (macOS/Linux)
```

### 2. Install Git

```bash
# Check if Git is installed
git --version

# If not installed (macOS)
brew install git

# If not installed (Linux)
sudo apt-get install git  # Ubuntu/Debian
sudo yum install git      # CentOS/RHEL
```

### 3. Create a Crypto Wallet

You'll need a wallet to deploy contracts and pay gas fees:

1. Install **MetaMask**: https://metamask.io/
2. Create a new wallet or import existing one
3. Save your seed phrase securely (NEVER share this!)
4. Export your private key: MetaMask → Account Details → Export Private Key

## Installation & Setup

### 1. Clone and Setup

```bash
# Navigate to the project directory
cd /path/to/first-proof

# Install dependencies
npm install
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your actual values
nano .env  # or use vim, code, etc.
```

Required environment variables:

```bash
# Your wallet's private key (from MetaMask)
PRIVATE_KEY=your_private_key_here

# RPC URL (see "Getting RPC URLs" section below)
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR-API-KEY

# Etherscan API Key (for contract verification)
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

## Getting RPC URLs and API Keys

### Option 1: Alchemy (Recommended)

1. Go to https://www.alchemy.com/
2. Sign up for a free account
3. Create a new app
4. Select network (Sepolia for testnet, Ethereum Mainnet for production)
5. Copy the HTTPS URL

```bash
# Example Alchemy URLs
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-api-key
ETHEREUM_MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your-api-key
```

### Option 2: Infura

1. Go to https://www.infura.io/
2. Sign up and create a new project
3. Copy the endpoint URL

```bash
# Example Infura URLs
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your-project-id
ETHEREUM_MAINNET_RPC_URL=https://mainnet.infura.io/v3/your-project-id
```

### Option 3: QuickNode

1. Go to https://www.quicknode.com/
2. Create an endpoint
3. Select Ethereum and your desired network
4. Copy the HTTP Provider URL

### Getting Etherscan API Key

1. Go to https://etherscan.io/
2. Create an account
3. Navigate to https://etherscan.io/myapikey
4. Create a new API key
5. Copy the key to your .env file

## Getting Test ETH (For Testnets)

Before deploying to a testnet, you need test ETH:

### Sepolia Testnet Faucets:

```bash
# Visit these faucets and enter your wallet address:
# 1. Alchemy Sepolia Faucet: https://www.alchemy.com/faucets/ethereum-sepolia
# 2. Infura Sepolia Faucet: https://www.infura.io/faucet/sepolia
# 3. QuickNode Faucet: https://faucet.quicknode.com/ethereum/sepolia
```

Check your balance:

```bash
# After requesting from faucet, check your wallet in MetaMask
# Or use Etherscan: https://sepolia.etherscan.io/
```

## Compiling the Smart Contract

```bash
# Compile the contract
npx hardhat compile

# You should see output like:
# Compiled 15 Solidity files successfully
```

## Testing Locally (Optional but Recommended)

```bash
# Start a local Hardhat node
npx hardhat node

# In a new terminal, deploy to local network
npx hardhat run scripts/deploy.js --network localhost
```

## Deploying to Ethereum

### Deploy to Sepolia Testnet (Recommended for testing)

```bash
# Make sure you have:
# 1. Test ETH in your wallet (from faucet)
# 2. PRIVATE_KEY in .env
# 3. SEPOLIA_RPC_URL in .env

# Deploy the contract
npx hardhat run scripts/deploy.js --network sepolia

# Expected output:
# ✅ FirstProofNFT deployed successfully!
# Contract address: 0x...
# Transaction hash: 0x...
```

### Deploy to Ethereum Mainnet (Production)

**WARNING**: This will use REAL ETH! Make sure you have enough ETH for gas fees (~$50-200 depending on network congestion).

```bash
# Make sure you have:
# 1. Real ETH in your wallet (0.05-0.1 ETH recommended)
# 2. PRIVATE_KEY in .env
# 3. ETHEREUM_MAINNET_RPC_URL in .env

# Deploy to mainnet
npx hardhat run scripts/deploy.js --network mainnet

# Save the contract address from the output!
```

## After Deployment

### 1. Save Your Contract Address

```bash
# Copy the contract address from deployment output
# Add it to your .env file:
echo "NFT_CONTRACT_ADDRESS=0xYourContractAddress" >> .env
```

### 2. Verify Your Contract on Etherscan

```bash
# For Sepolia
npx hardhat verify --network sepolia YOUR_CONTRACT_ADDRESS "First Proof NFT" "FPNFT" 10000

# For Mainnet
npx hardhat verify --network mainnet YOUR_CONTRACT_ADDRESS "First Proof NFT" "FPNFT" 10000
```

### 3. View Your Contract

- **Sepolia**: https://sepolia.etherscan.io/address/YOUR_CONTRACT_ADDRESS
- **Mainnet**: https://etherscan.io/address/YOUR_CONTRACT_ADDRESS

## Minting NFTs

### Prepare Metadata (IPFS)

First, upload your NFT metadata to IPFS:

1. Create a JSON metadata file:

```json
{
  "name": "My First NFT",
  "description": "This is my first NFT on Ethereum",
  "image": "ipfs://QmYourImageHash",
  "attributes": [
    {
      "trait_type": "Rarity",
      "value": "Legendary"
    }
  ]
}
```

2. Upload to IPFS using:
   - **Pinata**: https://www.pinata.cloud/
   - **NFT.Storage**: https://nft.storage/
   - **Web3.Storage**: https://web3.storage/

3. Get the IPFS hash (e.g., `QmXxXxXx...`)

### Mint Your First NFT

```bash
# Set environment variables
export NFT_CONTRACT_ADDRESS=0xYourContractAddress
export RECIPIENT_ADDRESS=0xRecipientWalletAddress
export TOKEN_URI=ipfs://QmYourMetadataHash

# Run the mint script
npx hardhat run scripts/mint.js --network sepolia

# For mainnet
npx hardhat run scripts/mint.js --network mainnet
```

### Alternative: Direct CLI Minting

```bash
# Mint using Hardhat console
npx hardhat console --network sepolia

# In the console:
const NFT = await ethers.getContractFactory("FirstProofNFT");
const nft = NFT.attach("YOUR_CONTRACT_ADDRESS");
await nft.mintNFT("RECIPIENT_ADDRESS", "ipfs://QmYourMetadataHash");
```

## Interacting with Your Contract

### Query Contract Information

```bash
# Run the interaction script
npx hardhat run scripts/interact.js --network sepolia

# This will show:
# - Contract name and symbol
# - Total supply
# - Owner address
# - Your NFT balance
```

### Using Hardhat Console (Advanced)

```bash
# Start console
npx hardhat console --network sepolia

# Get contract instance
const NFT = await ethers.getContractFactory("FirstProofNFT");
const nft = NFT.attach("YOUR_CONTRACT_ADDRESS");

# Check total supply
await nft.totalSupply();

# Check owner of token #0
await nft.ownerOf(0);

# Get token URI
await nft.tokenURI(0);

# Check your balance
const [signer] = await ethers.getSigners();
await nft.balanceOf(signer.address);
```

## API Integration

### Web3.js Example

```javascript
const Web3 = require('web3');
const web3 = new Web3('https://eth-sepolia.g.alchemy.com/v2/YOUR-API-KEY');

const contractABI = require('./artifacts/contracts/FirstProofNFT.sol/FirstProofNFT.json').abi;
const contractAddress = '0xYourContractAddress';

const contract = new web3.eth.Contract(contractABI, contractAddress);

// Get total supply
const totalSupply = await contract.methods.totalSupply().call();
console.log('Total Supply:', totalSupply);

// Get token owner
const owner = await contract.methods.ownerOf(0).call();
console.log('Token #0 Owner:', owner);
```

### Ethers.js Example

```javascript
const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/YOUR-API-KEY');
const contractAddress = '0xYourContractAddress';
const contractABI = require('./artifacts/contracts/FirstProofNFT.sol/FirstProofNFT.json').abi;

const contract = new ethers.Contract(contractAddress, contractABI, provider);

// Get total supply
const totalSupply = await contract.totalSupply();
console.log('Total Supply:', totalSupply.toString());

// Get token URI
const tokenURI = await contract.tokenURI(0);
console.log('Token #0 URI:', tokenURI);
```

## Finding the Right Recipient Address

The recipient address is the Ethereum wallet address that will receive the NFT. Here's how to find it:

### 1. Using MetaMask

```bash
# Open MetaMask
# Click on account name at top
# You'll see your address (0x...)
# Click to copy
```

### 2. For Another User

```bash
# Ask them to send you their Ethereum wallet address
# It should start with "0x" and be 42 characters long
# Example: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

### 3. Verify Address Format

```bash
# Valid Ethereum address format:
# - Starts with "0x"
# - Followed by 40 hexadecimal characters (0-9, a-f)
# - Total length: 42 characters
# - Example: 0x1234567890abcdef1234567890abcdef12345678
```

## Common Commands Cheat Sheet

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run local node
npx hardhat node

# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Deploy to Mainnet
npx hardhat run scripts/deploy.js --network mainnet

# Mint NFT
npx hardhat run scripts/mint.js --network sepolia

# Interact with contract
npx hardhat run scripts/interact.js --network sepolia

# Verify contract
npx hardhat verify --network sepolia CONTRACT_ADDRESS "Name" "Symbol" MaxSupply

# Open Hardhat console
npx hardhat console --network sepolia

# Clean build artifacts
npx hardhat clean
```

## Troubleshooting

### "Insufficient funds for gas"

```bash
# You need more ETH in your wallet
# For testnet: Get from faucet
# For mainnet: Buy ETH and transfer to your wallet
```

### "Nonce too high"

```bash
# Reset your MetaMask account
# MetaMask → Settings → Advanced → Reset Account
```

### "Network not found"

```bash
# Check your .env file has the correct RPC URL
# Make sure it's formatted correctly
```

### "Contract verification failed"

```bash
# Make sure constructor arguments match exactly
# Wait a few blocks after deployment before verifying
# Check that your Etherscan API key is correct
```

## Gas Costs (Estimated)

- **Contract Deployment**: 0.01-0.03 ETH (~$20-60 depending on gas prices)
- **Minting Single NFT**: 0.002-0.005 ETH (~$5-10)
- **Batch Mint (10 NFTs)**: 0.01-0.02 ETH (~$20-40)

Check current gas prices: https://etherscan.io/gastracker

## Security Best Practices

1. **NEVER commit your .env file or private key to Git**
2. **Use a separate wallet for development/testing**
3. **Test thoroughly on testnet before mainnet deployment**
4. **Consider getting a professional audit before mainnet launch**
5. **Use hardware wallet for mainnet deployments (Ledger/Trezor)**

## Project Structure

```
first-proof/
├── contracts/
│   └── FirstProofNFT.sol      # Main NFT smart contract
├── scripts/
│   ├── deploy.js              # Deployment script
│   ├── mint.js                # Minting script
│   └── interact.js            # Contract interaction script
├── test/                      # tokenURI regression tests
├── hardhat.config.js          # Hardhat configuration
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore file
├── package.json               # Node.js dependencies
└── README.md                  # This file
```

## Resources

- **Hardhat Documentation**: https://hardhat.org/docs
- **OpenZeppelin Contracts**: https://docs.openzeppelin.com/contracts
- **Ethereum Development**: https://ethereum.org/en/developers/
- **Solidity Documentation**: https://docs.soliditylang.org/
- **IPFS Documentation**: https://docs.ipfs.tech/
- **MetaMask**: https://docs.metamask.io/
- **Etherscan**: https://docs.etherscan.io/

## Support

For issues and questions:
- Review this README thoroughly
- Check Hardhat documentation
- Search on Stack Overflow
- Ask in Ethereum developer communities

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ using Hardhat, Solidity, and OpenZeppelin**
