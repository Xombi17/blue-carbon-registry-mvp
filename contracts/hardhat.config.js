require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../.env" });

const { PRIVATE_KEY, MUMBAI_URL, POLYGON_SCAN_API_KEY } = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    mumbai: {
      url: MUMBAI_URL || "https://rpc-mumbai.maticvigil.com",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      gasPrice: 35000000000
    },
    polygon: {
      url: "https://polygon-rpc.com/",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      gasPrice: 35000000000
    }
  },
  etherscan: {
    apiKey: {
      polygonMumbai: POLYGON_SCAN_API_KEY,
      polygon: POLYGON_SCAN_API_KEY
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};