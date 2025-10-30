/**
 * Web3 Icons CDN URLs
 * Alternative to React components for simple image-based icon usage
 * Source: https://www.web3icons.io/
 */

const WEB3ICONS_CDN = "https://cdn.jsdelivr.net/gh/0xa3k5/web3icons@latest"

export type IconVariant = "mono" | "branded" | "background"

/**
 * Get the CDN URL for a token icon
 * @param symbol - Token symbol (e.g., 'BTC', 'ETH')
 * @param variant - Icon style variant
 * @returns Full CDN URL to the icon SVG
 */
export function getTokenIconUrl(symbol: string, variant: IconVariant = "branded"): string {
  const normalized = symbol.toLowerCase()
  return `${WEB3ICONS_CDN}/tokens/${variant}/${normalized}.svg`
}

/**
 * Get the CDN URL for a network icon
 * @param networkName - Network name (e.g., 'ethereum', 'solana')
 * @param variant - Icon style variant
 * @returns Full CDN URL to the icon SVG
 */
export function getNetworkIconUrl(networkName: string, variant: IconVariant = "branded"): string {
  const normalized = networkName.toLowerCase()
  return `${WEB3ICONS_CDN}/networks/${variant}/${normalized}.svg`
}

/**
 * Get the CDN URL for a wallet icon
 * @param walletName - Wallet name (e.g., 'metamask', 'coinbase')
 * @param variant - Icon style variant
 * @returns Full CDN URL to the icon SVG
 */
export function getWalletIconUrl(walletName: string, variant: IconVariant = "branded"): string {
  const normalized = walletName.toLowerCase()
  return `${WEB3ICONS_CDN}/wallets/${variant}/${normalized}.svg`
}

/**
 * Get the CDN URL for an exchange icon
 * @param exchangeName - Exchange name (e.g., 'uniswap', 'binance')
 * @param variant - Icon style variant
 * @returns Full CDN URL to the icon SVG
 */
export function getExchangeIconUrl(exchangeName: string, variant: IconVariant = "branded"): string {
  const normalized = exchangeName.toLowerCase()
  return `${WEB3ICONS_CDN}/exchanges/${variant}/${normalized}.svg`
}

/**
 * Predefined icon URLs for common tokens
 */
export const COMMON_TOKEN_ICONS = {
  BTC: getTokenIconUrl("BTC"),
  ETH: getTokenIconUrl("ETH"),
  SOL: getTokenIconUrl("SOL"),
  BNB: getTokenIconUrl("BNB"),
  DOGE: getTokenIconUrl("DOGE"),
  XRP: getTokenIconUrl("XRP"),
  USDT: getTokenIconUrl("USDT"),
  USDC: getTokenIconUrl("USDC"),
  ADA: getTokenIconUrl("ADA"),
  AVAX: getTokenIconUrl("AVAX"),
  MATIC: getTokenIconUrl("MATIC"),
  OP: getTokenIconUrl("OP"),
  ARB: getTokenIconUrl("ARB"),
  LTC: getTokenIconUrl("LTC"),
  BCH: getTokenIconUrl("BCH"),
  ETC: getTokenIconUrl("ETC"),
  LINK: getTokenIconUrl("LINK"),
  UNI: getTokenIconUrl("UNI"),
  AAVE: getTokenIconUrl("AAVE"),
} as const