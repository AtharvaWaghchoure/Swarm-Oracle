import { BaseAgent } from './BaseAgent.js';
import { logger } from '../utils/logger.js';

export interface ExecutionAgentConfig {
  id: string;
  type: 'risk_manager' | 'cross_chain' | 'mev_protector';
  coordinator: any;
  role: string;
  config: {
    [key: string]: any;
  };
}

export class ExecutionAgent extends BaseAgent {
  private executionType: string;
  private role: string;
  private executionConfig: any;

  constructor(config: ExecutionAgentConfig) {
    super(config.id, config.type, config.coordinator);

    this.executionType = config.type;
    this.role = config.role;
    this.executionConfig = config.config;
  }

  /**
   * Process a task from the orchestrator
   */
  async processTask(task: any): Promise<any> {
    logger.info(`⚡ ${this.id} processing task: ${task.type}`);

    try {
      switch (task.type) {
        case 'execute_trade':
          const result = await this.execute(task.tradeDetails || {});
          return {
            agentId: this.id,
            taskType: 'execution',
            timestamp: Date.now(),
            success: true,
            result: result
          };
        case 'manage_risk':
          const riskResult = await this.manageRisk(task.riskData || {});
          return {
            agentId: this.id,
            taskType: 'risk_management',
            timestamp: Date.now(),
            success: true,
            result: riskResult
          };
        case 'cross_chain_bridge':
          const bridgeResult = await this.executeCrossChain(task.bridgeData || {});
          return {
            agentId: this.id,
            taskType: 'cross_chain',
            timestamp: Date.now(),
            success: true,
            result: bridgeResult
          };
        default:
          logger.warn(`Unknown task type: ${task.type}`);
          return {
            agentId: this.id,
            taskType: task.type,
            timestamp: Date.now(),
            success: false,
            error: 'Unknown task type'
          };
      }
    } catch (error) {
      logger.error(`❌ Execution failed for ${this.id}:`, error);
      return {
        agentId: this.id,
        taskType: task.type,
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Execute based on agent's execution type
   */
  private async execute(details: any): Promise<any> {
    switch (this.executionType) {
      case 'risk_manager':
        return await this.manageRisk(details);
      case 'cross_chain':
        return await this.executeCrossChain(details);
      case 'mev_protector':
        return await this.protectFromMEV(details);
      default:
        throw new Error(`Unknown execution type: ${this.executionType}`);
    }
  }

  private async manageRisk(task: any): Promise<any> {
    const { prediction, marketData, riskParameters } = task.data;
    
    const riskAssessment = this.assessRisk(prediction, marketData, riskParameters);
    const recommendation = this.generateRiskRecommendation(riskAssessment);
    
    return {
      agentId: this.id,
      executionType: 'risk_management',
      timestamp: Date.now(),
      riskAssessment,
      recommendation,
      confidence: riskAssessment.confidence,
      reasoning: `Risk level: ${riskAssessment.riskLevel}, Action: ${recommendation.action}`
    };
  }

  private async executeCrossChain(task: any): Promise<any> {
    const { sourceChain, targetChain, amount, operation } = task.data;
    
    const executionPlan = {
      sourceChain,
      targetChain,
      amount,
      operation,
      bridge: 'Chainlink CCIP',
      estimatedTime: 15,
      fees: { total: amount * 0.005 }
    };
    
    return {
      agentId: this.id,
      executionType: 'cross_chain',
      timestamp: Date.now(),
      executionPlan,
      confidence: 0.9,
      status: 'planned',
      reasoning: `Cross-chain execution planned from ${sourceChain} to ${targetChain}`
    };
  }

  private async protectFromMEV(task: any): Promise<any> {
    const { transaction, marketConditions } = task.data;
    
    const mevRisk = this.assessMEVRisk(transaction, marketConditions);
    const protectionStrategy = this.selectProtectionStrategy(mevRisk);
    
    return {
      agentId: this.id,
      executionType: 'mev_protection',
      timestamp: Date.now(),
      mevRisk,
      protectionStrategy,
      confidence: 0.85,
      reasoning: `MEV risk: ${mevRisk.riskLevel}, Protection: ${protectionStrategy.primary}`
    };
  }

  private assessRisk(prediction: any, marketData: any, riskParameters: any): any {
    const confidenceRisk = 1 - (prediction.confidence || 0.5);
    const volatilityRisk = (marketData.volatility || 0.2) / 0.5;
    const overall = Math.min(1, (confidenceRisk + volatilityRisk) / 2);
    
    return {
      overall,
      confidence: 0.8,
      riskLevel: overall > 0.7 ? 'high' : overall > 0.4 ? 'medium' : 'low'
    };
  }

  private generateRiskRecommendation(riskAssessment: any): any {
    const { riskLevel } = riskAssessment;
    
    if (riskLevel === 'high') {
      return { action: 'reject', maxExposure: 0 };
    } else if (riskLevel === 'medium') {
      return { action: 'proceed_with_caution', maxExposure: 0.5 };
    } else {
      return { action: 'proceed', maxExposure: 0.8 };
    }
  }

  private assessMEVRisk(transaction: any, marketConditions: any): any {
    const slippageRisk = Math.min(1, (transaction.amount || 0) / (marketConditions.liquidity || 1000000) * 100);
    const overall = slippageRisk;
    
    return {
      overall,
      slippage: slippageRisk,
      riskLevel: overall > 0.7 ? 'high' : overall > 0.4 ? 'medium' : 'low'
    };
  }

  private selectProtectionStrategy(mevRisk: any): any {
    if (mevRisk.riskLevel === 'high') {
      return { primary: 'private_mempool', gasStrategy: 'aggressive_gas' };
    } else if (mevRisk.riskLevel === 'medium') {
      return { primary: 'split_transaction', gasStrategy: 'standard_gas' };
    } else {
      return { primary: 'standard_protection', gasStrategy: 'standard_gas' };
    }
  }

  private createErrorResult(task: any, error: any): any {
    return {
      agentId: this.id,
      executionType: this.executionType,
      timestamp: Date.now(),
      error: true,
      message: error.message,
      confidence: 0
    };
  }
} 