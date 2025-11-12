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
        const holdQuantity = existingPosition?.quantity || 0
        const gainsInfo = existingPosition && existingPosition.unrealizedProfit !== undefined
          ? ` Unrealized profit: $${existingPosition.unrealizedProfit.toFixed(2)}`
          : ""
        return {
          action: "HOLD",
          quantity: 0,
          confidence: 1.0,
          reason: `Holding ${this.config.symbol} position (${holdQuantity.toFixed(8)} units). B&H strategy active.${gainsInfo}`,
        }
      }

      // Double-check: if we have no position but hasInitialBought is true, verify there are no filled buy orders
      // This prevents duplicate buys after agent restarts or API sync delays
      if (this.hasInitialBought && !existingPosition) {
        return {
          action: "HOLD",
          quantity: 0,
          confidence: 1.0,
          reason: `Previous BUY order detected but position not yet visible in account. Awaiting API sync...`,
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

      // Conservative price markup based on asset price
      // The Aster DEX has strict spread constraints - buy prices can't exceed market by too much
      // Use very small markups to stay within DEX acceptable range
      let markupPercentage = 0.1 // Start with 0.1% for most assets
      
      if (currentPrice > 500) {
        markupPercentage = 0.5 // 0.5% for very expensive assets like BNB (>$500)
      } else if (currentPrice > 200) {
        markupPercentage = 0.3 // 0.3% for expensive assets ($200-$500)
      } else if (currentPrice > 100) {
        markupPercentage = 0.2 // 0.2% for moderately expensive assets ($100-$200)
      } else if (currentPrice > 50) {
        markupPercentage = 0.15 // 0.15% for lower-priced assets ($50-$100)
      }
      
      // Add markup to price for BUY orders - use minimal markup to respect DEX spread limits
      const priceWithMarkup = currentPrice * (1 + markupPercentage / 100)
      // Use standard rounding to next cent, not ceiling (ceiling was causing violations)
      const priceRounded = Math.round(priceWithMarkup * 100) / 100

      // Mark that we've initiated the buy - prevents duplicate BUY signals
      // Even if the order is still pending (not filled), we won't generate another BUY
      this.hasInitialBought = true

      // For very expensive assets (>$500), use MARKET order to avoid tick size validation issues
      // For cheaper assets, use LIMIT orders with small markup
      const orderType = currentPrice > 500 ? "MARKET" : "LIMIT"
      const orderPrice = orderType === "MARKET" ? undefined : priceRounded
      const priceDisplay = orderType === "MARKET" ? "market price" : `$${priceRounded.toFixed(2)}`
      const markupDisplay = orderType === "MARKET" ? "" : ` (+${markupPercentage}% markup for tick size)`
      
      return {
        action: "BUY",
        quantity: quantityRounded,
        price: orderPrice,
        confidence: 1.0,
        reason: `Buy & Hold: Purchasing ${quantityRounded} token(s) (~$${buyAmountAdjusted.toFixed(2)}) at ${priceDisplay}${markupDisplay}. Holding indefinitely. 🎯`,
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