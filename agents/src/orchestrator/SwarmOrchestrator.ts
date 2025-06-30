import { AgentCoordinator } from '../coordination/AgentCoordinator.js';
import { logger } from '../utils/logger.js';

export interface SwarmAgents {
  dataCollectors: any[];
  analysts: any[];
  deliberation: any[];
  execution: any[];
}

export class SwarmOrchestrator {
  private coordinator: AgentCoordinator;
  private agents: SwarmAgents;
  private isRunning: boolean = false;
  private taskQueue: any[] = [];
  private processInterval: NodeJS.Timeout | null = null;

  constructor(coordinator: AgentCoordinator, agents: SwarmAgents) {
    this.coordinator = coordinator;
    this.agents = agents;
  }

  async start(): Promise<void> {
    logger.info('🚀 Starting Swarm Oracle orchestrator');
    
    this.isRunning = true;

    // Start all agents
    await this.startAllAgents();

    // Start task processing
    this.startTaskProcessing();

    // Start health monitoring
    this.startHealthMonitoring();

    // Start demo prediction cycle
    this.startDemoPredictionCycle();

    logger.info('✅ Swarm Oracle orchestrator started successfully');
  }

  async stop(): Promise<void> {
    logger.info('🛑 Stopping Swarm Oracle orchestrator');
    
    this.isRunning = false;

    // Clear intervals
    if (this.processInterval) {
      clearInterval(this.processInterval);
    }

    // Stop all agents
    await this.stopAllAgents();

    // Shutdown coordinator
    await this.coordinator.shutdown();

    logger.info('✅ Swarm Oracle orchestrator stopped');
  }

  private async startAllAgents(): Promise<void> {
    const allAgents = [
      ...this.agents.dataCollectors,
      ...this.agents.analysts,
      ...this.agents.deliberation,
      ...this.agents.execution
    ];

    for (const agent of allAgents) {
      try {
        await agent.start();
        logger.info(`✅ Started agent: ${agent.getId()}`);
      } catch (error) {
        logger.error(`❌ Failed to start agent ${agent.getId()}:`, error);
      }
    }
  }

  private async stopAllAgents(): Promise<void> {
    const allAgents = [
      ...this.agents.dataCollectors,
      ...this.agents.analysts,
      ...this.agents.deliberation,
      ...this.agents.execution
    ];

    for (const agent of allAgents) {
      try {
        await agent.stop();
        logger.info(`✅ Stopped agent: ${agent.getId()}`);
      } catch (error) {
        logger.error(`❌ Failed to stop agent ${agent.getId()}:`, error);
      }
    }
  }

  private startTaskProcessing(): void {
    this.processInterval = setInterval(async () => {
      if (this.taskQueue.length > 0) {
        const task = this.taskQueue.shift();
        await this.processTask(task);
      }
    }, 5000); // Process tasks every 5 seconds
  }

  private async processTask(task: any): Promise<void> {
    logger.info(`📋 Processing task: ${task.type}`);

    try {
      switch (task.type) {
        case 'market_prediction':
          await this.processMarketPredictionTask(task);
          break;
        case 'data_collection':
          await this.processDataCollectionTask(task);
          break;
        case 'analysis':
          await this.processAnalysisTask(task);
          break;
        default:
          logger.warn(`Unknown task type: ${task.type}`);
      }
    } catch (error) {
      logger.error(`Failed to process task ${task.type}:`, error);
    }
  }

  private async processMarketPredictionTask(task: any): Promise<void> {
    // 1. Collect data from all data collectors
    const dataCollection = await this.collectMarketData(task.market);
    
    // 2. Analyze data with analyst agents
    const analysisResults = await this.analyzeMarketData(dataCollection);
    
    // 3. Build consensus through deliberation
    const consensus = await this.buildConsensus(analysisResults);
    
    // 4. Execute if consensus reached
    if (consensus.hasConsensus) {
      await this.executeMarketDecision(consensus, task);
    }

    logger.info(`✅ Market prediction task completed for ${task.market}`);
  }

  private async collectMarketData(market: string): Promise<any> {
    const dataResults = await Promise.all(
      this.agents.dataCollectors.map(async (agent) => {
        try {
          return await agent.processTask({
            type: 'collect_data',
            data: { market, timestamp: Date.now() }
          });
        } catch (error) {
          logger.error(`Data collection failed for ${agent.getId()}:`, error);
          return null;
        }
      })
    );

    return dataResults.filter(result => result !== null);
  }

  private async analyzeMarketData(dataCollection: any[]): Promise<any[]> {
    const analysisResults = await Promise.all(
      this.agents.analysts.map(async (agent) => {
        try {
          return await agent.processTask({
            type: 'analyze_data',
            data: { 
              dataCollection,
              marketData: this.aggregateMarketData(dataCollection),
              timestamp: Date.now() 
            }
          });
        } catch (error) {
          logger.error(`Analysis failed for ${agent.getId()}:`, error);
          return null;
        }
      })
    );

    return analysisResults.filter(result => result !== null);
  }

  private async buildConsensus(analysisResults: any[]): Promise<any> {
    const facilitator = this.agents.deliberation.find(agent => 
      agent.getType() === 'facilitator'
    );

    if (!facilitator) {
      throw new Error('No consensus facilitator available');
    }

    return await facilitator.processTask({
      type: 'build_consensus',
      data: { 
        predictions: analysisResults,
        threshold: 0.8,
        timestamp: Date.now()
      }
    });
  }

  private async executeMarketDecision(consensus: any, task: any): Promise<void> {
    const riskManager = this.agents.execution.find(agent => 
      agent.getType() === 'risk_manager'
    );

    if (!riskManager) {
      logger.warn('No risk manager available for execution');
      return;
    }

    const riskAssessment = await riskManager.processTask({
      type: 'assess_risk',
      data: {
        prediction: consensus.consensus,
        marketData: { market: task.market },
        riskParameters: { positionSize: 0.1, portfolioSize: 1.0 }
      }
    });

    logger.info(`🎯 Execution decision: ${riskAssessment.recommendation.action} for ${task.market}`);
  }

  private aggregateMarketData(dataCollection: any[]): any {
    // Simple aggregation of market data
    const aggregated = {
      timestamp: Date.now(),
      sources: dataCollection.length,
      marketCap: 0,
      volume24h: 0,
      volatility: 0.2,
      sentiment: 0.5
    };

    // Mock aggregation
    for (const data of dataCollection) {
      if (data.marketData) {
        aggregated.marketCap += data.marketData.marketCap || 0;
        aggregated.volume24h += data.marketData.volume24h || 0;
      }
    }

    return aggregated;
  }

  private async processDataCollectionTask(task: any): Promise<void> {
    // Trigger data collection from all collectors
    for (const collector of this.agents.dataCollectors) {
      try {
        await collector.processTask(task);
      } catch (error) {
        logger.error(`Data collection failed for ${collector.getId()}:`, error);
      }
    }
  }

  private async processAnalysisTask(task: any): Promise<void> {
    // Trigger analysis from all analysts
    for (const analyst of this.agents.analysts) {
      try {
        await analyst.processTask(task);
      } catch (error) {
        logger.error(`Analysis failed for ${analyst.getId()}:`, error);
      }
    }
  }

  private startHealthMonitoring(): void {
    setInterval(async () => {
      if (this.isRunning) {
        const isHealthy = await this.coordinator.healthCheck();
        if (!isHealthy) {
          logger.warn('⚠️ Swarm health check failed - some agents may be unhealthy');
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private startDemoPredictionCycle(): void {
    // Demo: Create prediction tasks for popular markets
    const markets = ['BTC/USD', 'ETH/USD', 'SOL/USD'];
    
    setInterval(() => {
      if (this.isRunning) {
        const randomMarket = markets[Math.floor(Math.random() * markets.length)];
        this.addTask({
          id: `prediction_${Date.now()}`,
          type: 'market_prediction',
          market: randomMarket,
          timestamp: Date.now()
        });
        
        logger.info(`📊 Added prediction task for ${randomMarket}`);
      }
    }, 60000); // Every minute
  }

  public addTask(task: any): void {
    this.taskQueue.push(task);
    logger.info(`📝 Task added to queue: ${task.type}`);
  }

  public getStatus(): any {
    return {
      isRunning: this.isRunning,
      queueSize: this.taskQueue.length,
      agentCounts: {
        dataCollectors: this.agents.dataCollectors.length,
        analysts: this.agents.analysts.length,
        deliberation: this.agents.deliberation.length,
        execution: this.agents.execution.length
      },
      registeredAgents: this.coordinator.getRegisteredAgents().length
    };
  }
} 