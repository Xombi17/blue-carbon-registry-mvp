// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title BlueCarbonRegistry
 * @dev A smart contract for registering and managing Blue Carbon ecosystem projects
 * @notice This contract stores immutable project data and manages verification workflow
 */
contract BlueCarbonRegistry is AccessControl, ReentrancyGuard {
    using Counters for Counters.Counter;

    // Roles
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Project counter
    Counters.Counter private _projectIdCounter;

    // Project status enum
    enum ProjectStatus {
        PENDING,
        VERIFIED,
        REJECTED,
        CREDITS_ISSUED
    }

    // Ecosystem types
    enum EcosystemType {
        MANGROVE,
        SEAGRASS,
        SALT_MARSH,
        OTHER
    }

    // Project structure
    struct Project {
        uint256 id;
        address submitter;
        string name;
        string description;
        EcosystemType ecosystemType;
        string location; // Coordinates or region name
        string geoJsonHash; // IPFS hash of GeoJSON data
        string[] evidenceHashes; // IPFS hashes of photos/documents
        uint256 estimatedCarbonCapture; // in tons CO2
        uint256 areaSize; // in hectares
        uint256 submissionTimestamp;
        ProjectStatus status;
        address verifiedBy;
        uint256 verificationTimestamp;
        string verificationNotes;
        bool creditsIssued;
        uint256 creditTokenId;
    }

    // Storage
    mapping(uint256 => Project) public projects;
    mapping(address => uint256[]) public projectsBySubmitter;
    uint256[] public allProjectIds;

    // Events
    event ProjectSubmitted(
        uint256 indexed projectId,
        address indexed submitter,
        string name,
        EcosystemType ecosystemType
    );

    event ProjectVerified(
        uint256 indexed projectId,
        address indexed verifier,
        ProjectStatus status,
        string notes
    );

    event CreditsIssued(
        uint256 indexed projectId,
        uint256 indexed tokenId,
        uint256 carbonCapture
    );

    // Modifiers
    modifier projectExists(uint256 projectId) {
        require(projectId < _projectIdCounter.current(), "Project does not exist");
        _;
    }

    modifier onlyProjectSubmitter(uint256 projectId) {
        require(
            projects[projectId].submitter == msg.sender,
            "Only project submitter can perform this action"
        );
        _;
    }

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
    }

    /**
     * @dev Submit a new Blue Carbon project for verification
     * @param name Project name
     * @param description Project description
     * @param ecosystemType Type of blue carbon ecosystem
     * @param location Location description or coordinates
     * @param geoJsonHash IPFS hash of GeoJSON polygon data
     * @param evidenceHashes Array of IPFS hashes for evidence files
     * @param estimatedCarbonCapture Estimated carbon capture in tons CO2
     * @param areaSize Project area in hectares
     */
    function submitProject(
        string memory name,
        string memory description,
        EcosystemType ecosystemType,
        string memory location,
        string memory geoJsonHash,
        string[] memory evidenceHashes,
        uint256 estimatedCarbonCapture,
        uint256 areaSize
    ) external nonReentrant returns (uint256) {
        require(bytes(name).length > 0, "Project name cannot be empty");
        require(bytes(geoJsonHash).length > 0, "GeoJSON hash cannot be empty");
        require(evidenceHashes.length > 0, "At least one evidence file required");
        require(estimatedCarbonCapture > 0, "Carbon capture must be greater than 0");
        require(areaSize > 0, "Area size must be greater than 0");

        uint256 projectId = _projectIdCounter.current();
        _projectIdCounter.increment();

        Project storage project = projects[projectId];
        project.id = projectId;
        project.submitter = msg.sender;
        project.name = name;
        project.description = description;
        project.ecosystemType = ecosystemType;
        project.location = location;
        project.geoJsonHash = geoJsonHash;
        project.evidenceHashes = evidenceHashes;
        project.estimatedCarbonCapture = estimatedCarbonCapture;
        project.areaSize = areaSize;
        project.submissionTimestamp = block.timestamp;
        project.status = ProjectStatus.PENDING;

        projectsBySubmitter[msg.sender].push(projectId);
        allProjectIds.push(projectId);

        emit ProjectSubmitted(projectId, msg.sender, name, ecosystemType);

        return projectId;
    }

    /**
     * @dev Verify a project (only verifiers can call this)
     * @param projectId The ID of the project to verify
     * @param status New status (VERIFIED or REJECTED)
     * @param notes Verification notes
     */
    function verifyProject(
        uint256 projectId,
        ProjectStatus status,
        string memory notes
    ) external onlyRole(VERIFIER_ROLE) projectExists(projectId) {
        require(
            status == ProjectStatus.VERIFIED || status == ProjectStatus.REJECTED,
            "Invalid status for verification"
        );
        require(
            projects[projectId].status == ProjectStatus.PENDING,
            "Project already processed"
        );

        projects[projectId].status = status;
        projects[projectId].verifiedBy = msg.sender;
        projects[projectId].verificationTimestamp = block.timestamp;
        projects[projectId].verificationNotes = notes;

        emit ProjectVerified(projectId, msg.sender, status, notes);
    }

    /**
     * @dev Mark credits as issued for a project
     * @param projectId The project ID
     * @param tokenId The carbon credit token ID
     */
    function markCreditsIssued(
        uint256 projectId,
        uint256 tokenId
    ) external onlyRole(ADMIN_ROLE) projectExists(projectId) {
        require(
            projects[projectId].status == ProjectStatus.VERIFIED,
            "Project must be verified first"
        );
        require(!projects[projectId].creditsIssued, "Credits already issued");

        projects[projectId].creditsIssued = true;
        projects[projectId].creditTokenId = tokenId;
        projects[projectId].status = ProjectStatus.CREDITS_ISSUED;

        emit CreditsIssued(
            projectId,
            tokenId,
            projects[projectId].estimatedCarbonCapture
        );
    }

    /**
     * @dev Get project details
     * @param projectId The project ID
     * @return The project struct
     */
    function getProject(uint256 projectId)
        external
        view
        projectExists(projectId)
        returns (Project memory)
    {
        return projects[projectId];
    }

    /**
     * @dev Get all projects submitted by an address
     * @param submitter The submitter address
     * @return Array of project IDs
     */
    function getProjectsBySubmitter(address submitter)
        external
        view
        returns (uint256[] memory)
    {
        return projectsBySubmitter[submitter];
    }

    /**
     * @dev Get all project IDs
     * @return Array of all project IDs
     */
    function getAllProjectIds() external view returns (uint256[] memory) {
        return allProjectIds;
    }

    /**
     * @dev Get projects by status
     * @param status The project status to filter by
     * @return Array of project IDs with the specified status
     */
    function getProjectsByStatus(ProjectStatus status)
        external
        view
        returns (uint256[] memory)
    {
        uint256[] memory result = new uint256[](allProjectIds.length);
        uint256 count = 0;

        for (uint256 i = 0; i < allProjectIds.length; i++) {
            if (projects[allProjectIds[i]].status == status) {
                result[count] = allProjectIds[i];
                count++;
            }
        }

        // Resize array to actual count
        uint256[] memory filteredResult = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            filteredResult[i] = result[i];
        }

        return filteredResult;
    }

    /**
     * @dev Get total number of projects
     * @return Total project count
     */
    function getTotalProjectCount() external view returns (uint256) {
        return _projectIdCounter.current();
    }

    /**
     * @dev Add evidence to an existing project (only by submitter)
     * @param projectId The project ID
     * @param evidenceHash IPFS hash of additional evidence
     */
    function addEvidence(uint256 projectId, string memory evidenceHash)
        external
        projectExists(projectId)
        onlyProjectSubmitter(projectId)
    {
        require(
            projects[projectId].status == ProjectStatus.PENDING,
            "Cannot add evidence to processed project"
        );
        require(bytes(evidenceHash).length > 0, "Evidence hash cannot be empty");

        projects[projectId].evidenceHashes.push(evidenceHash);
    }

    /**
     * @dev Grant verifier role to an address
     * @param verifier Address to grant verifier role
     */
    function addVerifier(address verifier) external onlyRole(ADMIN_ROLE) {
        _grantRole(VERIFIER_ROLE, verifier);
    }

    /**
     * @dev Revoke verifier role from an address
     * @param verifier Address to revoke verifier role from
     */
    function removeVerifier(address verifier) external onlyRole(ADMIN_ROLE) {
        _revokeRole(VERIFIER_ROLE, verifier);
    }
}