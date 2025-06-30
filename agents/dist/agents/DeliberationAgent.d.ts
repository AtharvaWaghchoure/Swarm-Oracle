import { BaseAgent } from './BaseAgent.js';
export interface DeliberationAgentConfig {
    id: string;
    type: 'facilitator' | 'resolver';
    coordinator: any;
    role: 'consensus_building' | 'conflict_resolution';
    config: {
        [key: string]: any;
    };
}
export declare class DeliberationAgent extends BaseAgent {
    private deliberationType;
    private role;
    private deliberationConfig;
    constructor(config: DeliberationAgentConfig);
    /**
     * Process a task from the orchestrator
     */
    processTask(task: any): Promise<any>;
    /**
     * Deliberate based on agent's deliberation type
     */
    private deliberate;
    private facilitateConsensus;
    private resolveDispute;
    private analyzePredictions;
    private calculateConsensus;
    private analyzeConflict;
    private makeResolutionDecision;
    private calculateEvidenceWeight;
    private explainConsensus;
    private explainResolution;
    private createErrorResult;
}
//# sourceMappingURL=DeliberationAgent.d.ts.map