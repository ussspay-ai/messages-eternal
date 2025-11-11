/**
 * Buy & Hold Strategy
 * Simple long-term hold - buys $100 of ASTER and holds
 */

import { BaseStrategy, TradeSignal } from "../base-strategy.ts"

export class BuyAndHoldStrategy extends BaseStrategy {
  private buyAmount = 100 // $100 in USDT
  private hasInitialBought = false

  async generateSignal(
    currentPrice: number,
    accountInfo: any,
    positions: any[]
  ): Promise<TradeSignal> {
    try {
      // Check if we already have a position with quantity > 0
      const existingPosition = positions.find(
        (p) => p.symbol === this.config.symbol && p.quantity > 0
      )

      // If we already bought, just hold
      if (this.hasInitialBought || existingPosition) {
        this.hasInitialBought = true
        return {
          action: "HOLD",
          quantity: 0,
          confidence: 1.0,
          reason: `Holding ${this.config.symbol} position (${existingPosition?.quantity || 0} units). B&H strategy active.`,
        }
      }

      // Validate current price before calculation
      if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
        return {
          action: "HOLD",
          quantity: 0,
          confidence: 0,
          reason: `Invalid current price: ${currentPrice}. Cannot calculate buy quantity.`,
        }
      }

      // First time - generate BUY signal
      let buyAmountAdjusted = this.buyAmount
      let quantity = buyAmountAdjusted / currentPrice
      
      // For high-price assets, scale up the buy amount to get at least 0.01 tokens
      if (quantity < 0.01 && currentPrice > 50) {
        // Scale up to get meaningful holdings even for expensive assets
        buyAmountAdjusted = Math.min(currentPrice * 0.5, 500) // Up to $500 for very expensive assets
        quantity = buyAmountAdjusted / currentPrice
      }
      
      // Round to 2 decimal places - respects Aster DEX precision limits for most assets
      // This gives us fractional quantities while staying within API constraints
      const quantityRounded = Math.round(quantity * 100) / 100

      if (!Number.isFinite(quantityRounded) || quantityRounded <= 0) {
        return {
          action: "HOLD",
          quantity: 0,
          confidence: 0,
          reason: `Invalid quantity calculated: ${quantityRounded}. Asset price too high or insufficient equity.`,
        }
      }

      // Add 1% markup to price for BUY orders to ensure DEX tick size validation
      // (BUY orders should be above market price for proper order book positioning)
      const priceWithMarkup = currentPrice * 1.01
      const priceRounded = Math.round(priceWithMarkup * 100) / 100

      // Mark that we've initiated the buy - prevents duplicate BUY signals
      // Even if the order is still pending (not filled), we won't generate another BUY
      this.hasInitialBought = true

      return {
        action: "BUY",
        quantity: quantityRounded,
        price: priceRounded,
        confidence: 1.0,
        reason: `Buy & Hold: Purchasing ${quantityRounded} token(s) (~$${buyAmountAdjusted.toFixed(2)}) at $${priceRounded.toFixed(
          2
        )}. No stop loss or take profit. Holding indefinitely.`,
      }
    } catch (error) {
      console.error("[Buy & Hold] Error generating signal:", error)
      return {
        action: "HOLD",
        quantity: 0,
        confidence: 0,
        reason: "Error in B&H strategy",
      }
    }
  }
}