# Quick Start Guide - First Proof NFT

## 🚀 Fast Track Deployment (macOS/Linux)

### 1. Initial Setup (5 minutes)

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### 2. Get Your API Keys (10 minutes)

1. **Alchemy RPC URL** (Free):
   - Visit: https://www.alchemy.com/
   - Sign up → Create App → Select "Sepolia" network
   - Copy the HTTPS URL to your `.env` file

2. **MetaMask Private Key**:
   - Open MetaMask → Click account → Account Details → Export Private Key
   - Paste into `.env` file (NEVER share this!)

3. **Etherscan API Key** (Optional, for verification):
   - Visit: https://etherscan.io/myapikey
   - Create account → Generate API key
   - Add to `.env` file

### 3. Get Test ETH (2 minutes)

Visit any of these faucets and enter your wallet address:
- https://www.alchemy.com/faucets/ethereum-sepolia
- https://faucet.quicknode.com/ethereum/sepolia

### 4. Deploy Your NFT Contract (2 minutes)

```bash
# Compile the contract
npm run compile

# Deploy to Sepolia testnet
npm run deploy:sepolia
```

**Save the contract address from the output!**

### 5. Mint Your First NFT (2 minutes)

```bash
# Add contract address to .env
echo "NFT_CONTRACT_ADDRESS=0xYourContractAddress" >> .env
echo "RECIPIENT_ADDRESS=0xYourWalletAddress" >> .env
echo "TOKEN_URI=ipfs://QmExample" >> .env

# Mint NFT
npm run mint:sepolia
```

## 📋 Essential Commands

```bash
# Compile contracts
npm run compile

# Deploy
npm run deploy:sepolia        # Testnet
npm run deploy:mainnet        # Mainnet (uses real ETH!)

# Mint NFTs
npm run mint:sepolia
npm run mint:mainnet

# Check contract info
npm run interact:sepolia

# Open interactive console
npm run console:sepolia
```

## 🔍 Quick Troubleshooting

| Error | Solution |
|-------|----------|
| "Insufficient funds" | Get more test ETH from faucet |
| "Invalid private key" | Check your .env file format (no quotes, no 0x prefix) |
| "Network not found" | Verify RPC URL in .env |
| "Nonce too high" | Reset MetaMask: Settings → Advanced → Reset Account |

## 📚 Next Steps

1. ✅ Read the full [README.md](README.md) for detailed instructions
2. 🎨 Upload your NFT metadata to IPFS (Pinata, NFT.Storage)
3. 🔒 Verify your contract on Etherscan
4. 🚀 Build a frontend to interact with your NFT

## 🆘 Need Help?

- Full documentation: See [README.md](README.md)
- Hardhat docs: https://hardhat.org/docs
- Ethereum developer resources: https://ethereum.org/en/developers/

---

**⚡ Total time to first deployment: ~20 minutes**
