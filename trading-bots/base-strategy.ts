/**
 * Base Strategy Class
 * All trading strategies should extend this
 * 
 * Integrated with Supabase for:
 * - Trade execution logging
 * - Signal generation tracking
 * - Agent thinking/analysis logs
 * - Real-time status updates
 * - Decision history
 */

import { AsterClient } from "./lib/aster-client.ts"
import { BinancePriceClient } from "./lib/binance-price-client"
import { 
  saveAgentTrade, 
  saveAgentSignal, 
  saveAgentThinking,
  updateAgentStatus,
  saveAgentDecision,
  saveExitPlan,
  saveAgentChatMessage,
  type AgentTrade,
  type AgentSignal,
  type AgentThinking,
  type AgentStatusRecord,
  type AgentDecisionLog,
  type ExitPlan,
  type AgentChatMessage
} from "./lib/supabase-client.ts"

export interface AgentConfig {
  agentId: string // Agent ID (e.g., "Claude", "GPT", "Gemini")
  name: string
  signerAddress: string
  agentPrivateKey: string // Agent's private key
  userAddress: string
  userApiKey: string // User API key
  userApiSecret: string // User API secret
  symbol: string // e.g., "ETHUSDT"
  model: string // AI model name (e.g., "claude-3-5-sonnet")
  strategy: string // Strategy name (e.g., "arbitrage")
  initialCapital?: number // Initial capital for agent (default: 1000)
}

export interface TradeSignal {
  action: "BUY" | "SELL" | "HOLD"
  quantity: number
  price?: number
  stopLoss?: number
  takeProfit?: number
  confidence: number
  reason: string
}

export interface StrategyState {
  lastSignalTime: number
  position?: {
    symbol: string
    quantity: number
    entryPrice: number
    entryTime: number
  }
  orders: Map<string, any>
}

export abstract class BaseStrategy {
  protected client: AsterClient
  protected priceClient: BinancePriceClient
  protected config: AgentConfig
  protected state: StrategyState
  protected scanIntervalMs: number = 15000 // Check every 15 seconds (reduced from 5s to stay below API rate limits)

  constructor(config: AgentConfig) {
    this.config = config
    this.client = new AsterClient({
      agentId: config.agentId,
      signer: config.signerAddress,
      agentPrivateKey: config.agentPrivateKey,
      userAddress: config.userAddress,
      userApiKey: config.userApiKey,
      userApiSecret: config.userApiSecret,
    })
    this.priceClient = new BinancePriceClient()
    this.state = {
      lastSignalTime: 0,
      orders: new Map(),
    }
  }

  /**
   * Main loop - called periodically
   */
  async run(): Promise<void> {
    try {
      console.log(`[${this.config.name}] Starting trading loop...`)
      
      // Update status to running
      await this.updateStatus('running', 'Trading loop started')
      
      // Sync with server time before making authenticated requests
      await this.client.syncServerTime()

      while (true) {
        try {
          // Get current market and account data
          const stats = await this.client.getAccountInfo()
          // Fetch price from Binance instead of Aster
          const marketPrice = await this.priceClient.getMarketPrice(this.config.symbol)
          const positionsData = await this.client.getPositions()

          // DEBUG: Verify correct symbol and price
          console.log(`[${this.config.name}] 📊 Market Price - Symbol: ${marketPrice.symbol}, Price: ${marketPrice.price}, Requested: ${this.config.symbol}`)
          if (marketPrice.symbol !== this.config.symbol) {
            console.warn(`[${this.config.name}] ⚠️ SYMBOL MISMATCH! Requested: ${this.config.symbol}, Got: ${marketPrice.symbol}`)
          }

          // Log thinking/analysis process
          await this.logThinking('analysis', `Analyzing ${this.config.symbol} at $${marketPrice.price} (from Binance)`, {
            price: parseFloat(marketPrice.price),
            equity: stats.equity,
            openPositions: positionsData.positions.length,
            priceSource: 'binance',
          })

          // Generate trading signal
          const signal = await this.generateSignal(
            parseFloat(marketPrice.price),
            stats,
            positionsData.positions
          )

          // Log signal generation
          await this.logSignal(signal, marketPrice.price)

          // Debug: Show why trades are/aren't being triggered
          if (signal.action === "HOLD") {
            console.log(`[${this.config.name}] 📊 Signal: HOLD - Reason: ${signal.reason}`)
          } else {
            console.log(`[${this.config.name}] 🚀 Signal: ${signal.action} - Qty: ${signal.quantity}, Confidence: ${signal.confidence}%`)
          }

          // Execute trade if signal is generated
          if (signal.action !== "HOLD") {
            await this.executeTrade(signal)
          }

          // Update heartbeat
          await this.updateStatus('running', `Last analysis: ${signal.action}`)

          // Wait before next scan
          await this.sleep(this.scanIntervalMs)
        } catch (error) {
          console.error(`[${this.config.name}] Error in trading loop:`, error)
          await this.logThinking('error', `Error in trading loop: ${error instanceof Error ? error.message : 'Unknown error'}`)
          await this.updateStatus('error', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
          await this.sleep(this.scanIntervalMs)
        }
      }
    } catch (error) {
      console.error(`[${this.config.name}] Fatal error:`, error)
      await this.updateStatus('error', `Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      process.exit(1)
    }
  }

  /**
   * Generate trading signal based on strategy logic
   * Must be implemented by subclasses
   */
  protected abstract generateSignal(
    currentPrice: number,
    stats: any,
    positions: any[]
  ): Promise<TradeSignal>

  /**
   * Execute the trade
   */
  protected async executeTrade(signal: TradeSignal): Promise<void> {
    try {
      console.log(
        `[${this.config.name}] Executing ${signal.action} signal: ${signal.reason} (Confidence: ${signal.confidence})`
      )

      // Update status to trading
      await this.updateStatus('running', `Executing ${signal.action} trade`)

      let orderId: string | undefined

      if (signal.action === "BUY") {
        // Place BUY order - use MARKET if no price specified, otherwise LIMIT
        const orderType = signal.price ? "LIMIT" : "MARKET"
        const orderParams: any = {
          symbol: this.config.symbol,
          side: "BUY",
          type: orderType,
          quantity: signal.quantity,
        }
        
        // Only include price and timeInForce for LIMIT orders
        if (orderType === "LIMIT") {
          orderParams.price = signal.price || 0
          orderParams.timeInForce = "GTC"
        }
        
        const order = await this.client.placeOrder(orderParams)

        orderId = order.orderId
        console.log(`[${this.config.name}] BUY Order placed:`, orderId)

        // Place stop loss if specified
        if (signal.stopLoss) {
          try {
            const slOrder = await this.client.placeOrder({
              symbol: this.config.symbol,
              side: "SELL",
              type: "STOP_MARKET",
              quantity: signal.quantity,
              stopPrice: signal.stopLoss,
            })
            console.log(`[${this.config.name}] Stop Loss order placed:`, slOrder.orderId)
          } catch (error) {
            console.warn(`[${this.config.name}] Failed to place stop loss:`, error)
          }
        }

        // Place take profit if specified
        if (signal.takeProfit) {
          try {
            const tpOrder = await this.client.placeOrder({
              symbol: this.config.symbol,
              side: "SELL",
              type: "TAKE_PROFIT_MARKET",
              quantity: signal.quantity,
              stopPrice: signal.takeProfit,
            })
            console.log(`[${this.config.name}] Take Profit order placed:`, tpOrder.orderId)
          } catch (error) {
            console.warn(`[${this.config.name}] Failed to place take profit:`, error)
          }
        }
      } else if (signal.action === "SELL") {
        // Place SELL order - use MARKET if no price specified, otherwise LIMIT
        const orderType = signal.price ? "LIMIT" : "MARKET"
        const orderParams: any = {
          symbol: this.config.symbol,
          side: "SELL",
          type: orderType,
          quantity: signal.quantity,
        }
        
        // Only include price and timeInForce for LIMIT orders
        if (orderType === "LIMIT") {
          orderParams.price = signal.price || 0
          orderParams.timeInForce = "GTC"
        }
        
        const order = await this.client.placeOrder(orderParams)

        orderId = order.orderId
        console.log(`[${this.config.name}] SELL Order placed:`, orderId)
      }

      // Log trade execution to database
      await this.logTrade(signal, orderId)

      this.state.lastSignalTime = Date.now()
    } catch (error) {
      console.error(`[${this.config.name}] Trade execution failed:`, error)
      await this.logThinking('error', `Trade execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Get account balance
   */
  protected async getBalance(): Promise<number> {
    const account = await this.client.getAccountInfo()
    return account.equity || 0
  }

  /**
   * Get current position for symbol
   */
  protected async getCurrentPosition(symbol: string): Promise<any | null> {
    const positionsData = await this.client.getPositions()
    return positionsData.positions.find((p) => p.symbol === symbol) || null
  }

  /**
   * Log trade execution to Supabase with actual execution details
   * Reconciles order data from Aster to ensure data uniformity
   */
  protected async logTrade(signal: TradeSignal, orderId?: string): Promise<void> {
    try {
      let executedPrice = Number(signal.price) || 0
      let executedQuantity = Number(signal.quantity)
      let orderStatus: 'open' | 'closed' | 'cancelled' | 'error' = 'open'

      // POST-TRADE RECONCILIATION: Fetch actual execution details from Aster
      if (orderId) {
        try {
          const orderDetails = await this.client.getOrder(this.config.symbol, orderId)
          
          // Use actual execution data, not intended data
          const executedQty = Number(orderDetails.executedQty)
          const cumQuote = Number(orderDetails.cumQuote)
          const price = Number(orderDetails.price)
          
          executedPrice = executedQty > 0 
            ? cumQuote / executedQty 
            : price
          executedQuantity = executedQty
          
          // Map Aster status to our status (open | closed | cancelled | error)
          if (orderDetails.status === 'FILLED') {
            orderStatus = 'closed'
          } else if (orderDetails.status === 'PARTIALLY_FILLED') {
            orderStatus = 'open'  // Still open, awaiting more fills
          } else if (orderDetails.status === 'CANCELED') {
            orderStatus = 'cancelled'
          } else if (orderDetails.status === 'REJECTED') {
            orderStatus = 'error'
          }
          
          console.log(
            `[${this.config.name}] Order reconciliation: ` +
            `Intended: ${signal.quantity} @ ${signal.price}, ` +
            `Actual: ${executedQuantity} @ ${executedPrice.toFixed(2)}, ` +
            `Aster Status: ${orderDetails.status} → DB Status: ${orderStatus}`
          )
        } catch (reconciliationError) {
          console.warn(
            `[${this.config.name}] Could not reconcile order details, using intended values:`,
            reconciliationError
          )
          // Fallback to signal data if reconciliation fails
        }
      }

      const trade: AgentTrade = {
        agent_id: this.config.agentId,
        symbol: this.config.symbol,
        side: signal.action as 'BUY' | 'SELL',
        quantity: executedQuantity,
        entry_price: Number(signal.price) || 0,
        executed_price: executedPrice,
        stop_loss: Number(signal.stopLoss) || 0,
        take_profit: Number(signal.takeProfit) || 0,
        reason: signal.reason,
        confidence: signal.confidence,
        status: orderStatus,
        trade_timestamp: new Date().toISOString(),
        order_id: orderId,
      }

      await saveAgentTrade(trade)
      console.log(
        `[${this.config.name}] Trade logged to Supabase: ` +
        `${executedQuantity} ${this.config.symbol} @ ${executedPrice.toFixed(2)}`
      )

      // Save exit plan (TP/SL) if specified
      if (signal.takeProfit || signal.stopLoss) {
        const side = signal.action === 'BUY' ? 'LONG' : 'SHORT'
        const exitPlan: ExitPlan = {
          agent_id: this.config.agentId,
          symbol: this.config.symbol,
          side,
          position_size: executedQuantity,
          entry_price: executedPrice,
          take_profit: Number(signal.takeProfit) || 0,
          stop_loss: Number(signal.stopLoss) || 0,
          confidence: signal.confidence,
          reasoning: signal.reason,
        }

        await saveExitPlan(exitPlan)
        console.log(
          `[${this.config.name}] Exit plan saved: TP=${signal.takeProfit?.toFixed(2)}, SL=${signal.stopLoss?.toFixed(2)}`
        )

        // Announce exit plan in chat
        const baseSymbol = this.config.symbol.replace(/USDT$/, '')
        const chatMessage: AgentChatMessage = {
          agent_id: this.config.agentId,
          agent_name: this.config.name,
          message_type: 'trade_signal',
          symbol: baseSymbol,
          confidence: signal.confidence,
          unrealized_pnl: undefined,
          content: `${side} ${executedQuantity} ${baseSymbol} @ $${executedPrice.toFixed(2)}. Risk-Reward: TP $${signal.takeProfit?.toFixed(2)} / SL $${signal.stopLoss?.toFixed(2)} (${signal.confidence.toFixed(0)}% confidence). Reason: ${signal.reason}`,
          timestamp: new Date().toISOString(),
        }

        await saveAgentChatMessage(chatMessage)
        console.log(`[${this.config.name}] Exit plan announced in chat`)
      }
    } catch (error) {
      console.error(`[${this.config.name}] Failed to log trade:`, error)
      // Log the failed attempt but don't throw - trade already executed
    }
  }

  /**
   * Log signal generation to Supabase
   */
  protected async logSignal(signal: TradeSignal, currentPrice: string): Promise<void> {
    try {
      const dbSignal: AgentSignal = {
        agent_id: this.config.agentId,
        symbol: this.config.symbol,
        action: signal.action,
        confidence: signal.confidence,
        reason: signal.reason,
        signal_timestamp: new Date().toISOString(),
      }

      await saveAgentSignal(dbSignal)
    } catch (error) {
      console.error(`[${this.config.name}] Failed to log signal:`, error)
    }
  }

  /**
   * Log agent thinking/analysis to Supabase
   */
  protected async logThinking(
    type: 'analysis' | 'decision' | 'error' | 'market_analysis',
    content: string,
    context?: Record<string, any>
  ): Promise<void> {
    try {
      const thinking: AgentThinking = {
        agent_id: this.config.agentId,
        thinking_type: type,
        content,
        metadata: context,
        thinking_timestamp: new Date().toISOString(),
      }

      await saveAgentThinking(thinking)
    } catch (error) {
      console.error(`[${this.config.name}] Failed to log thinking:`, error)
    }
  }

  /**
   * Update agent status in real-time
   */
  protected async updateStatus(
    status: 'running' | 'idle' | 'error' | 'paused',
    message?: string
  ): Promise<void> {
    try {
      const stats = await this.getBalance()

      const statusRecord: AgentStatusRecord = {
        agent_id: this.config.agentId,
        name: this.config.name,
        status,
        message,
        last_heartbeat: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      await updateAgentStatus(statusRecord)
    } catch (error) {
      console.error(`[${this.config.name}] Failed to update status:`, error)
    }
  }

  /**
   * Log a decision for analysis/learning
   */
  protected async logDecision(
    decisionType: 'BUY' | 'SELL' | 'HOLD',
    reasoning: string,
    inputData?: Record<string, any>,
    outcome?: 'success' | 'failure' | 'pending'
  ): Promise<void> {
    try {
      const decisionLog: AgentDecisionLog = {
        agent_id: this.config.agentId,
        symbol: this.config.symbol,
        decision: decisionType,
        reasoning,
        confidence: 0.5,
        market_context: inputData,
        decision_timestamp: new Date().toISOString(),
      }

      await saveAgentDecision(decisionLog)
    } catch (error) {
      console.error(`[${this.config.name}] Failed to log decision:`, error)
    }
  }
}