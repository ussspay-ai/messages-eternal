'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, CheckCircle, XCircle, Loader2, Eye, EyeOff, Download, LogOut, Wallet, Settings, History, RefreshCw, Play, Zap, Copy, Check, Trash2, TestTube, DollarSign, Plus, Trash, ExternalLink, Users } from 'lucide-react'
import { useWalletAuth } from '@/hooks/use-wallet-auth'

// Animated background component
function AnimatedBackground() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return <div className="fixed inset-0 overflow-hidden pointer-events-none" />
  }

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Main gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#F5F1ED] via-[#FAF9F7] to-[#F0EBE6]" />
      
      {/* Animated orbs */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-stone-200/20 to-stone-100/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-br from-stone-100/15 to-stone-50/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
      <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-gradient-to-br from-stone-100/10 to-stone-50/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
      <div className="absolute bottom-40 right-1/4 w-72 h-72 bg-gradient-to-br from-stone-50/20 to-stone-50/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4.5s', animationDelay: '0.5s' }} />
      
      {/* Floating particles */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Animated floating dots */}
        {[...Array(12)].map((_, i) => {
          const delay = i * 0.3
          const duration = 15 + i
          const startX = Math.random() * 100
          const startY = Math.random() * 100
          const endX = startX + (Math.random() - 0.5) * 50
          const endY = startY - 30 - Math.random() * 30
          
          return (
            <g key={i}>
              <style>{`
                @keyframes float-${i} {
                  0% { opacity: 0; transform: translate(${startX}%, ${startY}%); }
                  10% { opacity: 0.4; }
                  90% { opacity: 0.4; }
                  100% { opacity: 0; transform: translate(${endX}%, ${endY}%); }
                }
                .particle-${i} { animation: float-${i} ${duration}s ease-in infinite; animation-delay: ${delay}s; }
              `}</style>
              <circle className={`particle-${i}`} cx="0" cy="0" r={1 + Math.random() * 1.5} fill="url(#particleGradient)" filter="url(#glow)" />
            </g>
          )
        })}
        
        <defs>
          <linearGradient id="particleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D97706" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.3" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

interface FundingResult {
  agent_id: string
  agent_name: string
  amount: number
  status: 'success' | 'failed' | 'pending'
  tx_hash?: string
  error?: string
}

interface AgentBalance {
  agent_id: string
  agent_name: string
  agent_signer: string
  wallet_balance: number
  unrealized_pnl: number
  equity: number
  total_roi: number
  positions_count: number
  status: 'success' | 'error'
  error?: string
  last_updated: string
}

interface BalanceCheckResult {
  agent_id: string
  agent_name: string
  balance: number
  status: 'funded' | 'underfunded' | 'error'
  error?: string
}

interface FundingHistoryEntry {
  id: string
  agent_id: string
  agent_name?: string
  amount: number
  status: string
  tx_hash?: string
  error_message?: string
  dry_run: boolean
  created_at: string
}

export default function PickabooAdmin() {
  const { connectWallet, verifyWallet, disconnectWallet, connectedAddress, isConnecting, error: walletError, setError: setWalletError } = useWalletAuth()
  const [authenticated, setAuthenticated] = useState(false)

  const [fundAmount, setFundAmount] = useState('50')
  const [dryRun, setDryRun] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [fundingResults, setFundingResults] = useState<FundingResult[]>([])

  const [balances, setBalances] = useState<BalanceCheckResult[]>([])
  const [isCheckingBalances, setIsCheckingBalances] = useState(false)

  // Real balance data from Asterdex
  const [agentBalances, setAgentBalances] = useState<AgentBalance[]>([])
  const [isLoadingAgentBalances, setIsLoadingAgentBalances] = useState(false)
  const [copiedSigner, setCopiedSigner] = useState<string | null>(null)

  const [tradingSymbol, setTradingSymbol] = useState('ASTERUSDT')
  const [symbolSearchQuery, setSymbolSearchQuery] = useState('')
  const [isUpdatingSymbol, setIsUpdatingSymbol] = useState(false)
  const [currentSymbols, setCurrentSymbols] = useState<Record<string, string>>({})
  const [supportedSymbols, setSupportedSymbols] = useState<string[]>(['ASTERUSDT', 'ETHUSDT', 'BTCUSDT', 'BNBUSDT', 'SOLUSDT'])
  
  // Multi-symbol per agent configuration
  const [agentSymbols, setAgentSymbols] = useState<Record<string, string[]>>({})
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [symbolSearchQueryPerAgent, setSymbolSearchQueryPerAgent] = useState('')
  const [isUpdatingAgentSymbols, setIsUpdatingAgentSymbols] = useState(false)
  
  const agentList = [
    { id: 'claude_arbitrage', name: 'Claude Arbitrage' },
    { id: 'chatgpt_openai', name: 'GPT-4 Momentum' },
    { id: 'gemini_grid', name: 'Gemini Grid' },
    { id: 'deepseek_ml', name: 'DeepSeek ML' },
    { id: 'buy_and_hold', name: 'Buy & Hold' },
  ]

  const [fundingHistory, setFundingHistory] = useState<FundingHistoryEntry[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [copiedTxHash, setCopiedTxHash] = useState<string | null>(null)

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Agent prompts management
  const [agentPrompts, setAgentPrompts] = useState<Record<string, any>>({})
  const [selectedPromptAgent, setSelectedPromptAgent] = useState<string | null>(null)
  const [promptEditText, setPromptEditText] = useState('')
  const [isUpdatingPrompt, setIsUpdatingPrompt] = useState(false)
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false)

  // Waitlist management
  const [waitlistEntries, setWaitlistEntries] = useState<any[]>([])
  const [isLoadingWaitlist, setIsLoadingWaitlist] = useState(false)
  const [waitlistStats, setWaitlistStats] = useState<any>(null)
  const [waitlistFilter, setWaitlistFilter] = useState('all')
  const [waitlistSearchQuery, setWaitlistSearchQuery] = useState('')

  // Fetch real agent balances from Asterdex
  const fetchAgentBalances = async () => {
    setIsLoadingAgentBalances(true)
    try {
      const response = await fetch(`/api/pickaboo/agent-balances?wallet=${connectedAddress}`)
      const data = await response.json()

      if (data.success && data.results) {
        setAgentBalances(data.results)
      }
    } catch (error) {
      console.error('Error fetching agent balances:', error)
    } finally {
      setIsLoadingAgentBalances(false)
    }
  }

  // Filtered symbols for searchable dropdown
  const filteredSymbols = useMemo(() => {
    if (!symbolSearchQuery) return supportedSymbols
    return supportedSymbols.filter(symbol =>
      symbol.toLowerCase().includes(symbolSearchQuery.toLowerCase())
    )
  }, [symbolSearchQuery, supportedSymbols])

  // Copy to clipboard handler
  const copyToClipboard = (text: string, signerAddress: string) => {
    navigator.clipboard.writeText(text)
    setCopiedSigner(signerAddress)
    setTimeout(() => setCopiedSigner(null), 2000)
  }

  // Copy TX hash and set state
  const copyTxHash = (txHash: string) => {
    navigator.clipboard.writeText(txHash)
    setCopiedTxHash(txHash)
    setTimeout(() => setCopiedTxHash(null), 2000)
  }

  // Get explorer URL for transaction hash
  const getExplorerUrl = (txHash: string): string => {
    // Check if it's a dry-run hash
    if (txHash.startsWith('0xdry_')) {
      return '#' // No explorer URL for dry-run hashes
    }
    // For BSC transactions, use BinanceScan
    return `https://bscscan.com/tx/${txHash}`
  }

  // Handle wallet connection and verification
  const handleWalletConnect = async () => {
    setWalletError(null)
    const result = await connectWallet()
    
    if (!result.success || !result.address) {
      setMessage({ type: 'error', text: result.error || 'Failed to connect wallet' })
      return
    }

    // Verify wallet is whitelisted
    const verifyResult = await verifyWallet(result.address)
    
    if (!verifyResult.success) {
      setMessage({ type: 'error', text: 'Wallet not authorized. Please contact an administrator.' })
      disconnectWallet()
      return
    }

    setAuthenticated(true)
    setMessage({ type: 'success', text: 'Wallet verified! Admin access granted.' })
  }

  // Handle logout
  const handleLogout = () => {
    setAuthenticated(false)
    disconnectWallet()
  }

  // Fetch supported symbols from Aster DEX on mount
  useEffect(() => {
    fetchSupportedSymbols()
  }, [])

  // Poll agent balances and load agent symbols when authenticated
  useEffect(() => {
    if (!authenticated || !connectedAddress) return

    console.log('[Pickaboo] Authenticated! Loading agent data...', { wallet: connectedAddress })

    // Initial fetch
    fetchAgentBalances()
    loadAgentSymbols()
    loadAgentPrompts()

    // Set up polling for balances every 5 minutes
    const pollInterval = setInterval(() => {
      fetchAgentBalances()
    }, 300000) // 5 minutes

    return () => {
      console.log('[Pickaboo] Cleaning up polling')
      clearInterval(pollInterval)
    }
  }, [authenticated, connectedAddress ?? ''])

  // Fund agents
  const handleFundAgents = async () => {
    const amount = parseFloat(fundAmount)
    if (isNaN(amount) || amount < 50 || amount > 1_000_000) {
      setMessage({
        type: 'error',
        text: 'Amount must be between $50 and $1,000,000 USDT',
      })
      return
    }

    setIsLoading(true)
    setFundingResults([]) // Clear previous results
    try {
      const response = await fetch('/api/pickaboo/fund-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: connectedAddress,
          amount,
          dryRun,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Check for insufficient balance error
        if (data.insufficient_balance) {
          setMessage({
            type: 'error',
            text: data.message || `Insufficient funds: Have $${data.main_account_balance}, need $${data.required_total}`,
          })
        } else {
          setMessage({ type: 'error', text: data.message || data.error || 'Failed to fund agents' })
        }
        
        // Refresh history to show failed attempts that were logged to database
        setTimeout(() => {
          fetchFundingHistory()
        }, 1000)
        return
      }

      setFundingResults(data.results || [])
      setMessage({
        type: 'success',
        text: data.message || `${dryRun ? '[DRY-RUN] ' : ''}Agents funded successfully`,
      })

      // Refresh balances after a moment
      setTimeout(checkBalances, 2000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Failed to fund agents' })
    } finally {
      setIsLoading(false)
    }
  }

  // Check balances
  const checkBalances = async () => {
    setIsCheckingBalances(true)
    try {
      const response = await fetch(`/api/pickaboo/verify-balances?wallet=${connectedAddress}`)
      const data = await response.json()

      if (data.success) {
        setBalances(data.results || [])
      }
    } catch (error) {
      console.error('Error checking balances:', error)
    } finally {
      setIsCheckingBalances(false)
    }
  }

  // Fetch real available symbols from Aster DEX
  const fetchSupportedSymbols = async () => {
    try {
      const response = await fetch(`/api/pickaboo/supported-symbols`)
      const data = await response.json()

      if (data.success && data.symbols && Array.isArray(data.symbols)) {
        console.log(`[Pickaboo] Loaded ${data.symbols.length} supported symbols from ${data.source}`)
        setSupportedSymbols(data.symbols)
      }
    } catch (error) {
      console.error('Error fetching supported symbols:', error)
      // Keep the default symbols on error
    }
  }

  // Load existing agent symbols from database
  const loadAgentSymbols = async () => {
    try {
      console.log('[Pickaboo] Loading agent symbols from database...', { wallet: connectedAddress })
      
      const response = await fetch(`/api/pickaboo/update-agent-symbols?wallet=${connectedAddress}`)
      const data = await response.json()

      console.log('[Pickaboo] Agent symbols response:', data)

      if (data.success) {
        if (data.agent_symbols && Object.keys(data.agent_symbols).length > 0) {
          console.log(`✅ [Pickaboo] Loaded ${data.count || Object.keys(data.agent_symbols).length} agent symbol configurations:`, data.agent_symbols)
          setAgentSymbols(data.agent_symbols)
        } else {
          console.log('[Pickaboo] No agent symbols configured yet - using defaults')
          setAgentSymbols({})
        }
      } else {
        console.warn('[Pickaboo] Failed to load agent symbols:', data.error || data.message)
      }
    } catch (error) {
      console.error('[Pickaboo] Error loading agent symbols:', error)
    }
  }

  // Fetch current symbols and supported symbols
  const fetchCurrentSymbols = async () => {
    try {
      const response = await fetch(`/api/pickaboo/update-symbol?wallet=${connectedAddress}`)
      const data = await response.json()

      if (data.success && data.symbols) {
        const symbolMap: Record<string, string> = {}
        data.symbols.forEach((s: any) => {
          symbolMap[s.agent_id] = s.symbol
        })
        setCurrentSymbols(symbolMap)
        setTradingSymbol(data.symbols[0]?.symbol || 'ASTERUSDT')
      }

      // Also set supported symbols from the API
      if (data.supportedSymbols && Array.isArray(data.supportedSymbols)) {
        setSupportedSymbols(data.supportedSymbols)
      }
    } catch (error) {
      console.error('Error fetching symbols:', error)
    }
  }

  // Update trading symbol
  const handleUpdateSymbol = async () => {
    if (!tradingSymbol || tradingSymbol.length === 0) {
      setMessage({ type: 'error', text: 'Please enter a valid symbol' })
      return
    }

    setIsUpdatingSymbol(true)
    try {
      const response = await fetch('/api/pickaboo/update-symbol', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: connectedAddress,
          symbol: tradingSymbol,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to update symbol' })
        return
      }

      setMessage({ type: 'success', text: data.message || 'Trading symbol updated' })
      fetchCurrentSymbols()
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Failed to update symbol' })
    } finally {
      setIsUpdatingSymbol(false)
    }
  }

  // Add symbol to agent's trading list
  const handleAddSymbolToAgent = (symbol: string) => {
    if (!selectedAgent) return
    
    setAgentSymbols(prev => {
      const currentAgentSymbols = prev[selectedAgent] || []
      if (!currentAgentSymbols.includes(symbol)) {
        return {
          ...prev,
          [selectedAgent]: [...currentAgentSymbols, symbol]
        }
      }
      return prev
    })
    setSymbolSearchQueryPerAgent('')
  }

  // Remove symbol from agent's trading list
  const handleRemoveSymbolFromAgent = (symbol: string) => {
    if (!selectedAgent) return
    
    setAgentSymbols(prev => ({
      ...prev,
      [selectedAgent]: (prev[selectedAgent] || []).filter(s => s !== symbol)
    }))
  }

  // Update agent symbols on backend
  const handleUpdateAgentSymbols = async () => {
    if (!selectedAgent) {
      setMessage({ type: 'error', text: 'Please select an agent' })
      return
    }

    const symbols = agentSymbols[selectedAgent] || []
    if (symbols.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one symbol to the agent' })
      return
    }

    setIsUpdatingAgentSymbols(true)
    try {
      console.log('[Pickaboo] Updating agent symbols:', { selectedAgent, symbols })

      const response = await fetch('/api/pickaboo/update-agent-symbols', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: connectedAddress,
          agent_id: selectedAgent,
          symbols: symbols,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('[Pickaboo] Update failed:', data)
        setMessage({ type: 'error', text: data.error || data.message || 'Failed to update agent symbols' })
        return
      }

      console.log('[Pickaboo] Successfully updated symbols:', data)
      setMessage({ type: 'success', text: `✅ ${selectedAgent}: ${symbols.join(', ')} added to trading list` })
      
      // Refresh both current symbols and agent symbols list to ensure persistence is verified
      setTimeout(() => {
        console.log('[Pickaboo] Refreshing symbol data to verify persistence...')
        fetchCurrentSymbols()
        loadAgentSymbols()
      }, 500)
    } catch (error: any) {
      console.error('[Pickaboo] Error updating agent symbols:', error)
      setMessage({ type: 'error', text: error?.message || 'Failed to update agent symbols' })
    } finally {
      setIsUpdatingAgentSymbols(false)
    }
  }

  // Load agent prompts from database
  const loadAgentPrompts = async () => {
    if (!authenticated || !connectedAddress) return
    
    setIsLoadingPrompts(true)
    try {
      const response = await fetch(`/api/pickaboo/agent-prompts?wallet=${connectedAddress}`)
      const data = await response.json()

      if (data.success && data.agent_prompts) {
        console.log('[Pickaboo] Loaded agent prompts:', data.agent_prompts)
        setAgentPrompts(data.agent_prompts)
      }
    } catch (error) {
      console.error('[Pickaboo] Error loading agent prompts:', error)
    } finally {
      setIsLoadingPrompts(false)
    }
  }

  // Update agent prompt
  const handleUpdatePrompt = async () => {
    if (!selectedPromptAgent || !promptEditText.trim()) {
      setMessage({ type: 'error', text: 'Please select an agent and enter a prompt' })
      return
    }

    setIsUpdatingPrompt(true)
    try {
      const agent = agentList.find(a => a.id === selectedPromptAgent)
      
      const response = await fetch('/api/pickaboo/agent-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: connectedAddress,
          agent_id: selectedPromptAgent,
          agent_name: agent?.name || selectedPromptAgent,
          new_prompt: promptEditText.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to update prompt' })
        return
      }

      setMessage({ type: 'success', text: `Yayyy! prompt updated for ${agent?.name} get a kiss 💋` })
      
      // Reload prompts to reflect changes
      setTimeout(() => {
        loadAgentPrompts()
      }, 500)
    } catch (error: any) {
      console.error('[Pickaboo] Error updating prompt:', error)
      setMessage({ type: 'error', text: error?.message || 'Failed to update prompt' })
    } finally {
      setIsUpdatingPrompt(false)
    }
  }

  // Handle agent prompt selection
  const handleSelectPromptAgent = (agentId: string) => {
    setSelectedPromptAgent(agentId)
    setPromptEditText('')
  }

  // Fetch waitlist entries and stats
  const fetchWaitlistData = async () => {
    setIsLoadingWaitlist(true)
    try {
      // Fetch entries
      const entriesResponse = await fetch(`/api/pickaboo/waitlist?wallet=${connectedAddress}&limit=100&interest=${waitlistFilter === 'all' ? '' : waitlistFilter}`)
      const entriesData = await entriesResponse.json()

      if (entriesData.success) {
        setWaitlistEntries(entriesData.entries || [])
      }

      // Fetch stats
      const statsResponse = await fetch(`/api/pickaboo/waitlist?wallet=${connectedAddress}&stats=true`)
      const statsData = await statsResponse.json()

      if (statsData.success) {
        setWaitlistStats(statsData.stats)
      }
    } catch (error) {
      console.error('Error fetching waitlist data:', error)
      setMessage({ type: 'error', text: 'Failed to load waitlist data' })
    } finally {
      setIsLoadingWaitlist(false)
    }
  }

  // Remove from waitlist
  const handleRemoveFromWaitlist = async (email: string) => {
    if (!confirm(`Remove ${email} from waitlist?`)) return

    try {
      const response = await fetch(`/api/pickaboo/waitlist?email=${encodeURIComponent(email)}&wallet=${connectedAddress}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: `Removed ${email} from waitlist` })
        fetchWaitlistData()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to remove from waitlist' })
      }
    } catch (error) {
      console.error('Error removing from waitlist:', error)
      setMessage({ type: 'error', text: 'Failed to remove from waitlist' })
    }
  }

  // Initialize agent symbols from current symbols on load
  useEffect(() => {
    if (Object.keys(currentSymbols).length > 0 && Object.keys(agentSymbols).length === 0) {
      const initial: Record<string, string[]> = {}
      agentList.forEach(agent => {
        initial[agent.id] = currentSymbols[agent.id] ? [currentSymbols[agent.id]] : []
      })
      setAgentSymbols(initial)
    }
  }, [currentSymbols])

  // Fetch funding history
  const fetchFundingHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const response = await fetch(`/api/pickaboo/funding-history?wallet=${connectedAddress}&limit=20`)
      const data = await response.json()

      if (data.success) {
        setFundingHistory(data.history || [])
      }
    } catch (error) {
      console.error('Error fetching funding history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Export history as CSV (exclude dry-run transactions)
  const exportHistory = () => {
    const headers = ['Agent ID', 'Agent Name', 'Amount', 'Status', 'TX Hash', 'Error', 'Date']
    const rows = fundingHistory
      .filter(h => !h.dry_run) // Exclude dry-run transactions
      .map(h => [
        h.agent_id,
        h.agent_name || '',
        h.amount,
        h.status,
        h.tx_hash || '',
        h.error_message || '',
        new Date(h.created_at).toLocaleString(),
      ])

    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `funding-history-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!authenticated) {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <AnimatedBackground />
        <div className="relative z-10 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 relative">
                <Image
                  src="/aster-icon.png"
                  alt="Pickaboo Bull"
                  width={80}
                  height={80}
                  className="drop-shadow-lg"
                />
              </div>
            </div>
            <h1 className="text-4xl font-light text-gray-900 mb-2" style={{ fontFamily: 'JetBrains Mono' }}>
              Pickaboo
            </h1>
            <p className="text-gray-600 font-light">Agent Funding Control Panel</p>
          </div>

          <Card className="border border-gray-300 shadow-lg backdrop-blur-sm bg-white/95">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <Button
                    onClick={handleWalletConnect}
                    disabled={isConnecting}
                    className="w-full bg-gradient-to-r from-stone-700 to-stone-800 hover:from-stone-800 hover:to-stone-900 text-white font-medium py-2.5 transition-all duration-300 transform hover:scale-105 active:scale-95"
                    style={{ fontFamily: 'JetBrains Mono' }}
                  >
                    <Wallet className="mr-2 h-4 w-4" />
                    {isConnecting ? 'Connecting Wallet...' : 'Connect Wallet'}
                  </Button>
                </div>

                {connectedAddress && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-xs text-gray-600 mb-1" style={{ fontFamily: 'JetBrains Mono' }}>Connected Wallet:</p>
                    <p className="text-sm font-mono text-green-800 break-all" style={{ fontFamily: 'JetBrains Mono' }}>
                      {connectedAddress}
                    </p>
                  </div>
                )}
              </div>

              {message && (
                <Alert className={`mt-4 border-0 ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}>
                  <AlertDescription className="text-sm" style={{ fontFamily: 'JetBrains Mono' }}>
                    {message.text}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-xs text-gray-500 mt-8" style={{ fontFamily: 'JetBrains Mono' }}>
            Web3 Wallet Verification Required
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen p-6">
      <AnimatedBackground />
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-16 h-16 relative">
                <Image
                  src="/aster-icon.png"
                  alt="Pickaboo Bull"
                  width={64}
                  height={64}
                  className="drop-shadow-md"
                />
              </div>
              <div>
                <h1 className="text-5xl font-light text-gray-900 mb-1" style={{ fontFamily: 'JetBrains Mono' }}>
                  Pickaboo
                </h1>
                <p className="text-gray-600 font-light text-sm" style={{ fontFamily: 'JetBrains Mono' }}>
                  Agent Funding & Trading Configuration
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all"
            style={{ fontFamily: 'JetBrains Mono' }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Message Alert */}
        {message && (
          <Alert className={`mb-6 border-0 backdrop-blur-sm ${
            message.type === 'success'
              ? 'bg-green-50/80 text-green-800'
              : 'bg-red-50/80 text-red-800'
          }`}>
            <AlertDescription className="text-sm font-medium" style={{ fontFamily: 'JetBrains Mono' }}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="balances" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-sm border border-gray-300 p-1 shadow-sm">
            <TabsTrigger
              value="balances"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-stone-700 data-[state=active]:to-stone-800 data-[state=active]:text-white transition-all"
              style={{ fontFamily: 'JetBrains Mono' }}
            >
              <Zap className="mr-2 h-4 w-4" />
              Balances
            </TabsTrigger>
            <TabsTrigger
              value="config"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-stone-700 data-[state=active]:to-stone-800 data-[state=active]:text-white transition-all"
              style={{ fontFamily: 'JetBrains Mono' }}
            >
              <Settings className="mr-2 h-4 w-4" />
              Config
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-stone-700 data-[state=active]:to-stone-800 data-[state=active]:text-white transition-all"
              style={{ fontFamily: 'JetBrains Mono' }}
            >
              <History className="mr-2 h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger
              value="prompts"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-stone-700 data-[state=active]:to-stone-800 data-[state=active]:text-white transition-all"
              style={{ fontFamily: 'JetBrains Mono' }}
            >
              <Settings className="mr-2 h-4 w-4" />
              Prompts
            </TabsTrigger>
            <TabsTrigger
              value="waitlist"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-stone-700 data-[state=active]:to-stone-800 data-[state=active]:text-white transition-all"
              style={{ fontFamily: 'JetBrains Mono' }}
              onClick={() => fetchWaitlistData()}
            >
              <Users className="mr-2 h-4 w-4" />
              Waitlist
            </TabsTrigger>
          </TabsList>

          {/* Agent Balances Tab - Real Data from Asterdex */}
          <TabsContent value="balances" className="space-y-6">
            <Card className="border border-gray-300 shadow-lg backdrop-blur-sm bg-white/95">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-2xl text-gray-900 font-light" style={{ fontFamily: 'JetBrains Mono' }}>
                    Agent Account Balances
                  </CardTitle>
                  <CardDescription className="text-gray-600">Real-time account equity & trading data from Asterdex • All funds are in agent signer wallets</CardDescription>
                </div>
                <Button
                  onClick={() => fetchAgentBalances()}
                  disabled={isLoadingAgentBalances}
                  className="bg-gradient-to-r from-stone-700 to-stone-800 hover:from-stone-800 hover:to-stone-900 text-white transition-all transform hover:scale-105 active:scale-95"
                  style={{ fontFamily: 'JetBrains Mono' }}
                >
                  {isLoadingAgentBalances ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Manual Refresh
                    </>
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                {agentBalances.length === 0 ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-stone-700 mb-3" />
                    <p className="text-gray-500" style={{ fontFamily: 'JetBrains Mono' }}>
                      Loading agent balances from Asterdex...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {agentBalances.map(agent => (
                      <div
                        key={agent.agent_id}
                        className="p-4 bg-gray-50/50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors space-y-3"
                      >
                        {/* Agent Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {agent.status === 'success' ? (
                              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                            )}
                            <div>
                              <p className="font-semibold text-gray-900" style={{ fontFamily: 'JetBrains Mono' }}>
                                {agent.agent_name}
                              </p>
                              <p className="text-xs text-gray-500 font-light" style={{ fontFamily: 'JetBrains Mono' }}>
                                {agent.agent_id}
                              </p>
                            </div>
                          </div>
                          {agent.positions_count > 0 && (
                            <span className="text-xs font-medium text-stone-700 bg-stone-100 px-2 py-1 rounded">
                              {agent.positions_count} position{agent.positions_count > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {/* Signer Address */}
                        {agent.agent_signer !== 'N/A' && (
                          <div className="pt-2 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-gray-600 font-light" style={{ fontFamily: 'JetBrains Mono' }}>
                                Signer Address
                              </p>
                              <button
                                onClick={() => copyToClipboard(agent.agent_signer, agent.agent_signer)}
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
                              >
                                {copiedSigner === agent.agent_signer ? (
                                  <>
                                    <Check className="h-3 w-3" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" />
                                    Copy
                                  </>
                                )}
                              </button>
                            </div>
                            <p className="text-xs text-gray-700 font-mono bg-gray-100 px-2 py-1 rounded mt-1 break-all">
                              {agent.agent_signer}
                            </p>
                          </div>
                        )}

                        {/* Balance Details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-gray-200">
                          <div>
                            <p className="text-xs text-gray-600 font-light" style={{ fontFamily: 'JetBrains Mono' }}>
                              💰 Account Equity
                            </p>
                            <p className="text-lg font-bold text-green-600" style={{ fontFamily: 'JetBrains Mono' }}>
                              {agent.status === 'error' ? 'N/A' : `$${agent.wallet_balance.toFixed(2)}`}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 font-light" style={{ fontFamily: 'JetBrains Mono' }}>
                              📈 Unrealized P&L
                            </p>
                            <p className={`text-sm font-semibold ${agent.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`} style={{ fontFamily: 'JetBrains Mono' }}>
                              {agent.status === 'error' ? 'N/A' : `${agent.unrealized_pnl >= 0 ? '+' : ''}$${agent.unrealized_pnl.toFixed(2)}`}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 font-light" style={{ fontFamily: 'JetBrains Mono' }}>
                              📊 Active Positions
                            </p>
                            <p className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'JetBrains Mono' }}>
                              {agent.status === 'error' ? 'N/A' : `${agent.positions_count}`}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 font-light" style={{ fontFamily: 'JetBrains Mono' }}>
                              📉 Total ROI
                            </p>
                            <p className={`text-sm font-semibold ${agent.total_roi >= 0 ? 'text-green-600' : 'text-red-600'}`} style={{ fontFamily: 'JetBrains Mono' }}>
                              {agent.status === 'error' ? 'N/A' : `${agent.total_roi >= 0 ? '+' : ''}${agent.total_roi.toFixed(2)}%`}
                            </p>
                          </div>
                        </div>

                        {/* Error Message */}
                        {agent.status === 'error' && agent.error && (
                          <div className="pt-2 border-t border-gray-200">
                            <p className="text-xs text-red-600 flex items-center gap-2" style={{ fontFamily: 'JetBrains Mono' }}>
                              <XCircle className="h-3 w-3 flex-shrink-0" />
                              {agent.error}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configuration Tab */}
          <TabsContent value="config" className="space-y-6">
            <Card className="border border-gray-300 shadow-lg backdrop-blur-sm bg-white/95">
              <CardHeader>
                <CardTitle className="text-2xl text-gray-900 font-light" style={{ fontFamily: 'JetBrains Mono' }}>
                  Agent Trading Symbols
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Per-Agent Multi-Symbol Configuration */}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg mb-4" style={{ fontFamily: 'JetBrains Mono' }}>
                      Per-Agent Trading Symbols
                    </h3>
                    <p className="text-sm text-gray-600 mb-4" style={{ fontFamily: 'JetBrains Mono' }}>
                      Assign multiple trading symbols to each agent. Each agent can now trade different symbols simultaneously.
                    </p>
                  </div>

                  {/* Agent Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900" style={{ fontFamily: 'JetBrains Mono' }}>
                      Select Agent
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {agentList.map(agent => (
                        <button
                          key={agent.id}
                          onClick={() => {
                            setSelectedAgent(agent.id)
                            setSymbolSearchQueryPerAgent('')
                          }}
                          className={`p-3 rounded-lg border transition-all font-medium text-sm ${
                            selectedAgent === agent.id
                              ? 'bg-stone-700 text-white border-stone-800'
                              : 'bg-white border-gray-300 text-gray-700 hover:border-stone-300 hover:bg-stone-50'
                          }`}
                          style={{ fontFamily: 'JetBrains Mono' }}
                        >
                          {agent.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Symbol Management for Selected Agent */}
                  {selectedAgent && (
                    <div className="space-y-3 p-4 bg-stone-50 rounded-lg border border-stone-200">
                      <h4 className="font-semibold text-gray-900" style={{ fontFamily: 'JetBrains Mono' }}>
                        {agentList.find(a => a.id === selectedAgent)?.name} - Trading Symbols
                      </h4>

                      {/* Add Symbol Input */}
                      <div className="space-y-2">
                        <Input
                          type="text"
                          placeholder="Search & add symbols... (e.g., BTC, ETH)"
                          value={symbolSearchQueryPerAgent}
                          onChange={e => setSymbolSearchQueryPerAgent(e.target.value)}
                          className="bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:ring-stone-500 focus:border-stone-500"
                          style={{ fontFamily: 'JetBrains Mono' }}
                        />

                        {/* Symbol Options */}
                        {symbolSearchQueryPerAgent.length > 0 && (
                          <div className="border border-gray-300 rounded-lg bg-white overflow-hidden max-h-48 overflow-y-auto">
                            {supportedSymbols
                              .filter(s => s.toLowerCase().includes(symbolSearchQueryPerAgent.toLowerCase()))
                              .map(symbol => (
                                <button
                                  key={symbol}
                                  onClick={() => handleAddSymbolToAgent(symbol)}
                                  disabled={(agentSymbols[selectedAgent] || []).includes(symbol)}
                                  className={`w-full text-left px-4 py-2 hover:bg-stone-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                                    (agentSymbols[selectedAgent] || []).includes(symbol)
                                      ? 'bg-green-100 text-green-900'
                                      : 'text-gray-700'
                                  }`}
                                  style={{ fontFamily: 'JetBrains Mono' }}
                                >
                                  {symbol}
                                  {(agentSymbols[selectedAgent] || []).includes(symbol) && ' ✓ Added'}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>

                      {/* Selected Symbols Display */}
                      {(agentSymbols[selectedAgent] || []).length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-900" style={{ fontFamily: 'JetBrains Mono' }}>
                            Trading ({(agentSymbols[selectedAgent] || []).length}):
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {(agentSymbols[selectedAgent] || []).map(symbol => (
                              <div
                                key={symbol}
                                className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-stone-200 hover:border-stone-300 transition-colors"
                              >
                                <span className="font-semibold text-stone-700 text-sm" style={{ fontFamily: 'JetBrains Mono' }}>
                                  {symbol}
                                </span>
                                <button
                                  onClick={() => handleRemoveSymbolFromAgent(symbol)}
                                  className="text-red-600 hover:text-red-700 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Update Button */}
                      <Button
                        onClick={handleUpdateAgentSymbols}
                        disabled={isUpdatingAgentSymbols || (agentSymbols[selectedAgent] || []).length === 0}
                        className="w-full bg-gradient-to-r from-stone-700 to-stone-800 hover:from-stone-800 hover:to-stone-900 text-white transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                        style={{ fontFamily: 'JetBrains Mono' }}
                      >
                        {isUpdatingAgentSymbols ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Zap className="mr-2 h-4 w-4" />
                            Update {agentList.find(a => a.id === selectedAgent)?.name}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {(Object.keys(agentSymbols).length > 0 || Object.keys(currentSymbols).length > 0) && (
                  <div className="space-y-3 pt-6 border-t border-gray-200">
                    <h3 className="font-semibold text-gray-900 text-lg flex items-center gap-2" style={{ fontFamily: 'JetBrains Mono' }}>
                      Current Trading Symbols (Active)
                    </h3>
                    <p className="text-sm text-gray-600" style={{ fontFamily: 'JetBrains Mono' }}>
                      These symbols are currently configured for each agent to trade
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {agentList.map(agent => {
                        const symbols = agentSymbols[agent.id] || []
                        return (
                          <div
                            key={agent.id}
                            className={`flex flex-col gap-2 p-4 rounded-lg border transition-all ${
                              symbols.length > 0
                                ? 'bg-green-50/50 border-green-300 hover:border-green-400 shadow-sm'
                                : 'bg-gray-50/50 border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <span className="text-gray-900 font-semibold text-sm" style={{ fontFamily: 'JetBrains Mono' }}>
                              {agent.name}
                            </span>
                            {symbols.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {symbols.map(symbol => (
                                  <span
                                    key={symbol}
                                    className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-full shadow-sm"
                                    style={{ fontFamily: 'JetBrains Mono' }}
                                  >
                                    {symbol}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs italic">No symbols configured yet</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card className="border border-gray-300 shadow-lg backdrop-blur-sm bg-white/95">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-2xl text-gray-900 font-light" style={{ fontFamily: 'JetBrains Mono' }}>
                    Funding History
                  </CardTitle>
                  <CardDescription className="text-gray-600">Recent funding transactions and operations</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={exportHistory}
                    disabled={fundingHistory.length === 0}
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all"
                    style={{ fontFamily: 'JetBrains Mono' }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button
                    onClick={() => {
                      if (confirm('Are you sure you want to clear all funding history? This cannot be undone.')) {
                        setFundingHistory([])
                      }
                    }}
                    disabled={fundingHistory.length === 0}
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-900 transition-all"
                    style={{ fontFamily: 'JetBrains Mono' }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear History
                  </Button>
                  <Button
                    onClick={fetchFundingHistory}
                    disabled={isLoadingHistory}
                    className="bg-gradient-to-r from-stone-700 to-stone-800 hover:from-stone-800 hover:to-stone-900 text-white transition-all transform hover:scale-105 active:scale-95"
                    style={{ fontFamily: 'JetBrains Mono' }}
                  >
                    {isLoadingHistory ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {fundingHistory.length === 0 ? (
                  <p className="text-gray-500 text-center py-8" style={{ fontFamily: 'JetBrains Mono' }}>
                    No funding history yet
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-300">
                          <th className="text-left py-3 px-3 text-gray-900 font-semibold" style={{ fontFamily: 'JetBrains Mono' }}>
                            Agent
                          </th>
                          <th className="text-right py-3 px-3 text-gray-900 font-semibold" style={{ fontFamily: 'JetBrains Mono' }}>
                            Amount
                          </th>
                          <th className="text-center py-3 px-3 text-gray-900 font-semibold" style={{ fontFamily: 'JetBrains Mono' }}>
                            Status
                          </th>
                          <th className="text-left py-3 px-3 text-gray-900 font-semibold" style={{ fontFamily: 'JetBrains Mono' }}>
                            Date
                          </th>
                          <th className="text-left py-3 px-3 text-gray-900 font-semibold" style={{ fontFamily: 'JetBrains Mono' }}>
                            Error / TX Hash
                          </th>
                          <th className="text-center py-3 px-3 text-gray-900 font-semibold" style={{ fontFamily: 'JetBrains Mono' }}>
                            Type
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {fundingHistory.map((entry, idx) => (
                          <tr
                            key={`${entry.id}-${idx}`}
                            className="border-b border-gray-200 hover:bg-gray-50/50 transition-colors"
                          >
                            <td className="py-3 px-3 text-gray-900" style={{ fontFamily: 'JetBrains Mono' }}>
                              {entry.agent_name || entry.agent_id}
                            </td>
                            <td className="py-3 px-3 text-right text-gray-900 font-medium" style={{ fontFamily: 'JetBrains Mono' }}>
                              ${entry.amount.toFixed(2)}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                                  entry.status === 'success'
                                    ? 'bg-green-100 text-green-700'
                                    : entry.status === 'failed'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-yellow-100 text-yellow-700'
                                }`}
                                style={{ fontFamily: 'JetBrains Mono' }}
                              >
                                {entry.status === 'success' ? (
                                  <CheckCircle className="h-3 w-3" />
                                ) : entry.status === 'failed' ? (
                                  <XCircle className="h-3 w-3" />
                                ) : (
                                  <AlertTriangle className="h-3 w-3" />
                                )}
                                {entry.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-gray-600 text-xs" style={{ fontFamily: 'JetBrains Mono' }}>
                              {new Date(entry.created_at).toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-gray-500 text-xs font-mono" style={{ fontFamily: 'JetBrains Mono' }}>
                              {entry.status === 'failed' && entry.error_message ? (
                                <div className="flex items-center gap-2 group">
                                  <span className="flex-1 truncate text-red-600 font-medium max-w-xs" title={entry.error_message}>
                                    {entry.error_message.substring(0, 40)}...
                                  </span>
                                </div>
                              ) : entry.tx_hash ? (
                                <div className="flex items-center gap-2 group">
                                  <span className="flex-1 truncate">{entry.tx_hash.slice(0, 12)}...</span>
                                  <button
                                    onClick={() => copyTxHash(entry.tx_hash!)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                                    title="Copy transaction hash"
                                  >
                                    {copiedTxHash === entry.tx_hash ? (
                                      <Check className="h-3 w-3 text-green-600" />
                                    ) : (
                                      <Copy className="h-3 w-3 text-gray-600" />
                                    )}
                                  </button>
                                  {!entry.tx_hash.startsWith('0xdry_') && (
                                    <a
                                      href={getExplorerUrl(entry.tx_hash)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                                      title="View on BinanceScan"
                                    >
                                      <svg className="h-3 w-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    </a>
                                  )}
                                </div>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-3 px-3 text-center text-xs" style={{ fontFamily: 'JetBrains Mono' }}>
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
                                entry.dry_run
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {entry.dry_run ? (
                                  <TestTube className="h-3 w-3" />
                                ) : (
                                  <DollarSign className="h-3 w-3" />
                                )}
                                {entry.dry_run ? 'Dry-Run' : 'Live'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Agent Prompts Tab */}
          <TabsContent value="prompts" className="space-y-6">
            <Card className="border border-gray-300 shadow-lg backdrop-blur-sm bg-white/95">
              <CardHeader>
                <CardTitle className="text-2xl text-gray-900 font-light" style={{ fontFamily: 'JetBrains Mono' }}>
                💋 Agent Trading Prompts 💋
                </CardTitle>
                <CardDescription className="text-gray-600">Customize the trading strategy prompts for each AI agent. Update how each agent thinks and trades.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoadingPrompts ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-stone-700 mb-3" />
                    <p className="text-gray-500" style={{ fontFamily: 'JetBrains Mono' }}>
                      Loading agent prompts...
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Agent Selector */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-900" style={{ fontFamily: 'JetBrains Mono' }}>
                        Select Agent to Edit
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {agentList.map(agent => (
                          <button
                            key={agent.id}
                            onClick={() => handleSelectPromptAgent(agent.id)}
                            className={`p-3 rounded-lg border transition-all font-medium text-sm ${
                              selectedPromptAgent === agent.id
                                ? 'bg-stone-700 text-white border-stone-800 shadow-lg'
                                : 'bg-white border-gray-300 text-gray-700 hover:border-stone-300 hover:bg-stone-50'
                            }`}
                            style={{ fontFamily: 'JetBrains Mono' }}
                          >
                            {agent.name}
                            {agentPrompts[agent.id] && (
                              <span className="block text-xs mt-1 opacity-75">✓ Configured</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Prompt Editor */}
                    {selectedPromptAgent && (
                      <div className="space-y-4 p-4 bg-stone-50 rounded-lg border border-stone-200">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900" style={{ fontFamily: 'JetBrains Mono' }}>
                            {agentList.find(a => a.id === selectedPromptAgent)?.name} - Trading Prompt
                          </h3>
                          <span className="text-xs text-gray-500">
                            {promptEditText.length} characters
                          </span>
                        </div>

                        {/* Two Column Layout: Current Prompt + Editor */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Current Prompt (Left Column) */}
                          {agentPrompts[selectedPromptAgent]?.current_prompt && (
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-gray-700 block" style={{ fontFamily: 'JetBrains Mono' }}>
                                Hey buddy here is your Current Mega Money Making Prompt
                              </label>
                              <div className="w-full h-64 p-3 bg-white border border-green-300 rounded-lg font-mono text-xs text-gray-700 overflow-y-auto whitespace-pre-wrap break-words bg-green-50/30"
                                style={{ fontFamily: 'JetBrains Mono' }}>
                                {agentPrompts[selectedPromptAgent].current_prompt}
                              </div>
                              <p className="text-xs text-gray-500" style={{ fontFamily: 'JetBrains Mono' }}>
                                Last updated: {new Date(agentPrompts[selectedPromptAgent].updated_at).toLocaleString()}
                              </p>
                            </div>
                          )}

                          {/* Edit Area (Right Column) */}
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-700 block" style={{ fontFamily: 'JetBrains Mono' }}>
                              Edit your new prompt for Golden descisions
                            </label>
                            <textarea
                              value={promptEditText}
                              onChange={(e) => setPromptEditText(e.target.value)}
                              placeholder="Enter the trading strategy prompt for this agent..."
                              className="w-full h-64 p-3 bg-white border border-gray-300 rounded-lg font-mono text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent resize-none"
                              style={{ fontFamily: 'JetBrains Mono' }}
                            />
                          </div>
                        </div>

                        {/* Update Button */}
                        <div className="flex gap-2">
                          <Button
                            onClick={handleUpdatePrompt}
                            disabled={isUpdatingPrompt || !promptEditText.trim()}
                            className="bg-gradient-to-r from-stone-700 to-stone-800 hover:from-stone-800 hover:to-stone-900 text-white transition-all transform hover:scale-105 active:scale-95"
                            style={{ fontFamily: 'JetBrains Mono' }}
                          >
                            {isUpdatingPrompt ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                              </>
                            ) : (
                              <>
                                <Check className="mr-2 h-4 w-4" />
                                Save Prompt
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => setPromptEditText(agentPrompts[selectedPromptAgent]?.current_prompt || '')}
                            variant="outline"
                            className="border-gray-300 text-gray-700 hover:bg-gray-50"
                            style={{ fontFamily: 'JetBrains Mono' }}
                            disabled={isUpdatingPrompt}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Reset
                          </Button>
                        </div>

                        {/* Previous Prompt History */}
                        {agentPrompts[selectedPromptAgent]?.previous_prompt && (
                          <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
                            <div className="flex items-center gap-2">
                              <History className="h-4 w-4 text-blue-600" />
                              <h4 className="font-semibold text-blue-900 text-sm" style={{ fontFamily: 'JetBrains Mono' }}>
                                Previous Prompt Version
                              </h4>
                            </div>
                            <p className="text-xs text-blue-700 p-2 bg-white rounded border border-blue-100 font-mono max-h-32 overflow-y-auto whitespace-pre-wrap break-words">
                              {agentPrompts[selectedPromptAgent].previous_prompt}
                            </p>
                            <p className="text-xs text-blue-600" style={{ fontFamily: 'JetBrains Mono' }}>
                              Last updated: {new Date(agentPrompts[selectedPromptAgent].updated_at).toLocaleString()}
                            </p>
                          </div>
                        )}

                        {/* Current Prompt Info */}
                        {agentPrompts[selectedPromptAgent]?.current_prompt && (
                          <div className="mt-6 p-3 bg-green-50 rounded-lg border border-green-200 space-y-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <h4 className="font-semibold text-green-900 text-sm" style={{ fontFamily: 'JetBrains Mono' }}>
                                Current Active Prompt
                              </h4>
                            </div>
                            <p className="text-xs text-gray-600 font-light" style={{ fontFamily: 'JetBrains Mono' }}>
                              Configured by: {agentPrompts[selectedPromptAgent].updated_by}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* No Agent Selected */}
                    {!selectedPromptAgent && (
                      <div className="text-center py-12 bg-stone-50 rounded-lg border-2 border-dashed border-stone-200">
                        <Settings className="h-12 w-12 text-stone-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-light" style={{ fontFamily: 'JetBrains Mono' }}>
                          Select an agent above to start editing their trading prompt
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Waitlist Management Tab */}
          <TabsContent value="waitlist" className="space-y-6">
            <Card className="border border-gray-300 shadow-lg backdrop-blur-sm bg-white/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Waitlist Management
                </CardTitle>
                <CardDescription>View and manage BNBForge waitlist entries</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Statistics */}
                {waitlistStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-blue-50 border border-blue-200">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{waitlistStats.total || 0}</p>
                          <p className="text-xs text-blue-600 mt-1">Total Entries</p>
                        </div>
                      </CardContent>
                    </Card>
                    {Object.entries(waitlistStats.byInterest || {}).map(([interest, count]: [string, any]) => (
                      <Card key={interest} className="bg-purple-50 border border-purple-200">
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-purple-600">{count}</p>
                            <p className="text-xs text-purple-600 mt-1 line-clamp-2">{interest}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Filter and Search */}
                <div className="flex gap-4 flex-wrap items-end">
                  <div className="flex-1 min-w-60">
                    <label className="text-xs font-semibold text-gray-700 block mb-2">Search by Email</label>
                    <Input
                      placeholder="Search entries..."
                      value={waitlistSearchQuery}
                      onChange={(e) => setWaitlistSearchQuery(e.target.value)}
                      className="border-gray-300"
                    />
                  </div>
                  <div className="min-w-48">
                    <label className="text-xs font-semibold text-gray-700 block mb-2">Filter by Interest</label>
                    <Select value={waitlistFilter} onValueChange={setWaitlistFilter}>
                      <SelectTrigger className="border-gray-300">
                        <SelectValue placeholder="All interests" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Interests</SelectItem>
                        <SelectItem value="trader">Trading with AI agents</SelectItem>
                        <SelectItem value="developer">Building AI trading agents</SelectItem>
                        <SelectItem value="researcher">Research & benchmarking</SelectItem>
                        <SelectItem value="investor">Riding The Neural Waves</SelectItem>
                        <SelectItem value="other">Curiosity Killing Me, I'm Just a Cat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => fetchWaitlistData()}
                    disabled={isLoadingWaitlist}
                    className="bg-gradient-to-r from-stone-700 to-stone-800 hover:from-stone-800 hover:to-stone-900"
                  >
                    {isLoadingWaitlist ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                      </>
                    )}
                  </Button>
                </div>

                {/* Entries Table */}
                {isLoadingWaitlist ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
                    <p className="text-gray-500 mt-2">Loading waitlist entries...</p>
                  </div>
                ) : waitlistEntries.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No waitlist entries found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-300 bg-gray-50">
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">Email</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">Name</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">Interest</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">Date Joined</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-700">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {waitlistEntries
                          .filter(entry =>
                            !waitlistSearchQuery ||
                            entry.email.toLowerCase().includes(waitlistSearchQuery.toLowerCase()) ||
                            entry.name.toLowerCase().includes(waitlistSearchQuery.toLowerCase())
                          )
                          .map((entry, idx) => (
                            <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="px-4 py-3 font-mono text-xs text-gray-900">{entry.email}</td>
                              <td className="px-4 py-3 text-gray-800">{entry.name}</td>
                              <td className="px-4 py-3">
                                <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                  {entry.interest}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-600 text-xs">
                                {new Date(entry.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button
                                  onClick={() => handleRemoveFromWaitlist(entry.email)}
                                  variant="outline"
                                  size="sm"
                                  className="border-red-300 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}