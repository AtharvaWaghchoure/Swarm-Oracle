import { AgentCoordinator } from '../coordination/AgentCoordinator.js';
export interface SwarmAgents {
    dataCollectors: any[];
    analysts: any[];
    deliberation: any[];
    execution: any[];
}
export declare class SwarmOrchestrator {
    private coordinator;
    private agents;
    private isRunning;
    private taskQueue;
    private processInterval;
    constructor(coordinator: AgentCoordinator, agents: SwarmAgents);
    start(): Promise<void>;
    stop(): Promise<void>;
    private startAllAgents;
    private stopAllAgents;
    private startTaskProcessing;
    private processTask;
    private processMarketPredictionTask;
    private collectMarketData;
    private analyzeMarketData;
    private buildConsensus;
    private executeMarketDecision;
    private aggregateMarketData;
    private processDataCollectionTask;
    private processAnalysisTask;
    private startHealthMonitoring;
    private startDemoPredictionCycle;
    addTask(task: any): void;
    getStatus(): any;
}
//# sourceMappingURL=SwarmOrchestrator.d.ts.map