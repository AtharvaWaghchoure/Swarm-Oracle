import { AgentCoordinator } from '../coordination/AgentCoordinator.js';
import { logger } from '../utils/logger.js';

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
export abstract class BaseAgent {
  protected id: string;
  protected type: string;
  protected coordinator: AgentCoordinator;
  protected status: 'active' | 'inactive' | 'error' = 'inactive';
  protected startTime: number = 0;
  protected lastActivityTime: number = 0;
  protected tasksCompleted: number = 0;
  protected errorCount: number = 0;
  protected memory: AgentMemory[] = [];
  protected maxMemorySize: number = 1000;

  constructor(id: string, type: string, coordinator: AgentCoordinator) {
    this.id = id;
    this.type = type;
    this.coordinator = coordinator;
  }

  /**
   * Start the agent
   */
  async start(): Promise<void> {
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
  async stop(): Promise<void> {
    this.status = 'inactive';
    
    // Unregister from coordinator
    await this.coordinator.unregisterAgent(this.id);
    
    logger.info(`Agent ${this.id} (${this.type}) stopped`);
  }

  /**
   * Update agent status
   */
  protected updateStatus(status: 'active' | 'inactive' | 'error'): void {
    this.status = status;
    this.lastActivityTime = Date.now();
  }

  /**
   * Record task completion
   */
  protected recordTaskCompletion(): void {
    this.tasksCompleted++;
    this.lastActivityTime = Date.now();
  }

  /**
   * Record error
   */
  protected recordError(error: Error): void {
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
  protected async storeMemory(memory: Omit<AgentMemory, 'id' | 'timestamp'>): Promise<void> {
    const memoryItem: AgentMemory = {
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
  protected getMemoriesByType(type: string, limit: number = 10): AgentMemory[] {
    return this.memory
      .filter(m => m.type === type)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Retrieve recent memories
   */
  protected getRecentMemories(limit: number = 10): AgentMemory[] {
    return this.memory
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Calculate performance score
   */
  protected calculatePerformanceScore(): number {
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
  getMetrics(): AgentMetrics {
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
  getId(): string {
    return this.id;
  }

  /**
   * Get agent type
   */
  getType(): string {
    return this.type;
  }

  /**
   * Get agent status
   */
  getStatus(): string {
    return this.status;
  }

  /**
   * Check if agent is healthy
   */
  isHealthy(): boolean {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivityTime;
    const maxInactivityTime = 300000; // 5 minutes
    
    return this.status === 'active' && timeSinceLastActivity < maxInactivityTime;
  }

  /**
   * Send message to another agent
   */
  protected async sendMessage(targetAgentId: string, message: any): Promise<void> {
    await this.coordinator.sendMessage(this.id, targetAgentId, message);
  }

  /**
   * Broadcast message to all agents of a specific type
   */
  protected async broadcastMessage(targetType: string, message: any): Promise<void> {
    await this.coordinator.broadcastMessage(this.id, targetType, message);
  }

  /**
   * Handle incoming messages (to be implemented by subclasses)
   */
  async handleMessage(fromAgentId: string, message: any): Promise<void> {
    logger.debug(`Agent ${this.id} received message from ${fromAgentId}:`, message);
    this.lastActivityTime = Date.now();
  }

  /**
   * Health check method
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Basic health check - can be overridden by subclasses
      return this.isHealthy();
    } catch (error) {
      this.recordError(error as Error);
      return false;
    }
  }

  /**
   * Cleanup resources (to be implemented by subclasses if needed)
   */
  async cleanup(): Promise<void> {
    // Override in subclasses if cleanup is needed
  }
} 