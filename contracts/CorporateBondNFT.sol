// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title CorporateBondNFT
 * @dev NFT-based digital corporate bonds for civics education platform
 * @notice Each NFT represents a corporate bond with financial terms and lifecycle tracking
 * Educational features include bond lifecycle stages, coupon payments, and maturity tracking
 */
contract CorporateBondNFT is
    ERC721,
    ERC721URIStorage,
    ERC721Enumerable,
    Ownable,
    ReentrancyGuard,
    Pausable
{
    // ============ STATE VARIABLES ============

    struct Bond {
        uint256 principal;           // Face value of the bond in wei
        uint256 couponRate;          // Annual coupon rate in basis points (e.g., 500 = 5%)
        uint256 issueDate;           // Timestamp when bond was issued
        uint256 maturityDate;        // Timestamp when bond matures
        uint256 lastCouponPayment;   // Timestamp of last coupon payment
        uint256 couponFrequency;     // Payment frequency in seconds (e.g., 365 days)
        address issuer;              // Original issuer of the bond
        BondStatus status;           // Current status of the bond
        bytes32 proofStreamProject;  // Optional: linked ProofStream project hash
        string bondType;             // Type: "corporate", "municipal", "treasury", etc.
        bool isPaidAtMaturity;       // Whether principal has been repaid
    }

    enum BondStatus {
        Active,          // Bond is active and paying coupons
        Matured,         // Bond has reached maturity
        Defaulted,       // Issuer defaulted on payments
        Redeemed         // Bond has been fully redeemed
    }

    // Mappings
    mapping(uint256 => Bond) public bonds;
    mapping(address => uint256[]) public issuerBonds;
    mapping(uint256 => uint256) public accumulatedCoupons; // Unclaimed coupon payments

    // Counters
    uint256 private _nextBondId;

    // Platform fee (in basis points, e.g., 50 = 0.5%)
    uint256 public platformFee = 50;

    // Minimum bond values for validation
    uint256 public constant MIN_PRINCIPAL = 0.01 ether;
    uint256 public constant MAX_PRINCIPAL = 1000 ether;
    uint256 public constant MIN_MATURITY_PERIOD = 30 days;
    uint256 public constant MAX_MATURITY_PERIOD = 10 * 365 days;
    uint256 public constant MAX_COUPON_RATE = 5000; // 50% max annual rate

    // ============ EVENTS ============

    event BondIssued(
        uint256 indexed bondId,
        address indexed issuer,
        uint256 principal,
        uint256 couponRate,
        uint256 maturityDate,
        string bondType
    );

    event CouponPaid(
        uint256 indexed bondId,
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );

    event BondMatured(
        uint256 indexed bondId,
        uint256 timestamp
    );

    event BondRedeemed(
        uint256 indexed bondId,
        address indexed holder,
        uint256 principal,
        uint256 finalCoupon
    );

    event BondDefaulted(
        uint256 indexed bondId,
        uint256 timestamp
    );

    event ProofStreamLinked(
        uint256 indexed bondId,
        bytes32 indexed projectHash
    );

    event PlatformFeeUpdated(
        uint256 newFee
    );

    // ============ CONSTRUCTOR ============

    constructor()
        ERC721("Corporate Bond NFT", "CBOND")
        Ownable(msg.sender)
    {
        _nextBondId = 1;
    }

    // ============ BOND ISSUANCE ============

    /**
     * @dev Issue a new bond NFT
     * @param principal Face value of the bond
     * @param couponRate Annual coupon rate in basis points
     * @param maturityPeriod Time until maturity in seconds
     * @param couponFrequency How often coupons are paid (in seconds)
     * @param bondType Type of bond (corporate, municipal, etc.)
     * @param tokenURI Metadata URI for the NFT
     * @param proofStreamProject Optional ProofStream project hash to link
     */
    function issueBond(
        uint256 principal,
        uint256 couponRate,
        uint256 maturityPeriod,
        uint256 couponFrequency,
        string memory bondType,
        string memory tokenURI,
        bytes32 proofStreamProject
    ) external payable whenNotPaused nonReentrant returns (uint256) {
        // Validation
        require(principal >= MIN_PRINCIPAL && principal <= MAX_PRINCIPAL, "Invalid principal");
        require(couponRate <= MAX_COUPON_RATE, "Coupon rate too high");
        require(maturityPeriod >= MIN_MATURITY_PERIOD && maturityPeriod <= MAX_MATURITY_PERIOD, "Invalid maturity period");
        require(couponFrequency > 0 && couponFrequency <= maturityPeriod, "Invalid coupon frequency");
        require(bytes(bondType).length > 0 && bytes(bondType).length <= 32, "Invalid bond type");
        require(msg.value >= principal, "Insufficient collateral");

        // Refund overpayment
        if (msg.value > principal) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - principal}("");
            require(refundSuccess, "Refund failed");
        }

        uint256 bondId = _nextBondId++;
        uint256 currentTime = block.timestamp;

        // Create bond
        bonds[bondId] = Bond({
            principal: principal,
            couponRate: couponRate,
            issueDate: currentTime,
            maturityDate: currentTime + maturityPeriod,
            lastCouponPayment: currentTime,
            couponFrequency: couponFrequency,
            issuer: msg.sender,
            status: BondStatus.Active,
            proofStreamProject: proofStreamProject,
            bondType: bondType,
            isPaidAtMaturity: false
        });

        // Track issuer bonds
        issuerBonds[msg.sender].push(bondId);

        // Mint NFT to issuer
        _safeMint(msg.sender, bondId);
        _setTokenURI(bondId, tokenURI);

        emit BondIssued(bondId, msg.sender, principal, couponRate, currentTime + maturityPeriod, bondType);

        if (proofStreamProject != bytes32(0)) {
            emit ProofStreamLinked(bondId, proofStreamProject);
        }

        return bondId;
    }

    // ============ COUPON PAYMENTS ============

    /**
     * @dev Calculate pending coupon payment for a bond
     * @param bondId The bond ID
     * @return Amount of coupon payment due
     */
    function calculatePendingCoupon(uint256 bondId) public view returns (uint256) {
        Bond memory bond = bonds[bondId];

        if (bond.status != BondStatus.Active && bond.status != BondStatus.Matured) {
            return 0;
        }

        uint256 currentTime = block.timestamp;
        uint256 timeSinceLastPayment = currentTime - bond.lastCouponPayment;

        // Check if enough time has passed for a coupon payment
        if (timeSinceLastPayment < bond.couponFrequency) {
            return 0;
        }

        // Calculate number of periods elapsed
        uint256 periodsElapsed = timeSinceLastPayment / bond.couponFrequency;

        // Calculate coupon payment: (principal * rate * periods) / (10000 * periods_per_year)
        uint256 periodsPerYear = 365 days / bond.couponFrequency;
        uint256 couponPayment = (bond.principal * bond.couponRate * periodsElapsed) / (10000 * periodsPerYear);

        return couponPayment;
    }

    /**
     * @dev Claim coupon payment for a bond (callable by bond holder)
     * @param bondId The bond ID
     */
    function claimCoupon(uint256 bondId) external nonReentrant whenNotPaused {
        require(_ownerOf(bondId) == msg.sender, "Not bond holder");

        Bond storage bond = bonds[bondId];
        require(bond.status == BondStatus.Active, "Bond not active");

        uint256 couponAmount = calculatePendingCoupon(bondId);
        require(couponAmount > 0, "No coupon payment due");

        // Update last payment time
        uint256 periodsElapsed = (block.timestamp - bond.lastCouponPayment) / bond.couponFrequency;
        bond.lastCouponPayment += (periodsElapsed * bond.couponFrequency);

        // Check if bond has matured
        if (block.timestamp >= bond.maturityDate) {
            bond.status = BondStatus.Matured;
            emit BondMatured(bondId, block.timestamp);
        }

        // Transfer coupon payment
        (bool success, ) = payable(msg.sender).call{value: couponAmount}("");
        require(success, "Coupon payment failed");

        emit CouponPaid(bondId, msg.sender, couponAmount, block.timestamp);
    }

    /**
     * @dev Issuer deposits funds for coupon payments
     * @param bondId The bond ID
     */
    function depositCouponFunds(uint256 bondId) external payable {
        Bond memory bond = bonds[bondId];
        require(msg.sender == bond.issuer, "Only issuer can deposit");
        require(msg.value > 0, "Must deposit funds");

        accumulatedCoupons[bondId] += msg.value;
    }

    // ============ BOND REDEMPTION ============

    /**
     * @dev Redeem bond at maturity (claim principal + final coupon)
     * @param bondId The bond ID
     */
    function redeemBond(uint256 bondId) external nonReentrant whenNotPaused {
        require(_ownerOf(bondId) == msg.sender, "Not bond holder");

        Bond storage bond = bonds[bondId];
        require(block.timestamp >= bond.maturityDate, "Bond not yet matured");
        require(bond.status == BondStatus.Active || bond.status == BondStatus.Matured, "Bond cannot be redeemed");
        require(!bond.isPaidAtMaturity, "Already redeemed");

        // Calculate any pending final coupon
        uint256 finalCoupon = calculatePendingCoupon(bondId);
        uint256 totalPayment = bond.principal + finalCoupon;

        // Update bond status
        bond.status = BondStatus.Redeemed;
        bond.isPaidAtMaturity = true;

        // Transfer principal + final coupon
        (bool success, ) = payable(msg.sender).call{value: totalPayment}("");
        require(success, "Redemption payment failed");

        emit BondRedeemed(bondId, msg.sender, bond.principal, finalCoupon);
    }

    // ============ BOND MANAGEMENT ============

    /**
     * @dev Mark bond as defaulted (only issuer or owner)
     * @param bondId The bond ID
     */
    function markAsDefaulted(uint256 bondId) external {
        Bond storage bond = bonds[bondId];
        require(msg.sender == bond.issuer || msg.sender == owner(), "Not authorized");
        require(bond.status == BondStatus.Active, "Bond not active");

        bond.status = BondStatus.Defaulted;
        emit BondDefaulted(bondId, block.timestamp);
    }

    /**
     * @dev Link bond to ProofStream project (only bond holder)
     * @param bondId The bond ID
     * @param projectHash ProofStream project hash
     */
    function linkProofStreamProject(uint256 bondId, bytes32 projectHash) external {
        require(_ownerOf(bondId) == msg.sender, "Not bond holder");
        require(projectHash != bytes32(0), "Invalid project hash");

        bonds[bondId].proofStreamProject = projectHash;
        emit ProofStreamLinked(bondId, projectHash);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @dev Get comprehensive bond details
     * @param bondId The bond ID
     */
    function getBondDetails(uint256 bondId) external view returns (
        uint256 principal,
        uint256 couponRate,
        uint256 issueDate,
        uint256 maturityDate,
        uint256 lastCouponPayment,
        address issuer,
        BondStatus status,
        string memory bondType,
        uint256 pendingCoupon
    ) {
        Bond memory bond = bonds[bondId];
        return (
            bond.principal,
            bond.couponRate,
            bond.issueDate,
            bond.maturityDate,
            bond.lastCouponPayment,
            bond.issuer,
            bond.status,
            bond.bondType,
            calculatePendingCoupon(bondId)
        );
    }

    /**
     * @dev Get all bonds issued by an address
     * @param issuer The issuer address
     */
    function getIssuerBonds(address issuer) external view returns (uint256[] memory) {
        return issuerBonds[issuer];
    }

    /**
     * @dev Get bond yield (simplified calculation)
     * @param bondId The bond ID
     */
    function getBondYield(uint256 bondId) external view returns (uint256) {
        Bond memory bond = bonds[bondId];
        if (bond.principal == 0) return 0;

        // Simple yield: (annual coupon / principal) * 10000 (in basis points)
        return bond.couponRate;
    }

    /**
     * @dev Check if bond has matured
     * @param bondId The bond ID
     */
    function hasMatured(uint256 bondId) external view returns (bool) {
        return block.timestamp >= bonds[bondId].maturityDate;
    }

    /**
     * @dev Get time until maturity
     * @param bondId The bond ID
     */
    function timeUntilMaturity(uint256 bondId) external view returns (uint256) {
        Bond memory bond = bonds[bondId];
        if (block.timestamp >= bond.maturityDate) {
            return 0;
        }
        return bond.maturityDate - block.timestamp;
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @dev Update platform fee
     * @param newFee New fee in basis points
     */
    function setPlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        platformFee = newFee;
        emit PlatformFeeUpdated(newFee);
    }

    /**
     * @dev Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency withdrawal (only for platform fees, not bond collateral)
     */
    function withdrawPlatformFees() external onlyOwner nonReentrant {
        // Calculate total locked in bonds
        uint256 totalLocked = 0;
        for (uint256 i = 1; i < _nextBondId; i++) {
            if (bonds[i].status == BondStatus.Active || bonds[i].status == BondStatus.Matured) {
                if (!bonds[i].isPaidAtMaturity) {
                    totalLocked += bonds[i].principal;
                }
            }
        }

        uint256 availableFees = address(this).balance - totalLocked;
        require(availableFees > 0, "No fees to withdraw");

        (bool success, ) = payable(owner()).call{value: availableFees}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // ============ OVERRIDES ============

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // Allow contract to receive ETH
    receive() external payable {}
}
