import { AgentCoordinator } from '../coordination/AgentCoordinator.js';
export interface AgentMemory {
    id: string;
    type: string;
    timestamp: number;
    data: any;
    metadata?: Record<string, any>;
}
export interface AgentMetrics {
    id: string;
    type: string;
    status: 'active' | 'inactive' | 'error';
    uptime: number;
    tasksCompleted: number;
    lastActivityTime: number;
    performanceScore: number;
    errorCount: number;
}
/**
 * Base Agent class providing common functionality for all agent types
 */
export declare abstract class BaseAgent {
    protected id: string;
    protected type: string;
    protected coordinator: AgentCoordinator;
    protected status: 'active' | 'inactive' | 'error';
    protected startTime: number;
    protected lastActivityTime: number;
    protected tasksCompleted: number;
    protected errorCount: number;
    protected memory: AgentMemory[];
    protected maxMemorySize: number;
    constructor(id: string, type: string, coordinator: AgentCoordinator);
    /**
     * Start the agent
     */
    start(): Promise<void>;
    /**
     * Stop the agent
     */
    stop(): Promise<void>;
    /**
     * Update agent status
     */
    protected updateStatus(status: 'active' | 'inactive' | 'error'): void;
    /**
     * Record task completion
     */
    protected recordTaskCompletion(): void;
    /**
     * Record error
     */
    protected recordError(error: Error): void;
    /**
     * Store memory
     */
    protected storeMemory(memory: Omit<AgentMemory, 'id' | 'timestamp'>): Promise<void>;
    /**
     * Retrieve memories by type
     */
    protected getMemoriesByType(type: string, limit?: number): AgentMemory[];
    /**
     * Retrieve recent memories
     */
    protected getRecentMemories(limit?: number): AgentMemory[];
    /**
     * Calculate performance score
     */
    protected calculatePerformanceScore(): number;
    /**
     * Get agent metrics
     */
    getMetrics(): AgentMetrics;
    /**
     * Get agent ID
     */
    getId(): string;
    /**
     * Get agent type
     */
    getType(): string;
    /**
     * Get agent status
     */
    getStatus(): string;
    /**
     * Check if agent is healthy
     */
    isHealthy(): boolean;
    /**
     * Send message to another agent
     */
    protected sendMessage(targetAgentId: string, message: any): Promise<void>;
    /**
     * Broadcast message to all agents of a specific type
     */
    protected broadcastMessage(targetType: string, message: any): Promise<void>;
    /**
     * Handle incoming messages (to be implemented by subclasses)
     */
    handleMessage(fromAgentId: string, message: any): Promise<void>;
    /**
     * Health check method
     */
    healthCheck(): Promise<boolean>;
    /**
     * Cleanup resources (to be implemented by subclasses if needed)
     */
    cleanup(): Promise<void>;
}
//# sourceMappingURL=BaseAgent.d.ts.map