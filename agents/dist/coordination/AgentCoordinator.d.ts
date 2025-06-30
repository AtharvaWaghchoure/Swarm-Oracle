export interface AgentMessage {
    id: string;
    fromAgentId: string;
    toAgentId?: string;
    type: string;
    data: any;
    timestamp: number;
}
export declare class AgentCoordinator {
    private agents;
    private messageQueues;
    private dbManager;
    constructor(dbManager?: any);
    registerAgent(agent: any): Promise<void>;
    unregisterAgent(agentId: string): Promise<void>;
    sendMessage(fromAgentId: string, toAgentId: string, message: any): Promise<void>;
    broadcastMessage(fromAgentId: string, targetType: string, message: any): Promise<void>;
    getRegisteredAgents(): string[];
    getAgentsByType(type: string): any[];
    getAgentMetrics(): any[];
    storeAgentMemory(agentId: string, memory: any): Promise<void>;
    getAgentMemories(agentId: string, limit?: number): Promise<any[]>;
    healthCheck(): Promise<boolean>;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=AgentCoordinator.d.ts.map