/**
 * Real Risk Metrics Calculator
 * Calculates actual risk metrics from trade history and account snapshots
 */

interface TradeData {
  realizedPnl: number
  time: number
  commission?: number
}

interface HistoricalSnapshot {
  timestamp: string
  account_value: number
  total_pnl: number
  return_percent: number
}

interface RiskMetrics {
  maxDrawdown: number // negative percentage
  volatility: number // percentage
  sortinoRatio: number
  calmarRatio: number
  sharpeRatio: number
  returnPercent: number
}

/**
 * Calculate Max Drawdown from historical account values
 * Formula: (Peak - Trough) / Peak
 * Returns negative value (e.g., -0.25 for 25% drawdown)
 */
export function calculateMaxDrawdown(snapshots: HistoricalSnapshot[]): number {
  if (!snapshots || snapshots.length < 2) {
    return 0
  }

  // Sort by timestamp ascending
  const sorted = [...snapshots].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  let peak = sorted[0].account_value
  let maxDrawdown = 0

  for (const snapshot of sorted) {
    if (snapshot.account_value > peak) {
      peak = snapshot.account_value
    }
    const drawdown = (snapshot.account_value - peak) / peak
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown
    }
  }

  return maxDrawdown
}

/**
 * Calculate daily returns volatility
 * Formula: Standard deviation of daily returns
 */
export function calculateVolatility(snapshots: HistoricalSnapshot[]): number {
  if (!snapshots || snapshots.length < 2) {
    return 0
  }

  // Sort by timestamp ascending
  const sorted = [...snapshots].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  // Calculate daily returns
  const returns: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const prevValue = sorted[i - 1].account_value
    const currValue = sorted[i].account_value
    if (prevValue > 0) {
      const dailyReturn = (currValue - prevValue) / prevValue
      returns.push(dailyReturn)
    }
  }

  if (returns.length === 0) {
    return 0
  }

  // Calculate standard deviation
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / returns.length
  const stdDev = Math.sqrt(variance)

  // Annualize (252 trading days)
  return stdDev * Math.sqrt(252) * 100
}

/**
 * Calculate Sortino Ratio
 * Formula: (Return - RiskFreeRate) / Downside Deviation
 * Assumes 0% risk-free rate for simplicity
 */
export function calculateSortinoRatio(
  snapshots: HistoricalSnapshot[],
  returnPercent: number
): number {
  if (!snapshots || snapshots.length < 2) {
    return 0
  }

  // Sort by timestamp ascending
  const sorted = [...snapshots].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  // Calculate daily returns
  const returns: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const prevValue = sorted[i - 1].account_value
    const currValue = sorted[i].account_value
    if (prevValue > 0) {
      const dailyReturn = (currValue - prevValue) / prevValue
      returns.push(dailyReturn)
    }
  }

  if (returns.length === 0) {
    return 0
  }

  // Calculate downside deviation (only negative returns)
  const downReturns = returns.filter((r) => r < 0)
  if (downReturns.length === 0) {
    // No downside risk, return high ratio
    return (returnPercent / 100 > 0 ? 5 : 0)
  }

  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length
  const downsideVariance = downReturns.reduce((sq, n) => {
    const excess = Math.min(n - meanReturn, 0)
    return sq + excess * excess
  }, 0) / returns.length

  const downsideDeviation = Math.sqrt(downsideVariance)

  // Annualize
  const annualReturn = (returnPercent / 100) * Math.sqrt(252)
  const annualDownsideDeviation = downsideDeviation * Math.sqrt(252)

  if (annualDownsideDeviation === 0) {
    return 0
  }

  return annualReturn / annualDownsideDeviation
}

/**
 * Calculate Calmar Ratio
 * Formula: Annual Return / |Max Drawdown|
 */
export function calculateCalmarRatio(
  maxDrawdown: number,
  returnPercent: number,
  daysActive: number
): number {
  if (maxDrawdown === 0 || daysActive === 0) {
    return 0
  }

  // Annualize return
  const annualReturn = (returnPercent / 100) * (365 / daysActive)

  // Calmar ratio uses absolute value of max drawdown
  const absMaxDrawdown = Math.abs(maxDrawdown)
  if (absMaxDrawdown === 0) {
    return 0
  }

  return annualReturn / absMaxDrawdown
}

/**
 * Calculate Sharpe Ratio
 * Formula: (Return - RiskFreeRate) / Volatility
 * Assumes 0% risk-free rate for simplicity
 */
export function calculateSharpeRatio(
  volatilityPercent: number,
  returnPercent: number,
  daysActive: number
): number {
  if (volatilityPercent === 0 || daysActive === 0) {
    return 0
  }

  // Annualize return
  const annualReturn = (returnPercent / 100) * (365 / daysActive)

  // Convert volatility from percentage to decimal
  const volatilityDecimal = volatilityPercent / 100

  if (volatilityDecimal === 0) {
    return 0
  }

  return annualReturn / volatilityDecimal
}

/**
 * Calculate all risk metrics from historical data
 */
export function calculateAllRiskMetrics(
  snapshots: HistoricalSnapshot[],
  currentReturnPercent: number
): RiskMetrics {
  if (!snapshots || snapshots.length < 2) {
    return {
      maxDrawdown: 0,
      volatility: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      sharpeRatio: 0,
      returnPercent: currentReturnPercent,
    }
  }

  const sorted = [...snapshots].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  const startDate = new Date(sorted[0].timestamp)
  const endDate = new Date(sorted[sorted.length - 1].timestamp)
  const daysActive = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  const maxDrawdown = calculateMaxDrawdown(snapshots)
  const volatility = calculateVolatility(snapshots)
  const sortinoRatio = calculateSortinoRatio(snapshots, currentReturnPercent)
  const calmarRatio = calculateCalmarRatio(maxDrawdown, currentReturnPercent, daysActive)
  const sharpeRatio = calculateSharpeRatio(volatility, currentReturnPercent, daysActive)

  return {
    maxDrawdown: maxDrawdown * 100, // Convert to percentage
    volatility,
    sortinoRatio,
    calmarRatio,
    sharpeRatio,
    returnPercent: currentReturnPercent,
  }
}

/**
 * Alternative calculation using trade-level data when snapshots are sparse
 */
export function calculateMetricsFromTrades(
  trades: TradeData[],
  accountValues: { date: Date; value: number }[],
  initialCapital: number
): RiskMetrics {
  if (!trades || trades.length === 0 || !accountValues || accountValues.length === 0) {
    return {
      maxDrawdown: 0,
      volatility: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      sharpeRatio: 0,
      returnPercent: 0,
    }
  }

  // Sort account values by date
  const sorted = [...accountValues].sort((a, b) => a.date.getTime() - b.date.getTime())

  // Calculate returns from account values
  const snapshots: HistoricalSnapshot[] = sorted.map((av) => ({
    timestamp: av.date.toISOString(),
    account_value: av.value,
    total_pnl: av.value - initialCapital,
    return_percent: ((av.value - initialCapital) / initialCapital) * 100,
  }))

  const finalReturn = ((sorted[sorted.length - 1].value - initialCapital) / initialCapital) * 100

  return calculateAllRiskMetrics(snapshots, finalReturn)
}