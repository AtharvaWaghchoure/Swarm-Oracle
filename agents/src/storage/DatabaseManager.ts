import { Pool } from 'pg';
import { logger } from '../utils/logger.js';

export interface Memory {
  id: string;
  agentId: string;
  type: string;
  data: any;
  timestamp: number;
  importance: number;
}

export class DatabaseManager {
  private pool?: Pool;
  private connected: boolean = false;
  private fallbackMode: boolean = false;
  private agentData: Map<string, any> = new Map();
  private memoryData: Map<string, any[]> = new Map();
  private messageData: any[] = [];
  private memoryStorage: Map<string, any> = new Map();

  constructor(databaseUrl: string) {
    if (databaseUrl && !databaseUrl.includes('postgresql://user:password@localhost')) {
      this.pool = new Pool({
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
    } else {
      logger.warn('🚧 Using fallback in-memory storage - PostgreSQL not configured');
      this.fallbackMode = true;
    }
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    if (this.fallbackMode) {
      this.connected = true;
      logger.info('🗄️ Connected to in-memory fallback storage');
      return;
    }

    try {
      if (!this.pool) throw new Error('Database pool not initialized');
      await this.pool.query('SELECT NOW()');
      await this.initializeTables();
      this.connected = true;
      logger.info('🗄️ Connected to PostgreSQL database');
    } catch (error) {
      logger.warn('⚠️ PostgreSQL connection failed, falling back to in-memory storage:', error);
      this.fallbackMode = true;
      this.connected = true;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;
    
    if (this.fallbackMode) {
      this.connected = false;
      logger.info('🗄️ Disconnected from in-memory storage');
      return;
    }

    try {
      if (this.pool) {
        await this.pool.end();
      }
      this.connected = false;
      logger.info('🗄️ Disconnected from PostgreSQL database');
    } catch (error) {
      logger.error('❌ Failed to disconnect from PostgreSQL:', error);
    }
  }

  private async initializeTables(): Promise<void> {
    if (!this.pool) throw new Error('Database pool not available');
    
    const createTablesQuery = `
      CREATE TABLE IF NOT EXISTS agent_memories (
        id VARCHAR(255) PRIMARY KEY,
        agent_id VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        data JSONB NOT NULL,
        timestamp BIGINT NOT NULL,
        importance DECIMAL(3,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_agent_memories_agent_id ON agent_memories(agent_id);
      CREATE INDEX IF NOT EXISTS idx_agent_memories_type ON agent_memories(type);
      CREATE INDEX IF NOT EXISTS idx_agent_memories_timestamp ON agent_memories(timestamp);
      CREATE INDEX IF NOT EXISTS idx_agent_memories_importance ON agent_memories(importance);

      CREATE TABLE IF NOT EXISTS agent_states (
        agent_id VARCHAR(255) PRIMARY KEY,
        state JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS predictions (
        id SERIAL PRIMARY KEY,
        market_id VARCHAR(255) NOT NULL,
        agent_swarm_id VARCHAR(255) NOT NULL,
        prediction JSONB NOT NULL,
        confidence DECIMAL(5,4) NOT NULL,
        timestamp BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_predictions_market_id ON predictions(market_id);
      CREATE INDEX IF NOT EXISTS idx_predictions_timestamp ON predictions(timestamp);
    `;

    await this.pool.query(createTablesQuery);
    logger.info('🗄️ Database tables initialized');
  }

  async storeMemory(memory: Memory): Promise<void> {
    if (!this.connected) await this.connect();

    if (this.fallbackMode) {
      this.memoryStorage.set(memory.id, memory);
      logger.debug(`💾 Stored memory ${memory.id} for agent ${memory.agentId} (fallback)`);
      return;
    }

    if (!this.pool) throw new Error('Database pool not available');

    const query = `
      INSERT INTO agent_memories (id, agent_id, type, data, timestamp, importance)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        data = EXCLUDED.data,
        timestamp = EXCLUDED.timestamp,
        importance = EXCLUDED.importance
    `;

    const values = [
      memory.id,
      memory.agentId,
      memory.type,
      JSON.stringify(memory.data),
      memory.timestamp,
      memory.importance
    ];

    try {
      await this.pool.query(query, values);
      logger.debug(`💾 Stored memory ${memory.id} for agent ${memory.agentId}`);
    } catch (error) {
      logger.error('❌ Failed to store memory:', error);
      throw error;
    }
  }

  async getMemories(agentId: string, limit?: number): Promise<Memory[]> {
    if (!this.connected) await this.connect();

    if (this.fallbackMode) {
      const memories = Array.from(this.memoryStorage.values())
        .filter((m: any) => m.agentId === agentId)
        .sort((a: any, b: any) => b.timestamp - a.timestamp);
      return limit ? memories.slice(0, limit) : memories;
    }

    if (!this.pool) throw new Error('Database pool not available');

    const query = `
      SELECT id, agent_id, type, data, timestamp, importance
      FROM agent_memories
      WHERE agent_id = $1
      ORDER BY timestamp DESC
      ${limit ? 'LIMIT $2' : ''}
    `;

    const values = limit ? [agentId, limit] : [agentId];

    try {
      const result = await this.pool.query(query, values);
      return result.rows.map((row: any) => ({
        id: row.id,
        agentId: row.agent_id,
        type: row.type,
        data: row.data,
        timestamp: parseInt(row.timestamp),
        importance: parseFloat(row.importance)
      }));
    } catch (error) {
      logger.error('❌ Failed to get memories:', error);
      throw error;
    }
  }

  async getMemoriesByType(agentId: string, type: string, limit?: number): Promise<Memory[]> {
    if (!this.connected) await this.connect();

    if (this.fallbackMode) {
      const memories = Array.from(this.memoryStorage.values())
        .filter((m: any) => m.agentId === agentId && m.type === type)
        .sort((a: any, b: any) => b.timestamp - a.timestamp);
      return limit ? memories.slice(0, limit) : memories;
    }

    if (!this.pool) throw new Error('Database pool not available');

    const query = `
      SELECT id, agent_id, type, data, timestamp, importance
      FROM agent_memories
      WHERE agent_id = $1 AND type = $2
      ORDER BY timestamp DESC
      ${limit ? 'LIMIT $3' : ''}
    `;

    const values = limit ? [agentId, type, limit] : [agentId, type];

    try {
      const result = await this.pool.query(query, values);
      return result.rows.map((row: any) => ({
        id: row.id,
        agentId: row.agent_id,
        type: row.type,
        data: row.data,
        timestamp: parseInt(row.timestamp),
        importance: parseFloat(row.importance)
      }));
    } catch (error) {
      logger.error('❌ Failed to get memories by type:', error);
      throw error;
    }
  }

  async saveAgentState(agentId: string, state: any): Promise<void> {
    if (!this.connected) await this.connect();

    if (this.fallbackMode) {
      this.memoryStorage.set(`state_${agentId}`, state);
      logger.debug(`💾 Saved state for agent ${agentId} (fallback)`);
      return;
    }

    if (!this.pool) throw new Error('Database pool not available');

    const query = `
      INSERT INTO agent_states (agent_id, state)
      VALUES ($1, $2)
      ON CONFLICT (agent_id) DO UPDATE SET
        state = EXCLUDED.state,
        updated_at = CURRENT_TIMESTAMP
    `;

    try {
      await this.pool.query(query, [agentId, JSON.stringify(state)]);
      logger.debug(`💾 Saved state for agent ${agentId}`);
    } catch (error) {
      logger.error('❌ Failed to save agent state:', error);
      throw error;
    }
  }

  async loadAgentState(agentId: string): Promise<any | null> {
    if (!this.connected) await this.connect();

    if (this.fallbackMode) {
      return this.memoryStorage.get(`state_${agentId}`) || null;
    }

    if (!this.pool) throw new Error('Database pool not available');

    const query = 'SELECT state FROM agent_states WHERE agent_id = $1';

    try {
      const result = await this.pool.query(query, [agentId]);
      return result.rows[0]?.state || null;
    } catch (error) {
      logger.error('❌ Failed to load agent state:', error);
      throw error;
    }
  }

  async storePrediction(marketId: string, agentSwarmId: string, prediction: any, confidence: number): Promise<void> {
    if (!this.connected) await this.connect();

    if (this.fallbackMode) {
      const predictionData = { marketId, agentSwarmId, prediction, confidence, timestamp: Date.now() };
      this.memoryStorage.set(`prediction_${Date.now()}`, predictionData);
      logger.debug(`💾 Stored prediction for market ${marketId} (fallback)`);
      return;
    }

    if (!this.pool) throw new Error('Database pool not available');

    const query = `
      INSERT INTO predictions (market_id, agent_swarm_id, prediction, confidence, timestamp)
      VALUES ($1, $2, $3, $4, $5)
    `;

    const values = [
      marketId,
      agentSwarmId,
      JSON.stringify(prediction),
      confidence,
      Date.now()
    ];

    try {
      await this.pool.query(query, values);
      logger.debug(`💾 Stored prediction for market ${marketId}`);
    } catch (error) {
      logger.error('❌ Failed to store prediction:', error);
      throw error;
    }
  }

  async getPredictions(marketId: string, limit?: number): Promise<any[]> {
    if (!this.connected) await this.connect();

    if (this.fallbackMode) {
      const predictions = Array.from(this.memoryStorage.values())
        .filter((p: any) => p.marketId === marketId)
        .sort((a: any, b: any) => b.timestamp - a.timestamp);
      return limit ? predictions.slice(0, limit) : predictions;
    }

    if (!this.pool) throw new Error('Database pool not available');

    const query = `
      SELECT id, market_id, agent_swarm_id, prediction, confidence, timestamp
      FROM predictions
      WHERE market_id = $1
      ORDER BY timestamp DESC
      ${limit ? 'LIMIT $2' : ''}
    `;

    const values = limit ? [marketId, limit] : [marketId];

    try {
      const result = await this.pool.query(query, values);
      return result.rows.map((row: any) => ({
        id: row.id,
        marketId: row.market_id,
        agentSwarmId: row.agent_swarm_id,
        prediction: row.prediction,
        confidence: parseFloat(row.confidence),
        timestamp: parseInt(row.timestamp)
      }));
    } catch (error) {
      logger.error('❌ Failed to get predictions:', error);
      throw error;
    }
  }

  async cleanup(olderThanTimestamp: number): Promise<void> {
    if (!this.connected) await this.connect();

    if (this.fallbackMode) {
      let cleanedCount = 0;
      for (const [key, value] of this.memoryStorage.entries()) {
        if ((value as any).timestamp && (value as any).timestamp < olderThanTimestamp) {
          this.memoryStorage.delete(key);
          cleanedCount++;
        }
      }
      logger.info(`🧹 Cleaned up ${cleanedCount} old records (fallback)`);
      return;
    }

    if (!this.pool) throw new Error('Database pool not available');

    try {
      // Clean up old memories with low importance
      const memoryQuery = `
        DELETE FROM agent_memories 
        WHERE timestamp < $1 AND importance < 0.3
      `;
      const memoryResult = await this.pool.query(memoryQuery, [olderThanTimestamp]);

      // Clean up old predictions
      const predictionQuery = `
        DELETE FROM predictions 
        WHERE timestamp < $1
      `;
      const predictionResult = await this.pool.query(predictionQuery, [olderThanTimestamp]);

      logger.info(`🧹 Cleaned up ${memoryResult.rowCount} old memories and ${predictionResult.rowCount} old predictions`);
    } catch (error) {
      logger.error('❌ Failed to cleanup database:', error);
      throw error;
    }
  }

  async storeAgentRegistration(agentInfo: any): Promise<void> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    this.agentData.set(agentInfo.agentId, {
      ...agentInfo,
      createdAt: Date.now(),
      lastUpdated: Date.now()
    });

    logger.debug(`Stored agent registration: ${agentInfo.agentId}`);
  }

  async updateAgentStatus(agentId: string, status: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    const existingData = this.agentData.get(agentId);
    if (existingData) {
      existingData.status = status;
      existingData.lastUpdated = Date.now();
      this.agentData.set(agentId, existingData);
    }

    logger.debug(`Updated agent status: ${agentId} -> ${status}`);
  }

  async storeAgentMemory(agentId: string, memory: any): Promise<void> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    if (!this.memoryData.has(agentId)) {
      this.memoryData.set(agentId, []);
    }

    const memories = this.memoryData.get(agentId)!;
    memories.push({
      ...memory,
      storedAt: Date.now()
    });

    // Keep only last 100 memories per agent
    if (memories.length > 100) {
      memories.splice(0, memories.length - 100);
    }

    logger.debug(`Stored memory for agent: ${agentId}`);
  }

  async getAgentMemories(agentId: string, limit: number = 10): Promise<any[]> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    const memories = this.memoryData.get(agentId) || [];
    return memories
      .slice(-limit)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  async storeMessage(message: any): Promise<void> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    this.messageData.push({
      ...message,
      storedAt: Date.now()
    });

    // Keep only last 1000 messages
    if (this.messageData.length > 1000) {
      this.messageData = this.messageData.slice(-1000);
    }

    logger.debug(`Stored message: ${message.id}`);
  }

  async getMessages(agentId?: string, limit: number = 10): Promise<any[]> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    let messages = this.messageData;

    if (agentId) {
      messages = messages.filter(msg => 
        msg.fromAgentId === agentId || msg.toAgentId === agentId
      );
    }

    return messages
      .slice(-limit)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  async getAgentStats(): Promise<any> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    const agents = Array.from(this.agentData.values());
    const totalMessages = this.messageData.length;
    const totalMemories = Array.from(this.memoryData.values())
      .reduce((sum, memories) => sum + memories.length, 0);

    return {
      totalAgents: agents.length,
      agentsByType: agents.reduce((acc, agent) => {
        acc[agent.type] = (acc[agent.type] || 0) + 1;
        return acc;
      }, {} as any),
      totalMessages,
      totalMemories,
      registeredAgents: agents.filter(a => a.status === 'registered').length,
      activeAgents: agents.filter(a => a.status === 'active').length
    };
  }

  async close(): Promise<void> {
    if (this.connected) {
      logger.info('🔌 Closing database connection');
      this.connected = false;
      
      // In production, this would close actual DB connections
      this.agentData.clear();
      this.memoryData.clear();
      this.messageData = [];
      
      logger.info('✅ Database connection closed');
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Development/Debug methods
  async dumpData(): Promise<any> {
    return {
      agents: Array.from(this.agentData.entries()),
      memories: Array.from(this.memoryData.entries()),
      messages: this.messageData,
      stats: await this.getAgentStats()
    };
  }
} 