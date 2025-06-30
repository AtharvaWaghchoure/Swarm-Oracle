import { BaseAgent } from './BaseAgent.js';
import { logger } from '../utils/logger.js';
export class DeliberationAgent extends BaseAgent {
    deliberationType;
    role;
    deliberationConfig;
    constructor(config) {
        super(config.id, config.type, config.coordinator);
        this.deliberationType = config.type;
        this.role = config.role;
        this.deliberationConfig = config.config;
    }
    /**
     * Process a task from the orchestrator
     */
    async processTask(task) {
        logger.info(`🏛️ ${this.id} processing task: ${task.type}`);
        try {
            switch (task.type) {
                case 'deliberate':
                    const result = await this.deliberate(task.proposals || [], task.consensus_threshold || 0.8);
                    return {
                        agentId: this.id,
                        taskType: 'deliberation',
                        timestamp: Date.now(),
                        success: true,
                        result: result
                    };
                case 'resolve_dispute':
                    const resolution = await this.resolveDispute(task.dispute || {});
                    return {
                        agentId: this.id,
                        taskType: 'dispute_resolution',
                        timestamp: Date.now(),
                        success: true,
                        resolution: resolution
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
        }
        catch (error) {
            logger.error(`❌ Deliberation failed for ${this.id}:`, error);
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
     * Deliberate based on agent's deliberation type
     */
    async deliberate(proposals, consensusThreshold) {
        switch (this.deliberationType) {
            case 'facilitator':
                return await this.facilitateConsensus({ proposals, consensusThreshold });
            case 'resolver':
                return await this.resolveDispute({ proposals, threshold: consensusThreshold });
            default:
                throw new Error(`Unknown deliberation type: ${this.deliberationType}`);
        }
    }
    async facilitateConsensus(task) {
        const { predictions, threshold } = task.data;
        // Analyze predictions from different agents
        const analysis = this.analyzePredictions(predictions);
        const consensus = this.calculateConsensus(analysis, threshold || 0.8);
        return {
            agentId: this.id,
            deliberationType: 'consensus',
            timestamp: Date.now(),
            consensus,
            confidence: consensus.strength,
            participatingAgents: predictions.map((p) => p.agentId),
            reasoning: this.explainConsensus(analysis, consensus)
        };
    }
    async resolveDispute(task) {
        const { conflictingPredictions, evidence } = task.data;
        // Analyze conflicting predictions and evidence
        const resolution = this.analyzeConflict(conflictingPredictions, evidence);
        const decision = this.makeResolutionDecision(resolution);
        return {
            agentId: this.id,
            deliberationType: 'dispute_resolution',
            timestamp: Date.now(),
            decision,
            confidence: decision.confidence,
            conflictingAgents: conflictingPredictions.map((p) => p.agentId),
            resolution,
            reasoning: this.explainResolution(resolution, decision)
        };
    }
    analyzePredictions(predictions) {
        const directions = { bullish: 0, bearish: 0, neutral: 0 };
        const strengths = [];
        const confidences = [];
        for (const prediction of predictions) {
            if (prediction.prediction && prediction.prediction.direction) {
                directions[prediction.prediction.direction]++;
                strengths.push(prediction.prediction.strength || 0.5);
            }
            confidences.push(prediction.confidence || 0.5);
        }
        return {
            totalPredictions: predictions.length,
            directions,
            averageStrength: strengths.reduce((sum, s) => sum + s, 0) / strengths.length,
            averageConfidence: confidences.reduce((sum, c) => sum + c, 0) / confidences.length,
            predictions
        };
    }
    calculateConsensus(analysis, threshold) {
        const total = analysis.totalPredictions;
        const { directions } = analysis;
        // Find the most common direction
        const dominantDirection = Object.entries(directions).reduce((a, b) => directions[a[0]] > directions[b[0]] ? a : b);
        const consensusRatio = dominantDirection[1] / total;
        const hasConsensus = consensusRatio >= threshold;
        return {
            hasConsensus,
            direction: dominantDirection[0],
            strength: consensusRatio,
            threshold,
            supportingAgents: consensusRatio * total,
            averageConfidence: analysis.averageConfidence
        };
    }
    analyzeConflict(conflictingPredictions, evidence) {
        const conflicts = [];
        const evidenceWeights = {};
        // Identify types of conflicts
        for (let i = 0; i < conflictingPredictions.length; i++) {
            for (let j = i + 1; j < conflictingPredictions.length; j++) {
                const pred1 = conflictingPredictions[i];
                const pred2 = conflictingPredictions[j];
                if (pred1.prediction.direction !== pred2.prediction.direction) {
                    conflicts.push({
                        agents: [pred1.agentId, pred2.agentId],
                        type: 'directional_conflict',
                        severity: Math.abs(pred1.confidence - pred2.confidence)
                    });
                }
            }
        }
        // Weight evidence by reliability
        for (const item of evidence) {
            evidenceWeights[item.source] = this.calculateEvidenceWeight(item);
        }
        return {
            conflicts,
            evidenceWeights,
            totalConflicts: conflicts.length,
            evidenceCount: evidence.length
        };
    }
    makeResolutionDecision(resolution) {
        // Simple resolution strategy - can be made more sophisticated
        const hasStrongEvidence = Object.values(resolution.evidenceWeights).some((weight) => weight > 0.8);
        const conflictSeverity = resolution.conflicts.reduce((sum, c) => sum + c.severity, 0) / resolution.conflicts.length;
        return {
            resolution: hasStrongEvidence ? 'evidence_based' : 'majority_vote',
            confidence: hasStrongEvidence ? 0.9 : Math.max(0.3, 1 - conflictSeverity),
            strategy: hasStrongEvidence ? 'Follow strongest evidence' : 'Defer to majority consensus',
            requiresHumanReview: conflictSeverity > 0.8
        };
    }
    calculateEvidenceWeight(evidence) {
        let weight = 0.5; // Base weight
        // Increase weight based on source reliability
        if (evidence.source === 'onchain')
            weight += 0.3;
        if (evidence.source === 'news')
            weight += 0.2;
        if (evidence.source === 'social')
            weight += 0.1;
        // Adjust for recency
        const ageHours = (Date.now() - evidence.timestamp) / (1000 * 60 * 60);
        if (ageHours < 1)
            weight += 0.2;
        else if (ageHours < 24)
            weight += 0.1;
        return Math.min(1, weight);
    }
    explainConsensus(analysis, consensus) {
        return `Consensus ${consensus.hasConsensus ? 'reached' : 'not reached'}: ${consensus.supportingAgents}/${analysis.totalPredictions} agents agree on ${consensus.direction} direction`;
    }
    explainResolution(resolution, decision) {
        return `Conflict resolved using ${decision.strategy} with ${decision.confidence * 100}% confidence. ${resolution.totalConflicts} conflicts identified.`;
    }
    createErrorResult(task, error) {
        return {
            agentId: this.id,
            deliberationType: this.deliberationType,
            timestamp: Date.now(),
            error: true,
            message: error.message,
            confidence: 0
        };
    }
}
//# sourceMappingURL=DeliberationAgent.js.map