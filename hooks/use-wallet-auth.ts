import { useCallback, useState } from 'react'

interface WalletConnectResult {
  success: boolean
  address?: string
  error?: string
}

/**
 * Hook for wallet-based authentication in Pickaboo admin dashboard
 */
export function useWalletAuth() {
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  /**
   * Connect wallet using injected provider (MetaMask, etc.)
   */
  const connectWallet = useCallback(async (): Promise<WalletConnectResult> => {
    setIsConnecting(true)
    setError(null)

    try {
      // Check if Web3 provider exists
      if (typeof window === 'undefined' || !window.ethereum) {
        const err = 'MetaMask or Web3 wallet not detected'
        setError(err)
        return { success: false, error: err }
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })

      if (!accounts || accounts.length === 0) {
        const err = 'No wallet accounts available'
        setError(err)
        return { success: false, error: err }
      }

      const address = accounts[0] as string
      setConnectedAddress(address)

      return { success: true, address }
    } catch (err: any) {
      const errorMessage =
        err?.message || 'Failed to connect wallet'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsConnecting(false)
    }
  }, [])

  /**
   * Verify wallet with backend
   */
  const verifyWallet = useCallback(async (walletAddress: string) => {
    try {
      const response = await fetch('/api/pickaboo/verify-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: walletAddress }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Wallet verification failed')
        return { success: false, error: data.error }
      }

      return { success: true, ...data }
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to verify wallet'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }, [])

  /**
   * Disconnect wallet
   */
  const disconnectWallet = useCallback(() => {
    setConnectedAddress(null)
    setError(null)
  }, [])

  /**
   * Get currently connected address
   */
  const getAddress = useCallback(() => connectedAddress, [connectedAddress])

  return {
    connectWallet,
    verifyWallet,
    disconnectWallet,
    getAddress,
    isConnecting,
    connectedAddress,
    error,
    setError,
  }
}

// Extend window interface for ethereum provider
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>
      on?: (event: string, handler: (...args: any[]) => void) => void
      removeListener?: (event: string, handler: (...args: any[]) => void) => void
      isConnected?: () => boolean
    }
  }
}