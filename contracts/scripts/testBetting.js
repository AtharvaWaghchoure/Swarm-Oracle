const { ethers } = require("hardhat");
require("dotenv/config");

async function main() {
    console.log("💰 Testing Betting on Swarm Oracle Prediction Markets\n");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Testing with account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    // Contract addresses from deployment
    const contractAddresses = {
        sepolia: {
            PredictionMarket: "0xAB85a785cc81509Ba3BB1ed40C4e80Fe4923D4Df",
        },
        arbitrumSepolia: {
            PredictionMarket: "0x27c8EAfB0aBADAc25ac194Ca8Fe1208D5E0D9bbd",
        },
        baseSepolia: {
            PredictionMarket: "0x27c8EAfB0aBADAc25ac194Ca8Fe1208D5E0D9bbd",
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
        // Get betting configuration
        console.log("⚙️ Betting Configuration:");
        const minBetAmount = await predictionMarket.minBetAmount();
        const maxBetAmount = await predictionMarket.maxBetAmount();
        const platformFee = await predictionMarket.platformFee();
        
        console.log(`   Min Bet Amount: ${ethers.formatEther(minBetAmount)} ETH`);
        console.log(`   Max Bet Amount: ${ethers.formatEther(maxBetAmount)} ETH`);
        console.log(`   Platform Fee: ${Number(platformFee) / 100}%\n`);

        // Find active markets
        console.log("🔍 Finding Active Markets:");
        const nextMarketId = await predictionMarket.nextMarketId();
        const activeMarkets = [];

        for (let i = 1; i < nextMarketId; i++) {
            try {
                const market = await predictionMarket.getMarket(i);
                const isActive = market.active && !market.resolved;
                const hasEnded = Date.now() > Number(market.endTime) * 1000;
                
                if (isActive && !hasEnded) {
                    activeMarkets.push(market);
                    console.log(`   ✅ Market #${market.id}: ${market.question}`);
                }
            } catch (error) {
                // Skip markets that don't exist
            }
        }

        if (activeMarkets.length === 0) {
            console.log("   ❌ No active markets found!");
            console.log("   💡 Create a market first using: pnpm run test:markets");
            return;
        }

        // Select the first active market for testing
        const testMarket = activeMarkets[0];
        console.log(`\n🎯 Testing with Market #${testMarket.id}`);
        console.log(`   Question: ${testMarket.question}`);
        console.log(`   Category: ${testMarket.category}`);
        console.log(`   End Time: ${new Date(Number(testMarket.endTime) * 1000).toLocaleString()}`);

        // Get current market stats
        const [totalVolume, yesVolume, noVolume, yesPrice, noPrice] = await predictionMarket.getMarketStats(testMarket.id);
        console.log("\n📊 Current Market Stats:");
        console.log(`   Total Volume: ${ethers.formatEther(totalVolume)} ETH`);
        console.log(`   YES Volume: ${ethers.formatEther(yesVolume)} ETH`);
        console.log(`   NO Volume: ${ethers.formatEther(noVolume)} ETH`);
        console.log(`   YES Price: ${(Number(yesPrice) / 100).toFixed(2)}%`);
        console.log(`   NO Price: ${(Number(noPrice) / 100).toFixed(2)}%`);

        // Get user's current position
        const currentPosition = await predictionMarket.getPosition(testMarket.id, deployer.address);
        console.log("\n👤 Your Current Position:");
        console.log(`   YES Amount: ${ethers.formatEther(currentPosition.yesAmount)} ETH`);
        console.log(`   NO Amount: ${ethers.formatEther(currentPosition.noAmount)} ETH`);
        console.log(`   Already Claimed: ${currentPosition.claimed}`);

        // Calculate potential winnings
        if (testMarket.resolved) {
            const potentialWinnings = await predictionMarket.calculateWinnings(testMarket.id, deployer.address);
            console.log(`   Potential Winnings: ${ethers.formatEther(potentialWinnings)} ETH`);
        }

        // Place a test bet
        const betAmount = ethers.parseEther("0.01"); // 0.01 ETH bet
        const betSide = true; // Bet on YES
        
        console.log(`\n💰 Placing Test Bet:`);
        console.log(`   Amount: ${ethers.formatEther(betAmount)} ETH`);
        console.log(`   Side: ${betSide ? 'YES' : 'NO'}`);
        console.log(`   Market: #${testMarket.id}`);

        // Check if we have enough ETH
        const accountBalance = await ethers.provider.getBalance(deployer.address);
        if (accountBalance < betAmount) {
            console.log("❌ Insufficient ETH balance for bet!");
            console.log("💡 Get testnet ETH from: https://faucets.chain.link/sepolia");
            return;
        }

        // Note: The contract expects betting tokens (ERC20), not ETH
        // Let's check what token is being used
        const bettingToken = await predictionMarket.bettingToken();
        console.log(`   Betting Token: ${bettingToken}`);

        // If betting token is zero address, it means ETH is used
        if (bettingToken === ethers.ZeroAddress) {
            console.log("   ✅ Using ETH for betting");
            
            // Estimate gas for the bet
            try {
                const gasEstimate = await predictionMarket.placeBet.estimateGas(
                    testMarket.id,
                    betSide,
                    betAmount,
                    { value: betAmount }
                );
                console.log(`   Estimated Gas: ${gasEstimate.toString()}`);
            } catch (gasError) {
                console.log(`   Gas estimation failed: ${gasError.message}`);
            }

            // Place the bet
            console.log("\n🚀 Placing bet...");
            const tx = await predictionMarket.placeBet(
                testMarket.id,
                betSide,
                betAmount,
                { value: betAmount }
            );

            console.log(`   Transaction submitted: ${tx.hash}`);
            console.log("   ⏳ Waiting for confirmation...");

            const receipt = await tx.wait();
            console.log(`   ✅ Bet placed successfully!`);
            console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
            console.log(`   Block number: ${receipt.blockNumber}`);

        } else {
            console.log("   ⚠️ Betting requires ERC20 tokens");
            console.log(`   Token Address: ${bettingToken}`);
            console.log("   💡 You need to approve and transfer tokens first");
            
            // For testing, let's try to get the token balance
            try {
                const tokenContract = await ethers.getContractAt("IERC20", bettingToken);
                const tokenBalance = await tokenContract.balanceOf(deployer.address);
                console.log(`   Your Token Balance: ${ethers.formatEther(tokenBalance)} tokens`);
                
                if (tokenBalance >= betAmount) {
                    // Check allowance
                    const allowance = await tokenContract.allowance(deployer.address, contractAddress);
                    console.log(`   Current Allowance: ${ethers.formatEther(allowance)} tokens`);
                    
                    if (allowance < betAmount) {
                        console.log("   🔐 Approving tokens...");
                        const approveTx = await tokenContract.approve(contractAddress, betAmount);
                        await approveTx.wait();
                        console.log("   ✅ Tokens approved");
                    }
                    
                    // Place the bet
                    console.log("\n🚀 Placing bet...");
                    const tx = await predictionMarket.placeBet(testMarket.id, betSide, betAmount);
                    
                    console.log(`   Transaction submitted: ${tx.hash}`);
                    const receipt = await tx.wait();
                    console.log(`   ✅ Bet placed successfully!`);
                    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
                } else {
                    console.log("   ❌ Insufficient token balance");
                }
            } catch (tokenError) {
                console.log(`   Token interaction failed: ${tokenError.message}`);
            }
        }

        // Show updated position
        console.log("\n📊 Updated Position:");
        const updatedPosition = await predictionMarket.getPosition(testMarket.id, deployer.address);
        console.log(`   YES Amount: ${ethers.formatEther(updatedPosition.yesAmount)} ETH`);
        console.log(`   NO Amount: ${ethers.formatEther(updatedPosition.noAmount)} ETH`);

        // Show updated market stats
        const [newTotalVolume, newYesVolume, newNoVolume, newYesPrice, newNoPrice] = await predictionMarket.getMarketStats(testMarket.id);
        console.log("\n📈 Updated Market Stats:");
        console.log(`   Total Volume: ${ethers.formatEther(newTotalVolume)} ETH`);
        console.log(`   YES Volume: ${ethers.formatEther(newYesVolume)} ETH`);
        console.log(`   NO Volume: ${ethers.formatEther(newNoVolume)} ETH`);
        console.log(`   YES Price: ${(Number(newYesPrice) / 100).toFixed(2)}%`);
        console.log(`   NO Price: ${(Number(newNoPrice) / 100).toFixed(2)}%`);

        console.log("\n✨ Betting test completed successfully!");

    } catch (error) {
        console.error("❌ Error during betting test:", error.message);
        
        if (error.message.includes("insufficient funds")) {
            console.log("\n💡 Tip: Make sure your account has enough testnet ETH");
            console.log("   Get testnet ETH from: https://faucets.chain.link/sepolia");
        }
        
        if (error.message.includes("Market not active")) {
            console.log("\n💡 Tip: The market may have ended or been paused");
        }
        
        if (error.message.includes("Invalid bet amount")) {
            console.log("\n💡 Tip: Check minimum and maximum bet amounts");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 