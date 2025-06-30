export interface Memory {
    id: string;
    agentId: string;
    type: string;
    data: any;
    timestamp: number;
    importance: number;
}
export declare class DatabaseManager {
    private pool?;
    private connected;
    private fallbackMode;
    private agentData;
    private memoryData;
    private messageData;
    private memoryStorage;
    constructor(databaseUrl: string);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    private initializeTables;
    storeMemory(memory: Memory): Promise<void>;
    getMemories(agentId: string, limit?: number): Promise<Memory[]>;
    getMemoriesByType(agentId: string, type: string, limit?: number): Promise<Memory[]>;
    saveAgentState(agentId: string, state: any): Promise<void>;
    loadAgentState(agentId: string): Promise<any | null>;
    storePrediction(marketId: string, agentSwarmId: string, prediction: any, confidence: number): Promise<void>;
    getPredictions(marketId: string, limit?: number): Promise<any[]>;
    cleanup(olderThanTimestamp: number): Promise<void>;
    storeAgentRegistration(agentInfo: any): Promise<void>;
    updateAgentStatus(agentId: string, status: string): Promise<void>;
    storeAgentMemory(agentId: string, memory: any): Promise<void>;
    getAgentMemories(agentId: string, limit?: number): Promise<any[]>;
    storeMessage(message: any): Promise<void>;
    getMessages(agentId?: string, limit?: number): Promise<any[]>;
    getAgentStats(): Promise<any>;
    close(): Promise<void>;
    isConnected(): boolean;
    dumpData(): Promise<any>;
}
//# sourceMappingURL=DatabaseManager.d.ts.map