# NFT Corporate Bonds with IP Protection Platform

A blockchain-based platform combining NFT corporate bonds with creative work intellectual property protection, designed for civics education.

## 🎯 Overview

This project implements two complementary smart contracts:

1. **ProofStream** - IP protection platform for timestamping creative work milestones
2. **CorporateBondNFT** - ERC-721 based digital corporate bonds with financial logic

### Key Features

#### ProofStream
- 📝 Register creative work milestones with content hashing
- 🔐 Public/private project visibility controls
- 👥 Witness verification system with authorization
- 📦 IPFS integration for off-chain storage
- ⏱️ Immutable timestamp proofs

#### CorporateBondNFT
- 💰 ERC-721 NFT bonds with principal and coupon payments
- 📊 Configurable coupon rates and payment frequencies
- 🔗 Optional linking to ProofStream projects
- ⚡ Bond lifecycle management (Active → Matured → Redeemed)
- 🛡️ Secure collateral and redemption system

## 🏗️ Architecture

```
Platform Architecture
│
├── ProofStream Contract
│   ├── Projects (timestamped creative work)
│   ├── Milestones (content hash + metadata)
│   └── Witnesses (verification system)
│
└── CorporateBondNFT Contract
    ├── Bond NFTs (ERC-721)
    ├── Financial Logic (coupons + maturity)
    └── ProofStream Integration (optional)
```

## 📋 Smart Contract Security

### Security Improvements Implemented

✅ **DoS Protection**: Witness array limited to 100 entries with O(1) duplicate checks
✅ **Overpayment Refunds**: Automatic refund of excess ETH
✅ **Input Validation**: String length limits (256 chars max)
✅ **Access Control**: OpenZeppelin Ownable with custom modifiers
✅ **Reentrancy Guards**: NonReentrant on all value transfers
✅ **Pausable**: Emergency stop mechanism
✅ **Event Logging**: Comprehensive events for all state changes

### Audited Security Patterns

- ✅ Checks-Effects-Interactions pattern
- ✅ OpenZeppelin v5.x battle-tested contracts
- ✅ Solidity 0.8.20 (built-in overflow protection)
- ✅ No unsafe external calls
- ✅ Proper fee validation and limits

## 🚀 Getting Started

### Prerequisites

- Node.js v16+ and npm
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd first-proof

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
```

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
# Run all tests
npm test

# Run with gas reporting
npm run test:gas

# Run with coverage
npm run test:coverage
```

### Deploy Locally

```bash
# Terminal 1: Start local node
npm run node

# Terminal 2: Deploy contracts
npm run deploy:local
```

## 🧪 Testing

Comprehensive test suite with 100+ tests covering:

- ✅ Contract deployment
- ✅ Project creation and validation
- ✅ Milestone registration
- ✅ Witness system (authorization, limits, DoS protection)
- ✅ Bond issuance and validation
- ✅ Coupon calculation and payment
- ✅ Bond transfer and redemption
- ✅ Access control
- ✅ Security scenarios
- ✅ Edge cases

```bash
npm test
```

Expected output:
```
ProofStream
  ✓ Should create project successfully
  ✓ Should refund overpayment
  ✓ Should prevent witness DoS
  ... (50+ tests)

CorporateBondNFT
  ✓ Should issue bond successfully
  ✓ Should calculate coupons correctly
  ✓ Should allow redemption at maturity
  ... (50+ tests)

100+ passing tests
```

## 📊 Contract Details

### ProofStream

| Parameter | Value |
|-----------|-------|
| Registration Fee | 0.001 ETH |
| Witness Fee | 0.0005 ETH |
| Max Witnesses | 100 |
| Max String Length | 256 characters |

### CorporateBondNFT

| Parameter | Value |
|-----------|-------|
| Min Principal | 0.01 ETH |
| Max Principal | 1000 ETH |
| Max Coupon Rate | 50% (5000 basis points) |
| Min Maturity | 30 days |
| Max Maturity | 10 years |
| Platform Fee | 0.5% (50 basis points) |

## 📁 Project Structure

```
first-proof/
├── contracts/
│   ├── ProofStream.sol           # IP protection contract
│   └── CorporateBondNFT.sol      # NFT bond contract
├── test/
│   ├── ProofStream.test.js       # ProofStream tests
│   └── CorporateBondNFT.test.js  # Bond tests
├── scripts/
│   ├── deploy.js                 # Deployment script
│   └── verify.js                 # Verification script
├── docs/
│   ├── ANALYSIS_REPORT.md        # Security analysis
│   └── DEPLOYMENT_GUIDE.md       # Deployment instructions
├── hardhat.config.js             # Hardhat configuration
├── package.json                  # Dependencies
└── README.md                     # This file
```

## 🌐 Deployment

See [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for detailed instructions.

### Quick Deploy to Testnet

```bash
# Deploy to Sepolia
npm run deploy:sepolia

# Verify contracts
npm run verify
```

### Supported Networks

- Ethereum Mainnet
- Sepolia Testnet
- Arbitrum (L2)
- Optimism (L2)
- Base (L2)

## 💡 Usage Examples

### Creating a Creative Project

```javascript
const tx = await proofStream.createProject(
  "My Album Project",
  "music",
  true, // public
  { value: ethers.parseEther("0.001") }
);
```

### Registering a Milestone

```javascript
const contentHash = ethers.keccak256(ethers.toUtf8Bytes("Song lyrics v1"));

await proofStream.registerMilestone(
  projectHash,
  contentHash,
  "First Draft - Song Lyrics",
  "draft",
  "ipfs://QmHash...",
  false, // not encrypted
  { value: ethers.parseEther("0.001") }
);
```

### Issuing a Bond

```javascript
const principal = ethers.parseEther("1"); // 1 ETH
const couponRate = 500; // 5% annual
const maturityPeriod = 365 * 24 * 60 * 60; // 1 year
const couponFrequency = 90 * 24 * 60 * 60; // Quarterly

await bondContract.issueBond(
  principal,
  couponRate,
  maturityPeriod,
  couponFrequency,
  "corporate",
  "ipfs://metadata",
  projectHash, // link to ProofStream project
  { value: principal }
);
```

## 🔒 Security

### Audit Status

⚠️ **NOT YET AUDITED** - Do not use in production with real funds

Before mainnet deployment:
1. Complete professional security audit
2. Run extensive testnet testing
3. Implement bug bounty program
4. Set up multi-sig wallet for admin functions

### Known Limitations

- Gas costs may be high on Ethereum L1 (recommend L2 deployment)
- Bond redemption requires contract to hold sufficient ETH
- No upgradability (contracts are immutable)

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🙏 Acknowledgments

- OpenZeppelin for battle-tested contract libraries
- Hardhat for development framework
- Ethereum community for educational resources

## 📞 Support

For questions or issues:
- Open an issue on GitHub
- Check [docs/](docs/) for detailed documentation
- Review [ANALYSIS_REPORT.md](ANALYSIS_REPORT.md) for security details

---

**Built for civics education** - Teaching blockchain, NFTs, and financial instruments through hands-on smart contract development.