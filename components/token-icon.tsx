"use client"

import { Suspense, lazy, useMemo } from "react"
import { TOKEN_ICON_MAP } from "@/lib/constants/token-icons"

interface TokenIconProps {
  symbol: string
  size?: number
  variant?: "mono" | "branded" | "background"
  className?: string
}

// Cache for dynamically imported icon components
const iconCache: Record<string, React.ComponentType<any>> = {}

// Dynamically get or create icon component
function getIconComponent(iconName: string) {
  if (!iconCache[iconName]) {
    try {
      // Dynamically import the specific icon
      iconCache[iconName] = lazy(() =>
        import("@web3icons/react").then((mod) => {
          const IconComponent = (mod as any)[iconName]
          if (!IconComponent) {
            throw new Error(`Icon ${iconName} not found`)
          }
          return { default: IconComponent }
        })
      )
    } catch (error) {
      console.warn(`Failed to load icon: ${iconName}`, error)
      // Return a null component as fallback
      iconCache[iconName] = () => null
    }
  }
  return iconCache[iconName]
}

const LoadingFallback = ({ size }: { size: number }) => (
  <div 
    className="inline-flex items-center justify-center rounded-full bg-gray-200"
    style={{ width: size, height: size }}
    aria-hidden="true"
  />
)

const TextFallback = ({ symbol, className }: { symbol: string; className: string }) => (
  <span className={`text-xs font-bold text-muted-foreground ${className}`} title={symbol}>
    {symbol.slice(0, 2).toUpperCase()}
  </span>
)

export function TokenIcon({ symbol, size = 24, variant = "branded", className = "" }: TokenIconProps) {
  const iconName = useMemo(() => TOKEN_ICON_MAP[symbol.toUpperCase()], [symbol])

  // If token not supported, show fallback text
  if (!iconName) {
    return <TextFallback symbol={symbol} className={className} />
  }

  // Get the dynamic component
  const IconComponent = useMemo(() => getIconComponent(iconName), [iconName])

  return (
    <Suspense fallback={<LoadingFallback size={size} />}>
      <IconComponent size={size} variant={variant} className={className} />
    </Suspense>
  )
}

export default TokenIcon