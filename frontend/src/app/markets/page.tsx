'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  MagnifyingGlassIcon, 
  PlusIcon,
  ClockIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { useContracts } from '@/hooks/useContracts'
import { type Market } from '@/lib/contracts'

const categories = ['All', 'Cryptocurrency', 'DeFi', 'Technology', 'Finance', 'Sports', 'Politics']

export default function MarketsPage() {
  const { 
    markets, 
    isLoading, 
    error,
    isConnected,
    isWalletConnected,
    createMarket,
    placeBet,
    refreshMarkets
  } = useContracts()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showBetModal, setShowBetModal] = useState(false)
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Create Market Form
  const [newQuestion, setNewQuestion] = useState('')
  const [newCategory, setNewCategory] = useState('Cryptocurrency')
  const [newDuration, setNewDuration] = useState(7) // days
  const [isCreating, setIsCreating] = useState(false)
  
  // Bet Form
  const [betAmount, setBetAmount] = useState('')
  const [betSide, setBetSide] = useState<'yes' | 'no'>('yes')
  const [isBetting, setIsBetting] = useState(false)
  const [betError, setBetError] = useState<string | null>(null)

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refreshMarkets()
    setTimeout(() => setIsRefreshing(false), 1000) // Give visual feedback
  }

  // Filter markets
  const filteredMarkets = markets.filter(market => {
    const matchesSearch = market.question.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || market.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Handle create market
  const handleCreateMarket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newQuestion.trim()) return

    try {
      setIsCreating(true)
      const result = await createMarket(
        newQuestion, 
        newCategory, 
        newDuration * 24 * 60 * 60 // Convert days to seconds
      )
      
      if (result.success) {
        console.log('✅ Market created:', result.txHash)
        setShowCreateModal(false)
        setNewQuestion('')
        // Markets will refresh automatically
      }
    } catch (error) {
      console.error('❌ Failed to create market:', error)
    } finally {
      setIsCreating(false)
    }
  }

  // Handle place bet
  const handlePlaceBet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMarket || !betAmount) return

    try {
      setIsBetting(true)
      setBetError(null)
      
      const result = await placeBet(
        selectedMarket.id,
        betSide === 'yes',
        betAmount
      )
      
      if (result.success) {
        console.log('✅ Bet placed:', result.txHash)
        setShowBetModal(false)
        setBetAmount('')
        setSelectedMarket(null)
      }
    } catch (error) {
      setBetError(error instanceof Error ? error.message : 'Failed to place bet')
    } finally {
      setIsBetting(false)
    }
  }

  const getTimeRemaining = (endTime: number) => {
    const remaining = endTime - Date.now()
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24))
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) return `${days}d ${hours}h`
    return `${hours}h`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading prediction markets...</p>
          <p className="text-slate-400 text-sm mt-2">Fetching from blockchain...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Prediction Markets</h1>
          <p className="text-slate-300">
            Decentralized prediction markets powered by AI agent consensus
          </p>
          {error && (
            <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-400 text-sm flex items-center">
                <span className="mr-2">⚠️</span>
                {error}
              </p>
              {error.includes('timeout') || error.includes('issues') ? (
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="mt-2 text-xs bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white px-3 py-1 rounded transition-colors"
                >
                  {isRefreshing ? 'Refreshing...' : 'Try Again'}
                </button>
              ) : null}
            </div>
          )}
        </div>
        <div className="mt-4 lg:mt-0 flex items-center space-x-4">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
            isConnected ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
            <span>{isConnected ? 'Live Markets' : 'Demo Mode'}</span>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg transition-colors text-sm"
          >
            <svg className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          
          {isWalletConnected && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Create Market</span>
            </button>
          )}
        </div>
      </div>

      {/* Market Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Volume</p>
              <p className="text-2xl font-bold text-white">
                {markets.reduce((sum, m) => sum + parseFloat(m.totalVolume || '0'), 0).toFixed(1)} ETH
              </p>
            </div>
            <CurrencyDollarIcon className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Active Markets</p>
              <p className="text-2xl font-bold text-white">{markets.filter(m => m.active).length}</p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Participants</p>
              <p className="text-2xl font-bold text-white">
                {markets.reduce((sum, m) => sum + m.participants, 0).toLocaleString()}
              </p>
            </div>
            <UserGroupIcon className="h-8 w-8 text-purple-400" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Categories</p>
              <p className="text-2xl font-bold text-white">{categories.length - 1}</p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-orange-400" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search markets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 w-80"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        
        <div className="text-slate-400 text-sm">
          Showing {filteredMarkets.length} of {markets.length} markets
          {!isConnected && (
            <span className="ml-2 text-yellow-400">(Demo Data)</span>
          )}
        </div>
      </div>

      {/* Markets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {filteredMarkets.map((market, index) => (
          <motion.div
            key={market.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="card hover:border-slate-600 transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                    {market.category}
                  </span>
                  <div className="flex items-center text-xs text-slate-400">
                    <ClockIcon className="h-3 w-3 mr-1" />
                    {getTimeRemaining(market.endTime)}
                  </div>
                </div>
                <h3 className="font-semibold text-white text-lg mb-3 line-clamp-3">
                  {market.question}
                </h3>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold text-green-400">{(market.yesPrice * 100).toFixed(0)}¢</p>
                  <p className="text-xs text-slate-400">YES</p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold text-red-400">{(market.noPrice * 100).toFixed(0)}¢</p>
                  <p className="text-xs text-slate-400">NO</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm font-medium text-white">{parseFloat(market.totalVolume).toFixed(2)} ETH</p>
                  <p className="text-xs text-slate-400">Volume</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{market.participants}</p>
                  <p className="text-xs text-slate-400">Traders</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    {market.creator.slice(0, 6)}...{market.creator.slice(-4)}
                  </p>
                  <p className="text-xs text-slate-400">Creator</p>
                </div>
              </div>

              {isWalletConnected && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedMarket(market)
                      setBetSide('yes')
                      setShowBetModal(true)
                    }}
                    className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                  >
                    Bet YES
                  </button>
                  <button
                    onClick={() => {
                      setSelectedMarket(market)
                      setBetSide('no')
                      setShowBetModal(true)
                    }}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                  >
                    Bet NO
                  </button>
                </div>
              )}
              
              {!isWalletConnected && (
                <div className="text-center text-slate-400 text-sm py-2">
                  Connect wallet to place bets
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredMarkets.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-white mb-2">No markets found</h3>
          <p className="text-slate-400 mb-6">
            {searchTerm || selectedCategory !== 'All' 
              ? 'Try adjusting your search or filters'
              : 'Be the first to create a prediction market!'
            }
          </p>
          {isWalletConnected && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Create First Market
            </button>
          )}
        </div>
      )}

      {/* Create Market Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800 rounded-xl p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-bold text-white mb-4">Create New Market</h3>
            <form onSubmit={handleCreateMarket} className="space-y-4">
              <div>
                <label className="block text-slate-400 mb-2">Question</label>
                <textarea
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Will X happen by Y date?"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white resize-none"
                  rows={3}
                  required
                />
              </div>
              
              <div>
                <label className="block text-slate-400 mb-2">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  {categories.slice(1).map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-2">Duration (days)</label>
                <input
                  type="number"
                  value={newDuration}
                  onChange={(e) => setNewDuration(parseInt(e.target.value))}
                  min="1"
                  max="365"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  {isCreating ? 'Creating...' : 'Create Market'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewQuestion('')
                  }}
                  className="flex-1 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Bet Modal */}
      {showBetModal && selectedMarket && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800 rounded-xl p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-bold text-white mb-4">Place Bet</h3>
            <p className="text-slate-300 mb-6">{selectedMarket.question}</p>
            
            <form onSubmit={handlePlaceBet} className="space-y-4">
              <div>
                <label className="block text-slate-400 mb-2">Position</label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setBetSide('yes')}
                    className={`flex-1 py-2 rounded-lg transition-colors ${
                      betSide === 'yes' ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    YES ({(selectedMarket.yesPrice * 100).toFixed(0)}¢)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBetSide('no')}
                    className={`flex-1 py-2 rounded-lg transition-colors ${
                      betSide === 'no' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    NO ({(selectedMarket.noPrice * 100).toFixed(0)}¢)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-2">Amount (ETH)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="0.1"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  required
                />
              </div>

              {betError && (
                <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded">
                  {betError}
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={isBetting}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  {isBetting ? 'Placing Bet...' : `Bet ${betSide.toUpperCase()}`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBetModal(false)
                    setBetAmount('')
                    setBetError(null)
                    setSelectedMarket(null)
                  }}
                  className="flex-1 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
} 