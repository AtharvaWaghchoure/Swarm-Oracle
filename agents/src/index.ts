// Load environment variables
import 'dotenv/config';

// Configuration from environment variables
const config = {
  // API Keys
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  
  // RAPIDAPI for Social Media
  rapidApi: {
    key: process.env.RAPIDAPI_KEY || '',
  },
  
  // News APIs
  newsApi: {
    key: process.env.NEWS_API_KEY || '',
  },
  alphaVantage: {
    key: process.env.ALPHA_VANTAGE_API_KEY || '',
  },
  
  // Blockchain RPCs
  rpcs: {
    ethereum: process.env.SEPOLIA_RPC_URL || '',
    arbitrum: process.env.ARBITRUM_SEPOLIA_RPC_URL || '',
    base: process.env.BASE_SEPOLIA_RPC_URL || '',
  },
  
  // Chainlink Configuration
  chainlink: {
    functionsSubscriptionId: process.env.CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID || '',
    vrfSubscriptionId: process.env.CHAINLINK_VRF_SUBSCRIPTION_ID || '',
    ccipRouterAddress: process.env.CHAINLINK_CCIP_ROUTER_ADDRESS || '',
  },
  
  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/swarm_oracle',
    redis: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  // Agent Configuration
  agents: {
    consensusThreshold: 0.8,
  },
};

import { SwarmOrchestrator } from './orchestrator/SwarmOrchestrator.js';
import { DataCollectorAgent } from './agents/DataCollectorAgent.js';
import { AnalystAgent } from './agents/AnalystAgent.js';
import { DeliberationAgent } from './agents/DeliberationAgent.js';
import { ExecutionAgent } from './agents/ExecutionAgent.js';
import { AgentCoordinator } from './coordination/AgentCoordinator.js';
import { DatabaseManager } from './storage/DatabaseManager.js';
import { logger } from './utils/logger.js';

/**
 * Main entry point for the Swarm Oracle AI agent system
 */
async function main() {
  try {
    console.log("rpcs:",config.rpcs.arbitrum)
    logger.info('🚀 Starting Swarm Oracle AI Agent System');

    // Initialize database
    const dbManager = new DatabaseManager(config.database.url);
    await dbManager.connect();

    // Initialize agent coordinator
    const coordinator = new AgentCoordinator(dbManager);
    
    // Create specialized agents
    const agents = {
      dataCollectors: await createDataCollectorAgents(coordinator, config),
      analysts: await createAnalystAgents(coordinator, config),
      deliberation: await createDeliberationAgents(coordinator, config),
      execution: await createExecutionAgents(coordinator, config)
    };
    
    // Initialize orchestrator
    const orchestrator = new SwarmOrchestrator(coordinator, agents);
    
    logger.info('🚀 Swarm Oracle is running!');
    logger.info('📊 Agent swarm active and coordinating');
    logger.info('🔮 Ready to process prediction requests');
    
    // Start the orchestration loop
    await orchestrator.start();
    
    // Cleanup on shutdown
    const cleanup = async () => {
      logger.info('🛑 Shutting down Swarm Oracle...');
      await orchestrator.stop();
      await dbManager.disconnect();
      process.exit(0);
    };
    
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
  } catch (error) {
    logger.error('❌ Failed to start Swarm Oracle:', error);
    process.exit(1);
  }
}

// Agent creation functions
async function createDataCollectorAgents(coordinator: AgentCoordinator, config: any): Promise<any[]> {
  const agents = [
    new DataCollectorAgent({
      id: 'twitter-collector',
      type: 'twitter',
      coordinator,
      config: {
        apiKey: config.rapidApi?.key || process.env.RAPIDAPI_KEY,
        collectInterval: 300000, // 5 minutes
        topics: ['BTC', 'ETH', 'crypto', 'bitcoin', 'ethereum']
      }
    }),
    new DataCollectorAgent({
      id: 'reddit-collector',
      type: 'reddit',
      coordinator,
      config: {
        apiKey: config.rapidApi?.key || process.env.RAPIDAPI_KEY,
        collectInterval: 600000, // 10 minutes
        subreddits: ['cryptocurrency', 'bitcoin', 'ethereum', 'cryptomarkets']
      }
    }),
    new DataCollectorAgent({
      id: 'news-collector',
      type: 'news',
      coordinator,
      config: {
        apiKey: config.newsApi.key,
        collectInterval: 900000, // 15 minutes
        sources: ['coindesk', 'cointelegraph', 'reuters', 'bloomberg']
      }
    }),
    new DataCollectorAgent({
      id: 'onchain-collector',
      type: 'onchain',
      coordinator,
      config: {
        rpcs: config.rpcs,
        collectInterval: 180000, // 3 minutes
        contracts: []
      }
    })
  ];

  for (const agent of agents) {
    await coordinator.registerAgent(agent);
  }

  return agents;
}

async function createAnalystAgents(coordinator: AgentCoordinator, config: any): Promise<any[]> {
  const agents = [
    new AnalystAgent({
      id: 'technical-analyst',
      type: 'technical',
      coordinator,
      specialty: 'price_patterns',
      config: {
        indicators: ['RSI', 'MACD', 'SMA', 'EMA'],
        timeframes: ['1h', '4h', '1d'],
        analysisInterval: 300000
      }
    }),
    new AnalystAgent({
      id: 'fundamental-analyst',
      type: 'fundamental',
      coordinator,
      specialty: 'market_fundamentals',
      config: {
        metrics: ['market_cap', 'volume', 'social_sentiment'],
        analysisInterval: 1800000
      }
    }),
    new AnalystAgent({
      id: 'sentiment-analyst',
      type: 'sentiment',
      coordinator,
      specialty: 'social_sentiment',
      config: {
        sources: ['twitter', 'reddit', 'news'],
        analysisInterval: 600000
      }
    }),
    new AnalystAgent({
      id: 'correlation-analyst',
      type: 'correlation',
      coordinator,
      specialty: 'cross_asset_correlation',
      config: {
        assets: ['BTC', 'ETH', 'SPY'],
        analysisInterval: 3600000
      }
    })
  ];

  for (const agent of agents) {
    await coordinator.registerAgent(agent);
  }

  return agents;
}

async function createDeliberationAgents(coordinator: AgentCoordinator, config: any): Promise<any[]> {
  const agents = [
    new DeliberationAgent({
      id: 'consensus-facilitator',
      type: 'facilitator',
      coordinator,
      role: 'consensus_building',
      config: {
        consensusThreshold: config.agents.consensusThreshold,
        deliberationTimeout: 300000
      }
    }),
    new DeliberationAgent({
      id: 'dispute-resolver',
      type: 'resolver',
      coordinator,
      role: 'conflict_resolution',
      config: {
        resolutionStrategies: ['evidence_weighing', 'majority_vote'],
        maxResolutionTime: 600000
      }
    })
  ];

  for (const agent of agents) {
    await coordinator.registerAgent(agent);
  }

  return agents;
}

async function createExecutionAgents(coordinator: AgentCoordinator, config: any): Promise<any[]> {
  const agents = [
    new ExecutionAgent({
      id: 'risk-manager',
      type: 'risk_manager',
      coordinator,
      role: 'position_sizing',
      config: {
        maxPositionSize: 1000,
        riskLimits: {
          perMarket: 0.05,
          perCategory: 0.20,
          total: 0.50
        }
      }
    }),
    new ExecutionAgent({
      id: 'cross-chain-executor',
      type: 'cross_chain',
      coordinator,
      role: 'cross_chain_operations',
      config: {
        supportedChains: ['ethereum', 'arbitrum', 'base'],
        gasOptimization: true
      }
    }),
    new ExecutionAgent({
      id: 'mev-protector',
      type: 'mev_protector',
      coordinator,
      role: 'mev_mitigation',
      config: {
        strategies: ['private_mempool', 'randomized_timing'],
        maxSlippage: 0.01
      }
    })
  ];

  for (const agent of agents) {
    await coordinator.registerAgent(agent);
  }

  return agents;
}

// Start the system
main().catch(console.error);

export { main }; 