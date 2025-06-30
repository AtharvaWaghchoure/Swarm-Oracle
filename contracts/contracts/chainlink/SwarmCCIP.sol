// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts-ccip/contracts/applications/CCIPReceiver.sol";
import "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title SwarmCCIP
 * @dev Cross-chain infrastructure for Swarm Oracle using Chainlink CCIP
 */
contract SwarmCCIP is CCIPReceiver, ConfirmedOwner, ReentrancyGuard, Pausable {
    enum MessageType {
        MARKET_SYNC,
        LIQUIDITY_BRIDGE,
        AGENT_COORDINATION,
        RESOLUTION_SYNC
    }

    struct CrossChainMarket {
        uint256 localMarketId;
        uint256 remoteMarketId;
        uint64 remoteChainSelector;
        address remoteContract;
        uint256 totalLiquidity;
        bool active;
    }

    struct LiquidityBridge {
        address user;
        uint256 amount;
        uint64 sourceChain;
        uint64 destinationChain;
        uint256 timestamp;
        bool completed;
    }

    struct AgentMessage {
        address agent;
        uint256 marketId;
        bytes data;
        uint256 timestamp;
        MessageType messageType;
    }

    // State variables
    mapping(uint64 => address) public chainContracts; // chainSelector => contract address
    mapping(uint256 => CrossChainMarket) public crossChainMarkets;
    mapping(bytes32 => LiquidityBridge) public liquidityBridges;
    mapping(address => bool) public authorizedAgents;
    mapping(uint64 => bool) public supportedChains;

    uint256 public nextBridgeId = 1;
    uint256 public bridgeFee = 1000; // 10% in basis points
    address public liquidityPool;
    IERC20 public bridgeToken;

    // Events
    event CrossChainMarketCreated(
        uint256 indexed localMarketId,
        uint256 indexed remoteMarketId,
        uint64 indexed remoteChain
    );
    
    event LiquidityBridgeInitiated(
        bytes32 indexed bridgeId,
        address indexed user,
        uint256 amount,
        uint64 sourceChain,
        uint64 destinationChain
    );
    
    event LiquidityBridgeCompleted(
        bytes32 indexed bridgeId,
        address indexed user,
        uint256 amount
    );
    
    event CrossChainMessageSent(
        bytes32 indexed messageId,
        uint64 indexed destinationChain,
        MessageType messageType
    );
    
    event CrossChainMessageReceived(
        bytes32 indexed messageId,
        uint64 indexed sourceChain,
        MessageType messageType
    );
    
    event CrossChainMarketSynced(
        uint256 indexed marketId,
        uint64 indexed sourceChain,
        uint256 totalVolume,
        uint256 avgPrice,
        int256 sentiment
    );
    
    event CrossChainAgentPrediction(
        uint256 indexed marketId,
        uint64 indexed sourceChain,
        address indexed agent,
        bool prediction,
        uint256 confidence,
        string reasoning
    );
    
    event CrossChainMarketResolved(
        uint256 indexed marketId,
        uint64 indexed sourceChain,
        bool outcome,
        uint256 totalVolume,
        uint256 resolutionTime,
        string evidence
    );

    error UnsupportedChain(uint64 chainSelector);
    error InsufficientLiquidity();
    error UnauthorizedAgent();
    error InvalidBridgeAmount();

    constructor(
        address _router,
        address _bridgeToken,
        address _liquidityPool
    ) CCIPReceiver(_router) ConfirmedOwner(msg.sender) {
        bridgeToken = IERC20(_bridgeToken);
        liquidityPool = _liquidityPool;
    }

    /**
     * @dev Create a cross-chain market link
     */
    function createCrossChainMarket(
        uint256 _localMarketId,
        uint256 _remoteMarketId,
        uint64 _remoteChainSelector
    ) external onlyOwner {
        require(supportedChains[_remoteChainSelector], "Unsupported chain");
        
        crossChainMarkets[_localMarketId] = CrossChainMarket({
            localMarketId: _localMarketId,
            remoteMarketId: _remoteMarketId,
            remoteChainSelector: _remoteChainSelector,
            remoteContract: chainContracts[_remoteChainSelector],
            totalLiquidity: 0,
            active: true
        });

        emit CrossChainMarketCreated(_localMarketId, _remoteMarketId, _remoteChainSelector);
    }

    /**
     * @dev Bridge liquidity to another chain
     */
    function bridgeLiquidity(
        uint256 _amount,
        uint64 _destinationChain,
        address _receiver
    ) external payable nonReentrant whenNotPaused returns (bytes32 bridgeId) {
        require(supportedChains[_destinationChain], "Unsupported destination chain");
        require(_amount > 0, "Invalid amount");
        
        // Transfer tokens from user
        bridgeToken.transferFrom(msg.sender, address(this), _amount);
        
        // Calculate fees
        uint256 fee = (_amount * bridgeFee) / 10000;
        uint256 bridgedAmount = _amount - fee;
        
        // Generate bridge ID
        bridgeId = keccak256(abi.encodePacked(msg.sender, _amount, block.timestamp, nextBridgeId++));
        
        // Store bridge request
        liquidityBridges[bridgeId] = LiquidityBridge({
            user: msg.sender,
            amount: bridgedAmount,
            sourceChain: _getChainSelector(),
            destinationChain: _destinationChain,
            timestamp: block.timestamp,
            completed: false
        });

        // Prepare CCIP message
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(chainContracts[_destinationChain]),
            data: abi.encode(MessageType.LIQUIDITY_BRIDGE, abi.encode(bridgeId, _receiver, bridgedAmount)),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: "",
            feeToken: address(0) // Pay in native token
        });

        // Send cross-chain message
        bytes32 messageId = IRouterClient(i_ccipRouter).ccipSend{value: msg.value}(
            _destinationChain,
            message
        );

        emit LiquidityBridgeInitiated(bridgeId, msg.sender, _amount, _getChainSelector(), _destinationChain);
        emit CrossChainMessageSent(messageId, _destinationChain, MessageType.LIQUIDITY_BRIDGE);
        
        return bridgeId;
    }

    /**
     * @dev Sync market data across chains
     */
    function syncMarketData(
        uint256 _marketId,
        uint64 _destinationChain,
        bytes memory _marketData
    ) external payable onlyAuthorizedAgent {
        require(supportedChains[_destinationChain], "Unsupported destination chain");
        
        // Prepare CCIP message
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(chainContracts[_destinationChain]),
            data: abi.encode(MessageType.MARKET_SYNC, abi.encode(_marketId, _marketData)),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: "",
            feeToken: address(0)
        });

        // Send cross-chain message
        bytes32 messageId = IRouterClient(i_ccipRouter).ccipSend{value: msg.value}(
            _destinationChain,
            message
        );

        emit CrossChainMessageSent(messageId, _destinationChain, MessageType.MARKET_SYNC);
    }

    /**
     * @dev Send agent coordination message
     */
    function sendAgentCoordination(
        uint64 _destinationChain,
        uint256 _marketId,
        bytes memory _coordinationData
    ) external payable onlyAuthorizedAgent {
        require(supportedChains[_destinationChain], "Unsupported destination chain");
        
        // Prepare CCIP message
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(chainContracts[_destinationChain]),
            data: abi.encode(MessageType.AGENT_COORDINATION, abi.encode(_marketId, msg.sender, _coordinationData)),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: "",
            feeToken: address(0)
        });

        // Send cross-chain message
        bytes32 messageId = IRouterClient(i_ccipRouter).ccipSend{value: msg.value}(
            _destinationChain,
            message
        );

        emit CrossChainMessageSent(messageId, _destinationChain, MessageType.AGENT_COORDINATION);
    }

    /**
     * @dev Sync market resolution across chains
     */
    function syncMarketResolution(
        uint256 _marketId,
        uint64 _destinationChain,
        bool _outcome,
        bytes memory _resolutionData
    ) external payable onlyOwner {
        require(supportedChains[_destinationChain], "Unsupported destination chain");
        
        // Prepare CCIP message
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(chainContracts[_destinationChain]),
            data: abi.encode(MessageType.RESOLUTION_SYNC, abi.encode(_marketId, _outcome, _resolutionData)),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: "",
            feeToken: address(0)
        });

        // Send cross-chain message
        bytes32 messageId = IRouterClient(i_ccipRouter).ccipSend{value: msg.value}(
            _destinationChain,
            message
        );

        emit CrossChainMessageSent(messageId, _destinationChain, MessageType.RESOLUTION_SYNC);
    }

    /**
     * @dev Handle received CCIP messages
     */
    function _ccipReceive(Client.Any2EVMMessage memory message) internal override {
        uint64 sourceChain = message.sourceChainSelector;
        bytes32 messageId = message.messageId;
        
        // Decode message type and data
        (MessageType messageType, bytes memory data) = abi.decode(message.data, (MessageType, bytes));
        
        if (messageType == MessageType.LIQUIDITY_BRIDGE) {
            _handleLiquidityBridge(data, sourceChain);
        } else if (messageType == MessageType.MARKET_SYNC) {
            _handleMarketSync(data, sourceChain);
        } else if (messageType == MessageType.AGENT_COORDINATION) {
            _handleAgentCoordination(data, sourceChain);
        } else if (messageType == MessageType.RESOLUTION_SYNC) {
            _handleResolutionSync(data, sourceChain);
        }

        emit CrossChainMessageReceived(messageId, sourceChain, messageType);
    }

    /**
     * @dev Handle liquidity bridge completion
     */
    function _handleLiquidityBridge(bytes memory data, uint64 sourceChain) internal {
        (bytes32 bridgeId, address receiver, uint256 amount) = abi.decode(data, (bytes32, address, uint256));
        
        // Mint or transfer tokens to receiver
        bridgeToken.transfer(receiver, amount);
        
        emit LiquidityBridgeCompleted(bridgeId, receiver, amount);
    }

    /**
     * @dev Handle market data sync
     */
    function _handleMarketSync(bytes memory data, uint64 sourceChain) internal {
        (uint256 marketId, bytes memory marketData) = abi.decode(data, (uint256, bytes));
        
        // Decode market sync data (totalVolume, avgPrice, sentiment)
        (uint256 totalVolume, uint256 avgPrice, int256 sentiment) = abi.decode(marketData, (uint256, uint256, int256));
        
        // Store cross-chain market data for this market
        CrossChainMarket storage market = crossChainMarkets[marketId];
        if (market.active) {
            market.totalLiquidity = totalVolume;
            
            // Emit event for external systems to process
            emit CrossChainMarketSynced(marketId, sourceChain, totalVolume, avgPrice, sentiment);
        }
    }

    /**
     * @dev Handle agent coordination
     */
    function _handleAgentCoordination(bytes memory data, uint64 sourceChain) internal {
        (uint256 marketId, address agent, bytes memory coordinationData) = abi.decode(data, (uint256, address, bytes));
        
        // Decode agent prediction data (prediction, confidence, reasoning)
        (bool prediction, uint256 confidence, string memory reasoning) = abi.decode(coordinationData, (bool, uint256, string));
        
        // Store cross-chain agent prediction
        CrossChainMarket storage market = crossChainMarkets[marketId];
        if (market.active && authorizedAgents[agent]) {
            // Emit event for agent coordination
            emit CrossChainAgentPrediction(marketId, sourceChain, agent, prediction, confidence, reasoning);
        }
    }

    /**
     * @dev Handle resolution sync
     */
    function _handleResolutionSync(bytes memory data, uint64 sourceChain) internal {
        (uint256 marketId, bool outcome, bytes memory resolutionData) = abi.decode(data, (uint256, bool, bytes));
        
        // Decode resolution metadata (totalVolume, timestamp, evidence)
        (uint256 totalVolume, uint256 resolutionTime, string memory evidence) = abi.decode(resolutionData, (uint256, uint256, string));
        
        // Update cross-chain market resolution
        CrossChainMarket storage market = crossChainMarkets[marketId];
        if (market.active) {
            market.totalLiquidity = totalVolume;
            
            // Emit event for cross-chain resolution
            emit CrossChainMarketResolved(marketId, sourceChain, outcome, totalVolume, resolutionTime, evidence);
        }
    }

    /**
     * @dev Calculate CCIP fees
     */
    function calculateCCIPFee(
        uint64 _destinationChain,
        bytes memory _data
    ) external view returns (uint256 fee) {
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(chainContracts[_destinationChain]),
            data: _data,
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: "",
            feeToken: address(0)
        });

        fee = IRouterClient(i_ccipRouter).getFee(_destinationChain, message);
    }

    /**
     * @dev Get current chain selector
     */
    function _getChainSelector() internal view returns (uint64) {
        if (block.chainid == 1) return 5009297550715157269; // Ethereum
        if (block.chainid == 137) return 4051577828743386545; // Polygon
        if (block.chainid == 42161) return 4949039107694359620; // Arbitrum
        if (block.chainid == 8453) return 15971525489660198786; // Base
        revert("Unsupported chain");
    }

    /**
     * @dev Add supported chain
     */
    function addSupportedChain(uint64 _chainSelector, address _contractAddress) external onlyOwner {
        supportedChains[_chainSelector] = true;
        chainContracts[_chainSelector] = _contractAddress;
    }

    /**
     * @dev Remove supported chain
     */
    function removeSupportedChain(uint64 _chainSelector) external onlyOwner {
        supportedChains[_chainSelector] = false;
        delete chainContracts[_chainSelector];
    }

    /**
     * @dev Authorize agent
     */
    function setAuthorizedAgent(address _agent, bool _authorized) external onlyOwner {
        authorizedAgents[_agent] = _authorized;
    }

    /**
     * @dev Update bridge fee
     */
    function setBridgeFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "Fee too high"); // Max 10%
        bridgeFee = _fee;
    }

    /**
     * @dev Update liquidity pool
     */
    function setLiquidityPool(address _pool) external onlyOwner {
        liquidityPool = _pool;
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
     * @dev Withdraw native tokens
     */
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(owner()).transfer(balance);
        }
    }

    /**
     * @dev Withdraw ERC20 tokens
     */
    function withdrawTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }

    /**
     * @dev Get cross-chain market info
     */
    function getCrossChainMarket(uint256 _marketId) external view returns (CrossChainMarket memory) {
        return crossChainMarkets[_marketId];
    }

    /**
     * @dev Get liquidity bridge info
     */
    function getLiquidityBridge(bytes32 _bridgeId) external view returns (LiquidityBridge memory) {
        return liquidityBridges[_bridgeId];
    }

    modifier onlyAuthorizedAgent() {
        if (!authorizedAgents[msg.sender] && msg.sender != owner()) {
            revert UnauthorizedAgent();
        }
        _;
    }

    // Allow contract to receive native tokens for CCIP fees
    receive() external payable {}
} 
 