const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Starting Swarm Oracle deployment...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  const networkName = hre.network.name;
  console.log("Network:", networkName);

  // Network-specific configurations
  const config = getNetworkConfig(networkName);
  
  const deployments = {};

  try {
    // 1. Deploy PredictionMarket contract
    console.log("\n📊 Deploying PredictionMarket...");
    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    const predictionMarket = await PredictionMarket.deploy(
      config.vrfCoordinator,
      config.subscriptionId,
      config.keyHash,
      config.linkToken, // betting token
      deployer.address // fee recipient
    );
    await predictionMarket.waitForDeployment();
    
    deployments.PredictionMarket = {
      address: await predictionMarket.getAddress(),
      network: networkName,
      deployer: deployer.address
    };
    console.log("✅ PredictionMarket deployed to:", deployments.PredictionMarket.address);

    // 2. Deploy SwarmFunctions contract
    console.log("\n🔗 Deploying SwarmFunctions...");
    const SwarmFunctions = await ethers.getContractFactory("SwarmFunctions");
    const swarmFunctions = await SwarmFunctions.deploy(
      config.functionsRouter,
      config.donId,
      config.subscriptionId
    );
    await swarmFunctions.waitForDeployment();
    
    deployments.SwarmFunctions = {
      address: await swarmFunctions.getAddress(),
      network: networkName,
      deployer: deployer.address
    };
    console.log("✅ SwarmFunctions deployed to:", deployments.SwarmFunctions.address);

    // 3. Deploy SwarmCCIP contract
    console.log("\n🌉 Deploying SwarmCCIP...");
    const SwarmCCIP = await ethers.getContractFactory("SwarmCCIP");
    const swarmCCIP = await SwarmCCIP.deploy(
      config.router,
      config.linkToken, // bridge token
      deployer.address // liquidity pool (temporarily using deployer address)
    );
    await swarmCCIP.waitForDeployment();
    
    deployments.SwarmCCIP = {
      address: await swarmCCIP.getAddress(),
      network: networkName,
      deployer: deployer.address
    };
    console.log("✅ SwarmCCIP deployed to:", deployments.SwarmCCIP.address);

    // 4. Configure contracts
    console.log("\n⚙️ Configuring contracts...");
    
    // Note: Contract configuration functions can be added later
    console.log("✅ Contracts deployed and ready for configuration");

    // Data feeds configuration can be added when the functions are implemented
    if (config.dataFeeds) {
      console.log("\n📈 Data feeds available for configuration:");
      for (const [symbol, feedAddress] of Object.entries(config.dataFeeds)) {
        console.log(`  ${symbol}: ${feedAddress}`);
      }
    }

    // Save deployment info
    const deploymentPath = path.join(__dirname, '..', 'deployments');
    if (!fs.existsSync(deploymentPath)) {
      fs.mkdirSync(deploymentPath, { recursive: true });
    }
    
    const deploymentFile = path.join(deploymentPath, `${networkName}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log(`\n💾 Deployment info saved to: ${deploymentFile}`);

    // Generate frontend config
    await generateFrontendConfig(deployments, networkName);

    console.log("\n🎉 Deployment completed successfully!");
    console.log("\n📋 Contract Addresses:");
    Object.entries(deployments).forEach(([name, info]) => {
      console.log(`  ${name}: ${info.address}`);
    });

    console.log("\n📝 Next steps:");
    console.log("1. Verify contracts on block explorer");
    console.log("2. Fund contracts with LINK tokens");
    console.log("3. Configure Chainlink subscriptions");
    console.log("4. Update frontend configuration");
    console.log("5. Start agent swarm");

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

function getNetworkConfig(networkName) {
  const configs = {
    localhost: {
      vrfCoordinator: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625", // Mock for local
      linkToken: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
      keyHash: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
      subscriptionId: 1,
      router: "0x1035CabC275068e0F4b745A29CEDf38E13aF41b1",
      functionsRouter: "0xf9B8fc078197181C841c296C876945aaa425B278",
      donId: "0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000" // Mock DON ID
    },
    sepolia: {
      vrfCoordinator: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
      linkToken: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
      keyHash: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
      subscriptionId: process.env.VRF_SUBSCRIPTION_ID || 1,
      router: "0x1035CabC275068e0F4b745A29CEDf38E13aF41b1",
      functionsRouter: "0xf9B8fc078197181C841c296C876945aaa425B278",
      donId: "0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000", // Sepolia DON ID
      dataFeeds: {
        "ETH/USD": "0x694AA1769357215DE4FAC081bf1f309aDC325306",
        "BTC/USD": "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43",
        "LINK/USD": "0xc59E3633BAAC79493d908e63626716e204A45EdF"
      }
    },
    polygon: {
      vrfCoordinator: "0xAE975071Be8F8eE67addBC1A82488F1C24858067",
      linkToken: "0xb0897686c545045aFc77CF20eC7A532E3120E0F1",
      keyHash: "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f",
      subscriptionId: process.env.VRF_SUBSCRIPTION_ID || 1,
      router: "0x849c5ED5a80F5B408Dd4969b78c2C8fdf0565Bfe",
      functionsRouter: "0xC22a79eBA640940ABB6dF0f7982cc119578E11De",
      donId: "0x66756e2d706f6c79676f6e2d6d61696e6e65742d310000000000000000000000", // Polygon DON ID
      dataFeeds: {
        "MATIC/USD": "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0",
        "ETH/USD": "0xF9680D99D6C9589e2a93a78A04A279e509205945",
        "BTC/USD": "0xc907E116054Ad103354f2D350FD2514433D57F6f"
      }
    },
    arbitrum: {
      vrfCoordinator: "0x50d47e4142598E3411aA864e08a44284e471AC6f",
      linkToken: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
      keyHash: "0x027f94ff1465b3525f9fc03e9ff7d6d2c0953482246dd6ae07570c45d6631414",
      subscriptionId: process.env.VRF_SUBSCRIPTION_ID || 1,
      router: "0x421300c335522D93991d24C6f7aCF8Cc84B429BD",
      functionsRouter: "0x97083e831F8F0638855e2A515c90EdCF158DF238",
      donId: "0x66756e2d617262697472756d2d6d61696e6e65742d3100000000000000000000", // Arbitrum DON ID
      dataFeeds: {
        "ETH/USD": "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
        "BTC/USD": "0x6ce185860a4963106506C203335A2910413708e9",
        "ARB/USD": "0xb2A824043730FE05F3DA2efaFa1CBbe83fa548D6"
      }
    },
    base: {
      vrfCoordinator: "0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634",
      linkToken: "0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196",
      keyHash: "0x9e9bebe0a5060b85fca14e8c7c5fb3b3b2c13b6c77da0c44b7dd18b5fb3a2b2f",
      subscriptionId: process.env.VRF_SUBSCRIPTION_ID || 1,
      router: "0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D",
      functionsRouter: "0xf9B8fc078197181C841c296C876945aaa425B278",
      donId: "0x66756e2d626173652d6d61696e6e65742d31000000000000000000000000000000", // Base DON ID
      dataFeeds: {
        "ETH/USD": "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
        "BTC/USD": "0x56a43EB56Da12C0dc1D972ACb089c06a5dEF8e69"
      }
    }
  };

  return configs[networkName] || configs.sepolia;
}

async function generateFrontendConfig(deployments, networkName) {
  const network = await ethers.provider.getNetwork();
  const frontendConfig = {
    networkName,
    contracts: deployments,
    chainId: Number(network.chainId), // Convert BigInt to Number
    rpcUrl: ethers.provider.connection?.url || 'http://localhost:8545'
  };

  const frontendPath = path.join(__dirname, '..', '..', 'frontend', 'src', 'config');
  if (!fs.existsSync(frontendPath)) {
    fs.mkdirSync(frontendPath, { recursive: true });
  }
  
  const configFile = path.join(frontendPath, 'contracts.json');
  fs.writeFileSync(configFile, JSON.stringify(frontendConfig, null, 2));
  console.log(`✅ Frontend config generated: ${configFile}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 