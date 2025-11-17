# Deployment Guide

This guide walks you through deploying the NFT Corporate Bond platform contracts.

## Prerequisites

1. **Node.js & npm** installed (v16+ recommended)
2. **Wallet with funds** for deployment
3. **RPC endpoint** (Alchemy, Infura, or other provider)
4. **Etherscan API key** (for contract verification)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file from the template:

```bash
cp .env.example .env
```

Edit `.env` and add:
- `PRIVATE_KEY`: Your deployment wallet private key (⚠️ NEVER commit this!)
- `SEPOLIA_RPC_URL`: Your Sepolia testnet RPC URL
- `ETHERSCAN_API_KEY`: Your Etherscan API key

### 3. Compile Contracts

```bash
npm run compile
```

## Deployment

### Local Development (Hardhat Network)

1. Start local node:
```bash
npm run node
```

2. In a new terminal, deploy:
```bash
npm run deploy:local
```

### Testnet Deployment (Sepolia)

```bash
npm run deploy:sepolia
```

### Mainnet Deployment

⚠️ **CAUTION**: Deploying to mainnet requires real ETH and should only be done after thorough testing and auditing.

```bash
npx hardhat run scripts/deploy.js --network mainnet
```

## Contract Verification

After deployment, verify your contracts on Etherscan:

```bash
# Set environment variables
export PROOFSTREAM_ADDRESS=0x...
export BOND_ADDRESS=0x...

# Run verification
npm run verify
```

Or manually:

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

## Post-Deployment Steps

### 1. Save Deployment Addresses

Record the deployed contract addresses in a safe location.

### 2. Configure Contract Parameters

You may want to adjust fees or other parameters:

```javascript
// Connect to deployed ProofStream
const proofStream = await ethers.getContractAt("ProofStream", PROOFSTREAM_ADDRESS);

// Update fees (only owner)
await proofStream.setRegistrationFee(ethers.parseEther("0.002"));
await proofStream.setWitnessFee(ethers.parseEther("0.001"));
```

### 3. Transfer Ownership (Optional)

For production, transfer ownership to a multi-sig wallet:

```javascript
await proofStream.transferOwnership(MULTISIG_ADDRESS);
await bondContract.transferOwnership(MULTISIG_ADDRESS);
```

### 4. Test Integration

Before announcing the deployment, test all critical functions:

1. Create a project
2. Register a milestone
3. Add witnesses
4. Issue a bond
5. Claim coupons
6. Redeem bond at maturity

## Gas Estimation

Typical gas costs on Ethereum mainnet (at 50 gwei):

| Operation | Gas Used | Cost @ 50 gwei | Cost @ $2000 ETH |
|-----------|----------|----------------|------------------|
| Deploy ProofStream | ~2,500,000 | 0.125 ETH | $250 |
| Deploy CorporateBondNFT | ~4,000,000 | 0.2 ETH | $400 |
| Create Project | ~150,000 | 0.0075 ETH | $15 |
| Register Milestone | ~120,000 | 0.006 ETH | $12 |
| Issue Bond | ~200,000 | 0.01 ETH | $20 |
| Claim Coupon | ~50,000 | 0.0025 ETH | $5 |

**Recommendation**: Consider deploying to Layer 2 networks (Arbitrum, Optimism, Base) for 90%+ gas savings.

## Layer 2 Deployment

### Arbitrum

```bash
npx hardhat run scripts/deploy.js --network arbitrum
```

### Optimism

```bash
npx hardhat run scripts/deploy.js --network optimism
```

### Base

```bash
npx hardhat run scripts/deploy.js --network base
```

## Security Checklist

Before mainnet deployment:

- [ ] All tests passing (100+ tests)
- [ ] Security audit completed
- [ ] Gas optimization review
- [ ] Multi-sig wallet setup for ownership
- [ ] Incident response plan in place
- [ ] Bug bounty program prepared
- [ ] Contract verified on block explorer
- [ ] Frontend integration tested
- [ ] Documentation complete

## Troubleshooting

### "Insufficient funds for gas"

Ensure your deployer wallet has enough ETH for:
- Contract deployment gas
- ~0.1 ETH extra for safety margin

### "Nonce too low"

Reset your account nonce:
```bash
npx hardhat clean
```

### "Contract size exceeds limit"

Enable optimizer in `hardhat.config.js`:
```javascript
optimizer: {
  enabled: true,
  runs: 200
}
```

## Support

For deployment issues:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review Hardhat documentation
3. Open an issue in the project repository

## Next Steps

After successful deployment:
1. Update README with contract addresses
2. Create user documentation
3. Set up monitoring and alerts
4. Plan upgrade strategy (if using upgradeable contracts)
5. Announce deployment to users
