'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  UserIcon,
  CogIcon,
  ChartBarIcon,
  TrophyIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  BellIcon,
  ShieldCheckIcon,
  KeyIcon,
  EyeIcon,
  PencilIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CheckCircleIcon,
  XMarkIcon,
  PhotoIcon,
  WalletIcon,
  GlobeAltIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'

// Types
interface UserProfile {
  id: string
  username: string
  email: string
  avatar?: string
  walletAddress: string
  memberSince: string
  totalVolume: number
  totalPredictions: number
  accuracy: number
  rank: number
  totalPnL: number
  winRate: number
  streak: number
  badges: string[]
}

interface TradingHistory {
  id: string
  marketTitle: string
  prediction: 'YES' | 'NO'
  amount: number
  outcome: 'win' | 'loss' | 'pending'
  pnl: number
  timestamp: string
  confidence: number
}

interface Portfolio {
  activePositions: number
  totalValue: number
  dailyChange: number
  weeklyChange: number
  monthlyChange: number
  positions: {
    market: string
    position: 'YES' | 'NO'
    amount: number
    currentValue: number
    pnl: number
    pnlPercentage: number
  }[]
}

interface Settings {
  notifications: {
    email: boolean
    push: boolean
    marketUpdates: boolean
    priceAlerts: boolean
  }
  privacy: {
    publicProfile: boolean
    showTradingHistory: boolean
    showPortfolio: boolean
  }
  trading: {
    autoApprove: boolean
    riskTolerance: 'low' | 'medium' | 'high'
    defaultSlippage: number
  }
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

export default function Profile() {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'portfolio' | 'settings'>('overview')
  const [user, setUser] = useState<UserProfile | null>(null)
  const [tradingHistory, setTradingHistory] = useState<TradingHistory[]>([])
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize user data
  useEffect(() => {
    const sampleUser: UserProfile = {
      id: 'user-1',
      username: 'CryptoTrader',
      email: 'trader@example.com',
      walletAddress: '0x1234...5678',
      memberSince: '2023-01-15',
      totalVolume: 125000,
      totalPredictions: 342,
      accuracy: 0.73,
      rank: 156,
      totalPnL: 12500,
      winRate: 0.68,
      streak: 5,
      badges: ['Early Adopter', 'High Volume Trader', 'Accurate Predictor', 'Streak Master'],
    }

    const sampleHistory: TradingHistory[] = Array.from({ length: 20 }, (_, i) => ({
      id: `trade-${i}`,
      marketTitle: [
        'Will Bitcoin reach $100,000 by end of 2024?',
        'Will Ethereum 2.0 staking rewards exceed 5% APY?',
        'Will a major AI breakthrough be announced at NeurIPS 2024?',
        'Will the S&P 500 close above 5000 by year end?',
      ][Math.floor(Math.random() * 4)],
      prediction: Math.random() > 0.5 ? 'YES' : 'NO',
      amount: Math.floor(Math.random() * 5000) + 100,
      outcome: ['win', 'loss', 'pending'][Math.floor(Math.random() * 3)] as any,
      pnl: (Math.random() - 0.5) * 2000,
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      confidence: 0.6 + Math.random() * 0.3,
    }))

    const samplePortfolio: Portfolio = {
      activePositions: 8,
      totalValue: 25000,
      dailyChange: 450,
      weeklyChange: -230,
      monthlyChange: 1200,
      positions: Array.from({ length: 8 }, (_, i) => ({
        market: `Market ${i + 1}`,
        position: Math.random() > 0.5 ? 'YES' : 'NO',
        amount: Math.floor(Math.random() * 3000) + 500,
        currentValue: Math.floor(Math.random() * 4000) + 400,
        pnl: (Math.random() - 0.5) * 1000,
        pnlPercentage: (Math.random() - 0.5) * 50,
      })),
    }

    const sampleSettings: Settings = {
      notifications: {
        email: true,
        push: false,
        marketUpdates: true,
        priceAlerts: true,
      },
      privacy: {
        publicProfile: true,
        showTradingHistory: false,
        showPortfolio: false,
      },
      trading: {
        autoApprove: false,
        riskTolerance: 'medium',
        defaultSlippage: 0.5,
      },
    }

    setUser(sampleUser)
    setTradingHistory(sampleHistory)
    setPortfolio(samplePortfolio)
    setSettings(sampleSettings)
    setIsLoading(false)
  }, [])

  const performanceData = tradingHistory
    .filter(trade => trade.outcome !== 'pending')
    .slice(-30)
    .map((trade, index) => ({
      trade: index + 1,
      cumulativePnL: tradingHistory
        .slice(0, index + 1)
        .reduce((sum, t) => sum + (t.outcome === 'win' ? Math.abs(t.pnl) : -Math.abs(t.pnl)), 0),
      winRate: tradingHistory
        .slice(0, index + 1)
        .filter(t => t.outcome === 'win').length / (index + 1),
    }))

  const portfolioDistribution = portfolio?.positions.map((pos, index) => ({
    name: pos.market,
    value: pos.currentValue,
    pnl: pos.pnl,
    color: COLORS[index % COLORS.length],
  })) || []

  if (isLoading || !user || !portfolio || !settings) {
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
        <div className="flex items-center space-x-6">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              {user.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                <UserIcon className="h-10 w-10 text-white" />
              )}
            </div>
            <button className="absolute -bottom-2 -right-2 p-1.5 bg-slate-700 rounded-full border-2 border-slate-800 hover:bg-slate-600 transition-colors">
              <PhotoIcon className="h-4 w-4 text-slate-300" />
            </button>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">{user.username}</h1>
            <p className="text-slate-300">Member since {new Date(user.memberSince).toLocaleDateString()}</p>
            <p className="text-sm text-slate-400">Rank #{user.rank.toLocaleString()}</p>
          </div>
        </div>
        <div className="mt-4 lg:mt-0 flex items-center space-x-4">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="btn-secondary flex items-center space-x-2"
          >
            <PencilIcon className="h-5 w-5" />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
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
              <p className="text-3xl font-bold text-white">${user.totalVolume.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg">
              <CurrencyDollarIcon className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-green-400">
            <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
            All time volume
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
              <p className="text-sm text-slate-400">Total P&L</p>
              <p className={`text-3xl font-bold ${user.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {user.totalPnL >= 0 ? '+' : ''}${user.totalPnL.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <ChartBarIcon className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-blue-400">
            <TrophyIcon className="h-4 w-4 mr-1" />
            {(user.totalPnL / user.totalVolume * 100).toFixed(1)}% ROI
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
              <p className="text-sm text-slate-400">Accuracy</p>
              <p className="text-3xl font-bold text-white">{(user.accuracy * 100).toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <TrophyIcon className="h-8 w-8 text-purple-400" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${user.accuracy * 100}%` }}
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
              <p className="text-sm text-slate-400">Win Streak</p>
              <p className="text-3xl font-bold text-white">{user.streak}</p>
            </div>
            <div className="p-3 bg-orange-500/20 rounded-lg">
              <CheckCircleIcon className="h-8 w-8 text-orange-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-orange-400">
            <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
            Current streak
          </div>
        </motion.div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-slate-800 rounded-lg p-1 mb-8">
        {[
          { id: 'overview', label: 'Overview', icon: ChartBarIcon },
          { id: 'history', label: 'Trading History', icon: CalendarIcon },
          { id: 'portfolio', label: 'Portfolio', icon: WalletIcon },
          { id: 'settings', label: 'Settings', icon: CogIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-blue-500 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Performance Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-6">Performance Over Time</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="trade" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulativePnL"
                      stroke="#10B981"
                      strokeWidth={2}
                      name="Cumulative P&L"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-6">Win Rate Trend</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="trade" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} domain={[0, 1]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }}
                      formatter={(value: any) => [`${(value * 100).toFixed(1)}%`, 'Win Rate']}
                    />
                    <Area
                      type="monotone"
                      dataKey="winRate"
                      stroke="#3B82F6"
                      fill="url(#colorWinRate)"
                      strokeWidth={2}
                    />
                    <defs>
                      <linearGradient id="colorWinRate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="card">
            <h3 className="text-xl font-semibold text-white mb-6">Achievements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {user.badges.map((badge, index) => (
                <div key={badge} className="flex items-center space-x-3 p-4 bg-slate-800/50 rounded-lg">
                  <div className={`p-2 rounded-lg ${
                    index === 0 ? 'bg-yellow-500/20' :
                    index === 1 ? 'bg-blue-500/20' :
                    index === 2 ? 'bg-green-500/20' : 'bg-purple-500/20'
                  }`}>
                    <TrophyIcon className={`h-6 w-6 ${
                      index === 0 ? 'text-yellow-400' :
                      index === 1 ? 'text-blue-400' :
                      index === 2 ? 'text-green-400' : 'text-purple-400'
                    }`} />
                  </div>
                  <span className="text-white font-medium">{badge}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card">
          <h3 className="text-xl font-semibold text-white mb-6">Recent Trading History</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 text-sm font-medium">Market</th>
                  <th className="text-center py-3 px-4 text-slate-400 text-sm font-medium">Prediction</th>
                  <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Amount</th>
                  <th className="text-center py-3 px-4 text-slate-400 text-sm font-medium">Outcome</th>
                  <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">P&L</th>
                  <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {tradingHistory.slice(0, 10).map((trade) => (
                  <tr key={trade.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-white max-w-xs truncate">{trade.marketTitle}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        trade.prediction === 'YES' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {trade.prediction}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">${trade.amount.toLocaleString()}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        trade.outcome === 'win' ? 'bg-green-500/20 text-green-400' :
                        trade.outcome === 'loss' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {trade.outcome}
                      </span>
                    </td>
                    <td className={`py-3 px-4 text-right font-medium ${
                      trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 text-sm">
                      {new Date(trade.timestamp).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'portfolio' && (
        <div className="space-y-8">
          {/* Portfolio Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card">
              <p className="text-sm text-slate-400">Total Value</p>
              <p className="text-2xl font-bold text-white">${portfolio.totalValue.toLocaleString()}</p>
            </div>
            <div className="card">
              <p className="text-sm text-slate-400">Daily Change</p>
              <p className={`text-2xl font-bold ${portfolio.dailyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {portfolio.dailyChange >= 0 ? '+' : ''}${portfolio.dailyChange.toFixed(2)}
              </p>
            </div>
            <div className="card">
              <p className="text-sm text-slate-400">Weekly Change</p>
              <p className={`text-2xl font-bold ${portfolio.weeklyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {portfolio.weeklyChange >= 0 ? '+' : ''}${portfolio.weeklyChange.toFixed(2)}
              </p>
            </div>
            <div className="card">
              <p className="text-sm text-slate-400">Active Positions</p>
              <p className="text-2xl font-bold text-white">{portfolio.activePositions}</p>
            </div>
          </div>

          {/* Portfolio Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 card">
              <h3 className="text-xl font-semibold text-white mb-6">Active Positions</h3>
              <div className="space-y-4">
                {portfolio.positions.map((position, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">{position.market}</h4>
                      <p className="text-sm text-slate-400">
                        {position.position} • ${position.amount.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium">${position.currentValue.toLocaleString()}</p>
                      <p className={`text-sm ${position.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)} ({position.pnlPercentage >= 0 ? '+' : ''}{position.pnlPercentage.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-6">Portfolio Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={portfolioDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {portfolioDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-8">
          {/* Account Settings */}
          <div className="card">
            <h3 className="text-xl font-semibold text-white mb-6">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
                <input
                  type="text"
                  value={user.username}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <input
                  type="email"
                  value={user.email}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Wallet Address</label>
                <input
                  type="text"
                  value={user.walletAddress}
                  disabled
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="card">
            <h3 className="text-xl font-semibold text-white mb-6">Notifications</h3>
            <div className="space-y-4">
              {Object.entries(settings.notifications).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-white capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <button
                    onClick={() => setSettings(prev => prev ? {
                      ...prev,
                      notifications: { ...prev.notifications, [key]: !value }
                    } : null)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      value ? 'bg-blue-500' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        value ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="card">
            <h3 className="text-xl font-semibold text-white mb-6">Privacy</h3>
            <div className="space-y-4">
              {Object.entries(settings.privacy).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-white capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <button
                    onClick={() => setSettings(prev => prev ? {
                      ...prev,
                      privacy: { ...prev.privacy, [key]: !value }
                    } : null)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      value ? 'bg-blue-500' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        value ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Trading Settings */}
          <div className="card">
            <h3 className="text-xl font-semibold text-white mb-6">Trading Preferences</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Risk Tolerance</label>
                <select
                  value={settings.trading.riskTolerance}
                  onChange={(e) => setSettings(prev => prev ? {
                    ...prev,
                    trading: { ...prev.trading, riskTolerance: e.target.value as any }
                  } : null)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Default Slippage (%)</label>
                <input
                  type="number"
                  value={settings.trading.defaultSlippage}
                  onChange={(e) => setSettings(prev => prev ? {
                    ...prev,
                    trading: { ...prev.trading, defaultSlippage: parseFloat(e.target.value) }
                  } : null)}
                  step="0.1"
                  min="0"
                  max="5"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white">Auto-approve transactions</span>
                <button
                  onClick={() => setSettings(prev => prev ? {
                    ...prev,
                    trading: { ...prev.trading, autoApprove: !prev.trading.autoApprove }
                  } : null)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.trading.autoApprove ? 'bg-blue-500' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.trading.autoApprove ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 