import { BaseAgent } from './BaseAgent.js';
import { AgentCoordinator } from '../coordination/AgentCoordinator.js';
export interface DataCollectorConfig {
    apiKey?: string;
    collectInterval: number;
    topics?: string[];
    subreddits?: string[];
    sources?: string[];
    rpcs?: Record<string, string>;
    contracts?: string[];
}
export interface CollectedData {
    source: string;
    type: 'sentiment' | 'price' | 'volume' | 'social' | 'news';
    timestamp: number;
    data: any;
    confidence: number;
    metadata?: Record<string, any>;
}
/**
 * Data Collector Agent - Specializes in gathering data from various sources
 */
export declare class DataCollectorAgent extends BaseAgent {
    private config;
    private providers;
    private collectionInterval?;
    constructor(options: {
        id: string;
        type: string;
        coordinator: AgentCoordinator;
        config: DataCollectorConfig;
    });
    /**
     * Initialize API clients based on agent type
     */
    private initializeClients;
    /**
     * Start data collection
     */
    start(): Promise<void>;
    /**
     * Stop data collection
     */
    stop(): Promise<void>;
    /**
     * Main data collection method
     */
    private collectData;
    /**
     * Collect Twitter sentiment data using RAPIDAPI
     */
    private collectTwitterData;
    /**
     * Collect Reddit sentiment data using RAPIDAPI
     */
    private collectRedditData;
    /**
     * Collect news sentiment data
     */
    private collectNewsData;
    /**
     * Collect on-chain data
     */
    private collectOnChainData;
    /**
     * Simple sentiment analysis
     */
    private analyzeSentiment;
    /**
     * Process collected data and send to coordinator
     */
    private processCollectedData;
    /**
     * Summarize collected data for memory storage
     */
    private summarizeData;
    /**
     * Get agent performance metrics
     */
    getMetrics(): {
        collectInterval: number;
        sources: string[];
        lastCollection: number;
        id: string;
        type: string;
        status: "active" | "inactive" | "error";
        uptime: number;
        tasksCompleted: number;
        lastActivityTime: number;
        performanceScore: number;
        errorCount: number;
    };
    /**
     * Get active data sources
     */
    private getActiveSources;
    /**
     * Process a task from the orchestrator
     */
    processTask(task: any): Promise<any>;
    /**
     * Get recent collected data for sharing with other agents
     */
    private getRecentCollectedData;
}
//# sourceMappingURL=DataCollectorAgent.d.ts.map