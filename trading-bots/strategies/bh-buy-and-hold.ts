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
      // Check if we already have a position
      const existingPosition = positions.find(
        (p) => p.symbol === this.config.symbol
      )

      // If we already bought, just hold
      if (this.hasInitialBought || existingPosition) {
        this.hasInitialBought = true
        return {
          action: "HOLD",
          quantity: 0,
          confidence: 1.0,
          reason: `Holding ASTER position (${existingPosition?.quantity || 0} units). B&H strategy active.`,
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
      
      // For high-price assets, ensure at least 1 token by increasing buy amount
      if (quantity < 1 && currentPrice > 50) {
        // Buy at least 1 token, scaled by price
        buyAmountAdjusted = Math.min(currentPrice * 1.2, 250) // Buy 1-1.2 tokens (or max $250)
        quantity = buyAmountAdjusted / currentPrice
      }
      
      // Round DOWN to whole numbers (0 decimals) for asset precision compatibility
      const quantityRounded = Math.floor(quantity)

      if (!Number.isFinite(quantityRounded) || quantityRounded <= 0) {
        return {
          action: "HOLD",
          quantity: 0,
          confidence: 0,
          reason: `Invalid quantity calculated: ${quantityRounded}. Asset price too high or insufficient equity.`,
        }
      }

      this.hasInitialBought = true

      return {
        action: "BUY",
        quantity: quantityRounded,
        price: currentPrice,
        confidence: 1.0,
        reason: `Buy & Hold: Purchasing ${quantityRounded} token(s) (~$${buyAmountAdjusted.toFixed(2)}) at $${currentPrice.toFixed(
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