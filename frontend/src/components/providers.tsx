'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiConfig, createConfig, configureChains } from 'wagmi'
import { mainnet, sepolia, arbitrumSepolia, baseSepolia, polygon, arbitrum, base } from 'wagmi/chains'
import { RainbowKitProvider, connectorsForWallets } from '@rainbow-me/rainbowkit'
import { 
  injectedWallet, 
  metaMaskWallet, 
  walletConnectWallet,
  coinbaseWallet,
  trustWallet,
  rainbowWallet
} from '@rainbow-me/rainbowkit/wallets'
import { publicProvider } from 'wagmi/providers/public'
import { useState } from 'react'
import '@rainbow-me/rainbowkit/styles.css'

// WalletConnect Project ID - use environment variable or fallback to hardcoded
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '9e676cc7b66a6c2d005568b25ca709a0'
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Swarm Oracle'

// Configure chains & providers - prioritizing testnets where contracts are deployed
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [
    // Testnets first (where our contracts are deployed)
    sepolia,
    arbitrumSepolia, 
    baseSepolia,
    // Mainnets
    mainnet,
    arbitrum,
    base,
    polygon
  ],
  [publicProvider()]
)

// Configure connectors with multiple wallet options
const connectors = connectorsForWallets([
  {
    groupName: 'Popular',
    wallets: [
      injectedWallet({ chains }),
      metaMaskWallet({ projectId: WALLETCONNECT_PROJECT_ID, chains }),
      walletConnectWallet({ projectId: WALLETCONNECT_PROJECT_ID, chains }),
      coinbaseWallet({ appName: APP_NAME, chains }),
      rainbowWallet({ projectId: WALLETCONNECT_PROJECT_ID, chains }),
    ],
  },
  {
    groupName: 'More',
    wallets: [
      trustWallet({ projectId: WALLETCONNECT_PROJECT_ID, chains }),
    ],
  },
])

// Configure Wagmi
const config = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 30000,
          },
        },
      })
  )

  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          chains={chains} 
          modalSize="compact"
          appInfo={{
            appName: APP_NAME,
            learnMoreUrl: 'https://swarmoracle.com',
          }}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  )
} 