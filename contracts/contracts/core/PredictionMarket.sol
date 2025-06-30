// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";

/**
 * @title PredictionMarket
 * @dev Core prediction market contract with Chainlink integration
 */
contract PredictionMarket is 
    Ownable, 
    ReentrancyGuard, 
    Pausable, 
    AutomationCompatibleInterface,
    VRFConsumerBaseV2
{
    using SafeERC20 for IERC20;

    struct Market {
        uint256 id;
        string question;
        string category;
        uint256 createdAt;
        uint256 endTime;
        uint256 resolutionTime;
        bool resolved;
        bool outcome; // true for YES, false for NO
        uint256 totalYesAmount;
        uint256 totalNoAmount;
        uint256 totalVolume;
        address creator;
        uint256 creatorFee; // basis points (100 = 1%)
        bool active;
    }

    struct Position {
        uint256 marketId;
        address user;
        uint256 yesAmount;
        uint256 noAmount;
        bool claimed;
    }

    struct AgentPrediction {
        address agent;
        uint256 marketId;
        bool prediction; // true for YES, false for NO
        uint256 confidence; // 0-10000 (100.00%)
        uint256 timestamp;
        string reasoning;
    }

    // State variables
    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Position)) public positions;
    mapping(uint256 => AgentPrediction[]) public agentPredictions;
    mapping(address => bool) public authorizedAgents;
    mapping(address => uint256) public agentReputation; // 0-10000 (100.00%)

    uint256 public nextMarketId = 1;
    uint256 public platformFee = 250; // 2.5% in basis points
    uint256 public minBetAmount = 0.01 ether;
    uint256 public maxBetAmount = 1000 ether;
    address public feeRecipient;
    IERC20 public bettingToken;

    // Chainlink VRF
    VRFCoordinatorV2Interface private vrfCoordinator;
    uint64 private vrfSubscriptionId;
    bytes32 private vrfKeyHash;
    uint32 private vrfCallbackGasLimit = 100000;
    uint16 private vrfRequestConfirmations = 3;
    uint32 private vrfNumWords = 1;
    mapping(uint256 => uint256) private vrfRequestToMarketId;
    
    // Chainlink integration contracts
    address public swarmFunctionsContract;
    address public swarmCCIPContract;

    // Events
    event MarketCreated(
        uint256 indexed marketId,
        string question,
        string category,
        uint256 endTime,
        address creator
    );
    
    event BetPlaced(
        uint256 indexed marketId,
        address indexed user,
        bool side,
        uint256 amount
    );
    
    event MarketResolved(
        uint256 indexed marketId,
        bool outcome,
        uint256 totalVolume
    );
    
    event WinningsClaimed(
        uint256 indexed marketId,
        address indexed user,
        uint256 amount
    );
    
    event AgentPredictionSubmitted(
        uint256 indexed marketId,
        address indexed agent,
        bool prediction,
        uint256 confidence
    );

    event AgentAuthorized(address indexed agent, bool authorized);

    constructor(
        address _vrfCoordinator,
        uint64 _subscriptionId,
        bytes32 _keyHash,
        address _bettingToken,
        address _feeRecipient
    ) Ownable(msg.sender) VRFConsumerBaseV2(_vrfCoordinator) {
        vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
        vrfSubscriptionId = _subscriptionId;
        vrfKeyHash = _keyHash;
        bettingToken = IERC20(_bettingToken);
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev Create a new prediction market
     */
    function createMarket(
        string memory _question,
        string memory _category,
        uint256 _endTime,
        uint256 _creatorFee
    ) external returns (uint256) {
        require(_endTime > block.timestamp, "End time must be in the future");
        require(_creatorFee <= 1000, "Creator fee too high"); // Max 10%

        uint256 marketId = nextMarketId++;
        
        markets[marketId] = Market({
            id: marketId,
            question: _question,
            category: _category,
            createdAt: block.timestamp,
            endTime: _endTime,
            resolutionTime: 0,
            resolved: false,
            outcome: false,
            totalYesAmount: 0,
            totalNoAmount: 0,
            totalVolume: 0,
            creator: msg.sender,
            creatorFee: _creatorFee,
            active: true
        });

        emit MarketCreated(marketId, _question, _category, _endTime, msg.sender);
        return marketId;
    }

    /**
     * @dev Place a bet on a market
     */
    function placeBet(
        uint256 _marketId,
        bool _side, // true for YES, false for NO
        uint256 _amount
    ) external nonReentrant whenNotPaused {
        Market storage market = markets[_marketId];
        require(market.active, "Market not active");
        require(block.timestamp < market.endTime, "Market has ended");
        require(_amount >= minBetAmount && _amount <= maxBetAmount, "Invalid bet amount");

        // Transfer tokens from user
        bettingToken.safeTransferFrom(msg.sender, address(this), _amount);

        // Update position
        Position storage position = positions[_marketId][msg.sender];
        position.marketId = _marketId;
        position.user = msg.sender;
        
        if (_side) {
            position.yesAmount += _amount;
            market.totalYesAmount += _amount;
        } else {
            position.noAmount += _amount;
            market.totalNoAmount += _amount;
        }

        market.totalVolume += _amount;

        emit BetPlaced(_marketId, msg.sender, _side, _amount);
    }

    /**
     * @dev Submit agent prediction
     */
    function submitAgentPrediction(
        uint256 _marketId,
        bool _prediction,
        uint256 _confidence,
        string memory _reasoning
    ) external {
        require(authorizedAgents[msg.sender], "Not an authorized agent");
        require(markets[_marketId].active, "Market not active");
        require(block.timestamp < markets[_marketId].endTime, "Market has ended");
        require(_confidence <= 10000, "Invalid confidence level");

        agentPredictions[_marketId].push(AgentPrediction({
            agent: msg.sender,
            marketId: _marketId,
            prediction: _prediction,
            confidence: _confidence,
            timestamp: block.timestamp,
            reasoning: _reasoning
        }));

        emit AgentPredictionSubmitted(_marketId, msg.sender, _prediction, _confidence);
    }

    /**
     * @dev Resolve market (automated via Chainlink Automation)
     */
    function resolveMarket(uint256 _marketId, bool _outcome) external onlyOwner {
        Market storage market = markets[_marketId];
        require(market.active, "Market not active");
        require(block.timestamp >= market.endTime, "Market has not ended");
        require(!market.resolved, "Market already resolved");

        market.resolved = true;
        market.outcome = _outcome;
        market.resolutionTime = block.timestamp;

        emit MarketResolved(_marketId, _outcome, market.totalVolume);
    }

    /**
     * @dev Claim winnings from a resolved market
     */
    function claimWinnings(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        Position storage position = positions[_marketId][msg.sender];
        
        require(market.resolved, "Market not resolved");
        require(!position.claimed, "Already claimed");
        require(position.yesAmount > 0 || position.noAmount > 0, "No position");

        uint256 winningAmount = calculateWinnings(_marketId, msg.sender);
        require(winningAmount > 0, "No winnings");

        position.claimed = true;
        bettingToken.safeTransfer(msg.sender, winningAmount);

        emit WinningsClaimed(_marketId, msg.sender, winningAmount);
    }

    /**
     * @dev Calculate winnings for a user in a market
     */
    function calculateWinnings(uint256 _marketId, address _user) public view returns (uint256) {
        Market storage market = markets[_marketId];
        Position storage position = positions[_marketId][_user];
        
        if (!market.resolved || position.claimed) {
            return 0;
        }

        uint256 totalPool = market.totalYesAmount + market.totalNoAmount;
        uint256 winningPool = market.outcome ? market.totalYesAmount : market.totalNoAmount;
        uint256 losingPool = market.outcome ? market.totalNoAmount : market.totalYesAmount;
        uint256 userWinningBet = market.outcome ? position.yesAmount : position.noAmount;

        if (userWinningBet == 0 || winningPool == 0) {
            return 0;
        }

        // Calculate proportional winnings from losing pool
        uint256 winningsFromLosingPool = (userWinningBet * losingPool) / winningPool;
        
        // Apply fees
        uint256 totalFees = (winningsFromLosingPool * (platformFee + market.creatorFee)) / 10000;
        uint256 netWinnings = userWinningBet + winningsFromLosingPool - totalFees;

        return netWinnings;
    }

    /**
     * @dev Chainlink Automation - Check if any markets need resolution
     */
    function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory performData) {
        uint256[] memory marketsToResolve = new uint256[](100); // Max 100 markets per check
        uint256 count = 0;

        for (uint256 i = 1; i < nextMarketId && count < 100; i++) {
            Market storage market = markets[i];
            if (market.active && 
                !market.resolved && 
                block.timestamp >= market.endTime) {
                marketsToResolve[count] = i;
                count++;
            }
        }

        upkeepNeeded = count > 0;
        
        // Encode market IDs to resolve
        uint256[] memory finalArray = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            finalArray[i] = marketsToResolve[i];
        }
        performData = abi.encode(finalArray);
    }

    /**
     * @dev Chainlink Automation - Perform market resolution
     */
    function performUpkeep(bytes calldata performData) external override {
        uint256[] memory marketsToResolve = abi.decode(performData, (uint256[]));
        
        for (uint256 i = 0; i < marketsToResolve.length; i++) {
            uint256 marketId = marketsToResolve[i];
            _requestRandomResolution(marketId);
        }
    }

    /**
     * @dev Request random resolution using Chainlink VRF
     */
    function _requestRandomResolution(uint256 _marketId) internal {
        uint256 requestId = vrfCoordinator.requestRandomWords(
            vrfKeyHash,
            vrfSubscriptionId,
            vrfRequestConfirmations,
            vrfCallbackGasLimit,
            vrfNumWords
        );
        vrfRequestToMarketId[requestId] = _marketId;
    }

    /**
     * @dev Chainlink VRF callback for random resolution
     */
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        uint256 marketId = vrfRequestToMarketId[requestId];
        Market storage market = markets[marketId];
        
        if (!market.resolved && market.active) {
            // Use agent consensus with random tiebreaker
            bool agentConsensus = _getAgentConsensus(marketId);
            bool randomOutcome = (randomWords[0] % 2) == 1;
            
            // Use agent consensus if available, otherwise random
            bool finalOutcome = agentPredictions[marketId].length > 0 ? agentConsensus : randomOutcome;
            
            market.resolved = true;
            market.outcome = finalOutcome;
            market.resolutionTime = block.timestamp;

            emit MarketResolved(marketId, finalOutcome, market.totalVolume);
        }
    }

    /**
     * @dev Get agent consensus for market resolution
     */
    function _getAgentConsensus(uint256 _marketId) internal view returns (bool) {
        AgentPrediction[] storage predictions = agentPredictions[_marketId];
        uint256 weightedYes = 0;
        uint256 weightedNo = 0;
        uint256 totalWeight = 0;

        for (uint256 i = 0; i < predictions.length; i++) {
            AgentPrediction storage pred = predictions[i];
            uint256 weight = agentReputation[pred.agent] * pred.confidence;
            
            if (pred.prediction) {
                weightedYes += weight;
            } else {
                weightedNo += weight;
            }
            totalWeight += weight;
        }

        return weightedYes > weightedNo;
    }

    /**
     * @dev Authorize/deauthorize an agent
     */
    function setAgentAuthorization(address _agent, bool _authorized) external onlyOwner {
        authorizedAgents[_agent] = _authorized;
        if (_authorized && agentReputation[_agent] == 0) {
            agentReputation[_agent] = 5000; // Start with 50% reputation
        }
        emit AgentAuthorized(_agent, _authorized);
    }

    /**
     * @dev Update agent reputation based on performance
     */
    function updateAgentReputation(address _agent, uint256 _newReputation) external onlyOwner {
        require(_newReputation <= 10000, "Invalid reputation");
        agentReputation[_agent] = _newReputation;
    }

    /**
     * @dev Get market details
     */
    function getMarket(uint256 _marketId) external view returns (Market memory) {
        return markets[_marketId];
    }

    /**
     * @dev Get user position in market
     */
    function getPosition(uint256 _marketId, address _user) external view returns (Position memory) {
        return positions[_marketId][_user];
    }

    /**
     * @dev Get agent predictions for market
     */
    function getAgentPredictions(uint256 _marketId) external view returns (AgentPrediction[] memory) {
        return agentPredictions[_marketId];
    }

    /**
     * @dev Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Update platform fee
     */
    function setPlatformFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "Fee too high"); // Max 10%
        platformFee = _fee;
    }

    /**
     * @dev Update betting limits
     */
    function setBettingLimits(uint256 _minAmount, uint256 _maxAmount) external onlyOwner {
        minBetAmount = _minAmount;
        maxBetAmount = _maxAmount;
    }

    /**
     * @dev Withdraw accumulated fees
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = bettingToken.balanceOf(address(this));
        // Calculate total locked in active markets
        uint256 lockedAmount = 0;
        for (uint256 i = 1; i < nextMarketId; i++) {
            if (markets[i].active && !markets[i].resolved) {
                lockedAmount += markets[i].totalYesAmount + markets[i].totalNoAmount;
            }
        }
        
        uint256 availableFees = balance > lockedAmount ? balance - lockedAmount : 0;
        if (availableFees > 0) {
            bettingToken.safeTransfer(feeRecipient, availableFees);
        }
    }
    
    /**
     * @dev Set Chainlink Functions contract address
     */
    function setSwarmFunctionsContract(address _functionsContract) external onlyOwner {
        swarmFunctionsContract = _functionsContract;
    }
    
    /**
     * @dev Set Chainlink CCIP contract address
     */
    function setSwarmCCIPContract(address _ccipContract) external onlyOwner {
        swarmCCIPContract = _ccipContract;
    }
    
    /**
     * @dev Update market with external data from Chainlink Functions
     */
    function updateMarketWithExternalData(
        uint256 _marketId, 
        int256 sentiment, 
        uint256 volume,
        uint256 price
    ) external {
        require(msg.sender == swarmFunctionsContract, "Only SwarmFunctions can update");
        require(markets[_marketId].active, "Market not active");
        
        // Calculate prediction score based on real data
        int256 predictionScore = _calculatePredictionScore(_marketId, sentiment, volume, price);
        
        // Update market metadata with external data and prediction
        emit ExternalDataUpdated(_marketId, sentiment, volume, price);
        emit PredictionScoreUpdated(_marketId, predictionScore);
    }
    
    /**
     * @dev Calculate prediction score using mathematical models
     */
    function _calculatePredictionScore(
        uint256 _marketId,
        int256 sentiment,
        uint256 volume,
        uint256 price
    ) internal view returns (int256) {
        Market storage market = markets[_marketId];
        
        // Get current market state
        uint256 totalVolume = market.totalYesAmount + market.totalNoAmount;
        uint256 yesRatio = totalVolume > 0 ? (market.totalYesAmount * 10000) / totalVolume : 5000;
        
        // Multi-factor prediction model
        int256 score = 0;
        
        // 1. Sentiment Analysis Weight (30%)
        score += (sentiment * 3000) / 10000;
        
        // 2. Volume Momentum (20%)
        // Higher volume indicates stronger conviction
        int256 volumeScore = volume > 100 ? int256(2000) : int256(volume) * 20;
        score += volumeScore;
        
        // 3. Market Imbalance (25%)
        // If market is heavily skewed, predict regression to mean
        int256 imbalanceScore = 0;
        if (yesRatio > 7000) {
            imbalanceScore = -2500; // Oversold, predict correction
        } else if (yesRatio < 3000) {
            imbalanceScore = 2500; // Oversold, predict bounce
        }
        score += imbalanceScore;
        
        // 4. Price Action (15%)
        // Use price as a momentum indicator
        int256 priceScore = 0;
        if (price > 0) {
            // Simple momentum: recent price action
            priceScore = 1500; // Positive price movement
        }
        score += priceScore;
        
        // 5. Agent Consensus (10%)
        int256 agentScore = _getWeightedAgentConsensus(_marketId);
        score += (agentScore * 1000) / 10000;
        
        // Normalize to -10000 to 10000 range
        return _clamp(score, -10000, 10000);
    }
    
    /**
     * @dev Get weighted agent consensus as score
     */
    function _getWeightedAgentConsensus(uint256 _marketId) internal view returns (int256) {
        AgentPrediction[] storage predictions = agentPredictions[_marketId];
        if (predictions.length == 0) return int256(0);
        
        int256 weightedSum = 0;
        uint256 totalWeight = 0;
        
        for (uint256 i = 0; i < predictions.length; i++) {
            AgentPrediction storage pred = predictions[i];
            uint256 weight = agentReputation[pred.agent] * pred.confidence;
            
            int256 predictionValue = pred.prediction ? int256(10000) : int256(-10000);
            weightedSum += predictionValue * int256(weight);
            totalWeight += weight;
        }
        
        return totalWeight > 0 ? weightedSum / int256(totalWeight) : int256(0);
    }
    
    /**
     * @dev Mathematical clamping function
     */
    function _clamp(int256 value, int256 min, int256 max) internal pure returns (int256) {
        if (value < min) return min;
        if (value > max) return max;
        return value;
    }
    
    /**
     * @dev Get mathematical prediction for market outcome
     */
    function getMathematicalPrediction(uint256 _marketId) external view returns (
        int256 predictionScore,
        uint256 confidence,
        string memory reasoning
    ) {
        Market storage market = markets[_marketId];
        require(market.active, "Market not active");
        
        // This would use the last external data update
        // For demo, return based on current market state
        uint256 totalVolume = market.totalYesAmount + market.totalNoAmount;
        uint256 yesRatio = totalVolume > 0 ? (market.totalYesAmount * 10000) / totalVolume : 5000;
        
        predictionScore = _calculateBasicPrediction(yesRatio, totalVolume);
        confidence = _calculateConfidence(totalVolume, agentPredictions[_marketId].length);
        reasoning = _generateReasoning(yesRatio, totalVolume);
    }
    
    /**
     * @dev Calculate basic prediction based on market state
     */
    function _calculateBasicPrediction(uint256 yesRatio, uint256 totalVolume) internal pure returns (int256) {
        // Mean reversion model: extreme positions tend to correct
        if (yesRatio > 8000) return int256(-5000); // Strong sell signal
        if (yesRatio < 2000) return int256(5000);  // Strong buy signal
        if (yesRatio > 6000) return int256(-2000); // Mild sell signal
        if (yesRatio < 4000) return int256(2000);  // Mild buy signal
        return int256(0); // Neutral
    }
    
    /**
     * @dev Calculate confidence based on volume and agent participation
     */
    function _calculateConfidence(uint256 totalVolume, uint256 agentCount) internal pure returns (uint256) {
        uint256 volumeScore = totalVolume > 1 ether ? 5000 : (totalVolume * 5000) / 1 ether;
        uint256 agentScore = agentCount > 5 ? 5000 : agentCount * 1000;
        return (volumeScore + agentScore) / 2;
    }
    
    /**
     * @dev Generate reasoning string
     */
    function _generateReasoning(uint256 yesRatio, uint256 totalVolume) internal pure returns (string memory) {
        if (totalVolume < 0.1 ether) return "Low volume - insufficient data";
        if (yesRatio > 8000) return "Extremely bullish - correction likely";
        if (yesRatio < 2000) return "Extremely bearish - bounce likely";
        if (yesRatio > 6000) return "Bullish trend - some resistance expected";
        if (yesRatio < 4000) return "Bearish trend - some support expected";
        return "Balanced market - neutral outlook";
    }
    
    /**
     * @dev Cross-chain synchronization function called by CCIP
     */
    function syncFromCrossChain(
        uint256 _marketId,
        uint256 _totalVolume,
        uint256 _avgPrice
    ) external {
        require(msg.sender == swarmCCIPContract, "Only SwarmCCIP can sync");
        require(markets[_marketId].active, "Market not active");
        
        // Update market with cross-chain data
        emit CrossChainSyncReceived(_marketId, _totalVolume, _avgPrice);
    }
    
    /**
     * @dev Emergency pause for specific market
     */
    function pauseMarket(uint256 _marketId) external onlyOwner {
        markets[_marketId].active = false;
        emit MarketPaused(_marketId);
    }
    
    /**
     * @dev Get current price for YES or NO position
     */
    function getPrice(uint256 _marketId, bool _side) public view returns (uint256) {
        Market storage market = markets[_marketId];
        uint256 totalPool = market.totalYesAmount + market.totalNoAmount;
        
        if (totalPool == 0) {
            return 5000; // 50% initial price (in basis points)
        }
        
        if (_side) {
            // YES price = (yesAmount / totalAmount) * 10000
            return (market.totalYesAmount * 10000) / totalPool;
        } else {
            // NO price = (noAmount / totalAmount) * 10000
            return (market.totalNoAmount * 10000) / totalPool;
        }
    }
    
    /**
     * @dev Get market statistics for external systems
     */
    function getMarketStats(uint256 _marketId) external view returns (
        uint256 totalVolume,
        uint256 yesVolume,
        uint256 noVolume,
        uint256 currentYesPrice,
        uint256 currentNoPrice
    ) {
        Market storage market = markets[_marketId];
        return (
            market.totalYesAmount + market.totalNoAmount,
            market.totalYesAmount,
            market.totalNoAmount,
            getPrice(_marketId, true),
            getPrice(_marketId, false)
        );
    }
    
    // Additional events for integration
    event ExternalDataUpdated(uint256 indexed marketId, int256 sentiment, uint256 volume, uint256 price);
    event CrossChainSyncReceived(uint256 indexed marketId, uint256 totalVolume, uint256 avgPrice);
    event MarketPaused(uint256 indexed marketId);
    event PredictionScoreUpdated(uint256 indexed marketId, int256 predictionScore);
    
    // Modifiers for backward compatibility (if needed)
    modifier onlyWhenActive(uint256 _marketId) {
        require(markets[_marketId].active, "Market not active");
        _;
    }
} 
 