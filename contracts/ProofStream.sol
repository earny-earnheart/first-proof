// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ProofStream
 * @dev Blockchain-based creative timeline and IP protection platform
 * @notice Allows creators to register timestamped milestones of their creative work
 * @custom:security-contact security@proofstream.io
 *
 * SECURITY FIXES APPLIED:
 * - Added pagination to prevent unbounded array issues
 * - Implemented witness limit and O(1) duplicate checking
 * - Added nonce to prevent hash collisions
 * - Implemented excess fee refunds
 * - Added maximum fee caps
 * - Added events for all state changes
 * - Added string length validation
 */
contract ProofStream is Ownable, ReentrancyGuard, Pausable {

    // ============ CONSTANTS ============

    uint256 public constant MAX_REGISTRATION_FEE = 0.1 ether;
    uint256 public constant MAX_WITNESS_FEE = 0.05 ether;
    uint256 public constant MAX_WITNESSES_PER_MILESTONE = 50;
    uint256 public constant MAX_STRING_LENGTH = 200;
    uint256 public constant MAX_IPFS_HASH_LENGTH = 100;

    // ============ STATE VARIABLES ============

    struct Milestone {
        bytes32 contentHash;        // SHA-256 hash of the work
        uint256 timestamp;          // Block timestamp
        string title;               // Title/description of milestone
        string stage;               // "draft", "revision", "final", etc.
        string ipfsHash;            // Optional IPFS hash for storage
        bool isEncrypted;           // Whether content is encrypted
        address[] witnesses;        // Array of witness addresses
        mapping(address => bool) hasWitnessed;  // O(1) duplicate checking
        uint256 witnessCount;       // Track witness count
    }

    struct Project {
        string projectId;           // Unique project identifier
        address creator;            // Project owner
        uint256 createdAt;          // Project creation timestamp
        Milestone[] milestones;     // Array of milestones
        bool isPublic;              // Public or private project
        string category;            // "music", "art", "writing", etc.
    }

    // Mapping: project hash => Project
    mapping(bytes32 => Project) public projects;

    // Mapping: creator address => array of project hashes
    mapping(address => bytes32[]) public creatorProjects;

    // Mapping: creator address => nonce for unique hash generation
    mapping(address => uint256) private creatorNonce;

    // Mapping: content hash => registration info for quick lookup
    mapping(bytes32 => RegistrationInfo) public registrations;

    struct RegistrationInfo {
        bytes32 projectHash;
        uint256 milestoneIndex;
        uint256 timestamp;
        address creator;
        bool exists;
    }

    // Mapping: creator => witness => isAuthorized
    mapping(address => mapping(address => bool)) public authorizedWitnesses;

    // Fee configuration
    uint256 public registrationFee = 0.001 ether; // ~$2 at $2000 ETH
    uint256 public witnessFee = 0.0005 ether;

    // Statistics
    uint256 public totalProjects;
    uint256 public totalMilestones;

    // ============ EVENTS ============

    event ProjectCreated(
        bytes32 indexed projectHash,
        address indexed creator,
        string projectId,
        uint256 timestamp
    );

    event MilestoneRegistered(
        bytes32 indexed projectHash,
        bytes32 indexed contentHash,
        address indexed creator,
        uint256 milestoneIndex,
        uint256 timestamp
    );

    event WitnessAdded(
        bytes32 indexed projectHash,
        uint256 milestoneIndex,
        address indexed witness,
        uint256 timestamp
    );

    event WitnessAuthorized(
        address indexed creator,
        address indexed witness,
        uint256 timestamp
    );

    event WitnessRevoked(
        address indexed creator,
        address indexed witness,
        uint256 timestamp
    );

    event ProjectVisibilityChanged(
        bytes32 indexed projectHash,
        bool isPublic
    );

    event FeeUpdated(uint256 newFee, string feeType);

    event ExcessRefunded(address indexed recipient, uint256 amount);

    // ============ MODIFIERS ============

    modifier onlyProjectOwner(bytes32 projectHash) {
        require(
            projects[projectHash].creator == msg.sender,
            "Not project owner"
        );
        _;
    }

    modifier projectExists(bytes32 projectHash) {
        require(
            projects[projectHash].creator != address(0),
            "Project does not exist"
        );
        _;
    }

    modifier validStringLength(string memory str, uint256 maxLength) {
        require(bytes(str).length > 0, "String cannot be empty");
        require(bytes(str).length <= maxLength, "String too long");
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor() Ownable(msg.sender) {
        // Initialize with owner
    }

    // ============ MAIN FUNCTIONS ============

    /**
     * @dev Create a new project
     * @param projectId Unique identifier for the project
     * @param category Category of work (music, art, writing, etc.)
     * @param isPublic Whether project timeline is publicly visible
     */
    function createProject(
        string memory projectId,
        string memory category,
        bool isPublic
    )
        external
        payable
        whenNotPaused
        validStringLength(projectId, MAX_STRING_LENGTH)
        validStringLength(category, MAX_STRING_LENGTH)
        returns (bytes32)
    {
        require(msg.value >= registrationFee, "Insufficient fee");

        // Create unique project hash with nonce to prevent collisions
        bytes32 projectHash = keccak256(
            abi.encodePacked(msg.sender, projectId, block.timestamp, creatorNonce[msg.sender]++)
        );

        require(projects[projectHash].creator == address(0), "Project exists");

        // Initialize project
        Project storage newProject = projects[projectHash];
        newProject.projectId = projectId;
        newProject.creator = msg.sender;
        newProject.createdAt = block.timestamp;
        newProject.isPublic = isPublic;
        newProject.category = category;

        // Add to creator's projects
        creatorProjects[msg.sender].push(projectHash);

        totalProjects++;

        emit ProjectCreated(projectHash, msg.sender, projectId, block.timestamp);

        // Refund excess payment
        _refundExcess(registrationFee);

        return projectHash;
    }

    /**
     * @dev Register a milestone in a project
     * @param projectHash Hash of the project
     * @param contentHash SHA-256 hash of the work
     * @param title Title/description of milestone
     * @param stage Stage of work (draft, revision, final)
     * @param ipfsHash Optional IPFS hash for full content
     * @param isEncrypted Whether the content is encrypted
     */
    function registerMilestone(
        bytes32 projectHash,
        bytes32 contentHash,
        string memory title,
        string memory stage,
        string memory ipfsHash,
        bool isEncrypted
    )
        external
        payable
        projectExists(projectHash)
        onlyProjectOwner(projectHash)
        whenNotPaused
        validStringLength(title, MAX_STRING_LENGTH)
        validStringLength(stage, MAX_STRING_LENGTH)
    {
        require(msg.value >= registrationFee, "Insufficient fee");
        require(contentHash != bytes32(0), "Content hash required");
        require(!registrations[contentHash].exists, "Content already registered");

        // Validate IPFS hash length if provided
        if (bytes(ipfsHash).length > 0) {
            require(bytes(ipfsHash).length <= MAX_IPFS_HASH_LENGTH, "IPFS hash too long");
        }

        Project storage project = projects[projectHash];

        // Create milestone - note: we need to handle the mapping separately
        project.milestones.push();
        uint256 milestoneIndex = project.milestones.length - 1;

        Milestone storage newMilestone = project.milestones[milestoneIndex];
        newMilestone.contentHash = contentHash;
        newMilestone.timestamp = block.timestamp;
        newMilestone.title = title;
        newMilestone.stage = stage;
        newMilestone.ipfsHash = ipfsHash;
        newMilestone.isEncrypted = isEncrypted;
        newMilestone.witnessCount = 0;

        // Register content hash for quick lookup
        registrations[contentHash] = RegistrationInfo({
            projectHash: projectHash,
            milestoneIndex: milestoneIndex,
            timestamp: block.timestamp,
            creator: msg.sender,
            exists: true
        });

        totalMilestones++;

        emit MilestoneRegistered(
            projectHash,
            contentHash,
            msg.sender,
            milestoneIndex,
            block.timestamp
        );

        // Refund excess payment
        _refundExcess(registrationFee);
    }

    /**
     * @dev Add a witness signature to a milestone
     * @param projectHash Hash of the project
     * @param milestoneIndex Index of the milestone
     */
    function addWitness(
        bytes32 projectHash,
        uint256 milestoneIndex
    ) external payable projectExists(projectHash) whenNotPaused {
        require(msg.value >= witnessFee, "Insufficient witness fee");

        Project storage project = projects[projectHash];
        require(milestoneIndex < project.milestones.length, "Invalid milestone");

        Milestone storage milestone = project.milestones[milestoneIndex];

        // Check witness limit
        require(milestone.witnessCount < MAX_WITNESSES_PER_MILESTONE, "Max witnesses reached");

        // O(1) duplicate check using mapping
        require(!milestone.hasWitnessed[msg.sender], "Already witnessed");

        // Add witness
        milestone.hasWitnessed[msg.sender] = true;
        milestone.witnesses.push(msg.sender);
        milestone.witnessCount++;

        emit WitnessAdded(projectHash, milestoneIndex, msg.sender, block.timestamp);

        // Refund excess payment
        _refundExcess(witnessFee);
    }

    /**
     * @dev Authorize a witness for future verification
     * @param witness Address to authorize
     */
    function authorizeWitness(address witness) external {
        require(witness != address(0), "Invalid witness address");
        require(witness != msg.sender, "Cannot authorize self");
        authorizedWitnesses[msg.sender][witness] = true;
        emit WitnessAuthorized(msg.sender, witness, block.timestamp);
    }

    /**
     * @dev Revoke witness authorization
     * @param witness Address to revoke
     */
    function revokeWitness(address witness) external {
        require(witness != address(0), "Invalid witness address");
        authorizedWitnesses[msg.sender][witness] = false;
        emit WitnessRevoked(msg.sender, witness, block.timestamp);
    }

    /**
     * @dev Toggle project visibility
     * @param projectHash Hash of the project
     */
    function setProjectVisibility(
        bytes32 projectHash,
        bool isPublic
    ) external projectExists(projectHash) onlyProjectOwner(projectHash) {
        projects[projectHash].isPublic = isPublic;
        emit ProjectVisibilityChanged(projectHash, isPublic);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @dev Verify if content was registered
     * @param contentHash Hash to verify
     * @return exists Whether content is registered
     * @return timestamp When it was registered
     * @return creator Who registered it
     */
    function verifyContent(bytes32 contentHash)
        external
        view
        returns (bool exists, uint256 timestamp, address creator)
    {
        RegistrationInfo memory info = registrations[contentHash];
        return (info.exists, info.timestamp, info.creator);
    }

    /**
     * @dev Get paginated projects for a creator (FIXED: prevents unbounded array issue)
     * @param creator Address of creator
     * @param offset Starting index
     * @param limit Maximum number of results
     * @return projectHashes Array of project hashes
     * @return total Total number of projects for this creator
     */
    function getCreatorProjects(address creator, uint256 offset, uint256 limit)
        external
        view
        returns (bytes32[] memory projectHashes, uint256 total)
    {
        total = creatorProjects[creator].length;

        if (offset >= total) {
            return (new bytes32[](0), total);
        }

        uint256 end = offset + limit > total ? total : offset + limit;
        uint256 size = end - offset;
        projectHashes = new bytes32[](size);

        for (uint256 i = 0; i < size; i++) {
            projectHashes[i] = creatorProjects[creator][offset + i];
        }

        return (projectHashes, total);
    }

    /**
     * @dev Get total number of projects for a creator
     * @param creator Address of creator
     * @return Number of projects
     */
    function getCreatorProjectCount(address creator)
        external
        view
        returns (uint256)
    {
        return creatorProjects[creator].length;
    }

    /**
     * @dev Get project details
     * @param projectHash Hash of the project
     */
    function getProject(bytes32 projectHash)
        external
        view
        returns (
            string memory projectId,
            address creator,
            uint256 createdAt,
            uint256 milestoneCount,
            bool isPublic,
            string memory category
        )
    {
        Project storage project = projects[projectHash];
        return (
            project.projectId,
            project.creator,
            project.createdAt,
            project.milestones.length,
            project.isPublic,
            project.category
        );
    }

    /**
     * @dev Get milestone details
     * @param projectHash Hash of the project
     * @param milestoneIndex Index of milestone
     */
    function getMilestone(bytes32 projectHash, uint256 milestoneIndex)
        external
        view
        returns (
            bytes32 contentHash,
            uint256 timestamp,
            string memory title,
            string memory stage,
            string memory ipfsHash,
            bool isEncrypted,
            uint256 witnessCount
        )
    {
        Project storage project = projects[projectHash];
        require(milestoneIndex < project.milestones.length, "Invalid milestone");

        Milestone storage milestone = project.milestones[milestoneIndex];
        return (
            milestone.contentHash,
            milestone.timestamp,
            milestone.title,
            milestone.stage,
            milestone.ipfsHash,
            milestone.isEncrypted,
            milestone.witnessCount
        );
    }

    /**
     * @dev Get witnesses for a milestone (paginated to prevent gas issues)
     * @param projectHash Hash of the project
     * @param milestoneIndex Index of milestone
     * @param offset Starting index
     * @param limit Maximum number of results
     */
    function getMilestoneWitnesses(
        bytes32 projectHash,
        uint256 milestoneIndex,
        uint256 offset,
        uint256 limit
    )
        external
        view
        returns (address[] memory witnesses, uint256 total)
    {
        Project storage project = projects[projectHash];
        require(milestoneIndex < project.milestones.length, "Invalid milestone");

        Milestone storage milestone = project.milestones[milestoneIndex];
        total = milestone.witnesses.length;

        if (offset >= total) {
            return (new address[](0), total);
        }

        uint256 end = offset + limit > total ? total : offset + limit;
        uint256 size = end - offset;
        witnesses = new address[](size);

        for (uint256 i = 0; i < size; i++) {
            witnesses[i] = milestone.witnesses[offset + i];
        }

        return (witnesses, total);
    }

    /**
     * @dev Check if an address has witnessed a milestone
     * @param projectHash Hash of the project
     * @param milestoneIndex Index of milestone
     * @param witness Address to check
     */
    function hasWitnessed(
        bytes32 projectHash,
        uint256 milestoneIndex,
        address witness
    ) external view returns (bool) {
        Project storage project = projects[projectHash];
        require(milestoneIndex < project.milestones.length, "Invalid milestone");
        return project.milestones[milestoneIndex].hasWitnessed[witness];
    }

    /**
     * @dev Get total milestone count for a project
     */
    function getProjectMilestoneCount(bytes32 projectHash)
        external
        view
        returns (uint256)
    {
        return projects[projectHash].milestones.length;
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @dev Refund excess ETH sent by user
     * @param requiredFee The required fee amount
     */
    function _refundExcess(uint256 requiredFee) internal {
        if (msg.value > requiredFee) {
            uint256 excess = msg.value - requiredFee;
            (bool success, ) = payable(msg.sender).call{value: excess}("");
            require(success, "Refund failed");
            emit ExcessRefunded(msg.sender, excess);
        }
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @dev Update registration fee (with maximum cap)
     * @param newFee New fee in wei
     */
    function setRegistrationFee(uint256 newFee) external onlyOwner {
        require(newFee <= MAX_REGISTRATION_FEE, "Fee exceeds maximum");
        registrationFee = newFee;
        emit FeeUpdated(newFee, "registration");
    }

    /**
     * @dev Update witness fee (with maximum cap)
     * @param newFee New fee in wei
     */
    function setWitnessFee(uint256 newFee) external onlyOwner {
        require(newFee <= MAX_WITNESS_FEE, "Fee exceeds maximum");
        witnessFee = newFee;
        emit FeeUpdated(newFee, "witness");
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
     * @dev Withdraw collected fees
     */
    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // Allow contract to receive ETH
    receive() external payable {}
}
