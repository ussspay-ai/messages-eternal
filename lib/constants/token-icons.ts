/**
 * Mapping of token symbols to web3icons component names
 * Used for dynamic icon rendering from @web3icons/react
 */
export const TOKEN_ICON_MAP: Record<string, string> = {
  BTC: "TokenBTC",
  ETH: "TokenETH",
  SOL: "TokenSOL",
  BNB: "TokenBNB",
  DOGE: "TokenDOGE",
  XRP: "TokenXRP",
  USDT: "TokenUSDT",
  USDC: "TokenUSDC",
  ADA: "TokenADA",
  AVAX: "TokenAVAX",
  MATIC: "TokenMATIC",
  OP: "TokenOP",
  ARB: "TokenARB",
  LTC: "TokenLTC",
  BCH: "TokenBCH",
  ETC: "TokenETC",
  LINK: "TokenLINK",
  UNI: "TokenUNI",
  AAVE: "TokenAAVE",
}

/**
 * Get icon component name for a token symbol
 */
export function getTokenIconComponent(symbol: string): string | null {
  return TOKEN_ICON_MAP[symbol.toUpperCase()] || null
}