import { BaseAgent } from './BaseAgent.js';
export interface ExecutionAgentConfig {
    id: string;
    type: 'risk_manager' | 'cross_chain' | 'mev_protector';
    coordinator: any;
    role: string;
    config: {
        [key: string]: any;
    };
}
export declare class ExecutionAgent extends BaseAgent {
    private executionType;
    private role;
    private executionConfig;
    constructor(config: ExecutionAgentConfig);
    /**
     * Process a task from the orchestrator
     */
    processTask(task: any): Promise<any>;
    /**
     * Execute based on agent's execution type
     */
    private execute;
    private manageRisk;
    private executeCrossChain;
    private protectFromMEV;
    private assessRisk;
    private generateRiskRecommendation;
    private assessMEVRisk;
    private selectProtectionStrategy;
    private createErrorResult;
}
//# sourceMappingURL=ExecutionAgent.d.ts.map