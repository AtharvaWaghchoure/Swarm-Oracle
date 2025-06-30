import { logger } from '../utils/logger.js';

export interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId?: string;
  type: string;
  data: any;
  timestamp: number;
}

export class AgentCoordinator {
  private agents: Map<string, any> = new Map();
  private messageQueues: Map<string, AgentMessage[]> = new Map();
  private dbManager: any;

  constructor(dbManager?: any) {
    this.dbManager = dbManager;
  }

  async registerAgent(agent: any): Promise<void> {
    logger.info(`Registering agent: ${agent.getId()} (${agent.getType()})`);
    
    this.agents.set(agent.getId(), agent);
    this.messageQueues.set(agent.getId(), []);

    // Store agent registration in database
    if (this.dbManager) {
      await this.dbManager.storeAgentRegistration({
        agentId: agent.getId(),
        type: agent.getType(),
        timestamp: Date.now(),
        status: 'registered'
      });
    }
  }

  async unregisterAgent(agentId: string): Promise<void> {
    logger.info(`Unregistering agent: ${agentId}`);
    
    this.agents.delete(agentId);
    this.messageQueues.delete(agentId);

    // Update database
    if (this.dbManager) {
      await this.dbManager.updateAgentStatus(agentId, 'unregistered');
    }
  }

  async sendMessage(fromAgentId: string, toAgentId: string, message: any): Promise<void> {
    const messageWithId: AgentMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fromAgentId,
      toAgentId,
      type: message.type || 'generic',
      data: message,
      timestamp: Date.now()
    };

    // Add to recipient's queue
    const queue = this.messageQueues.get(toAgentId);
    if (queue) {
      queue.push(messageWithId);
      
      // Notify recipient agent
      const recipient = this.agents.get(toAgentId);
      if (recipient && typeof recipient.handleMessage === 'function') {
        await recipient.handleMessage(fromAgentId, message);
      }
    }

    // Store in database
    if (this.dbManager) {
      await this.dbManager.storeMessage(messageWithId);
    }
  }

  async broadcastMessage(fromAgentId: string, targetType: string, message: any): Promise<void> {
    const targetAgents = Array.from(this.agents.values())
      .filter(agent => agent.getType() === targetType);

    for (const agent of targetAgents) {
      if (agent.getId() !== fromAgentId) {
        await this.sendMessage(fromAgentId, agent.getId(), message);
      }
    }
  }

  getRegisteredAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  getAgentsByType(type: string): any[] {
    return Array.from(this.agents.values())
      .filter(agent => agent.getType() === type);
  }

  getAgentMetrics(): any[] {
    return Array.from(this.agents.values())
      .map(agent => agent.getMetrics ? agent.getMetrics() : null)
      .filter(metrics => metrics !== null);
  }

  async storeAgentMemory(agentId: string, memory: any): Promise<void> {
    if (this.dbManager) {
      await this.dbManager.storeAgentMemory(agentId, memory);
    }
  }

  async getAgentMemories(agentId: string, limit: number = 10): Promise<any[]> {
    if (this.dbManager) {
      return await this.dbManager.getAgentMemories(agentId, limit);
    }
    return [];
  }

  async healthCheck(): Promise<boolean> {
    let healthyAgents = 0;
    const totalAgents = this.agents.size;

    for (const agent of this.agents.values()) {
      if (agent.isHealthy && agent.isHealthy()) {
        healthyAgents++;
      }
    }

    const healthRatio = totalAgents > 0 ? healthyAgents / totalAgents : 0;
    logger.info(`Agent health check: ${healthyAgents}/${totalAgents} agents healthy (${(healthRatio * 100).toFixed(1)}%)`);

    return healthRatio > 0.8; // 80% threshold
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down AgentCoordinator');
    
    // Stop all agents
    for (const agent of this.agents.values()) {
      if (agent.stop) {
        await agent.stop();
      }
    }

    // Clear data structures
    this.agents.clear();
    this.messageQueues.clear();

    // Close database connection
    if (this.dbManager && this.dbManager.close) {
      await this.dbManager.close();
    }
  }
} 