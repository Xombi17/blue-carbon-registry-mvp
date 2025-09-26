const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Blue Carbon Registry & MRV System", function () {
  let registry, credits;
  let owner, verifier, user, buyer;

  beforeEach(async function () {
    [owner, verifier, user, buyer] = await ethers.getSigners();

    // Deploy BlueCarbonRegistry
    const BlueCarbonRegistry = await ethers.getContractFactory("BlueCarbonRegistry");
    registry = await BlueCarbonRegistry.deploy();
    await registry.deployed();

    // Deploy BlueCarbonCredits
    const BlueCarbonCredits = await ethers.getContractFactory("BlueCarbonCredits");
    credits = await BlueCarbonCredits.deploy(
      "Blue Carbon Credits",
      "BCC",
      "https://ipfs.io/ipfs/"
    );
    await credits.deployed();

    // Grant roles
    const VERIFIER_ROLE = await registry.VERIFIER_ROLE();
    const MINTER_ROLE = await credits.MINTER_ROLE();
    
    await registry.grantRole(VERIFIER_ROLE, verifier.address);
    await credits.grantRole(MINTER_ROLE, owner.address);
  });

  describe("BlueCarbonRegistry", function () {
    it("Should submit a project successfully", async function () {
      const projectData = {
        name: "Sundarbans Mangrove Restoration",
        description: "Large-scale mangrove restoration project in West Bengal",
        ecosystemType: 0, // MANGROVE
        location: "Sundarbans, West Bengal, India",
        geoJsonHash: "QmTestGeoJsonHash123",
        evidenceHashes: ["QmTestEvidence1", "QmTestEvidence2"],
        estimatedCarbonCapture: 1000, // 1000 tons CO2
        areaSize: 500 // 500 hectares
      };

      const tx = await registry.connect(user).submitProject(
        projectData.name,
        projectData.description,
        projectData.ecosystemType,
        projectData.location,
        projectData.geoJsonHash,
        projectData.evidenceHashes,
        projectData.estimatedCarbonCapture,
        projectData.areaSize
      );

      await expect(tx)
        .to.emit(registry, "ProjectSubmitted")
        .withArgs(0, user.address, projectData.name, projectData.ecosystemType);

      const project = await registry.getProject(0);
      expect(project.name).to.equal(projectData.name);
      expect(project.submitter).to.equal(user.address);
      expect(project.status).to.equal(0); // PENDING
    });

    it("Should verify a project", async function () {
      // First submit a project
      await registry.connect(user).submitProject(
        "Test Project",
        "Test Description",
        0, // MANGROVE
        "Test Location",
        "QmTestHash",
        ["QmEvidence1"],
        100,
        50
      );

      // Verify the project
      const tx = await registry.connect(verifier).verifyProject(
        0, // projectId
        1, // VERIFIED
        "Project meets all requirements"
      );

      await expect(tx)
        .to.emit(registry, "ProjectVerified")
        .withArgs(0, verifier.address, 1, "Project meets all requirements");

      const project = await registry.getProject(0);
      expect(project.status).to.equal(1); // VERIFIED
      expect(project.verifiedBy).to.equal(verifier.address);
    });

    it("Should get projects by status", async function () {
      // Submit multiple projects
      await registry.connect(user).submitProject(
        "Project 1", "Description 1", 0, "Location 1", "Hash1", ["Evidence1"], 100, 50
      );
      await registry.connect(user).submitProject(
        "Project 2", "Description 2", 1, "Location 2", "Hash2", ["Evidence2"], 200, 100
      );

      // Verify one project
      await registry.connect(verifier).verifyProject(0, 1, "Approved");

      const pendingProjects = await registry.getProjectsByStatus(0); // PENDING
      const verifiedProjects = await registry.getProjectsByStatus(1); // VERIFIED

      expect(pendingProjects.length).to.equal(1);
      expect(verifiedProjects.length).to.equal(1);
      expect(pendingProjects[0]).to.equal(1);
      expect(verifiedProjects[0]).to.equal(0);
    });
  });

  describe("BlueCarbonCredits", function () {
    it("Should mint carbon credit NFT", async function () {
      const creditData = {
        recipient: user.address,
        projectId: 0,
        carbonAmount: 1000,
        vintageYear: 2024,
        projectLocation: "Sundarbans, West Bengal",
        ecosystemType: "Mangrove",
        certificationStandard: "Verra VCS",
        ipfsMetadataHash: "QmTestMetadataHash"
      };

      const tx = await credits.connect(owner).mintCarbonCredit(
        creditData.recipient,
        creditData.projectId,
        creditData.carbonAmount,
        creditData.vintageYear,
        creditData.projectLocation,
        creditData.ecosystemType,
        creditData.certificationStandard,
        creditData.ipfsMetadataHash
      );

      await expect(tx)
        .to.emit(credits, "CreditMinted")
        .withArgs(0, creditData.projectId, creditData.recipient, creditData.carbonAmount);

      const credit = await credits.getCarbonCredit(0);
      expect(credit.projectId).to.equal(creditData.projectId);
      expect(credit.carbonAmount).to.equal(creditData.carbonAmount);
      expect(credit.status).to.equal(0); // ACTIVE

      const totalIssued = await credits.totalCarbonIssued();
      expect(totalIssued).to.equal(creditData.carbonAmount);
    });

    it("Should retire carbon credits", async function () {
      // Mint a credit first
      await credits.connect(owner).mintCarbonCredit(
        user.address, 0, 500, 2024, "Test Location", "Mangrove", "VCS", "QmTestHash"
      );

      const tx = await credits.connect(user).retireCredit(0, "Corporate carbon neutrality");

      await expect(tx)
        .to.emit(credits, "CreditRetired")
        .withArgs(0, user.address, "Corporate carbon neutrality", 500);

      const credit = await credits.getCarbonCredit(0);
      expect(credit.status).to.equal(1); // RETIRED
      expect(credit.retiredBy).to.equal(user.address);

      const totalRetired = await credits.totalCarbonRetired();
      expect(totalRetired).to.equal(500);
    });

    it("Should track credit ownership", async function () {
      // Mint credits to different users
      await credits.connect(owner).mintCarbonCredit(
        user.address, 0, 100, 2024, "Location 1", "Mangrove", "VCS", "Hash1"
      );
      await credits.connect(owner).mintCarbonCredit(
        user.address, 1, 200, 2024, "Location 2", "Seagrass", "VCS", "Hash2"
      );
      await credits.connect(owner).mintCarbonCredit(
        buyer.address, 2, 300, 2024, "Location 3", "Salt Marsh", "VCS", "Hash3"
      );

      const userCredits = await credits.getCreditsByOwner(user.address);
      const buyerCredits = await credits.getCreditsByOwner(buyer.address);

      expect(userCredits.length).to.equal(2);
      expect(buyerCredits.length).to.equal(1);
      expect(userCredits[0]).to.equal(0);
      expect(userCredits[1]).to.equal(1);
      expect(buyerCredits[0]).to.equal(2);
    });

    it("Should get active and retired credits", async function () {
      // Mint multiple credits
      await credits.connect(owner).mintCarbonCredit(
        user.address, 0, 100, 2024, "Location 1", "Mangrove", "VCS", "Hash1"
      );
      await credits.connect(owner).mintCarbonCredit(
        user.address, 1, 200, 2024, "Location 2", "Seagrass", "VCS", "Hash2"
      );
      await credits.connect(owner).mintCarbonCredit(
        buyer.address, 2, 300, 2024, "Location 3", "Salt Marsh", "VCS", "Hash3"
      );

      // Retire one credit
      await credits.connect(user).retireCredit(0, "Test retirement");

      const activeCredits = await credits.getActiveCredits();
      const retiredCredits = await credits.getRetiredCredits();

      expect(activeCredits.length).to.equal(2);
      expect(retiredCredits.length).to.equal(1);
      expect(retiredCredits[0]).to.equal(0);
    });
  });

  describe("Integration Tests", function () {
    it("Should handle complete project lifecycle", async function () {
      // 1. Submit project
      await registry.connect(user).submitProject(
        "Complete Lifecycle Project",
        "Full test of project lifecycle",
        0, // MANGROVE
        "Test Location",
        "QmGeoHash",
        ["QmEvidence1", "QmEvidence2"],
        500,
        250
      );

      // 2. Verify project
      await registry.connect(verifier).verifyProject(0, 1, "Approved for credits");

      // 3. Mint carbon credits
      await credits.connect(owner).mintCarbonCredit(
        user.address,
        0, // projectId
        500, // carbonAmount
        2024,
        "Test Location",
        "Mangrove",
        "VCS",
        "QmCreditMetadata"
      );

      // 4. Mark credits as issued in registry
      await registry.connect(owner).markCreditsIssued(0, 0); // projectId, tokenId

      // Verify final state
      const project = await registry.getProject(0);
      const credit = await credits.getCarbonCredit(0);

      expect(project.status).to.equal(3); // CREDITS_ISSUED
      expect(project.creditsIssued).to.equal(true);
      expect(project.creditTokenId).to.equal(0);
      expect(credit.projectId).to.equal(0);
      expect(credit.carbonAmount).to.equal(500);
    });
  });
});