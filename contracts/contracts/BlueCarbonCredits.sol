// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title BlueCarbonCredits
 * @dev NFT contract for Blue Carbon ecosystem carbon credits
 * @notice Each token represents carbon credits from a verified Blue Carbon project
 */
contract BlueCarbonCredits is ERC721, ERC721URIStorage, AccessControl, ReentrancyGuard {
    using Counters for Counters.Counter;
    using Strings for uint256;

    // Roles
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Token counter
    Counters.Counter private _tokenIdCounter;

    // Credit status enum
    enum CreditStatus {
        ACTIVE,
        RETIRED,
        TRANSFERRED
    }

    // Carbon credit metadata structure
    struct CarbonCredit {
        uint256 tokenId;
        uint256 projectId;
        uint256 carbonAmount; // tons of CO2
        address originalIssuer;
        uint256 issuanceDate;
        uint256 vintageYear;
        string projectLocation;
        string ecosystemType;
        string certificationStandard;
        string ipfsMetadataHash;
        CreditStatus status;
        address retiredBy;
        uint256 retirementDate;
        string retirementReason;
    }

    // Storage
    mapping(uint256 => CarbonCredit) public carbonCredits;
    mapping(uint256 => uint256) public projectToToken; // projectId => tokenId
    mapping(address => uint256[]) public creditsByOwner;
    
    // Retirement tracking
    uint256 public totalCarbonIssued;
    uint256 public totalCarbonRetired;
    
    // Base URI for metadata
    string private _baseTokenURI;

    // Events
    event CreditMinted(
        uint256 indexed tokenId,
        uint256 indexed projectId,
        address indexed recipient,
        uint256 carbonAmount
    );

    event CreditRetired(
        uint256 indexed tokenId,
        address indexed retiredBy,
        string reason,
        uint256 carbonAmount
    );

    event CreditTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to
    );

    event MetadataUpdated(
        uint256 indexed tokenId,
        string newMetadataHash
    );

    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenURI
    ) ERC721(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _baseTokenURI = baseTokenURI;
    }

    /**
     * @dev Mint a new carbon credit NFT for a verified project
     * @param recipient Address to receive the NFT
     * @param projectId The ID of the verified project
     * @param carbonAmount Amount of carbon captured in tons CO2
     * @param vintageYear Year when carbon capture occurred
     * @param projectLocation Location of the project
     * @param ecosystemType Type of blue carbon ecosystem
     * @param certificationStandard Certification standard used
     * @param ipfsMetadataHash IPFS hash of detailed metadata
     */
    function mintCarbonCredit(
        address recipient,
        uint256 projectId,
        uint256 carbonAmount,
        uint256 vintageYear,
        string memory projectLocation,
        string memory ecosystemType,
        string memory certificationStandard,
        string memory ipfsMetadataHash
    ) external onlyRole(MINTER_ROLE) nonReentrant returns (uint256) {
        require(recipient != address(0), "Cannot mint to zero address");
        require(carbonAmount > 0, "Carbon amount must be greater than 0");
        require(vintageYear > 0, "Invalid vintage year");
        require(bytes(ipfsMetadataHash).length > 0, "Metadata hash required");

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        // Create carbon credit metadata
        CarbonCredit storage credit = carbonCredits[tokenId];
        credit.tokenId = tokenId;
        credit.projectId = projectId;
        credit.carbonAmount = carbonAmount;
        credit.originalIssuer = msg.sender;
        credit.issuanceDate = block.timestamp;
        credit.vintageYear = vintageYear;
        credit.projectLocation = projectLocation;
        credit.ecosystemType = ecosystemType;
        credit.certificationStandard = certificationStandard;
        credit.ipfsMetadataHash = ipfsMetadataHash;
        credit.status = CreditStatus.ACTIVE;

        // Update mappings and totals
        projectToToken[projectId] = tokenId;
        creditsByOwner[recipient].push(tokenId);
        totalCarbonIssued += carbonAmount;

        // Mint the NFT
        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, ipfsMetadataHash);

        emit CreditMinted(tokenId, projectId, recipient, carbonAmount);

        return tokenId;
    }

    /**
     * @dev Retire carbon credits (permanent removal from circulation)
     * @param tokenId The ID of the token to retire
     * @param reason Reason for retirement
     */
    function retireCredit(
        uint256 tokenId,
        string memory reason
    ) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Only token owner can retire");
        require(
            carbonCredits[tokenId].status == CreditStatus.ACTIVE,
            "Credit already retired or transferred"
        );
        require(bytes(reason).length > 0, "Retirement reason required");

        CarbonCredit storage credit = carbonCredits[tokenId];
        credit.status = CreditStatus.RETIRED;
        credit.retiredBy = msg.sender;
        credit.retirementDate = block.timestamp;
        credit.retirementReason = reason;

        totalCarbonRetired += credit.carbonAmount;

        // Burn the token to prevent further transfers
        _burn(tokenId);

        emit CreditRetired(tokenId, msg.sender, reason, credit.carbonAmount);
    }

    /**
     * @dev Override transfer to update credit status and tracking
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);

        // Update credit status on transfer (except for minting and burning)
        if (from != address(0) && to != address(0)) {
            carbonCredits[tokenId].status = CreditStatus.TRANSFERRED;
            
            // Update owner tracking
            _removeFromOwnerArray(from, tokenId);
            creditsByOwner[to].push(tokenId);

            emit CreditTransferred(tokenId, from, to);
        }
    }

    /**
     * @dev Remove token from owner's array
     */
    function _removeFromOwnerArray(address owner, uint256 tokenId) private {
        uint256[] storage ownerTokens = creditsByOwner[owner];
        for (uint256 i = 0; i < ownerTokens.length; i++) {
            if (ownerTokens[i] == tokenId) {
                ownerTokens[i] = ownerTokens[ownerTokens.length - 1];
                ownerTokens.pop();
                break;
            }
        }
    }

    /**
     * @dev Get carbon credit details
     * @param tokenId The token ID
     * @return The carbon credit struct
     */
    function getCarbonCredit(uint256 tokenId)
        external
        view
        returns (CarbonCredit memory)
    {
        require(_exists(tokenId), "Token does not exist");
        return carbonCredits[tokenId];
    }

    /**
     * @dev Get credits owned by an address
     * @param owner The owner address
     * @return Array of token IDs
     */
    function getCreditsByOwner(address owner)
        external
        view
        returns (uint256[] memory)
    {
        return creditsByOwner[owner];
    }

    /**
     * @dev Get active (non-retired) credits
     * @return Array of active token IDs
     */
    function getActiveCredits() external view returns (uint256[] memory) {
        uint256 totalSupply = _tokenIdCounter.current();
        uint256[] memory activeTokens = new uint256[](totalSupply);
        uint256 activeCount = 0;

        for (uint256 i = 0; i < totalSupply; i++) {
            if (_exists(i) && carbonCredits[i].status == CreditStatus.ACTIVE) {
                activeTokens[activeCount] = i;
                activeCount++;
            }
        }

        // Resize array to actual count
        uint256[] memory result = new uint256[](activeCount);
        for (uint256 i = 0; i < activeCount; i++) {
            result[i] = activeTokens[i];
        }

        return result;
    }

    /**
     * @dev Get retired credits
     * @return Array of retired token IDs
     */
    function getRetiredCredits() external view returns (uint256[] memory) {
        uint256 totalSupply = _tokenIdCounter.current();
        uint256[] memory retiredTokens = new uint256[](totalSupply);
        uint256 retiredCount = 0;

        for (uint256 i = 0; i < totalSupply; i++) {
            if (carbonCredits[i].status == CreditStatus.RETIRED) {
                retiredTokens[retiredCount] = i;
                retiredCount++;
            }
        }

        // Resize array to actual count
        uint256[] memory result = new uint256[](retiredCount);
        for (uint256 i = 0; i < retiredCount; i++) {
            result[i] = retiredTokens[i];
        }

        return result;
    }

    /**
     * @dev Update metadata hash for a token
     * @param tokenId The token ID
     * @param newMetadataHash New IPFS metadata hash
     */
    function updateMetadata(
        uint256 tokenId,
        string memory newMetadataHash
    ) external onlyRole(ADMIN_ROLE) {
        require(_exists(tokenId), "Token does not exist");
        require(bytes(newMetadataHash).length > 0, "Metadata hash required");

        carbonCredits[tokenId].ipfsMetadataHash = newMetadataHash;
        _setTokenURI(tokenId, newMetadataHash);

        emit MetadataUpdated(tokenId, newMetadataHash);
    }

    /**
     * @dev Set base URI for token metadata
     * @param baseTokenURI New base URI
     */
    function setBaseURI(string memory baseTokenURI) external onlyRole(ADMIN_ROLE) {
        _baseTokenURI = baseTokenURI;
    }

    /**
     * @dev Get base URI
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Get total number of tokens minted
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter.current();
    }

    /**
     * @dev Add a minter role
     * @param minter Address to grant minter role
     */
    function addMinter(address minter) external onlyRole(ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, minter);
    }

    /**
     * @dev Remove a minter role
     * @param minter Address to revoke minter role from
     */
    function removeMinter(address minter) external onlyRole(ADMIN_ROLE) {
        _revokeRole(MINTER_ROLE, minter);
    }

    // Required overrides
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
        override(ERC721, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
}