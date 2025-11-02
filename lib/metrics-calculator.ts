/**
 * Metrics Calculator
 * Utility functions to calculate trading metrics from trades and positions data
 */

export interface TradeData {
  netPnl: number
  commission?: number
  side?: "LONG" | "SHORT"
}

export interface PositionData {
  leverage: number
}

export interface CalculatedMetrics {
  avgLeverage: number
  biggestWin: number
  biggestLoss: number
  winRate: number
  longWinRate: number
  shortWinRate: number
  flatRate: number
  totalFees: number
}

/**
 * Calculate average leverage from open positions
 */
export function calculateAverageLeverage(positions: PositionData[]): number {
  if (positions.length === 0) return 0
  const totalLeverage = positions.reduce((sum, p) => sum + p.leverage, 0)
  return Math.round((totalLeverage / positions.length) * 10) / 10
}

/**
 * Calculate biggest win (most profitable trade)
 */
export function calculateBiggestWin(trades: TradeData[]): number {
  if (trades.length === 0) return 0
  let biggestWin = 0
  for (const trade of trades) {
    if (trade.netPnl > 0 && trade.netPnl > biggestWin) {
      biggestWin = trade.netPnl
    }
  }
  return Math.round(biggestWin * 100) / 100
}

/**
 * Calculate biggest loss (most losing trade)
 */
export function calculateBiggestLoss(trades: TradeData[]): number {
  if (trades.length === 0) return 0
  let biggestLoss = 0
  for (const trade of trades) {
    if (trade.netPnl < 0 && trade.netPnl < biggestLoss) {
      biggestLoss = trade.netPnl
    }
  }
  return Math.round(biggestLoss * 100) / 100
}

/**
 * Calculate win rate percentage (winning trades / total trades)
 */
export function calculateWinRate(trades: TradeData[]): number {
  if (trades.length === 0) return 0
  const winningTrades = trades.filter((t) => t.netPnl > 0)
  return Math.round((winningTrades.length / trades.length) * 100 * 10) / 10
}

/**
 * Calculate total fees paid
 */
export function calculateTotalFees(trades: TradeData[]): number {
  if (trades.length === 0) return 0
  const totalFees = trades.reduce((sum, t) => sum + (t.commission || 0), 0)
  return Math.round(totalFees * 100) / 100
}

/**
 * Calculate long win rate (win rate for LONG trades only)
 */
export function calculateLongWinRate(trades: TradeData[]): number {
  if (trades.length === 0) return 0
  const longTrades = trades.filter((t) => t.side === "LONG")
  if (longTrades.length === 0) return 0
  const winningLongs = longTrades.filter((t) => t.netPnl > 0)
  return Math.round((winningLongs.length / longTrades.length) * 100 * 10) / 10
}

/**
 * Calculate short win rate (win rate for SHORT trades only)
 */
export function calculateShortWinRate(trades: TradeData[]): number {
  if (trades.length === 0) return 0
  const shortTrades = trades.filter((t) => t.side === "SHORT")
  if (shortTrades.length === 0) return 0
  const winningShorts = shortTrades.filter((t) => t.netPnl > 0)
  return Math.round((winningShorts.length / shortTrades.length) * 100 * 10) / 10
}

/**
 * Calculate flat rate (trades that broke even or nearly broke even)
 * Breakeven is defined as trades with netPnl between -1 and 1 (within $1 of breakeven)
 */
export function calculateFlatRate(trades: TradeData[]): number {
  if (trades.length === 0) return 0
  const flatTrades = trades.filter((t) => Math.abs(t.netPnl) <= 1)
  return Math.round((flatTrades.length / trades.length) * 100 * 10) / 10
}

/**
 * Calculate all metrics at once
 */
export function calculateAllMetrics(
  trades: TradeData[],
  positions: PositionData[]
): CalculatedMetrics {
  return {
    avgLeverage: calculateAverageLeverage(positions),
    biggestWin: calculateBiggestWin(trades),
    biggestLoss: calculateBiggestLoss(trades),
    winRate: calculateWinRate(trades),
    longWinRate: calculateLongWinRate(trades),
    shortWinRate: calculateShortWinRate(trades),
    flatRate: calculateFlatRate(trades),
    totalFees: calculateTotalFees(trades),
  }
}