import { logger } from '../utils/logger.js';
/**
 * Base Agent class providing common functionality for all agent types
 */
export class BaseAgent {
    id;
    type;
    coordinator;
    status = 'inactive';
    startTime = 0;
    lastActivityTime = 0;
    tasksCompleted = 0;
    errorCount = 0;
    memory = [];
    maxMemorySize = 1000;
    constructor(id, type, coordinator) {
        this.id = id;
        this.type = type;
        this.coordinator = coordinator;
    }
    /**
     * Start the agent
     */
    async start() {
        this.status = 'active';
        this.startTime = Date.now();
        this.lastActivityTime = Date.now();
        // Register with coordinator
        await this.coordinator.registerAgent(this);
        logger.info(`Agent ${this.id} (${this.type}) started`);
    }
    /**
     * Stop the agent
     */
    async stop() {
        this.status = 'inactive';
        // Unregister from coordinator
        await this.coordinator.unregisterAgent(this.id);
        logger.info(`Agent ${this.id} (${this.type}) stopped`);
    }
    /**
     * Update agent status
     */
    updateStatus(status) {
        this.status = status;
        this.lastActivityTime = Date.now();
    }
    /**
     * Record task completion
     */
    recordTaskCompletion() {
        this.tasksCompleted++;
        this.lastActivityTime = Date.now();
    }
    /**
     * Record error
     */
    recordError(error) {
        this.errorCount++;
        this.status = 'error';
        this.lastActivityTime = Date.now();
        logger.error(`Agent ${this.id} error:`, error);
        // Auto-recover after a short delay
        setTimeout(() => {
            if (this.status === 'error') {
                this.status = 'active';
            }
        }, 5000);
    }
    /**
     * Store memory
     */
    async storeMemory(memory) {
        const memoryItem = {
            id: `${this.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            ...memory
        };
        this.memory.push(memoryItem);
        // Maintain memory size limit
        if (this.memory.length > this.maxMemorySize) {
            this.memory = this.memory.slice(-this.maxMemorySize);
        }
        // Also store in coordinator's database
        await this.coordinator.storeAgentMemory(this.id, memoryItem);
    }
    /**
     * Retrieve memories by type
     */
    getMemoriesByType(type, limit = 10) {
        return this.memory
            .filter(m => m.type === type)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }
    /**
     * Retrieve recent memories
     */
    getRecentMemories(limit = 10) {
        return this.memory
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }
    /**
     * Calculate performance score
     */
    calculatePerformanceScore() {
        const uptime = Date.now() - this.startTime;
        const errorRate = this.errorCount / Math.max(this.tasksCompleted, 1);
        const activityScore = this.tasksCompleted / Math.max(uptime / 3600000, 1); // tasks per hour
        // Score between 0 and 100
        const baseScore = Math.min(100, activityScore * 10);
        const errorPenalty = errorRate * 50;
        return Math.max(0, baseScore - errorPenalty);
    }
    /**
     * Get agent metrics
     */
    getMetrics() {
        return {
            id: this.id,
            type: this.type,
            status: this.status,
            uptime: this.startTime > 0 ? Date.now() - this.startTime : 0,
            tasksCompleted: this.tasksCompleted,
            lastActivityTime: this.lastActivityTime,
            performanceScore: this.calculatePerformanceScore(),
            errorCount: this.errorCount
        };
    }
    /**
     * Get agent ID
     */
    getId() {
        return this.id;
    }
    /**
     * Get agent type
     */
    getType() {
        return this.type;
    }
    /**
     * Get agent status
     */
    getStatus() {
        return this.status;
    }
    /**
     * Check if agent is healthy
     */
    isHealthy() {
        const now = Date.now();
        const timeSinceLastActivity = now - this.lastActivityTime;
        const maxInactivityTime = 300000; // 5 minutes
        return this.status === 'active' && timeSinceLastActivity < maxInactivityTime;
    }
    /**
     * Send message to another agent
     */
    async sendMessage(targetAgentId, message) {
        await this.coordinator.sendMessage(this.id, targetAgentId, message);
    }
    /**
     * Broadcast message to all agents of a specific type
     */
    async broadcastMessage(targetType, message) {
        await this.coordinator.broadcastMessage(this.id, targetType, message);
    }
    /**
     * Handle incoming messages (to be implemented by subclasses)
     */
    async handleMessage(fromAgentId, message) {
        logger.debug(`Agent ${this.id} received message from ${fromAgentId}:`, message);
        this.lastActivityTime = Date.now();
    }
    /**
     * Health check method
     */
    async healthCheck() {
        try {
            // Basic health check - can be overridden by subclasses
            return this.isHealthy();
        }
        catch (error) {
            this.recordError(error);
            return false;
        }
    }
    /**
     * Cleanup resources (to be implemented by subclasses if needed)
     */
    async cleanup() {
        // Override in subclasses if cleanup is needed
    }
}
//# sourceMappingURL=BaseAgent.js.map