/**
 * Aster PRO API Client for Trading Agents
 * Handles authentication and API calls to Aster PRO API (https://api.asterai.xyz)
 * For agent-based trading at https://github.com/asterdex/api-docs
 */

import { ethers } from "ethers"
import * as crypto from "crypto"

interface AsterConfig {
  agentId: string // Agent ID string (e.g., "Claude", "GPT", "Gemini")
  signer: string // Signer address for authentication (agent wallet address)
  agentPrivateKey: string // Agent's private key for on-chain signing
  userAddress: string // Main account wallet address
  userApiKey: string // User API key for REST authentication
  userApiSecret: string // User API secret for signing
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
  // From positions endpoint
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
  private serverTimeOffset: number = 0 // Offset between client and server time in ms

  constructor(config: AsterConfig) {
    this.config = {
      baseUrl: process.env.ASTER_API_URL || "https://fapi.asterdex.com",
      ...config,
    }
    this.baseUrl = this.config.baseUrl!
    
    // Log which agent is trading and from which wallet
    console.log(`\n[AsterClient] Initialized for agent: ${config.agentId}`)
    console.log(`[AsterClient] Trading from signer wallet: ${config.signer}`)
    console.log(`[AsterClient] Using API credentials for agent signer wallet\n`)
    
    // Log which agent is trading and from which wallet
    console.log(`\n[AsterClient] Initialized for agent: ${config.agentId}`)
    console.log(`[AsterClient] Trading from signer wallet: ${config.signer}`)
    console.log(`[AsterClient] Using API credentials for agent signer wallet\n`)
  }

  /**
   * Sync with server time to handle clock skew
   * This should be called before making authenticated requests
   */
  async syncServerTime(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/fapi/v1/time`)
      const data = (await response.json()) as Record<string, any>
      
      if (data && data.serverTime) {
        const clientTime = Date.now()
        this.serverTimeOffset = data.serverTime - clientTime
        console.log(`[AsterClient] Server time synced. Offset: ${this.serverTimeOffset}ms`)
      }
    } catch (error) {
      console.warn(`[AsterClient] Failed to sync server time:`, error)
      // Continue anyway - the client will retry on 400 errors
    }
  }

  /**
   * Generate timestamp in milliseconds, adjusted for server time offset
   */
  private getTimestamp(): number {
    return Date.now() + this.serverTimeOffset
  }

  /**
   * Generate HMAC-SHA256 signature
   * Aster uses simple HMAC-SHA256: HMAC(totalParams, secretKey)
   * where totalParams = query string + request body
   */
  private hmacSha256(data: string, secret: string): string {
    return crypto.createHmac("sha256", secret).update(data).digest("hex")
  }

  /**
   * Generate signature for authenticated requests
   * Per Aster API docs: uses secretKey as key and totalParams (query + body) as value
   */
  private generateSignature(queryString: string, body: string): string {
    // totalParams = query string + body (concatenated directly)
    const totalParams = queryString || body ? `${queryString}${body}` : ""
    
    // Sign with HMAC-SHA256 using USER API secret
    return this.hmacSha256(totalParams, this.config.userApiSecret)
  }

  /**
   * Sort query params alphabetically by key
   */
  private sortQueryParams(params: Record<string, any>): string {
    if (Object.keys(params).length === 0) return ""

    const entries = Object.entries(params)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => {
        // Check for NaN values and provide helpful error message
        const stringValue = String(v)
        if (stringValue === "NaN" || !Number.isFinite(v) && typeof v === "number") {
          console.error(`[AsterClient] NaN detected in parameter '${k}' with value:`, v)
          throw new Error(
            `Invalid parameter '${k}': received NaN. This usually means a calculation resulted in an invalid number. ` +
            `Check that balance, prices, and quantities are valid positive numbers.`
          )
        }
        return [k, stringValue]
      })
      .sort(([a], [b]) => a.localeCompare(b))

    return entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")
  }

  /**
   * Build endpoint path for Aster Finance Futures API
   * Format: /fapi/v1{path}
   */
  private buildEndpoint(path: string): string {
    return `/fapi/v1${path}`
  }

  /**
   * Make authenticated API request to Aster Finance Futures API with retry logic
   */
  private async request<T>(
    method: "GET" | "POST" | "DELETE" | "PUT",
    endpoint: string,
    params: Record<string, any> = {},
    retryCount: number = 0
  ): Promise<T> {
    try {
      return await this.makeRequest<T>(method, endpoint, params)
    } catch (error: any) {
      // If we get a timestamp error and haven't retried yet, sync and retry
      if (
        retryCount === 0 &&
        error?.message?.includes("Timestamp") &&
        error?.message?.includes("recvWindow")
      ) {
        console.log(`[AsterClient] Timestamp error detected, syncing server time and retrying...`)
        await this.syncServerTime()
        return this.request<T>(method, endpoint, params, retryCount + 1)
      }
      throw error
    }
  }

  /**
   * Internal method to make the actual HTTP request
   */
  private async makeRequest<T>(
    method: "GET" | "POST" | "DELETE" | "PUT",
    endpoint: string,
    params: Record<string, any> = {}
  ): Promise<T> {
    const timestamp = this.getTimestamp()

    // For Aster Finance API, add timestamp and recvWindow to params
    const allParams = {
      timestamp,
      recvWindow: 10000, // Increased from 5000 to 10000ms for more tolerance
      ...params,
    }

    let queryString = ""
    let body = ""

    if (method === "GET" || method === "DELETE") {
      // For GET/DELETE: params go in query string
      queryString = this.sortQueryParams(allParams)
    } else {
      // For POST/PUT: params go in body
      body = this.sortQueryParams(allParams)
    }

    // Generate signature (per Aster API: HMAC-SHA256(totalParams, secretKey) where totalParams = query + body)
    const signature = this.generateSignature(queryString, body)

    const options: RequestInit = {
      method,
      headers: {
        "X-MBX-APIKEY": this.config.userApiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "NOF1-Trading-Platform/1.0",
      },
    }

    let url = ""

    // Add signature to query string for GET/DELETE, body for POST/PUT
    if (method === "GET" || method === "DELETE") {
      const queryWithSig = queryString
        ? `${queryString}&signature=${signature}`
        : `signature=${signature}`
      url = `${this.baseUrl}${endpoint}?${queryWithSig}`
    } else {
      body = body ? `${body}&signature=${signature}` : `signature=${signature}`
      url = `${this.baseUrl}${endpoint}`
      options.body = body
    }

    const response = await fetch(url, options)
    return this.handleResponse<T>(response)
  }

  /**
   * Handle API responses
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get("content-type")
    const text = await response.text()

    if (!contentType?.includes("application/json")) {
      // Log detailed error info for debugging
      console.error(
        `[AsterClient] Expected JSON but received ${contentType}. Status: ${response.status}`
      )
      console.error(`[AsterClient] Response body: ${text.substring(0, 300)}`)
      throw new Error(
        `Aster API Error: Expected JSON but received ${contentType}. Response: ${text.substring(0, 200)}`
      )
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
   * Get account stats by combining positions and trades data
   */
  async getStats(): Promise<AsterStats> {
    return this.getAccountInfo()
  }

  /**
   * Get account information by fetching positions and account data
   * Uses /fapi/v1/account endpoint
   */
  async getAccountInfo(): Promise<AsterStats> {
    try {
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

      // Fetch account data
      const accountData = await this.request<any>(
        "GET",
        this.buildEndpoint("/account")
      )

      // Convert string values to numbers
      const totalWalletBalance = toNumber(accountData.totalWalletBalance)
      const totalUnrealizedProfit = toNumber(accountData.totalUnrealizedProfit)
      const totalCrossCollateral = toNumber(accountData.totalCrossCollateral)

      // Transform to our format
      const stats: AsterStats = {
        equity: totalWalletBalance,
        total_pnl: totalUnrealizedProfit + totalCrossCollateral,
        total_roi: totalWalletBalance > 0 ? (totalUnrealizedProfit / totalWalletBalance) * 100 : 0,
        positions: accountData.positions || [],
      }

      return stats
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

      const accountData = await this.request<any>(
        "GET",
        this.buildEndpoint("/account")
      )

      // Convert string values to numbers
      const totalWalletBalance = toNumber(accountData.totalWalletBalance)
      const totalUnrealizedProfit = toNumber(accountData.totalUnrealizedProfit)

      return {
        positions: accountData.positions || [],
        total_pnl: totalUnrealizedProfit,
        total_roi: totalWalletBalance > 0 ? (totalUnrealizedProfit / totalWalletBalance) * 100 : 0,
        equity: totalWalletBalance,
      }
    } catch (error) {
      console.error("[AsterClient] Error fetching positions:", error)
      throw error
    }
  }

  /**
   * Get trade history
   */
  async getTrades(symbol?: string, limit: number = 100): Promise<AsterTradesResponse> {
    try {
      const params: Record<string, any> = { limit }
      if (symbol) {
        params.symbol = symbol
      }

      const trades = await this.request<any[]>(
        "GET",
        this.buildEndpoint("/userTrades"),
        params
      )

      return {
        trades: trades || [],
        summary: {
          win_rate: 0.5,
          total_trades: trades?.length || 0,
          net_pnl: 0,
        },
      }
    } catch (error) {
      console.error("[AsterClient] Error fetching trades:", error)
      throw error
    }
  }

  /**
   * Get all orders (including filled and canceled)
   */
  async getAllOrders(symbol: string, limit: number = 100): Promise<AsterOrder[]> {
    return this.request<AsterOrder[]>("GET", this.buildEndpoint("/allOrders"), {
      symbol,
      limit,
    })
  }

  /**
   * Get open orders only
   */
  async getOpenOrders(symbol?: string): Promise<AsterOrder[]> {
    return this.request<AsterOrder[]>(
      "GET",
      this.buildEndpoint("/openOrders"),
      symbol ? { symbol } : {}
    )
  }

  /**
   * Get market price for a symbol (extracted from ticker or mark price)
   */
  async getMarketPrice(symbol: string): Promise<{ symbol: string; price: string }> {
    try {
      // Get current market price from ticker
      const ticker = await this.request<any>(
        "GET",
        this.buildEndpoint("/ticker/price"),
        { symbol }
      )

      if (ticker && ticker.price) {
        return { symbol, price: ticker.price }
      }

      throw new Error(`No price data available for ${symbol}`)
    } catch (error) {
      console.error(`[AsterClient] Could not fetch market price for ${symbol}:`, error)
      throw error
    }
  }

  /**
   * Get agent stats/summary
   */
  async getAgentStats(): Promise<any> {
    return this.request<any>("GET", this.buildEndpoint("/stats"))
  }

  /**
   * Get WebSocket listen key for user data streams
   */
  async getListenKey(): Promise<{ listenKey: string }> {
    return this.request<{ listenKey: string }>("POST", this.buildEndpoint("/stream"))
  }

  /**
   * Keep WebSocket listen key alive
   */
  async keepListenKeyAlive(listenKey: string): Promise<void> {
    await this.request<void>("PUT", this.buildEndpoint("/stream"), { listenKey })
  }

  /**
   * Close WebSocket listen key
   */
  async closeListenKey(listenKey: string): Promise<void> {
    await this.request<void>("DELETE", this.buildEndpoint("/stream"), { listenKey })
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
    clientOrderId?: string
  }): Promise<any> {
    return this.request<any>("POST", this.buildEndpoint("/order"), params)
  }

  /**
   * Cancel an order
   */
  async cancelOrder(symbol: string, orderId: string): Promise<any> {
    return this.request<any>("DELETE", this.buildEndpoint("/order"), {
      symbol,
      orderId,
    })
  }

  /**
   * Get order status
   */
  async getOrder(symbol: string, orderId: string): Promise<AsterOrder> {
    return this.request<AsterOrder>("GET", this.buildEndpoint("/order"), {
      symbol,
      orderId,
    })
  }

  /**
   * Close a position
   */
  async closePosition(symbol: string, side: "LONG" | "SHORT"): Promise<any> {
    return this.request<any>("POST", this.buildEndpoint("/position/close"), {
      symbol,
      side,
    })
  }

  /**
   * Update leverage for agent
   */
  async setLeverage(symbol: string, leverage: number): Promise<any> {
    return this.request<any>("POST", this.buildEndpoint("/leverage"), {
      symbol,
      leverage,
    })
  }

  /**
   * Get wallet balance (available balance for trading)
   */
  async getWalletBalance(): Promise<number> {
    try {
      const account = await this.request<any>("GET", this.buildEndpoint("/account"))
      
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