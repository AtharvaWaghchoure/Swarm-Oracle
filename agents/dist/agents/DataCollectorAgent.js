import axios from 'axios';
import { ethers } from 'ethers';
import { BaseAgent } from './BaseAgent.js';
import { logger } from '../utils/logger.js';
/**
 * Data Collector Agent - Specializes in gathering data from various sources
 */
export class DataCollectorAgent extends BaseAgent {
    config;
    providers = new Map();
    collectionInterval;
    constructor(options) {
        super(options.id, options.type, options.coordinator);
        this.config = options.config;
        this.initializeClients();
    }
    /**
     * Initialize API clients based on agent type
     */
    initializeClients() {
        switch (this.type) {
            case 'onchain':
                if (this.config.rpcs) {
                    for (const [chain, rpc] of Object.entries(this.config.rpcs)) {
                        this.providers.set(chain, new ethers.JsonRpcProvider(rpc));
                    }
                }
                break;
            case 'twitter':
            case 'reddit':
            case 'news':
                // These now use RAPIDAPI or direct HTTP requests
                logger.info(`${this.id}: Initialized for ${this.type} data collection via API`);
                break;
        }
    }
    /**
     * Start data collection
     */
    async start() {
        await super.start();
        // Start periodic data collection
        this.collectionInterval = setInterval(() => this.collectData(), this.config.collectInterval);
        // Initial data collection
        await this.collectData();
    }
    /**
     * Stop data collection
     */
    async stop() {
        if (this.collectionInterval) {
            clearInterval(this.collectionInterval);
        }
        await super.stop();
    }
    /**
     * Main data collection method
     */
    async collectData() {
        try {
            let data = [];
            switch (this.type) {
                case 'twitter':
                    data = await this.collectTwitterData();
                    break;
                case 'reddit':
                    data = await this.collectRedditData();
                    break;
                case 'news':
                    data = await this.collectNewsData();
                    break;
                case 'onchain':
                    data = await this.collectOnChainData();
                    break;
            }
            // Process and store collected data
            for (const item of data) {
                await this.processCollectedData(item);
            }
            logger.info(`${this.id}: Collected ${data.length} data points`);
        }
        catch (error) {
            logger.error(`${this.id}: Error collecting data:`, error);
        }
    }
    /**
     * Collect Twitter sentiment data using RAPIDAPI
     */
    async collectTwitterData() {
        if (!this.config.apiKey)
            return []; // RAPIDAPI key
        const collectedData = [];
        for (const topic of this.config.topics || []) {
            try {
                // Using RAPIDAPI Twitter endpoint
                const response = await axios.get('https://twitter154.p.rapidapi.com/search/search', {
                    params: {
                        query: `${topic} crypto cryptocurrency trading`,
                        limit: '50',
                        language: 'en'
                    },
                    headers: {
                        'X-RapidAPI-Key': this.config.apiKey,
                        'X-RapidAPI-Host': 'twitter154.p.rapidapi.com'
                    }
                });
                const tweets = response.data?.results || [];
                let sentimentScore = 0;
                let totalEngagement = 0;
                const processedTweets = [];
                for (const tweet of tweets) {
                    const sentiment = this.analyzeSentiment(tweet.text || '');
                    const engagement = (tweet.favorite_count || 0) +
                        (tweet.retweet_count || 0) +
                        (tweet.reply_count || 0);
                    sentimentScore += sentiment * (1 + Math.log(engagement + 1));
                    totalEngagement += engagement;
                    processedTweets.push({
                        text: tweet.text,
                        sentiment,
                        engagement,
                        created_at: tweet.created_at
                    });
                }
                const normalizedSentiment = processedTweets.length > 0
                    ? sentimentScore / processedTweets.length
                    : 0;
                collectedData.push({
                    source: 'twitter',
                    type: 'sentiment',
                    timestamp: Date.now(),
                    data: {
                        topic,
                        sentiment: normalizedSentiment,
                        volume: processedTweets.length,
                        engagement: totalEngagement,
                        tweets: processedTweets.slice(0, 10)
                    },
                    confidence: Math.min(processedTweets.length / 50, 1),
                    metadata: { source: 'rapidapi-twitter' }
                });
            }
            catch (error) {
                logger.error(`Error collecting Twitter data for ${topic}:`, error);
            }
        }
        return collectedData;
    }
    /**
     * Collect Reddit sentiment data using RAPIDAPI
     */
    async collectRedditData() {
        if (!this.config.apiKey)
            return []; // RAPIDAPI key
        const collectedData = [];
        for (const subreddit of this.config.subreddits || []) {
            try {
                // Using RAPIDAPI Reddit endpoint
                const response = await axios.get('https://reddit34.p.rapidapi.com/getSubredditPosts', {
                    params: {
                        subreddit: subreddit,
                        sort: 'hot',
                        limit: '50'
                    },
                    headers: {
                        'X-RapidAPI-Key': this.config.apiKey,
                        'X-RapidAPI-Host': 'reddit34.p.rapidapi.com'
                    }
                });
                const posts = response.data?.data?.children || [];
                let sentimentScore = 0;
                let totalScore = 0;
                const processedPosts = [];
                for (const postWrapper of posts) {
                    const post = postWrapper.data;
                    const content = `${post.title} ${post.selftext || ''}`;
                    const sentiment = this.analyzeSentiment(content);
                    const score = post.score || 0;
                    sentimentScore += sentiment * (1 + Math.log(Math.abs(score) + 1));
                    totalScore += score;
                    processedPosts.push({
                        title: post.title,
                        content: post.selftext,
                        sentiment,
                        score,
                        comments: post.num_comments,
                        created: post.created_utc
                    });
                }
                const normalizedSentiment = processedPosts.length > 0
                    ? sentimentScore / processedPosts.length
                    : 0;
                collectedData.push({
                    source: 'reddit',
                    type: 'sentiment',
                    timestamp: Date.now(),
                    data: {
                        subreddit,
                        sentiment: normalizedSentiment,
                        volume: processedPosts.length,
                        totalScore,
                        posts: processedPosts.slice(0, 10)
                    },
                    confidence: Math.min(processedPosts.length / 50, 1),
                    metadata: { source: 'rapidapi-reddit' }
                });
            }
            catch (error) {
                logger.error(`Error collecting Reddit data for ${subreddit}:`, error);
            }
        }
        return collectedData;
    }
    /**
     * Collect news sentiment data
     */
    async collectNewsData() {
        if (!this.config.apiKey)
            return [];
        const collectedData = [];
        const topics = this.config.topics || ['cryptocurrency', 'bitcoin', 'ethereum'];
        for (const topic of topics) {
            try {
                const response = await axios.get('https://newsapi.org/v2/everything', {
                    params: {
                        q: `${topic} cryptocurrency`,
                        language: 'en',
                        sortBy: 'publishedAt',
                        pageSize: 50,
                        apiKey: this.config.apiKey
                    }
                });
                const articles = response.data.articles || [];
                let sentimentScore = 0;
                const processedArticles = [];
                for (const article of articles) {
                    const text = (article.title || '') + ' ' + (article.description || '');
                    const sentiment = this.analyzeSentiment(text);
                    sentimentScore += sentiment;
                    processedArticles.push({
                        title: article.title,
                        description: article.description,
                        source: article.source.name,
                        sentiment,
                        publishedAt: article.publishedAt,
                        url: article.url
                    });
                }
                const normalizedSentiment = processedArticles.length > 0
                    ? sentimentScore / processedArticles.length
                    : 0;
                collectedData.push({
                    source: 'news',
                    type: 'sentiment',
                    timestamp: Date.now(),
                    data: {
                        topic,
                        sentiment: normalizedSentiment,
                        volume: processedArticles.length,
                        articles: processedArticles.slice(0, 10)
                    },
                    confidence: Math.min(0.9, 0.3 + (processedArticles.length / 50) * 0.6),
                    metadata: {
                        collection_method: 'news_api',
                        sources: this.config.sources
                    }
                });
            }
            catch (error) {
                logger.error(`Error collecting news data for ${topic}:`, error);
            }
        }
        return collectedData;
    }
    /**
     * Collect on-chain data
     */
    async collectOnChainData() {
        const collectedData = [];
        for (const [chainName, provider] of this.providers) {
            try {
                // Get latest block
                const latestBlock = await provider.getBlock('latest');
                // Get gas price
                const gasPrice = await provider.getFeeData();
                // Get network info
                const network = await provider.getNetwork();
                collectedData.push({
                    source: 'onchain',
                    type: 'volume',
                    timestamp: Date.now(),
                    data: {
                        chain: chainName,
                        blockNumber: latestBlock?.number,
                        gasPrice: gasPrice.gasPrice?.toString(),
                        baseFee: gasPrice.lastBaseFeePerGas?.toString() || '0',
                        timestamp: latestBlock?.timestamp,
                        transactionCount: latestBlock?.transactions.length
                    },
                    confidence: 0.95,
                    metadata: {
                        collection_method: 'ethereum_provider',
                        network_name: network.name,
                        chain_id: network.chainId.toString()
                    }
                });
                // Collect contract-specific data if contracts are configured
                if (this.config.contracts) {
                    for (const contractAddress of this.config.contracts) {
                        const code = await provider.getCode(contractAddress);
                        if (code !== '0x') {
                            const balance = await provider.getBalance(contractAddress);
                            collectedData.push({
                                source: 'onchain',
                                type: 'volume',
                                timestamp: Date.now(),
                                data: {
                                    chain: chainName,
                                    contract: contractAddress,
                                    balance: balance.toString(),
                                    hasCode: true
                                },
                                confidence: 0.98,
                                metadata: {
                                    collection_method: 'contract_analysis'
                                }
                            });
                        }
                    }
                }
            }
            catch (error) {
                logger.error(`Error collecting on-chain data for ${chainName}:`, error);
            }
        }
        return collectedData;
    }
    /**
     * Simple sentiment analysis
     */
    analyzeSentiment(text) {
        const lowerText = text.toLowerCase();
        const positiveWords = [
            'bullish', 'moon', 'pump', 'rise', 'up', 'gain', 'profit', 'buy',
            'surge', 'rally', 'breakthrough', 'adoption', 'positive', 'optimistic',
            'strong', 'support', 'breakthrough', 'milestone'
        ];
        const negativeWords = [
            'bearish', 'dump', 'crash', 'fall', 'down', 'loss', 'sell', 'drop',
            'decline', 'plunge', 'negative', 'pessimistic', 'weak', 'resistance',
            'correction', 'bubble', 'risk', 'concern'
        ];
        let score = 0;
        const words = lowerText.split(/\s+/);
        for (const word of words) {
            if (positiveWords.includes(word))
                score += 1;
            if (negativeWords.includes(word))
                score -= 1;
        }
        // Normalize to -1 to 1 range
        return Math.tanh(score / Math.max(words.length / 10, 1));
    }
    /**
     * Process collected data and send to coordinator
     */
    async processCollectedData(data) {
        // Store in agent's local memory
        await this.storeMemory({
            type: 'data_collection',
            data: {
                source: data.source,
                timestamp: data.timestamp,
                confidence: data.confidence,
                summary: this.summarizeData(data)
            }
        });
    }
    /**
     * Summarize collected data for memory storage
     */
    summarizeData(data) {
        switch (data.type) {
            case 'sentiment':
                return `Collected ${data.source} sentiment: ${data.data.sentiment.toFixed(3)} with ${data.data.volume} items`;
            case 'volume':
                if (data.source === 'onchain') {
                    return `On-chain data: Block ${data.data.blockNumber} with ${data.data.transactionCount} transactions`;
                }
                return `Volume data collected from ${data.source}`;
            default:
                return `Data collected from ${data.source}`;
        }
    }
    /**
     * Get agent performance metrics
     */
    getMetrics() {
        return {
            ...super.getMetrics(),
            collectInterval: this.config.collectInterval,
            sources: this.getActiveSources(),
            lastCollection: this.lastActivityTime
        };
    }
    /**
     * Get active data sources
     */
    getActiveSources() {
        const sources = [];
        if (this.config.apiKey) {
            if (this.type === 'twitter')
                sources.push('twitter');
            if (this.type === 'reddit')
                sources.push('reddit');
            if (this.type === 'news')
                sources.push('news');
        }
        if (this.providers.size > 0)
            sources.push('onchain');
        return sources;
    }
    /**
     * Process a task from the orchestrator
     */
    async processTask(task) {
        logger.info(`📊 ${this.id} processing task: ${task.type}`);
        try {
            switch (task.type) {
                case 'collect_data':
                    await this.collectData();
                    return {
                        agentId: this.id,
                        taskType: 'data_collection',
                        timestamp: Date.now(),
                        success: true,
                        dataPoints: await this.getRecentCollectedData()
                    };
                default:
                    logger.warn(`Unknown task type: ${task.type}`);
                    return {
                        agentId: this.id,
                        taskType: task.type,
                        timestamp: Date.now(),
                        success: false,
                        error: 'Unknown task type'
                    };
            }
        }
        catch (error) {
            logger.error(`❌ Task processing failed for ${this.id}:`, error);
            return {
                agentId: this.id,
                taskType: task.type,
                timestamp: Date.now(),
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get recent collected data for sharing with other agents
     */
    async getRecentCollectedData() {
        const recentMemories = this.getRecentMemories(5);
        return recentMemories
            .filter(memory => memory.type === 'data_collection')
            .map(memory => memory.data);
    }
}
//# sourceMappingURL=DataCollectorAgent.js.map