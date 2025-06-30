// Smart Contract Integration for Swarm Oracle Prediction Markets
import { parseEther, formatEther } from 'viem'
import { sepolia, arbitrumSepolia, baseSepolia } from 'viem/chains'

// Contract addresses from deployments
export const CONTRACT_ADDRESSES = {
  [sepolia.id]: '0xAB85a785cc81509Ba3BB1ed40C4e80Fe4923D4Df',
  [arbitrumSepolia.id]: '0x27c8EAfB0aBADAc25ac194Ca8Fe1208D5E0D9bbd',
  [baseSepolia.id]: '0x27c8EAfB0aBADAc25ac194Ca8Fe1208D5E0D9bbd'
} as const

// PredictionMarket Contract ABI - Key functions only
export const PREDICTION_MARKET_ABI = [
  // Read functions
  {
    inputs: [{ internalType: "uint256", name: "_marketId", type: "uint256" }],
    name: "getMarket",
    outputs: [{
      components: [
        { internalType: "uint256", name: "id", type: "uint256" },
        { internalType: "string", name: "question", type: "string" },
        { internalType: "string", name: "category", type: "string" },
        { internalType: "uint256", name: "createdAt", type: "uint256" },
        { internalType: "uint256", name: "endTime", type: "uint256" },
        { internalType: "uint256", name: "resolutionTime", type: "uint256" },
        { internalType: "bool", name: "resolved", type: "bool" },
        { internalType: "bool", name: "outcome", type: "bool" },
        { internalType: "uint256", name: "totalYesAmount", type: "uint256" },
        { internalType: "uint256", name: "totalNoAmount", type: "uint256" },
        { internalType: "uint256", name: "totalVolume", type: "uint256" },
        { internalType: "address", name: "creator", type: "address" },
        { internalType: "uint256", name: "creatorFee", type: "uint256" },
        { internalType: "bool", name: "active", type: "bool" }
      ],
      internalType: "struct PredictionMarket.Market",
      name: "",
      type: "tuple"
    }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "nextMarketId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "_marketId", type: "uint256" },
      { internalType: "bool", name: "_side", type: "bool" }
    ],
    name: "getPrice",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  // Write functions
  {
    inputs: [
      { internalType: "string", name: "_question", type: "string" },
      { internalType: "string", name: "_category", type: "string" },
      { internalType: "uint256", name: "_endTime", type: "uint256" },
      { internalType: "uint256", name: "_creatorFee", type: "uint256" }
    ],
    name: "createMarket",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "_marketId", type: "uint256" },
      { internalType: "bool", name: "_side", type: "bool" },
      { internalType: "uint256", name: "_amount", type: "uint256" }
    ],
    name: "placeBet",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const

// Market interface
export interface Market {
  id: number
  question: string
  category: string
  endTime: number
  totalYesAmount: string
  totalNoAmount: string
  totalVolume: string
  resolved: boolean
  active: boolean
  yesPrice: number
  noPrice: number
  participants: number
  creator: string
}

// Utility functions
export function getContractAddress(chainId: number): `0x${string}` {
  const address = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]
  if (!address) {
    throw new Error(`Contract not deployed on chain ${chainId}`)
  }
  return address as `0x${string}`
}

export function formatMarketPrice(priceInBasisPoints: bigint): number {
  return Number(priceInBasisPoints) / 10000
}

export function calculateParticipants(yesAmount: bigint, noAmount: bigint): number {
  const totalVolume = yesAmount + noAmount
  const averageBet = parseEther('0.1')
  return Math.max(1, Number(totalVolume / averageBet))
}

export { parseEther, formatEther } 