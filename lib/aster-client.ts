/**
 * Aster Futures API Client
 * Handles authentication and API calls to Aster Finance Futures API V3
 * Mirrors the trading-bots implementation for consistency
 */

import crypto from "crypto"

interface AsterConfig {
  agentId: string // Agent ID string (e.g., "claude_arbitrage")
  signer: string // Signer address for authentication (agent wallet)
  apiSecret?: string // API secret for signing (optional for backwards compatibility)
  user?: string // Main account wallet address (optional)
  // Trading-bots compatible properties (optional)
  agentPrivateKey?: string // Agent's private key for on-chain signing
  userAddress?: string // Main account wallet address
  userApiKey?: string // User API key for REST authentication
  userApiSecret?: string // User API secret for signing
  baseUrl?: string
}

interface AsterPositionsResponse {
  positions: AsterPosition[]
  total_pnl: number
  total_roi: number
  equity: number
}

interface AsterTradesResponse {
  trades: AsterTrade[]
  summary?: {
    win_rate: number
    total_trades: number
    net_pnl: number
  }
}

interface AsterStats {
  // From account endpoint
  equity: number
  total_pnl: number
  total_roi: number
  positions: AsterPosition[]

  // From trades endpoint (optional)
  win_rate?: number
  total_trades?: number
  net_pnl?: number
  trades?: AsterTrade[]
}

interface AsterPosition {
  symbol: string
  positionAmt: number
  initialMargin: number
  maintMargin: number
  unrealizedProfit: number
  entryPrice: number
  maxNotional: number
  liquidationPrice: number
  leverage: number
  isolated: boolean
  side: "LONG" | "SHORT"
  percentage: number
  notional: number
  markPrice: number
  updateTime: number
}

interface AsterTrade {
  symbol: string
  id: string
  orderId: string
  side: "BUY" | "SELL"
  price: number
  qty: number
  realizedPnl: number
  marginAsset: string
  quoteQty: number
  commission: number
  commissionAsset: string
  time: number
  positionSide: "BOTH" | "LONG" | "SHORT"
  buyer: boolean
  maker: boolean
}

interface AsterOrder {
  symbol: string
  orderId: string
  clientOrderId: string
  price: number
  origQty: number
  executedQty: number
  cumQuote: number
  status: "NEW" | "PARTIALLY_FILLED" | "FILLED" | "CANCELED" | "REJECTED" | "EXPIRED"
  timeInForce: "GTC" | "IOC" | "FOK" | "GTX"
  type: "LIMIT" | "MARKET" | "STOP" | "STOP_MARKET" | "TAKE_PROFIT" | "TAKE_PROFIT_MARKET"
  side: "BUY" | "SELL"
  stopPrice: number
  time: number
  updateTime: number
  isWorking: boolean
  origQuoteOrderQty: number
}

export class AsterClient {
  private config: AsterConfig
  private baseUrl: string

  constructor(config: AsterConfig) {
    this.config = {
      baseUrl: "https://fapi.asterdex.com",
      ...config,
    }
    this.baseUrl = this.config.baseUrl!
    
    // Log which agent is trading and from which wallet
    console.log(`\n[AsterClient] Initialized for agent: ${config.agentId}`)
    console.log(`[AsterClient] Trading from signer wallet: ${config.signer}`)
    console.log(`[AsterClient] Using agent-specific API credentials\n`)
  }

  /**
   * Generate timestamp
   */
  private getTimestamp(): number {
    return Date.now()
  }

  /**
   * Generate HMAC-SHA256 signature using simpler method
   * Concatenate all params and sign with secret
   */
  private generateSignature(params: Record<string, any>): string {
    const secret = this.config.apiSecret || this.config.userApiSecret || ""
    if (!secret) {
      throw new Error("API secret not configured. Provide either apiSecret or userApiSecret in config.")
    }
    const sortedKeys = Object.keys(params).sort()
    const totalParams = sortedKeys.map((key) => `${key}=${params[key]}`).join("&")
    return crypto.createHmac("sha256", secret).update(totalParams).digest("hex")
  }

  /**
   * Make authenticated API request to Aster Futures API
   */
  private async request<T>(
    method: "GET" | "POST" | "DELETE" | "PUT",
    endpoint: string,
    params: Record<string, any> = {}
  ): Promise<T> {
    const timestamp = this.getTimestamp()

    // Add timestamp to params
    const allParams: Record<string, any> = {
      ...params,
      timestamp,
    }

    // Generate signature
    const signature = this.generateSignature(allParams)

    // Build query string
    const sortedKeys = Object.keys(allParams).sort()
    const queryString = sortedKeys.map((key) => `${key}=${encodeURIComponent(allParams[key])}`).join("&")

    const url = `${this.baseUrl}${endpoint}?${queryString}&signature=${signature}`

    const apiKey = this.config.userApiKey || this.config.signer
    const options: RequestInit = {
      method,
      headers: {
        "X-MBX-APIKEY": apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "NOF1-Trading-Platform/1.0",
      },
      signal: AbortSignal.timeout(8000), // 8 second timeout to stay within Vercel limits
    }

    try {
      const response = await fetch(url, options)
      return this.handleResponse<T>(response)
    } catch (error) {
      console.error(`[AsterClient] Request failed for ${endpoint}:`, error)
      throw error
    }
  }

  /**
   * Handle API responses
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get("content-type")
    const text = await response.text()

    if (!contentType?.includes("application/json")) {
      console.error(
        `[AsterClient] Expected JSON but received ${contentType}. Status: ${response.status}`
      )
      console.error(`[AsterClient] Response body: ${text.substring(0, 300)}`)
      throw new Error(
        `Aster API Error: Expected JSON but received ${contentType}. Response: ${text.substring(0, 200)}`
      )
    }

    // Log the response status and length for debugging
    if (!response.ok) {
      console.error(`[AsterClient] API returned status ${response.status}`)
    }

    let data
    try {
      data = JSON.parse(text)
    } catch (e) {
      throw new Error(`Failed to parse JSON response: ${text.substring(0, 200)}`)
    }

    if (!response.ok) {
      throw new Error(`Aster API Error: ${data.msg || response.statusText}`)
    }

    return data as T
  }

  /**
   * Parse account data from Aster API response
   * Pulls equity and P&L data directly from Asterdex API response
   */
  private parseAccountData(account: any): AsterStats {
    // Log the full raw response for debugging
    console.log(`[AsterClient.parseAccountData] Full API response:`, JSON.stringify(account, null, 2))
    
    // Helper function to safely convert values to numbers
    const toNumber = (value: any): number => {
      if (value === null || value === undefined) return 0
      if (typeof value === 'number') return value
      if (typeof value === 'string') {
        const parsed = parseFloat(value)
        return isNaN(parsed) ? 0 : parsed
      }
      return 0
    }

    // Parse positions from account response
    const positions: AsterPosition[] = []
    if (account.positions && Array.isArray(account.positions)) {
      for (const pos of account.positions) {
        const positionAmt = toNumber(pos.positionAmt)
        if (positionAmt !== 0) {
          const unrealizedProfit = toNumber(pos.unrealizedProfit)
          positions.push({
            symbol: pos.symbol,
            positionAmt: positionAmt,
            initialMargin: toNumber(pos.initialMargin),
            maintMargin: toNumber(pos.maintMargin),
            unrealizedProfit: unrealizedProfit,
            entryPrice: toNumber(pos.entryPrice),
            maxNotional: toNumber(pos.maxNotional),
            liquidationPrice: toNumber(pos.liquidationPrice),
            leverage: toNumber(pos.leverage) || 1,
            isolated: pos.isolated || false,
            side: pos.positionSide as "LONG" | "SHORT",
            percentage: toNumber(pos.percentage),
            notional: toNumber(pos.notional),
            markPrice: toNumber(pos.markPrice),
            updateTime: pos.updateTime || 0,
          })
        }
      }
    }

    // Get balance and P&L data directly from Asterdex API response
    // These fields represent the actual account state on Asterdex
    const totalWalletBalance = toNumber(account.totalWalletBalance)
    const totalUnrealizedProfit = toNumber(account.totalUnrealizedProfit || 0)
    const totalCrossCollateral = toNumber(account.totalCrossCollateral || 0)
    
    // Equity is the total wallet balance + unrealized profits (what Asterdex shows as account equity)
    const equity = totalWalletBalance + totalUnrealizedProfit

    console.log(`[AsterClient.parseAccountData] Parsed values:`, {
      totalWalletBalance,
      totalUnrealizedProfit,
      totalCrossCollateral,
      calculatedEquity: equity,
      positionsCount: positions.length,
    })

    // Return stats using Asterdex API values directly
    return {
      equity,
      total_pnl: totalUnrealizedProfit + totalCrossCollateral,
      total_roi: totalWalletBalance > 0 ? (totalUnrealizedProfit / totalWalletBalance) * 100 : 0,
      positions,
    }
  }

  /**
   * Get account stats by fetching account data
   */
  async getStats(): Promise<AsterStats> {
    return this.getAccountInfo()
  }

  /**
   * Get account information from /fapi/v1/account endpoint
   */
  async getAccountInfo(): Promise<AsterStats> {
    try {
      console.log(`[AsterClient] Fetching account info from /fapi/v1/account`)
      const account = await this.request<any>("GET", "/fapi/v1/account")
      console.log(`[AsterClient] Account info received, parsing...`)
      return this.parseAccountData(account)
    } catch (error) {
      console.error("[AsterClient] Error fetching account info:", error)
      throw error
    }
  }

  /**
   * Get open positions
   */
  async getPositions(): Promise<AsterPositionsResponse> {
    try {
      const account = await this.request<any>("GET", "/fapi/v1/account")
      const stats = this.parseAccountData(account)
      return {
        positions: stats.positions,
        total_pnl: stats.total_pnl,
        total_roi: stats.total_roi,
        equity: stats.equity,
      }
    } catch (error) {
      console.error("[AsterClient] Error fetching positions:", error)
      throw error
    }
  }

  /**
   * Get trade history from /fapi/v1/trades endpoint
   */
  async getTrades(symbol?: string, limit: number = 100): Promise<AsterTradesResponse> {
    try {
      const params: Record<string, any> = { limit }
      if (symbol) {
        params.symbol = symbol
      }

      const trades = await this.request<AsterTrade[]>("GET", "/fapi/v1/trades", params)

      // Calculate win rate and PnL summary
      let winCount = 0
      let totalTrades = trades.length
      let netPnl = 0

      for (const trade of trades) {
        if (trade.realizedPnl > 0) winCount++
        netPnl += trade.realizedPnl
      }

      const winRate = totalTrades > 0 ? winCount / totalTrades : 0

      return {
        trades,
        summary: {
          win_rate: winRate,
          total_trades: totalTrades,
          net_pnl: netPnl,
        },
      }
    } catch (error) {
      console.error("[AsterClient] Error fetching trades:", error)
      throw error
    }
  }

  /**
   * Get all orders for a symbol
   */
  async getAllOrders(symbol: string, limit: number = 500): Promise<AsterOrder[]> {
    try {
      return this.request<AsterOrder[]>("GET", "/fapi/v1/allOrders", {
        symbol,
        limit,
      })
    } catch (error) {
      console.error("[AsterClient] Error fetching all orders:", error)
      throw error
    }
  }

  /**
   * Get open orders
   */
  async getOpenOrders(symbol?: string): Promise<AsterOrder[]> {
    try {
      const params: Record<string, any> = {}
      if (symbol) {
        params.symbol = symbol
      }
      return this.request<AsterOrder[]>("GET", "/fapi/v1/openOrders", params)
    } catch (error) {
      console.error("[AsterClient] Error fetching open orders:", error)
      throw error
    }
  }

  /**
   * Get mark price for a symbol (simpler alternative to market price)
   */
  async getMarkPrice(symbol: string): Promise<{ symbol: string; markPrice: string }> {
    try {
      const result = await this.request<any>("GET", "/fapi/v1/premiumIndex", { symbol })
      return {
        symbol: result.symbol,
        markPrice: result.markPrice,
      }
    } catch (error) {
      console.error("[AsterClient] Error fetching mark price:", error)
      throw error
    }
  }

  /**
   * Get position risk information (alternative to account)
   */
  async getPositionRisk(symbol?: string): Promise<any[]> {
    try {
      const params: Record<string, any> = {}
      if (symbol) {
        params.symbol = symbol
      }
      return this.request<any[]>("GET", "/fapi/v1/positionRisk", params)
    } catch (error) {
      console.error("[AsterClient] Error fetching position risk:", error)
      throw error
    }
  }

  /**
   * Get WebSocket listen key for user data streams
   */
  async getListenKey(): Promise<{ listenKey: string }> {
    try {
      return this.request<{ listenKey: string }>("POST", "/fapi/v1/listenKey")
    } catch (error) {
      console.error("[AsterClient] Error getting listen key:", error)
      throw error
    }
  }

  /**
   * Keep WebSocket listen key alive
   */
  async keepListenKeyAlive(listenKey: string): Promise<void> {
    try {
      await this.request<void>("PUT", "/fapi/v1/listenKey", { listenKey })
    } catch (error) {
      console.error("[AsterClient] Error keeping listen key alive:", error)
      throw error
    }
  }

  /**
   * Close WebSocket listen key
   */
  async closeListenKey(listenKey: string): Promise<void> {
    try {
      await this.request<void>("DELETE", "/fapi/v1/listenKey", { listenKey })
    } catch (error) {
      console.error("[AsterClient] Error closing listen key:", error)
      throw error
    }
  }

  /**
   * Place an order
   */
  async placeOrder(params: {
    symbol: string
    side: "BUY" | "SELL"
    type: "LIMIT" | "MARKET" | "STOP_MARKET" | "TAKE_PROFIT_MARKET"
    timeInForce?: "GTC" | "IOC" | "FOK"
    quantity: number
    price?: number
    stopPrice?: number
    positionSide?: "BOTH" | "LONG" | "SHORT"
  }): Promise<AsterOrder> {
    try {
      return this.request<AsterOrder>("POST", "/fapi/v1/order", {
        symbol: params.symbol,
        side: params.side,
        type: params.type,
        timeInForce: params.timeInForce,
        quantity: params.quantity,
        price: params.price,
        stopPrice: params.stopPrice,
        positionSide: params.positionSide,
      })
    } catch (error) {
      console.error("[AsterClient] Error placing order:", error)
      throw error
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(symbol: string, orderId: string): Promise<AsterOrder> {
    try {
      return this.request<AsterOrder>("DELETE", "/fapi/v1/order", {
        symbol,
        orderId,
      })
    } catch (error) {
      console.error("[AsterClient] Error canceling order:", error)
      throw error
    }
  }

  /**
   * Change leverage for a symbol
   */
  async changeLeverage(symbol: string, leverage: number): Promise<any> {
    try {
      return this.request<any>("POST", "/fapi/v1/leverage", {
        symbol,
        leverage,
      })
    } catch (error) {
      console.error("[AsterClient] Error changing leverage:", error)
      throw error
    }
  }

  /**
   * Get current server time
   */
  async getServerTime(): Promise<number> {
    try {
      const result = await fetch(`${this.baseUrl}/fapi/v1/time`)
      const data = await result.json() as { serverTime: number }
      return data.serverTime
    } catch (error) {
      console.error("[AsterClient] Error getting server time:", error)
      throw error
    }
  }

  /**
   * Get exchange information (symbols, limits, etc.)
   * Public endpoint - no authentication needed
   */
  async getExchangeInfo(): Promise<any> {
    try {
      const result = await fetch(`${this.baseUrl}/fapi/v1/exchangeInfo`)
      if (!result.ok) throw new Error(`HTTP ${result.status}`)
      return await result.json()
    } catch (error) {
      console.error("[AsterClient] Error fetching exchange info:", error)
      throw error
    }
  }

  /**
   * Get list of supported trading symbols
   */
  async getSupportedSymbols(): Promise<string[]> {
    try {
      const info = await this.getExchangeInfo()
      if (!info.symbols || !Array.isArray(info.symbols)) {
        return ['ASTERUSDT']
      }
      // Filter for USDT perpetual futures
      return info.symbols
        .filter((s: any) => s.symbol.endsWith('USDT') && s.status === 'TRADING')
        .map((s: any) => s.symbol)
        .sort()
    } catch (error) {
      console.error("[AsterClient] Error getting supported symbols:", error)
      // Return default symbols on error
      return ['ASTERUSDT', 'ETHUSDT', 'BTCUSDT']
    }
  }

  /**
   * Get wallet balance (available balance for trading)
   */
  async getWalletBalance(): Promise<number> {
    try {
      const account = await this.request<any>("GET", "/fapi/v1/account")
      
      // Get available balance for USDT
      if (account.balances) {
        const usdt = account.balances.find((b: any) => b.asset === 'USDT')
        if (usdt) {
          return parseFloat(usdt.free) + parseFloat(usdt.locked)
        }
      }
      
      // Fallback to total wallet balance
      return parseFloat(account.totalWalletBalance || 0)
    } catch (error) {
      console.error("[AsterClient] Error fetching wallet balance:", error)
      throw error
    }
  }

  /**
   * Transfer USDT from this account to another address
   * 
   * NOTE: Aster DEX API does NOT support programmatic transfers between wallets
   * The only transfer method available is the withdraw endpoint, which requires:
   * - EIP712 signature (manual signing required)
   * - Withdrawal fees
   * - Withdrawal processing delays
   * 
   * For agent funding, manually transfer USDT on BNB Chain using your wallet:
   * 1. Send $50 USDT to each agent's signer wallet address
   * 2. Verify balances appear in Aster dashboard (they query on-chain balance)
   * 
   * Agent Signer Addresses (from .env):
   * - AGENT_1_SIGNER
   * - AGENT_2_SIGNER
   * - AGENT_3_SIGNER
   * - AGENT_4_SIGNER
   * - AGENT_5_SIGNER
   */
  async transferUSDT(toAddress: string, amount: number): Promise<{ txHash: string; status: string }> {
    const message = `[AsterClient] ⚠️ Transfer not supported via API (${amount} USDT to ${toAddress})`
    console.log(message)
    console.log(`[AsterClient] 💡 Use a wallet to manually send USDT on BNB Chain instead`)
    
    // Return informational response
    return {
      txHash: `manual_transfer_required_${Date.now()}`,
      status: 'requires_manual_blockchain_transfer',
    }
  }
}

export default AsterClient