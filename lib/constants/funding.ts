/**
 * Funding and Capital Constants
 * Used across API routes for consistent capital calculations
 */

/**
 * Initial funding amount for each agent in USDT
 * This is the amount each agent account is funded with
 */
export const AGENT_INITIAL_CAPITAL = 50

/**
 * Default funding configuration
 */
export const DEFAULT_FUNDING_CONFIG = {
  amount: AGENT_INITIAL_CAPITAL,
  dryRun: false,
  maxRetries: 3,
  retryDelayMs: 2000,
}