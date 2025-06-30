// Configuration template for Swarm Oracle
// Copy this file to config.ts and fill in your values

/// <reference types="node" />

export const config = {
  // API Keys
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },

  // Social Media APIs
  twitter: {
    apiKey: process.env.TWITTER_API_KEY || '',
    apiSecret: process.env.TWITTER_API_SECRET || '',
  },
  reddit: {
    clientId: process.env.REDDIT_CLIENT_ID || '',
    clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
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
    ethereum: process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/your_key',
    polygon: process.env.POLYGON_RPC_URL || 'https://polygon-mainnet.g.alchemy.com/v2/your_key',
    arbitrum: process.env.ARBITRUM_RPC_URL || 'https://arb-mainnet.g.alchemy.com/v2/your_key',
    base: process.env.BASE_RPC_URL || 'https://base-mainnet.g.alchemy.com/v2/your_key',
  },

  // Chainlink Configuration
  chainlink: {
    functionsSubscriptionId: process.env.CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID || '',
    vrfSubscriptionId: process.env.CHAINLINK_VRF_SUBSCRIPTION_ID || '',
    ccipRouterAddress: process.env.CHAINLINK_CCIP_ROUTER_ADDRESS || '',
  },

  // Private Keys (use test keys for development)
  privateKeys: {
    deployer: process.env.DEPLOYER_PRIVATE_KEY || '',
    agentOperator: process.env.AGENT_OPERATOR_PRIVATE_KEY || '',
  },

  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/swarm_oracle',
    redis: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // Agent Configuration
  agents: {
    count: parseInt(process.env.AGENT_COUNT || '10'),
    reputationThreshold: parseFloat(process.env.REPUTATION_THRESHOLD || '0.7'),
    consensusThreshold: parseFloat(process.env.CONSENSUS_THRESHOLD || '0.8'),
  },

  // Market Configuration
  markets: {
    minDuration: parseInt(process.env.MIN_MARKET_DURATION || '3600'), // 1 hour
    maxDuration: parseInt(process.env.MAX_MARKET_DURATION || '31536000'), // 1 year
    minBetAmount: parseFloat(process.env.MIN_BET_AMOUNT || '0.01'),
    maxBetAmount: parseFloat(process.env.MAX_BET_AMOUNT || '1000'),
  },

  // Development
  development: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000'),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
  },
}; 