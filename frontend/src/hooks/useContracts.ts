import { useState, useEffect, useCallback } from 'react'
import { useWalletClient, usePublicClient, useAccount, useChainId } from 'wagmi'
import { 
  PREDICTION_MARKET_ABI, 
  getContractAddress, 
  formatMarketPrice, 
  calculateParticipants, 
  parseEther, 
  formatEther,
  type Market 
} from '@/lib/contracts'
import { sepolia } from 'viem/chains'

export function useContracts() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastFetchTime, setLastFetchTime] = useState<number>(0)
  
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const { address, isConnected: isWalletConnected } = useAccount()
  const chainId = useChainId() ?? sepolia.id

  // Demo data for development/fallback
  const getDemoMarkets = (): Market[] => [
    {
      id: 1,
      question: "Will Bitcoin reach $100,000 by end of 2024?",
      category: "Cryptocurrency",
      endTime: Date.now() + 86400000 * 30,
      totalYesAmount: "15.5",
      totalNoAmount: "8.2",
      totalVolume: "23.7",
      resolved: false,
      active: true,
      yesPrice: 0.65,
      noPrice: 0.35,
      participants: 234,
      creator: "0x1234567890123456789012345678901234567890"
    },
    {
      id: 2,
      question: "Will Ethereum staking rewards exceed 5% APR in Q1 2024?",
      category: "DeFi",
      endTime: Date.now() + 86400000 * 15,
      totalYesAmount: "8.9",
      totalNoAmount: "12.1",
      totalVolume: "21.0",
      resolved: false,
      active: true,
      yesPrice: 0.42,
      noPrice: 0.58,
      participants: 156,
      creator: "0x2345678901234567890123456789012345678901"
    },
    {
      id: 3,
      question: "Will a major AI breakthrough be announced at NeurIPS 2024?",
      category: "Technology",
      endTime: Date.now() + 86400000 * 45,
      totalYesAmount: "12.3",
      totalNoAmount: "9.7",
      totalVolume: "22.0",
      resolved: false,
      active: true,
      yesPrice: 0.56,
      noPrice: 0.44,
      participants: 189,
      creator: "0x3456789012345678901234567890123456789012"
    },
    {
      id: 4,
      question: "Will Tesla stock price exceed $300 by March 2024?",
      category: "Finance",
      endTime: Date.now() + 86400000 * 20,
      totalYesAmount: "6.8",
      totalNoAmount: "14.2",
      totalVolume: "21.0",
      resolved: false,
      active: true,
      yesPrice: 0.32,
      noPrice: 0.68,
      participants: 98,
      creator: "0x4567890123456789012345678901234567890123"
    },
    {
      id: 5,
      question: "Will the next US Federal Reserve interest rate decision be a cut?",
      category: "Finance",
      endTime: Date.now() + 86400000 * 10,
      totalYesAmount: "18.3",
      totalNoAmount: "11.7",
      totalVolume: "30.0",
      resolved: false,
      active: true,
      yesPrice: 0.61,
      noPrice: 0.39,
      participants: 287,
      creator: "0x5678901234567890123456789012345678901234"
    }
  ]

  // Enhanced contract read with timeout and retry
  const readContractWithTimeout = async (contractCall: any, timeoutMs: number = 5000) => {
    return Promise.race([
      publicClient!.readContract(contractCall),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Contract call timeout')), timeoutMs)
      )
    ])
  }

  // Retry logic for contract calls
  const retryContractCall = async (contractCall: any, maxRetries: number = 2) => {
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const timeout = 3000 + (i * 2000) // Increasing timeout with retries
        return await readContractWithTimeout(contractCall, timeout)
      } catch (error) {
        console.warn(`Contract call attempt ${i + 1} failed:`, error)
        if (i === maxRetries) throw error
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
      }
    }
  }

  // Fetch markets from smart contract with improved error handling
  const fetchMarkets = useCallback(async (force: boolean = false) => {
    // Avoid fetching too frequently
    const now = Date.now()
    if (!force && now - lastFetchTime < 10000) { // 10 second cooldown
      return
    }

    console.log('🔄 Starting market fetch...')
    setIsLoading(true)
    setError(null)
    
    try {
      // If no public client, use demo data
      if (!publicClient) {
        console.log('⚠️ No public client available, using demo data')
        setMarkets(getDemoMarkets())
        setIsConnected(false)
        setIsLoading(false)
        return
      }

      try {
        // Get contract address for current chain
        const contractAddress = getContractAddress(chainId)
        console.log(`📋 Contract: ${contractAddress} on chain ${chainId}`)
        
        // Test basic contract connectivity with timeout
        console.log('🔍 Testing contract connectivity...')
        
        const nextMarketIdCall = {
          address: contractAddress,
          abi: PREDICTION_MARKET_ABI,
          functionName: 'nextMarketId',
        }

        const nextMarketIdResult = await retryContractCall(nextMarketIdCall)
        const nextMarketId = nextMarketIdResult as bigint
        const marketCount = Math.max(0, Number(nextMarketId) - 1)
        
        console.log(`📊 Next market ID: ${nextMarketId}, Market count: ${marketCount}`)

        if (marketCount <= 0) {
          console.log('📝 No markets found on-chain, using demo data')
          setMarkets(getDemoMarkets())
          setIsConnected(true) // Still connected, just no markets
          setError('No markets found on blockchain - showing demo data')
          setIsLoading(false)
          setLastFetchTime(now)
          return
        }

        console.log(`🔄 Fetching ${marketCount} markets from blockchain...`)

        // Fetch fewer markets in parallel to avoid timeouts
        const batchSize = Math.min(marketCount, 3) // Limit to 3 markets at a time
        const marketData: any[] = []

        for (let i = 0; i < marketCount; i += batchSize) {
          const batch = Math.min(batchSize, marketCount - i)
          console.log(`📋 Fetching batch ${Math.floor(i/batchSize) + 1}: markets ${i + 1} to ${i + batch}`)
          
          const batchPromises = Array.from({ length: batch }, (_, j) => {
            const marketId = i + j + 1
            return retryContractCall({
              address: contractAddress,
              abi: PREDICTION_MARKET_ABI,
              functionName: 'getMarket',
              args: [BigInt(marketId)],
            })
          })

          try {
            const batchResults = await Promise.all(batchPromises)
            marketData.push(...batchResults)
          } catch (batchError) {
            console.warn(`Batch ${Math.floor(i/batchSize) + 1} failed:`, batchError)
            // Continue with other batches
          }
        }

        if (marketData.length === 0) {
          throw new Error('Failed to fetch any market data')
        }

        console.log(`✅ Fetched ${marketData.length}/${marketCount} markets`)

        // Format markets with proper typing (simplified price handling)
        const formattedMarkets: Market[] = marketData.map((marketData: any, index: number) => {
          const yesAmount = marketData.totalYesAmount || BigInt(0)
          const noAmount = marketData.totalNoAmount || BigInt(0)
          const totalVolume = yesAmount + noAmount
          
          // Calculate simple prices based on volume ratio
          let yesPrice = 0.5
          let noPrice = 0.5
          
          if (totalVolume > 0) {
            yesPrice = Number(yesAmount) / Number(totalVolume)
            noPrice = Number(noAmount) / Number(totalVolume)
          }
          
          const market: Market = {
            id: Number(marketData.id || index + 1),
            question: marketData.question || `Market ${index + 1}`,
            category: marketData.category || 'Technology',
            endTime: Number(marketData.endTime || 0) * 1000, // Convert to milliseconds
            totalYesAmount: formatEther(yesAmount),
            totalNoAmount: formatEther(noAmount),
            totalVolume: formatEther(totalVolume),
            resolved: Boolean(marketData.resolved),
            active: marketData.active !== false, // Default to true
            yesPrice: Math.max(0.01, Math.min(0.99, yesPrice)), // Clamp between 1% and 99%
            noPrice: Math.max(0.01, Math.min(0.99, noPrice)),
            participants: calculateParticipants(yesAmount, noAmount),
            creator: marketData.creator || '0x0000000000000000000000000000000000000000'
          }

          console.log(`📋 Market ${market.id}: ${market.question.substring(0, 50)}...`)
          return market
        })

        console.log(`✅ Successfully formatted ${formattedMarkets.length} markets`)
        setMarkets(formattedMarkets)
        setIsConnected(true)
        setLastFetchTime(now)
        
      } catch (contractError: any) {
        console.warn('⚠️ Contract interaction failed:', contractError)
        console.log('📝 Falling back to demo data')
        setMarkets(getDemoMarkets())
        setIsConnected(false)
        
        // Provide user-friendly error messages
        let errorMessage = 'Contract error - using demo data'
        if (contractError.message?.includes('timeout')) {
          errorMessage = 'Network timeout - using demo data (try refreshing)'
        } else if (contractError.message?.includes('WebSocket')) {
          errorMessage = 'Connection issues - using demo data'
        } else if (contractError.message?.includes('Unauthorized')) {
          errorMessage = 'RPC provider issues - using demo data'
        }
        
        setError(errorMessage)
      }
      
    } catch (generalError: any) {
      console.error('❌ General error in fetchMarkets:', generalError)
      setMarkets(getDemoMarkets())
      setIsConnected(false)
      setError('Network issues - using demo data')
    } finally {
      setIsLoading(false)
      console.log('✅ Market fetching completed')
    }
  }, [publicClient, chainId, lastFetchTime])

  // Manual refresh function
  const refreshMarkets = useCallback(() => {
    setLastFetchTime(0) // Reset cooldown
    fetchMarkets(true)
  }, [fetchMarkets])

  // Fetch markets on mount and when dependencies change
  useEffect(() => {
    fetchMarkets()
  }, [publicClient, chainId])

  // Create a new prediction market
  const createMarket = async (question: string, category: string, duration: number): Promise<{ success: boolean; txHash: string }> => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected')
    }

    try {
      const contractAddress = getContractAddress(chainId)
      const endTime = Math.floor(Date.now() / 1000) + duration
      const creatorFee = 250 // 2.5% in basis points

      console.log('🚀 Creating market:', { question, category, endTime, creatorFee })

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'createMarket',
        args: [question, category, BigInt(endTime), BigInt(creatorFee)],
      })

      console.log('✅ Market creation transaction sent:', hash)
      
      // Refresh markets after a delay to allow for blockchain confirmation
      setTimeout(() => {
        refreshMarkets()
      }, 5000)

      return { success: true, txHash: hash as string }
    } catch (error) {
      console.error('❌ Create market error:', error)
      throw error
    }
  }

  // Place a bet on a market
  const placeBet = async (marketId: number, isYes: boolean, amount: string): Promise<{ success: boolean; txHash: string }> => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected')
    }

    try {
      const contractAddress = getContractAddress(chainId)
      const betAmount = parseEther(amount)

      console.log('🎯 Placing bet:', { marketId, isYes, amount, betAmount: betAmount.toString() })

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'placeBet',
        args: [BigInt(marketId), isYes, betAmount],
        value: betAmount,
      })

      console.log('✅ Bet placed successfully:', hash)
      
      // Refresh markets after a delay to allow for blockchain confirmation
      setTimeout(() => {
        refreshMarkets()
      }, 5000)

      return { success: true, txHash: hash as string }
    } catch (error) {
      console.error('❌ Place bet error:', error)
      throw error
    }
  }

  return {
    markets,
    isLoading,
    error,
    isConnected,
    isWalletConnected,
    createMarket,
    placeBet,
    refreshMarkets, // Export refresh function
  }
} 