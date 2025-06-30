import { BaseAgent } from './BaseAgent.js';
import { logger } from '../utils/logger.js';
export class AnalystAgent extends BaseAgent {
    analysisType;
    specialty;
    analysisConfig;
    constructor(config) {
        super(config.id, config.type, config.coordinator);
        this.analysisType = config.type;
        this.specialty = config.specialty;
        this.analysisConfig = config.config;
    }
    /**
     * Process a task from the orchestrator
     */
    async processTask(task) {
        logger.info(`🔬 ${this.id} processing task: ${task.type}`);
        try {
            switch (task.type) {
                case 'analyze_data':
                    // Extract the actual data array from the task data object
                    let dataArray = [];
                    if (task.data) {
                        if (Array.isArray(task.data)) {
                            dataArray = task.data;
                        }
                        else if (task.data.dataCollection && Array.isArray(task.data.dataCollection)) {
                            dataArray = task.data.dataCollection;
                        }
                        else if (task.data.marketData) {
                            // If marketData is available, wrap it in an array
                            dataArray = [task.data.marketData];
                        }
                    }
                    const analysis = await this.analyzeData(dataArray);
                    return {
                        agentId: this.id,
                        taskType: 'analysis',
                        timestamp: Date.now(),
                        success: true,
                        analysis: analysis
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
            logger.error(`❌ Analysis failed for ${this.id}:`, error);
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
     * Analyze data based on agent's analysis type
     */
    async analyzeData(data) {
        switch (this.analysisType) {
            case 'technical':
                return await this.performTechnicalAnalysis(data);
            case 'fundamental':
                return await this.performFundamentalAnalysis(data);
            case 'sentiment':
                return await this.performSentimentAnalysis(data);
            case 'correlation':
                return await this.performCorrelationAnalysis(data);
            default:
                throw new Error(`Unknown analysis type: ${this.analysisType}`);
        }
    }
    async performTechnicalAnalysis(data) {
        // Find price data from the collected data
        const priceData = data.find(d => d.type === 'price' || d.prices) || { prices: [] };
        const prices = priceData.prices || [];
        if (prices.length === 0) {
            return {
                trend: 'neutral',
                signals: ['No price data available'],
                confidence: 0.1,
                indicators: {
                    rsi: null,
                    macd: null,
                    bollinger: null
                }
            };
        }
        // Simple technical analysis with safe data access
        const recentPrices = prices.slice(-20); // Last 20 data points
        const currentPrice = recentPrices[recentPrices.length - 1]?.price || 0;
        const previousPrice = recentPrices[recentPrices.length - 2]?.price || currentPrice;
        const priceChange = currentPrice - previousPrice;
        const trend = priceChange > 0 ? 'bullish' : priceChange < 0 ? 'bearish' : 'neutral';
        return {
            trend,
            signals: [`Price ${trend} trend detected`],
            confidence: Math.min(Math.abs(priceChange) / currentPrice * 10, 1),
            indicators: {
                rsi: this.calculateRSI(recentPrices),
                macd: this.calculateMACD(recentPrices),
                currentPrice,
                priceChange
            }
        };
    }
    calculateRSI(prices) {
        if (prices.length < 2)
            return 50; // Neutral RSI
        let gains = 0;
        let losses = 0;
        for (let i = 1; i < prices.length; i++) {
            const change = (prices[i]?.price || 0) - (prices[i - 1]?.price || 0);
            if (change > 0)
                gains += change;
            else
                losses += Math.abs(change);
        }
        const avgGain = gains / prices.length;
        const avgLoss = losses / prices.length;
        if (avgLoss === 0)
            return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }
    calculateMACD(prices) {
        if (prices.length < 12)
            return { macd: 0, signal: 0, histogram: 0 };
        // Simplified MACD calculation
        const ema12 = this.calculateEMA(prices, 12);
        const ema26 = this.calculateEMA(prices, 26);
        const macd = ema12 - ema26;
        return { macd, signal: macd * 0.9, histogram: macd * 0.1 };
    }
    calculateEMA(prices, period) {
        if (prices.length === 0)
            return 0;
        const multiplier = 2 / (period + 1);
        let ema = prices[0]?.price || 0;
        for (let i = 1; i < Math.min(prices.length, period); i++) {
            const price = prices[i]?.price || 0;
            ema = (price * multiplier) + (ema * (1 - multiplier));
        }
        return ema;
    }
    async performFundamentalAnalysis(data) {
        // Find fundamental data from collected sources
        const newsData = data.filter(d => d.type === 'news');
        const economicData = data.filter(d => d.type === 'economic');
        const fundamentalScore = this.calculateFundamentalScore(newsData, economicData);
        return {
            score: fundamentalScore,
            signals: this.generateFundamentalSignals(newsData, economicData),
            confidence: Math.min(newsData.length / 10, 1), // More news = higher confidence
            factors: {
                newsCount: newsData.length,
                economicIndicators: economicData.length,
                overallSentiment: fundamentalScore > 0.5 ? 'positive' : 'negative'
            }
        };
    }
    calculateFundamentalScore(newsData, economicData) {
        let score = 0.5; // Neutral baseline
        // Simple news sentiment scoring
        newsData.forEach(item => {
            if (item.sentiment) {
                score += item.sentiment > 0 ? 0.1 : -0.1;
            }
        });
        // Economic data influence
        economicData.forEach(item => {
            if (item.value && item.expected) {
                const surprise = (item.value - item.expected) / item.expected;
                score += surprise * 0.05;
            }
        });
        return Math.max(0, Math.min(1, score));
    }
    generateFundamentalSignals(newsData, economicData) {
        const signals = [];
        if (newsData.length > 5) {
            signals.push('High news activity detected');
        }
        if (economicData.length > 0) {
            signals.push('Economic data available for analysis');
        }
        return signals.length > 0 ? signals : ['Limited fundamental data'];
    }
    async performSentimentAnalysis(data) {
        // Find social and news data for sentiment analysis
        const socialData = data.filter(d => d.type === 'social' || d.type === 'twitter' || d.type === 'reddit');
        const newsData = data.filter(d => d.type === 'news');
        if (socialData.length === 0 && newsData.length === 0) {
            return {
                sentiment: 'neutral',
                score: 0.5,
                confidence: 0.1,
                signals: ['No sentiment data available']
            };
        }
        const sentimentScore = this.calculateSentimentScore(socialData, newsData);
        return {
            sentiment: sentimentScore > 0.6 ? 'bullish' : sentimentScore < 0.4 ? 'bearish' : 'neutral',
            score: sentimentScore,
            confidence: Math.min((socialData.length + newsData.length) / 20, 1),
            signals: this.generateSentimentSignals(sentimentScore),
            sources: {
                social: socialData.length,
                news: newsData.length
            }
        };
    }
    calculateSentimentScore(socialData, newsData) {
        let totalSentiment = 0;
        let count = 0;
        [...socialData, ...newsData].forEach(item => {
            if (item.sentiment !== undefined) {
                totalSentiment += item.sentiment;
                count++;
            }
        });
        return count > 0 ? (totalSentiment / count + 1) / 2 : 0.5; // Normalize to 0-1
    }
    generateSentimentSignals(score) {
        const signals = [];
        if (score > 0.7) {
            signals.push('Very positive sentiment detected');
        }
        else if (score > 0.6) {
            signals.push('Positive sentiment trend');
        }
        else if (score < 0.3) {
            signals.push('Very negative sentiment detected');
        }
        else if (score < 0.4) {
            signals.push('Negative sentiment trend');
        }
        else {
            signals.push('Neutral sentiment');
        }
        return signals;
    }
    async performCorrelationAnalysis(data) {
        // Find multiple data sources for correlation analysis
        const priceData = data.filter(d => d.type === 'price');
        const volumeData = data.filter(d => d.type === 'volume');
        const socialData = data.filter(d => d.type === 'social');
        const correlations = this.calculateCorrelations(priceData, volumeData, socialData);
        return {
            correlations,
            signals: this.generateCorrelationSignals(correlations),
            confidence: Math.min(priceData.length / 10, 1),
            relationships: {
                priceVolume: correlations.priceVolume || 0,
                priceSocial: correlations.priceSocial || 0,
                volumeSocial: correlations.volumeSocial || 0
            }
        };
    }
    calculateCorrelations(priceData, volumeData, socialData) {
        // Simplified correlation calculation
        return {
            priceVolume: priceData.length > 0 && volumeData.length > 0 ? 0.6 : 0,
            priceSocial: priceData.length > 0 && socialData.length > 0 ? 0.4 : 0,
            volumeSocial: volumeData.length > 0 && socialData.length > 0 ? 0.3 : 0
        };
    }
    generateCorrelationSignals(correlations) {
        const signals = [];
        if (correlations.priceVolume > 0.5) {
            signals.push('Strong price-volume correlation');
        }
        if (correlations.priceSocial > 0.5) {
            signals.push('Social sentiment correlates with price');
        }
        return signals.length > 0 ? signals : ['Weak correlations detected'];
    }
    createErrorResult(task, error) {
        return {
            agentId: this.id,
            analysisType: this.analysisType,
            timestamp: Date.now(),
            error: true,
            message: error.message,
            confidence: 0
        };
    }
}
//# sourceMappingURL=AnalystAgent.js.map