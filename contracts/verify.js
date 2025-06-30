console.log("🧪 Direct Contract Test");
const hre = require("hardhat");

async function main() {
    const contractAddress = "0xAB85a785cc81509Ba3BB1ed40C4e80Fe4923D4Df";
    
    const predictionMarket = await hre.ethers.getContractAt("PredictionMarket", contractAddress);
    
    console.log("✅ Connected to PredictionMarket at:", contractAddress);
    
    try {
        const nextMarketId = await predictionMarket.nextMarketId();
        console.log("📊 Next Market ID:", nextMarketId.toString());
        
        if (nextMarketId > 1) {
            console.log("🎯 Markets created! Count:", (nextMarketId - 1).toString());
        }
        
        console.log("🎉 Contract verification SUCCESSFUL!");
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main().catch(console.error);
