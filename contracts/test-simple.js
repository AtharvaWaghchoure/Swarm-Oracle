console.log("🧪 Simple Contract Verification");
const hre = require("hardhat");

async function main() {
    const deploymentFile = "./deployments/sepolia.json";
    const deployment = require(deploymentFile);
    
    const predictionMarket = await hre.ethers.getContractAt("PredictionMarket", deployment.PredictionMarket);
    
    console.log("✅ Connected to PredictionMarket at:", deployment.PredictionMarket);
    
    try {
        const nextMarketId = await predictionMarket.nextMarketId();
        console.log("📊 Next Market ID:", nextMarketId.toString());
        
        if (nextMarketId > 1) {
            console.log("🎯 Markets have been created! Current market count:", (nextMarketId - 1).toString());
        }
        
        console.log("🎉 Contract verification SUCCESSFUL!");
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main().catch(console.error);
