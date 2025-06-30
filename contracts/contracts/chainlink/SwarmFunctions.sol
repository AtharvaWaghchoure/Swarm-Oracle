// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SwarmFunctions
 * @dev Chainlink Functions integration for external data aggregation
 */
contract SwarmFunctions is FunctionsClient, ConfirmedOwner, ReentrancyGuard {
    using FunctionsRequest for FunctionsRequest.Request;

    struct DataRequest {
        uint256 requestId;
        string dataType; // "twitter_sentiment", "news_sentiment", "market_data"
        string[] parameters;
        uint256 timestamp;
        address requester;
        bool fulfilled;
    }

    struct SentimentData {
        int256 score; // -10000 to 10000 (-100.00% to 100.00%)
        uint256 volume; // Number of mentions/articles
        uint256 timestamp;
        string source; // "twitter", "reddit", "news"
    }

    struct MarketData {
        uint256 price; // In wei (scaled)
        uint256 volume24h;
        int256 priceChange24h; // -10000 to 10000 (-100.00% to 100.00%)
        uint256 timestamp;
        string asset; // "BTC", "ETH", etc.
    }

    // State variables
    mapping(bytes32 => DataRequest) public dataRequests;
    mapping(string => SentimentData) public sentimentData; // key: "twitter_BTC", "news_ETH"
    mapping(string => MarketData) public marketData; // key: "BTC", "ETH"
    mapping(address => bool) public authorizedCallers;

    bytes32 public donId;
    uint64 public subscriptionId;
    uint32 public gasLimit = 300000;

    // JavaScript source code for different data types
    string public twitterSentimentSource;
    string public newsSentimentSource;
    string public marketDataSource;

    // Events
    event DataRequested(
        bytes32 indexed requestId,
        string dataType,
        string[] parameters,
        address requester
    );
    
    event DataFulfilled(
        bytes32 indexed requestId,
        string dataType,
        bytes response
    );
    
    event SentimentUpdated(
        string indexed key,
        int256 score,
        uint256 volume,
        string source
    );
    
    event MarketDataUpdated(
        string indexed asset,
        uint256 price,
        uint256 volume24h,
        int256 priceChange24h
    );

    error UnauthorizedCaller();
    error InvalidDataType();
    error RequestNotFound();

    constructor(
        address router,
        bytes32 _donId,
        uint64 _subscriptionId
    ) FunctionsClient(router) ConfirmedOwner(msg.sender) {
        donId = _donId;
        subscriptionId = _subscriptionId;
        
        // Initialize JavaScript source codes
        _initializeSourceCodes();
    }

    /**
     * @dev Initialize JavaScript source codes for different data types
     */
    function _initializeSourceCodes() internal {
        // Real Twitter/X sentiment analysis using official API
        twitterSentimentSource = 
            "const bearerToken = secrets.twitterBearerToken;"
            "const asset = args[0];"
            "const query = `${asset} (crypto OR cryptocurrency) -is:retweet lang:en`;"
            ""
            "const response = await Functions.makeHttpRequest({"
            "  url: 'https://api.twitter.com/2/tweets/search/recent',"
            "  method: 'GET',"
            "  headers: { 'Authorization': `Bearer ${bearerToken}` },"
            "  params: {"
            "    'query': query,"
            "    'max_results': 100,"
            "    'tweet.fields': 'public_metrics,created_at,context_annotations'"
            "  }"
            "});"
            ""
            "if (!response.data || !response.data.data) {"
            "  return Functions.encodeUint256(0) + Functions.encodeUint256(0);"
            "}"
            ""
            "let sentiment = 0;"
            "let totalEngagement = 0;"
            "const tweets = response.data.data;"
            ""
            "for (const tweet of tweets) {"
            "  const text = tweet.text.toLowerCase();"
            "  const metrics = tweet.public_metrics;"
            "  const engagement = metrics.retweet_count + metrics.like_count + metrics.reply_count;"
            "  "
            "  // Weighted sentiment based on engagement"
            "  let tweetSentiment = 0;"
            "  if (text.match(/\\b(moon|bullish|pump|rally|surge|green|up|buy|hodl|diamond)\\b/g)) tweetSentiment += 2;"
            "  if (text.match(/\\b(bear|dump|crash|red|down|sell|rekt|liquidat)\\b/g)) tweetSentiment -= 2;"
            "  if (text.match(/\\b(good|great|amazing|excellent|positive)\\b/g)) tweetSentiment += 1;"
            "  if (text.match(/\\b(bad|terrible|awful|negative|worried)\\b/g)) tweetSentiment -= 1;"
            "  "
            "  sentiment += tweetSentiment * Math.log(engagement + 1);"
            "  totalEngagement += engagement;"
            "}"
            ""
            "const normalizedSentiment = tweets.length > 0 ? Math.round((sentiment / tweets.length) * 1000) : 0;"
            "const volumeScore = Math.min(tweets.length * 10, 10000);"
            ""
            "return Functions.encodeUint256(Math.max(-10000, Math.min(10000, normalizedSentiment))) + "
            "       Functions.encodeUint256(volumeScore);";

        // Real News sentiment analysis using NewsAPI
        newsSentimentSource = 
            "const apiKey = secrets.newsApiKey;"
            "const asset = args[0];"
            "const query = `${asset} AND (cryptocurrency OR crypto OR blockchain)`;"
            ""
            "const response = await Functions.makeHttpRequest({"
            "  url: 'https://newsapi.org/v2/everything',"
            "  method: 'GET',"
            "  params: {"
            "    'q': query,"
            "    'language': 'en',"
            "    'sortBy': 'publishedAt',"
            "    'pageSize': 50,"
            "    'apiKey': apiKey"
            "  }"
            "});"
            ""
            "if (!response.data || !response.data.articles) {"
            "  return Functions.encodeUint256(0) + Functions.encodeUint256(0);"
            "}"
            ""
            "let sentiment = 0;"
            "let totalScore = 0;"
            "const articles = response.data.articles;"
            ""
            "for (const article of articles) {"
            "  const title = (article.title || '').toLowerCase();"
            "  const description = (article.description || '').toLowerCase();"
            "  const content = title + ' ' + description;"
            "  "
            "  let articleSentiment = 0;"
            "  // Positive indicators"
            "  if (content.match(/\\b(surge|rally|gains?|rise|bull|positive|growth|adoption|breakthrough)\\b/g)) articleSentiment += 3;"
            "  if (content.match(/\\b(increase|up|high|strong|optimistic|bullish)\\b/g)) articleSentiment += 2;"
            "  if (content.match(/\\b(good|better|improved|promising|potential)\\b/g)) articleSentiment += 1;"
            "  "
            "  // Negative indicators"
            "  if (content.match(/\\b(crash|plunge|dump|bear|collapse|fraud|hack|banned?)\\b/g)) articleSentiment -= 3;"
            "  if (content.match(/\\b(fall|drop|decline|down|weak|concern|risk)\\b/g)) articleSentiment -= 2;"
            "  if (content.match(/\\b(bad|worse|negative|warning|volatile)\\b/g)) articleSentiment -= 1;"
            "  "
            "  // Weight by source credibility (rough heuristic)"
            "  const source = (article.source.name || '').toLowerCase();"
            "  let weight = 1;"
            "  if (source.includes('reuters') || source.includes('bloomberg') || source.includes('wsj')) weight = 2;"
            "  if (source.includes('coindesk') || source.includes('cointelegraph')) weight = 1.5;"
            "  "
            "  sentiment += articleSentiment * weight;"
            "  totalScore += Math.abs(articleSentiment) * weight;"
            "}"
            ""
            "const normalizedSentiment = totalScore > 0 ? Math.round((sentiment / totalScore) * 10000) : 0;"
            "const volumeScore = Math.min(articles.length * 20, 10000);"
            ""
            "return Functions.encodeUint256(Math.max(-10000, Math.min(10000, normalizedSentiment))) + "
            "       Functions.encodeUint256(volumeScore);";

        // Real Market data using CoinGecko API (free tier)
        marketDataSource = 
            "const asset = args[0];"
            "let coinId;"
            "if (asset === 'BTC') coinId = 'bitcoin';"
            "else if (asset === 'ETH') coinId = 'ethereum';"
            "else if (asset === 'LINK') coinId = 'chainlink';"
            "else if (asset === 'UNI') coinId = 'uniswap';"
            "else coinId = asset.toLowerCase();"
            ""
            "// Get current price and 24h data"
            "const priceResponse = await Functions.makeHttpRequest({"
            "  url: `https://api.coingecko.com/api/v3/simple/price`,"
            "  method: 'GET',"
            "  params: {"
            "    'ids': coinId,"
            "    'vs_currencies': 'usd',"
            "    'include_24hr_vol': 'true',"
            "    'include_24hr_change': 'true',"
            "    'include_market_cap': 'true'"
            "  }"
            "});"
            ""
            "if (!priceResponse.data || !priceResponse.data[coinId]) {"
            "  throw new Error('Price data not found for ' + asset);"
            "}"
            ""
            "const data = priceResponse.data[coinId];"
            "const currentPrice = data.usd;"
            "const volume24h = data.usd_24h_vol || 0;"
            "const priceChange24h = data.usd_24h_change || 0;"
            ""
            "// Convert to contract format"
            "const priceWei = Math.round(currentPrice * 1e18);"
            "const volumeWei = Math.round(volume24h * 1e18);"
            "const priceChangeBps = Math.round(priceChange24h * 100); // basis points"
            ""
            "return Functions.encodeUint256(priceWei) + "
            "       Functions.encodeUint256(volumeWei) + "
            "       Functions.encodeInt256(priceChangeBps);";
    }

    /**
     * @dev Request Twitter sentiment data
     */
    function requestTwitterSentiment(string[] calldata assets) external onlyAuthorized returns (bytes32 requestId) {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(twitterSentimentSource);
        req.setArgs(assets);
        req.addSecretsReference("twitter");

        requestId = _sendRequest(req.encodeCBOR(), subscriptionId, gasLimit, donId);
        
        dataRequests[requestId] = DataRequest({
            requestId: uint256(requestId),
            dataType: "twitter_sentiment",
            parameters: assets,
            timestamp: block.timestamp,
            requester: msg.sender,
            fulfilled: false
        });

        emit DataRequested(requestId, "twitter_sentiment", assets, msg.sender);
        return requestId;
    }

    /**
     * @dev Request news sentiment data
     */
    function requestNewsSentiment(string[] calldata assets) external onlyAuthorized returns (bytes32 requestId) {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(newsSentimentSource);
        req.setArgs(assets);
        req.addSecretsReference("news");

        requestId = _sendRequest(req.encodeCBOR(), subscriptionId, gasLimit, donId);
        
        dataRequests[requestId] = DataRequest({
            requestId: uint256(requestId),
            dataType: "news_sentiment",
            parameters: assets,
            timestamp: block.timestamp,
            requester: msg.sender,
            fulfilled: false
        });

        emit DataRequested(requestId, "news_sentiment", assets, msg.sender);
        return requestId;
    }

    /**
     * @dev Request market data
     */
    function requestMarketData(string[] calldata assets) external onlyAuthorized returns (bytes32 requestId) {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(marketDataSource);
        req.setArgs(assets);
        // No secrets needed for CoinGecko free tier

        requestId = _sendRequest(req.encodeCBOR(), subscriptionId, gasLimit, donId);
        
        dataRequests[requestId] = DataRequest({
            requestId: uint256(requestId),
            dataType: "market_data",
            parameters: assets,
            timestamp: block.timestamp,
            requester: msg.sender,
            fulfilled: false
        });

        emit DataRequested(requestId, "market_data", assets, msg.sender);
        return requestId;
    }

    /**
     * @dev Chainlink Functions callback
     */
    function fulfillRequest(bytes32 requestId, bytes memory response, bytes memory err) internal override {
        DataRequest storage request = dataRequests[requestId];
        if (request.timestamp == 0) {
            revert RequestNotFound();
        }

        request.fulfilled = true;

        if (err.length > 0) {
            // Handle error
            return;
        }

        // Process response based on data type
        if (keccak256(abi.encodePacked(request.dataType)) == keccak256(abi.encodePacked("twitter_sentiment"))) {
            _processSentimentResponse(response, request.parameters[0], "twitter");
        } else if (keccak256(abi.encodePacked(request.dataType)) == keccak256(abi.encodePacked("news_sentiment"))) {
            _processSentimentResponse(response, request.parameters[0], "news");
        } else if (keccak256(abi.encodePacked(request.dataType)) == keccak256(abi.encodePacked("market_data"))) {
            _processMarketDataResponse(response, request.parameters[0]);
        }

        emit DataFulfilled(requestId, request.dataType, response);
    }

    /**
     * @dev Process sentiment response
     */
    function _processSentimentResponse(bytes memory response, string memory asset, string memory source) internal {
        if (response.length >= 64) {
            (int256 sentiment, uint256 volume) = abi.decode(response, (int256, uint256));
            
            string memory key = string(abi.encodePacked(source, "_", asset));
            sentimentData[key] = SentimentData({
                score: sentiment,
                volume: volume,
                timestamp: block.timestamp,
                source: source
            });

            emit SentimentUpdated(key, sentiment, volume, source);
        }
    }

    /**
     * @dev Process market data response
     */
    function _processMarketDataResponse(bytes memory response, string memory asset) internal {
        if (response.length >= 96) {
            (uint256 price, uint256 volume, int256 priceChange) = abi.decode(response, (uint256, uint256, int256));
            
            marketData[asset] = MarketData({
                price: price,
                volume24h: volume,
                priceChange24h: priceChange,
                timestamp: block.timestamp,
                asset: asset
            });

            emit MarketDataUpdated(asset, price, volume, priceChange);
        }
    }

    /**
     * @dev Get sentiment data
     */
    function getSentimentData(string memory source, string memory asset) external view returns (SentimentData memory) {
        string memory key = string(abi.encodePacked(source, "_", asset));
        return sentimentData[key];
    }

    /**
     * @dev Get market data
     */
    function getMarketData(string memory asset) external view returns (MarketData memory) {
        return marketData[asset];
    }

    /**
     * @dev Get aggregated sentiment score
     */
    function getAggregatedSentiment(string memory asset) external view returns (int256 score, uint256 totalVolume) {
        SentimentData memory twitterData = sentimentData[string(abi.encodePacked("twitter_", asset))];
        SentimentData memory newsData = sentimentData[string(abi.encodePacked("news_", asset))];
        
        // Weight: Twitter 40%, News 60%
        uint256 twitterWeight = 4000;
        uint256 newsWeight = 6000;
        
        score = (twitterData.score * int256(twitterWeight) + newsData.score * int256(newsWeight)) / 10000;
        totalVolume = twitterData.volume + newsData.volume;
    }

    /**
     * @dev Authorize caller
     */
    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        authorizedCallers[caller] = authorized;
    }

    /**
     * @dev Update JavaScript source codes
     */
    function updateSourceCode(string memory dataType, string memory newSource) external onlyOwner {
        if (keccak256(abi.encodePacked(dataType)) == keccak256(abi.encodePacked("twitter_sentiment"))) {
            twitterSentimentSource = newSource;
        } else if (keccak256(abi.encodePacked(dataType)) == keccak256(abi.encodePacked("news_sentiment"))) {
            newsSentimentSource = newSource;
        } else if (keccak256(abi.encodePacked(dataType)) == keccak256(abi.encodePacked("market_data"))) {
            marketDataSource = newSource;
        } else {
            revert InvalidDataType();
        }
    }

    /**
     * @dev Update subscription settings
     */
    function updateSubscription(uint64 _subscriptionId, uint32 _gasLimit) external onlyOwner {
        subscriptionId = _subscriptionId;
        gasLimit = _gasLimit;
    }

    modifier onlyAuthorized() {
        if (!authorizedCallers[msg.sender] && msg.sender != owner()) {
            revert UnauthorizedCaller();
        }
        _;
    }
} 
 