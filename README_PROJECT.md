# ProofStream

Blockchain-based creative timeline and IP protection platform for registering timestamped milestones of creative work.

## 📋 Overview

ProofStream allows creators to register verifiable, immutable timestamps of their creative work on the blockchain. Each project can have multiple milestones tracked over time, with optional witness signatures for additional verification.

## 🏗️ Project Structure

```
proofstream/
├── contracts/              # Solidity smart contracts
│   └── ProofStream.sol    # Main contract
├── test/                  # Test suite
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── fixtures/         # Test fixtures and helpers
├── scripts/              # Deployment and utility scripts
│   ├── deploy.ts        # Main deployment script
│   ├── verify.ts        # Contract verification
│   └── interact.ts      # Interaction helper
├── docs/                # Additional documentation
├── hardhat.config.ts    # Hardhat configuration
├── package.json         # Dependencies and scripts
└── .env.example        # Environment variables template
```

## 🚀 Getting Started

### Prerequisites

- Node.js v18+ and npm
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

### Compilation

```bash
npm run compile
```

This will:
- Compile all Solidity contracts
- Generate TypeScript types in `typechain-types/`
- Create artifacts in `artifacts/`

## 🧪 Testing

### Run all tests
```bash
npm test
```

### Run unit tests only
```bash
npm run test:unit
```

### Run integration tests only
```bash
npm run test:integration
```

### Run with gas reporting
```bash
npm run test:gas
```

### Generate coverage report
```bash
npm run test:coverage
```

## 📦 Deployment

### Local Network

```bash
# Terminal 1: Start local Hardhat node
npm run node

# Terminal 2: Deploy to local network
npm run deploy:local
```

### Testnet (Sepolia)

```bash
# 1. Configure .env with:
#    - SEPOLIA_RPC_URL
#    - PRIVATE_KEY (with testnet ETH)

# 2. Deploy
npm run deploy:sepolia

# 3. Verify on Etherscan
CONTRACT_ADDRESS=0x... npm run verify:sepolia
```

### Mainnet

```bash
# ⚠️ CAUTION: Mainnet deployment uses real ETH

# 1. Configure .env with:
#    - MAINNET_RPC_URL
#    - PRIVATE_KEY (with sufficient ETH)
#    - ETHERSCAN_API_KEY

# 2. Deploy
npm run deploy:mainnet

# 3. Verify
CONTRACT_ADDRESS=0x... npm run verify:mainnet
```

## 🔐 Security Features

### Implemented Protections

- ✅ **Reentrancy Protection**: `nonReentrant` on withdrawal
- ✅ **Access Control**: Owner and project-level permissions
- ✅ **Pausable**: Emergency stop mechanism
- ✅ **Gas DoS Prevention**: Pagination and limits
- ✅ **Fee Caps**: Maximum fee limits to prevent abuse
- ✅ **Input Validation**: String length and parameter checks
- ✅ **Automatic Refunds**: Excess fees returned to users
- ✅ **Integer Overflow**: Solidity 0.8.20 built-in protection

### Security Constants

```solidity
MAX_REGISTRATION_FEE = 0.1 ETH
MAX_WITNESS_FEE = 0.05 ETH
MAX_WITNESSES_PER_MILESTONE = 50
MAX_STRING_LENGTH = 200
MAX_IPFS_HASH_LENGTH = 100
```

## 📖 Contract API

### Main Functions

#### Create Project
```solidity
function createProject(
    string projectId,
    string category,
    bool isPublic
) returns (bytes32 projectHash)
```

#### Register Milestone
```solidity
function registerMilestone(
    bytes32 projectHash,
    bytes32 contentHash,
    string title,
    string stage,
    string ipfsHash,
    bool isEncrypted
)
```

#### Add Witness
```solidity
function addWitness(
    bytes32 projectHash,
    uint256 milestoneIndex
)
```

### View Functions

#### Get Creator Projects (Paginated)
```solidity
function getCreatorProjects(
    address creator,
    uint256 offset,
    uint256 limit
) returns (bytes32[] projectHashes, uint256 total)
```

#### Verify Content
```solidity
function verifyContent(bytes32 contentHash)
    returns (bool exists, uint256 timestamp, address creator)
```

## 💰 Fee Structure

| Action | Default Fee | Max Fee |
|--------|------------|---------|
| Create Project | 0.001 ETH | 0.1 ETH |
| Register Milestone | 0.001 ETH | 0.1 ETH |
| Add Witness | 0.0005 ETH | 0.05 ETH |

Fees can be adjusted by contract owner within maximum limits.

## 📊 Gas Estimates

| Function | Estimated Gas | USD Cost (50 gwei, $2000 ETH) |
|----------|---------------|-------------------------------|
| createProject | ~155,000 | ~$6 |
| registerMilestone | ~205,000 | ~$8 |
| addWitness | ~35,000 | ~$1.40 |

## 🛠️ Available Scripts

```bash
npm run compile          # Compile contracts
npm run test            # Run all tests
npm run test:unit       # Run unit tests
npm run test:integration # Run integration tests
npm run test:coverage   # Generate coverage report
npm run test:gas        # Run tests with gas reporting
npm run deploy:local    # Deploy to local network
npm run deploy:sepolia  # Deploy to Sepolia testnet
npm run deploy:mainnet  # Deploy to mainnet
npm run verify:sepolia  # Verify on Sepolia Etherscan
npm run verify:mainnet  # Verify on mainnet Etherscan
npm run node           # Start local Hardhat node
npm run clean          # Clean artifacts and cache
npm run typechain      # Generate TypeScript types
```

## 🔧 Configuration

### Hardhat Networks

Configured networks in `hardhat.config.ts`:
- `hardhat` - Local development
- `localhost` - Local node
- `sepolia` - Sepolia testnet
- `goerli` - Goerli testnet
- `mainnet` - Ethereum mainnet
- `polygon` - Polygon mainnet
- `mumbai` - Mumbai testnet

### Environment Variables

See `.env.example` for all available configuration options.

Required for deployment:
- `PRIVATE_KEY` - Deployer private key
- `<NETWORK>_RPC_URL` - RPC endpoint
- `ETHERSCAN_API_KEY` - For verification

Optional:
- `REPORT_GAS=true` - Enable gas reporting
- `COINMARKETCAP_API_KEY` - For USD gas estimates

## 📚 Documentation

- [Security Analysis](./PROOFSTREAM_ANALYSIS_REPORT.md)
- [Security Fixes](./SECURITY_FIXES_SUMMARY.md)
- [SSH Key Setup](./SSH_KEY_SETUP.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Run coverage: `npm run test:coverage`
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Ethers.js Documentation](https://docs.ethers.org/)

## ⚠️ Disclaimer

This contract handles user funds. Always:
- Audit thoroughly before mainnet deployment
- Test extensively on testnets
- Consider getting a professional security audit
- Use a multisig wallet for ownership
- Monitor contract activity after deployment

## 🆘 Support

For security issues, contact: security@proofstream.io

---

**Built with ❤️ using Hardhat, TypeScript, and OpenZeppelin**
