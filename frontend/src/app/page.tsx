'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  CpuChipIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  BoltIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

// Types
interface AgentStatus {
  id: string
  name: string
  type: string
  status: 'active' | 'idle' | 'error'
  lastActivity: string
  tasksCompleted: number
  accuracy: number
}

interface SystemMetrics {
  totalAgents: number
  activeAgents: number
  tasksProcessed: number
  avgResponseTime: number
  systemHealth: number
  uptime: string
}

interface MarketData {
  timestamp: string
  price: number
  volume: number
  predictions: number
}

export default function Dashboard() {
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalAgents: 13,
    activeAgents: 0,
    tasksProcessed: 0,
    avgResponseTime: 0,
    systemHealth: 0,
    uptime: '0h 0m',
  })
  const [marketData, setMarketData] = useState<MarketData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Initialize agents data
  useEffect(() => {
    const initializeAgents = () => {
      const agentTypes = [
        { name: 'Twitter Collector', type: 'Data Collector' },
        { name: 'Reddit Collector', type: 'Data Collector' },
        { name: 'News Collector', type: 'Data Collector' },
        { name: 'OnChain Collector', type: 'Data Collector' },
        { name: 'Technical Analyst', type: 'Analyst' },
        { name: 'Fundamental Analyst', type: 'Analyst' },
        { name: 'Sentiment Analyst', type: 'Analyst' },
        { name: 'Correlation Analyst', type: 'Analyst' },
        { name: 'Consensus Facilitator', type: 'Deliberation' },
        { name: 'Dispute Resolver', type: 'Deliberation' },
        { name: 'Risk Manager', type: 'Execution' },
        { name: 'Cross-Chain Executor', type: 'Execution' },
        { name: 'MEV Protector', type: 'Execution' },
      ]

      const initialAgents: AgentStatus[] = agentTypes.map((agent, index) => ({
        id: `agent-${index}`,
        name: agent.name,
        type: agent.type,
        status: Math.random() > 0.2 ? 'active' : 'idle',
        lastActivity: new Date(Date.now() - Math.random() * 300000).toISOString(),
        tasksCompleted: Math.floor(Math.random() * 100),
        accuracy: 0.85 + Math.random() * 0.12,
      }))

      setAgents(initialAgents)
      setIsLoading(false)
    }

    const generateMarketData = () => {
      const data: MarketData[] = []
      const now = Date.now()
      for (let i = 23; i >= 0; i--) {
        data.push({
          timestamp: new Date(now - i * 60 * 60 * 1000).toLocaleTimeString(),
          price: 50000 + Math.random() * 10000,
          volume: Math.random() * 1000000,
          predictions: Math.floor(Math.random() * 50),
        })
      }
      setMarketData(data)
    }

    initializeAgents()
    generateMarketData()
  }, [])

  // Update metrics based on agents
  useEffect(() => {
    const activeCount = agents.filter(agent => agent.status === 'active').length
    const totalTasks = agents.reduce((sum, agent) => sum + agent.tasksCompleted, 0)
    const avgAccuracy = agents.reduce((sum, agent) => sum + agent.accuracy, 0) / agents.length

    setMetrics({
      totalAgents: agents.length,
      activeAgents: activeCount,
      tasksProcessed: totalTasks,
      avgResponseTime: 150 + Math.random() * 50,
      systemHealth: avgAccuracy * 100,
      uptime: '12h 34m',
    })
  }, [agents])

  // Real-time updates simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents(prev => prev.map(agent => ({
        ...agent,
        status: Math.random() > 0.1 ? 'active' : agent.status,
        lastActivity: Math.random() > 0.7 ? new Date().toISOString() : agent.lastActivity,
        tasksCompleted: agent.tasksCompleted + (Math.random() > 0.5 ? 1 : 0),
      })))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/10'
      case 'idle': return 'text-yellow-400 bg-yellow-400/10'
      case 'error': return 'text-red-400 bg-red-400/10'
      default: return 'text-gray-400 bg-gray-400/10'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return CheckCircleIcon
      case 'idle': return ClockIcon
      case 'error': return ExclamationTriangleIcon
      default: return CpuChipIcon
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Swarm Oracle Dashboard
        </h1>
        <p className="text-slate-300">
          Real-time monitoring of AI agent swarm and prediction markets
        </p>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div 
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Active Agents</p>
              <p className="text-3xl font-bold text-white">{metrics.activeAgents}/{metrics.totalAgents}</p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <CpuChipIcon className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-green-400">
            <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
            {((metrics.activeAgents / metrics.totalAgents) * 100).toFixed(1)}% operational
          </div>
        </motion.div>

        <motion.div 
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Tasks Processed</p>
              <p className="text-3xl font-bold text-white">{metrics.tasksProcessed.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg">
              <ChartBarIcon className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-green-400">
            <BoltIcon className="h-4 w-4 mr-1" />
            +{Math.floor(Math.random() * 10)} in last hour
          </div>
        </motion.div>

        <motion.div 
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">System Health</p>
              <p className="text-3xl font-bold text-white">{metrics.systemHealth.toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <CheckCircleIcon className="h-8 w-8 text-purple-400" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${metrics.systemHealth}%` }}
              ></div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Avg Response</p>
              <p className="text-3xl font-bold text-white">{metrics.avgResponseTime.toFixed(0)}ms</p>
            </div>
            <div className="p-3 bg-orange-500/20 rounded-lg">
              <ClockIcon className="h-8 w-8 text-orange-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-slate-400">
            <ClockIcon className="h-4 w-4 mr-1" />
            Uptime: {metrics.uptime}
          </div>
        </motion.div>
      </div>

      {/* Agent Grid and Market Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Agent Status Grid */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Agent Swarm Status</h2>
              <div className="flex items-center space-x-2">
                <EyeIcon className="h-5 w-5 text-slate-400" />
                <span className="text-sm text-slate-400">Live Monitoring</span>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agents.map((agent, index) => {
                const StatusIcon = getStatusIcon(agent.status)
                return (
                  <motion.div
                    key={agent.id}
                    className={`p-4 rounded-lg border transition-all duration-200 hover:border-slate-600 ${
                      agent.status === 'active' ? 'agent-pulse border-green-500/30' : 'border-slate-700'
                    }`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <StatusIcon className={`h-5 w-5 ${getStatusColor(agent.status).split(' ')[0]}`} />
                        <span className="font-medium text-white text-sm">{agent.name}</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                        {agent.status}
                      </span>
                    </div>
                    
                    <div className="text-xs text-slate-400 mb-2">
                      {agent.type} • {agent.tasksCompleted} tasks
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        Last: {new Date(agent.lastActivity).toLocaleTimeString()}
                      </span>
                      <span className="text-green-400 font-medium">
                        {(agent.accuracy * 100).toFixed(1)}%
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Market Activity Chart */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-6">Market Activity (24h)</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={marketData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="timestamp" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="predictions" 
                  stroke="#3B82F6" 
                  fill="url(#colorPredictions)" 
                  strokeWidth={2}
                />
                <defs>
                  <linearGradient id="colorPredictions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <motion.div 
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h2 className="text-xl font-semibold text-white mb-6">Recent Agent Activity</h2>
        <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
          {agents.slice(0, 8).map((agent, index) => (
            <div key={`activity-${agent.id}`} className="flex items-center space-x-3 p-3 rounded-lg bg-slate-800/30">
              <div className={`w-2 h-2 rounded-full ${
                agent.status === 'active' ? 'bg-green-400' : 
                agent.status === 'idle' ? 'bg-yellow-400' : 'bg-red-400'
              }`}></div>
              <div className="flex-1">
                <p className="text-sm text-white">
                  <span className="font-medium">{agent.name}</span> completed {agent.type.toLowerCase()} task
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(agent.lastActivity).toLocaleString()} • Accuracy: {(agent.accuracy * 100).toFixed(1)}%
                </p>
              </div>
              <div className="text-xs text-slate-500">
                {Math.floor((Date.now() - new Date(agent.lastActivity).getTime()) / 60000)}m ago
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
