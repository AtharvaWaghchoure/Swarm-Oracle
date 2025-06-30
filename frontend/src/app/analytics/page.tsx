'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ChartBarIcon,
  PresentationChartLineIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  BanknotesIcon,
  UsersIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
} from 'recharts'

// Types
interface AnalyticsData {
  timestamp: string
  marketVolume: number
  totalPredictions: number
  agentAccuracy: number
  userEngagement: number
  crossChainActivity: number
  gasUsed: number
  transactionCount: number
}

interface MarketPerformance {
  category: string
  totalVolume: number
  accuracy: number
  participantCount: number
  avgDuration: number
  profitability: number
}

interface AgentAnalytics {
  agentType: string
  accuracy: number
  responseTime: number
  tasksCompleted: number
  errorRate: number
  efficiency: number
}

interface PredictionAccuracy {
  timeframe: string
  actualAccuracy: number
  targetAccuracy: number
  confidence: number
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16']

export default function Analytics() {
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d' | '90d'>('7d')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([])
  const [marketPerformance, setMarketPerformance] = useState<MarketPerformance[]>([])
  const [agentAnalytics, setAgentAnalytics] = useState<AgentAnalytics[]>([])
  const [predictionAccuracy, setPredictionAccuracy] = useState<PredictionAccuracy[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Initialize analytics data
  useEffect(() => {
    const generateTimeSeriesData = (days: number): AnalyticsData[] => {
      return Array.from({ length: days * 24 }, (_, i) => {
        const timestamp = new Date(Date.now() - (days * 24 - 1 - i) * 60 * 60 * 1000)
        return {
          timestamp: timestamp.toISOString(),
          marketVolume: 50000 + Math.random() * 100000,
          totalPredictions: Math.floor(Math.random() * 500) + 100,
          agentAccuracy: 0.75 + Math.random() * 0.2,
          userEngagement: Math.random() * 100,
          crossChainActivity: Math.floor(Math.random() * 50) + 10,
          gasUsed: Math.random() * 1000000,
          transactionCount: Math.floor(Math.random() * 1000) + 100,
        }
      })
    }

    const sampleMarketPerformance: MarketPerformance[] = [
      {
        category: 'Cryptocurrency',
        totalVolume: 2500000,
        accuracy: 0.84,
        participantCount: 1250,
        avgDuration: 45,
        profitability: 15.2,
      },
      {
        category: 'DeFi',
        totalVolume: 1800000,
        accuracy: 0.78,
        participantCount: 890,
        avgDuration: 32,
        profitability: 12.8,
      },
      {
        category: 'Technology',
        totalVolume: 2100000,
        accuracy: 0.91,
        participantCount: 1680,
        avgDuration: 28,
        profitability: 18.5,
      },
      {
        category: 'Finance',
        totalVolume: 3200000,
        accuracy: 0.73,
        participantCount: 2100,
        avgDuration: 52,
        profitability: 9.3,
      },
      {
        category: 'Sports',
        totalVolume: 950000,
        accuracy: 0.69,
        participantCount: 650,
        avgDuration: 14,
        profitability: 7.8,
      },
    ]

    const sampleAgentAnalytics: AgentAnalytics[] = [
      {
        agentType: 'Data Collector',
        accuracy: 0.89,
        responseTime: 145,
        tasksCompleted: 12500,
        errorRate: 2.1,
        efficiency: 94.2,
      },
      {
        agentType: 'Analyst',
        accuracy: 0.92,
        responseTime: 280,
        tasksCompleted: 8900,
        errorRate: 1.8,
        efficiency: 96.1,
      },
      {
        agentType: 'Deliberation',
        accuracy: 0.87,
        responseTime: 420,
        tasksCompleted: 3200,
        errorRate: 3.2,
        efficiency: 91.8,
      },
      {
        agentType: 'Execution',
        accuracy: 0.95,
        responseTime: 125,
        tasksCompleted: 5600,
        errorRate: 1.2,
        efficiency: 98.5,
      },
    ]

    const samplePredictionAccuracy: PredictionAccuracy[] = [
      { timeframe: 'Last Hour', actualAccuracy: 0.89, targetAccuracy: 0.85, confidence: 0.94 },
      { timeframe: 'Last 6 Hours', actualAccuracy: 0.87, targetAccuracy: 0.85, confidence: 0.92 },
      { timeframe: 'Last Day', actualAccuracy: 0.84, targetAccuracy: 0.85, confidence: 0.88 },
      { timeframe: 'Last Week', actualAccuracy: 0.86, targetAccuracy: 0.85, confidence: 0.91 },
      { timeframe: 'Last Month', actualAccuracy: 0.83, targetAccuracy: 0.85, confidence: 0.85 },
    ]

    const days = timeframe === '24h' ? 1 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90
    setAnalyticsData(generateTimeSeriesData(days))
    setMarketPerformance(sampleMarketPerformance)
    setAgentAnalytics(sampleAgentAnalytics)
    setPredictionAccuracy(samplePredictionAccuracy)
    setIsLoading(false)
  }, [timeframe])

  const aggregatedData = analyticsData.reduce(
    (acc, curr) => ({
      totalVolume: acc.totalVolume + curr.marketVolume,
      totalPredictions: acc.totalPredictions + curr.totalPredictions,
      avgAccuracy: (acc.avgAccuracy + curr.agentAccuracy) / 2,
      totalTransactions: acc.totalTransactions + curr.transactionCount,
    }),
    { totalVolume: 0, totalPredictions: 0, avgAccuracy: 0, totalTransactions: 0 }
  )

  const filteredMarkets = selectedCategory === 'all' 
    ? marketPerformance 
    : marketPerformance.filter(m => m.category.toLowerCase() === selectedCategory.toLowerCase())

  const getTimeframeData = () => {
    const hoursPerPoint = timeframe === '24h' ? 1 : timeframe === '7d' ? 6 : timeframe === '30d' ? 24 : 72
    return analyticsData.filter((_, index) => index % hoursPerPoint === 0)
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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
          <p className="text-slate-300">
            Deep insights into market performance, agent behavior, and prediction accuracy
          </p>
        </div>
        <div className="mt-4 lg:mt-0 flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-slate-700 rounded-lg p-1">
            {(['24h', '7d', '30d', '90d'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`px-3 py-1 rounded text-sm font-medium transition-all duration-200 ${
                  timeframe === period
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
          <button className="btn-secondary flex items-center space-x-2">
            <ArrowPathIcon className="h-5 w-5" />
            <span>Refresh</span>
          </button>
          <button className="btn-primary flex items-center space-x-2">
            <DocumentArrowDownIcon className="h-5 w-5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Volume</p>
              <p className="text-3xl font-bold text-white">${(aggregatedData.totalVolume / 1000000).toFixed(1)}M</p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg">
              <BanknotesIcon className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-green-400">
            <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
            +23.5% vs last period
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
              <p className="text-sm text-slate-400">Predictions Made</p>
              <p className="text-3xl font-bold text-white">{(aggregatedData.totalPredictions / 1000).toFixed(1)}K</p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <PresentationChartLineIcon className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-blue-400">
            <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
            +15.2% accuracy rate
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
              <p className="text-sm text-slate-400">Agent Accuracy</p>
              <p className="text-3xl font-bold text-white">{(aggregatedData.avgAccuracy * 100).toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <ChartBarIcon className="h-8 w-8 text-purple-400" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${aggregatedData.avgAccuracy * 100}%` }}
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
              <p className="text-sm text-slate-400">Transactions</p>
              <p className="text-3xl font-bold text-white">{(aggregatedData.totalTransactions / 1000).toFixed(1)}K</p>
            </div>
            <div className="p-3 bg-orange-500/20 rounded-lg">
              <UsersIcon className="h-8 w-8 text-orange-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-orange-400">
            <CheckCircleIcon className="h-4 w-4 mr-1" />
            98.5% success rate
          </div>
        </motion.div>
      </div>

      {/* Market Volume and Activity Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Market Volume Trends</h3>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="cryptocurrency">Cryptocurrency</option>
              <option value="defi">DeFi</option>
              <option value="technology">Technology</option>
              <option value="finance">Finance</option>
            </select>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={getTimeframeData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="timestamp" 
                  stroke="#9CA3AF" 
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                />
                <Area
                  type="monotone"
                  dataKey="marketVolume"
                  fill="url(#colorVolume)"
                  stroke="#3B82F6"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="totalPredictions"
                  stroke="#10B981"
                  strokeWidth={2}
                  yAxisId="right"
                />
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold text-white mb-6">Agent Performance Radar</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={agentAnalytics}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="agentType" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <PolarRadiusAxis 
                  angle={30} 
                  domain={[0, 100]} 
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  tickCount={4}
                />
                <Radar
                  name="Accuracy"
                  dataKey="accuracy"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Radar
                  name="Efficiency"
                  dataKey="efficiency"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Market Performance Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 card">
          <h3 className="text-xl font-semibold text-white mb-6">Market Category Performance</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredMarkets} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="category" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }}
                />
                <Bar dataKey="totalVolume" fill="#3B82F6" name="Volume ($)" />
                <Bar dataKey="participantCount" fill="#10B981" name="Participants" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold text-white mb-6">Accuracy Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={marketPerformance}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="accuracy"
                  nameKey="category"
                >
                  {marketPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }}
                  formatter={(value: any) => [`${(value * 100).toFixed(1)}%`, 'Accuracy']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {marketPerformance.map((category, index) => (
              <div key={category.category} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="text-sm text-slate-300">{category.category}</span>
                </div>
                <span className="text-sm text-slate-400">{(category.accuracy * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Prediction Accuracy Timeline */}
      <div className="card mb-8">
        <h3 className="text-xl font-semibold text-white mb-6">Prediction Accuracy Over Time</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={getTimeframeData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="timestamp" 
                stroke="#9CA3AF" 
                fontSize={12}
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis stroke="#9CA3AF" fontSize={12} domain={[0.5, 1]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
                labelFormatter={(value) => new Date(value).toLocaleString()}
                formatter={(value: any) => [`${(value * 100).toFixed(2)}%`, 'Accuracy']}
              />
              <Area
                type="monotone"
                dataKey="agentAccuracy"
                stroke="#10B981"
                fill="url(#colorAccuracy)"
                strokeWidth={3}
              />
              <defs>
                <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Analytics Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <h3 className="text-xl font-semibold text-white mb-6">Agent Performance Metrics</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 text-sm font-medium">Agent Type</th>
                  <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Accuracy</th>
                  <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Tasks</th>
                  <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {agentAnalytics.map((agent, index) => (
                  <tr key={agent.agentType} className="border-b border-slate-800">
                    <td className="py-3 px-4 text-white">{agent.agentType}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-medium ${agent.accuracy > 0.9 ? 'text-green-400' : agent.accuracy > 0.8 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {(agent.accuracy * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">{agent.tasksCompleted.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <div className="w-16 bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${agent.efficiency}%` }}
                          ></div>
                        </div>
                        <span className="text-slate-300 text-sm">{agent.efficiency.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold text-white mb-6">Market Performance Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 text-sm font-medium">Category</th>
                  <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Volume</th>
                  <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">ROI</th>
                  <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Participants</th>
                </tr>
              </thead>
              <tbody>
                {marketPerformance.map((market, index) => (
                  <tr key={market.category} className="border-b border-slate-800">
                    <td className="py-3 px-4 text-white">{market.category}</td>
                    <td className="py-3 px-4 text-right text-slate-300">
                      ${(market.totalVolume / 1000000).toFixed(1)}M
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-medium ${market.profitability > 15 ? 'text-green-400' : market.profitability > 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {market.profitability.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">{market.participantCount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
} 