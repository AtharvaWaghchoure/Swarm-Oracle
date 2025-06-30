const { ethers } = require("hardhat");
require("dotenv/config");

async function main() {
    console.log("🔮 Testing Swarm Oracle Prediction Markets\n");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Testing with account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    // Contract addresses from deployment
    const contractAddresses = {
        sepolia: {
            PredictionMarket: "0xAB85a785cc81509Ba3BB1ed40C4e80Fe4923D4Df",
            SwarmFunctions: "0xCbcFF61747cCfCCEF925dd3d4AEf420bab8461E8",
            SwarmCCIP: "0x7386e06aEdB264Fe43B849d3930DBe14c420bAe3"
        },
        arbitrumSepolia: {
            PredictionMarket: "0x27c8EAfB0aBADAc25ac194Ca8Fe1208D5E0D9bbd",
            SwarmFunctions: "0x9100AF642f6Fa6FbBbE5248f75f08DFE8d42E23f",
            SwarmCCIP: "0x4168cC0010de28F5b4C50C315eD64c385Dca46e0"
        },
        baseSepolia: {
            PredictionMarket: "0x27c8EAfB0aBADAc25ac194Ca8Fe1208D5E0D9bbd",
            SwarmFunctions: "0x9100AF642f6Fa6FbBbE5248f75f08DFE8d42E23f",
            SwarmCCIP: "0x4168cC0010de28F5b4C50C315eD64c385Dca46e0"
        }
    };

    // Determine which network we're on
    const network = await ethers.provider.getNetwork();
    let contractAddress;
    let networkName;

    switch (network.chainId.toString()) {
        case '11155111': // Sepolia
            contractAddress = contractAddresses.sepolia.PredictionMarket;
            networkName = 'Ethereum Sepolia';
            break;
        case '421614': // Arbitrum Sepolia
            contractAddress = contractAddresses.arbitrumSepolia.PredictionMarket;
            networkName = 'Arbitrum Sepolia';
            break;
        case '84532': // Base Sepolia
            contractAddress = contractAddresses.baseSepolia.PredictionMarket;
            networkName = 'Base Sepolia';
            break;
        default:
            throw new Error(`Unsupported network: ${network.chainId}`);
    }

    console.log(`🌐 Connected to: ${networkName} (Chain ID: ${network.chainId})`);
    console.log(`📜 PredictionMarket Contract: ${contractAddress}\n`);

    // Get contract instance
    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    const predictionMarket = PredictionMarket.attach(contractAddress);

    try {
        // First, let's get the current state
        console.log("📊 Current Market State:");
        const nextMarketId = await predictionMarket.nextMarketId();
        console.log(`Next Market ID: ${nextMarketId}`);
        console.log(`Total Markets Created: ${nextMarketId - 1n}\n`);

        // List all existing markets
        console.log("📋 Listing All Existing Markets:");
        console.log("=" .repeat(80));
        
        const existingMarkets = [];
        for (let i = 1; i < nextMarketId; i++) {
            try {
                const market = await predictionMarket.getMarket(i);
                if (market.id > 0) { // Market exists
                    existingMarkets.push(market);
                    
                    const endTime = new Date(Number(market.endTime) * 1000);
                    const createdTime = new Date(Number(market.createdAt) * 1000);
                    const isActive = market.active && !market.resolved;
                    const hasEnded = Date.now() > Number(market.endTime) * 1000;
                    
                    console.log(`🎯 Market #${market.id}`);
                    console.log(`   Question: ${market.question}`);
                    console.log(`   Category: ${market.category}`);
                    console.log(`   Creator: ${market.creator}`);
                    console.log(`   Created: ${createdTime.toLocaleString()}`);
                    console.log(`   End Time: ${endTime.toLocaleString()}`);
                    console.log(`   Status: ${isActive ? (hasEnded ? '⏰ Ended (Awaiting Resolution)' : '🟢 Active') : market.resolved ? '✅ Resolved' : '🔴 Inactive'}`);
                    
                    if (market.resolved) {
                        console.log(`   Outcome: ${market.outcome ? '✅ YES' : '❌ NO'}`);
                        const resolutionTime = new Date(Number(market.resolutionTime) * 1000);
                        console.log(`   Resolved: ${resolutionTime.toLocaleString()}`);
                    }
                    
                    console.log(`   Total Volume: ${ethers.formatEther(market.totalVolume)} ETH`);
                    console.log(`   YES Amount: ${ethers.formatEther(market.totalYesAmount)} ETH`);
                    console.log(`   NO Amount: ${ethers.formatEther(market.totalNoAmount)} ETH`);
                    
                    // Get current prices
                    try {
                        const yesPrice = await predictionMarket.getPrice(i, true);
                        const noPrice = await predictionMarket.getPrice(i, false);
                        console.log(`   YES Price: ${(Number(yesPrice) / 100).toFixed(2)}%`);
                        console.log(`   NO Price: ${(Number(noPrice) / 100).toFixed(2)}%`);
                    } catch (priceError) {
                        console.log(`   Prices: Unable to fetch`);
                    }
                    
                    console.log("   " + "-".repeat(60));
                }
            } catch (error) {
                // Market doesn't exist or error reading it
                console.log(`   Market #${i}: Not found or error reading`);
            }
        }

        if (existingMarkets.length === 0) {
            console.log("   No markets found. This is the first deployment!");
        }

        console.log(`\n📈 Summary: ${existingMarkets.length} markets found\n`);

        // Now let's create a new test market
        console.log("🎯 Creating a New Test Prediction Market:");
        console.log("=" .repeat(80));

        const currentTime = Math.floor(Date.now() / 1000);
        const endTime = currentTime + (24 * 60 * 60); // 24 hours from now
        const endDate = new Date(endTime * 1000);

        const testMarket = {
            question: `Will Bitcoin price exceed $50,000 by ${endDate.toLocaleDateString()}?`,
            category: "Cryptocurrency",
            endTime: endTime,
            creatorFee: 100 // 1%
        };

        console.log(`Question: ${testMarket.question}`);
        console.log(`Category: ${testMarket.category}`);
        console.log(`End Time: ${endDate.toLocaleString()}`);
        console.log(`Creator Fee: ${testMarket.creatorFee / 100}%`);

        // Estimate gas for market creation
        try {
            const gasEstimate = await predictionMarket.createMarket.estimateGas(
                testMarket.question,
                testMarket.category,
                testMarket.endTime,
                testMarket.creatorFee
            );
            console.log(`Estimated Gas: ${gasEstimate.toString()}`);
        } catch (gasError) {
            console.log(`Gas estimation failed: ${gasError.message}`);
        }

        // Create the market
        console.log("\n🚀 Creating market...");
        const tx = await predictionMarket.createMarket(
            testMarket.question,
            testMarket.category,
            testMarket.endTime,
            testMarket.creatorFee
        );

        console.log(`Transaction submitted: ${tx.hash}`);
        console.log("⏳ Waiting for confirmation...");

        const receipt = await tx.wait();
        console.log(`✅ Market created successfully!`);
        console.log(`Gas used: ${receipt.gasUsed.toString()}`);
        console.log(`Block number: ${receipt.blockNumber}`);

        // Parse the MarketCreated event to get the market ID
        const marketCreatedEvent = receipt.logs.find(log => {
            try {
                const parsed = predictionMarket.interface.parseLog(log);
                return parsed.name === 'MarketCreated';
            } catch {
                return false;
            }
        });

        if (marketCreatedEvent) {
            const parsedEvent = predictionMarket.interface.parseLog(marketCreatedEvent);
            const newMarketId = parsedEvent.args.marketId;
            console.log(`🎯 New Market ID: ${newMarketId}`);

            // Get the newly created market details
            console.log("\n📋 New Market Details:");
            const newMarket = await predictionMarket.getMarket(newMarketId);
            console.log(`   ID: ${newMarket.id}`);
            console.log(`   Question: ${newMarket.question}`);
            console.log(`   Category: ${newMarket.category}`);
            console.log(`   Creator: ${newMarket.creator}`);
            console.log(`   Active: ${newMarket.active}`);
            console.log(`   End Time: ${new Date(Number(newMarket.endTime) * 1000).toLocaleString()}`);
        }

        // Show updated market count
        const newNextMarketId = await predictionMarket.nextMarketId();
        console.log(`\n📊 Updated Market Count: ${newNextMarketId - 1n} total markets`);

        console.log("\n✨ Test completed successfully!");
        console.log("\n💡 Next steps:");
        console.log("   1. Try placing bets on the new market");
        console.log("   2. Submit agent predictions");
        console.log("   3. Wait for market resolution");

    } catch (error) {
        console.error("❌ Error during testing:", error.message);
        
        if (error.message.includes("insufficient funds")) {
            console.log("\n💡 Tip: Make sure your account has enough testnet ETH");
            console.log("   Get testnet ETH from: https://faucets.chain.link/sepolia");
        }
        
        if (error.message.includes("execution reverted")) {
            console.log("\n💡 Tip: Check if contract parameters are valid");
            console.log("   - End time must be in the future");
            console.log("   - Creator fee must be <= 10%");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 