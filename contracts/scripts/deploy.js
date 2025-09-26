const hre = require("hardhat");

async function main() {
  console.log("🌊 Deploying Blue Carbon Registry & MRV System...\n");

  // Get the ContractFactory and Signers here.
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy BlueCarbonRegistry
  console.log("\n📋 Deploying BlueCarbonRegistry...");
  const BlueCarbonRegistry = await hre.ethers.getContractFactory("BlueCarbonRegistry");
  const registry = await BlueCarbonRegistry.deploy();
  await registry.deployed();

  console.log("✅ BlueCarbonRegistry deployed to:", registry.address);

  // Deploy BlueCarbonCredits
  console.log("\n🏆 Deploying BlueCarbonCredits...");
  const BlueCarbonCredits = await hre.ethers.getContractFactory("BlueCarbonCredits");
  const credits = await BlueCarbonCredits.deploy(
    "Blue Carbon Credits",
    "BCC",
    "https://ipfs.io/ipfs/" // Base URI for metadata
  );
  await credits.deployed();

  console.log("✅ BlueCarbonCredits deployed to:", credits.address);

  // Grant MINTER_ROLE to registry contract so it can mint credits
  console.log("\n🔗 Setting up roles and permissions...");
  const MINTER_ROLE = await credits.MINTER_ROLE();
  await credits.grantRole(MINTER_ROLE, registry.address);
  console.log("✅ Granted MINTER_ROLE to BlueCarbonRegistry");

  // Deploy a combined contract for easier management
  console.log("\n🏗️  Deploying BlueCarbonSystem (combined interface)...");
  const BlueCarbonSystem = await hre.ethers.getContractFactory("BlueCarbonSystem");
  let system;
  
  try {
    system = await BlueCarbonSystem.deploy(registry.address, credits.address);
    await system.deployed();
    console.log("✅ BlueCarbonSystem deployed to:", system.address);
  } catch (error) {
    console.log("ℹ️  BlueCarbonSystem contract not found, skipping...");
  }

  // Display deployment summary
  console.log("\n" + "=".repeat(50));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(50));
  console.log(`Network: ${hre.network.name}`);
  console.log(`BlueCarbonRegistry: ${registry.address}`);
  console.log(`BlueCarbonCredits: ${credits.address}`);
  if (system) {
    console.log(`BlueCarbonSystem: ${system.address}`);
  }
  console.log("=".repeat(50));

  // Save deployment addresses to a file
  const fs = require('fs');
  const deploymentData = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    contracts: {
      BlueCarbonRegistry: registry.address,
      BlueCarbonCredits: credits.address,
      ...(system && { BlueCarbonSystem: system.address })
    },
    deployer: deployer.address
  };

  const deploymentPath = `./deployments/${hre.network.name}.json`;
  
  // Create deployments directory if it doesn't exist
  if (!fs.existsSync('./deployments')) {
    fs.mkdirSync('./deployments');
  }

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
  console.log(`📄 Deployment data saved to: ${deploymentPath}`);

  // Verification instructions
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("\n📝 To verify contracts on Etherscan/PolygonScan:");
    console.log(`npx hardhat verify --network ${hre.network.name} ${registry.address}`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${credits.address} "Blue Carbon Credits" "BCC" "https://ipfs.io/ipfs/"`);
    if (system) {
      console.log(`npx hardhat verify --network ${hre.network.name} ${system.address} ${registry.address} ${credits.address}`);
    }
  }

  console.log("\n🚀 Ready to start the Blue Carbon MRV system!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });