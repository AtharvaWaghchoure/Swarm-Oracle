import { BaseAgent } from './BaseAgent.js';
export interface AnalystAgentConfig {
    id: string;
    type: 'technical' | 'fundamental' | 'sentiment' | 'correlation';
    coordinator: any;
    specialty: string;
    config: {
        [key: string]: any;
    };
}
export declare class AnalystAgent extends BaseAgent {
    private analysisType;
    private specialty;
    private analysisConfig;
    constructor(config: AnalystAgentConfig);
    /**
     * Process a task from the orchestrator
     */
    processTask(task: any): Promise<any>;
    /**
     * Analyze data based on agent's analysis type
     */
    private analyzeData;
    private performTechnicalAnalysis;
    private calculateRSI;
    private calculateMACD;
    private calculateEMA;
    private performFundamentalAnalysis;
    private calculateFundamentalScore;
    private generateFundamentalSignals;
    private performSentimentAnalysis;
    private calculateSentimentScore;
    private generateSentimentSignals;
    private performCorrelationAnalysis;
    private calculateCorrelations;
    private generateCorrelationSignals;
    private createErrorResult;
}
//# sourceMappingURL=AnalystAgent.d.ts.map