"use client"

import { useState, useEffect } from "react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

interface Token {
  symbol: string
  icon: string
  name: string
  active: boolean
}

const ALL_TOKENS: Omit<Token, "active">[] = [
  { symbol: "ASTER", icon: "⭐", name: "Aster Network" },
  { symbol: "BTC", icon: "₿", name: "Bitcoin" },
  { symbol: "ETH", icon: "Ξ", name: "Ethereum" },
  { symbol: "SOL", icon: "◎", name: "Solana" },
  { symbol: "BNB", icon: "⬡", name: "Binance Coin" },
  { symbol: "DOGE", icon: "Ð", name: "Dogecoin" },
  { symbol: "XRP", icon: "✕", name: "Ripple" },
]

export function TokenActivation() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem("activeTokens")
    if (saved) {
      const activeSymbols = JSON.parse(saved)
      setTokens(
        ALL_TOKENS.map((t) => ({
          ...t,
          active: activeSymbols.includes(t.symbol),
        }))
      )
    } else {
      // Default: only ASTER
      setTokens(
        ALL_TOKENS.map((t) => ({
          ...t,
          active: t.symbol === "ASTER",
        }))
      )
    }
  }, [])

  const toggleToken = (symbol: string) => {
    setTokens((prev) =>
      prev.map((t) =>
        t.symbol === symbol
          ? { ...t, active: !t.active }
          : t
      )
    )
    setIsSaved(false)
  }

  const handleSave = () => {
    const activeSymbols = tokens.filter((t) => t.active).map((t) => t.symbol)
    localStorage.setItem("activeTokens", JSON.stringify(activeSymbols))
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

  const activeCount = tokens.filter((t) => t.active).length

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold font-mono mb-2">ACTIVE TRADING TOKENS</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Select which tokens agents can trade. Start with ASTER, activate more as you fund the platform.
        </p>
        
        <div className="bg-muted/30 border-2 border-border p-4 rounded">
          <p className="text-xs font-mono mb-4">
            {activeCount} of {ALL_TOKENS.length} active
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {tokens.map((token) => (
              <button
                key={token.symbol}
                onClick={() => toggleToken(token.symbol)}
                className={`p-3 border-2 rounded transition-all text-left ${
                  token.active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/50"
                }`}
              >
                <div className="text-xs mb-1">{token.icon}</div>
                <div className="font-bold text-xs">{token.symbol}</div>
                <div className="text-[10px] text-muted-foreground">{token.name}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t-2 border-border pt-4">
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary text-primary-foreground border-2 border-primary font-mono text-xs font-bold hover:retro-shadow-sm transition-all"
          >
            {isSaved ? "✓ SAVED" : "SAVE"}
          </button>
          <div className="text-xs text-muted-foreground self-center">
            Agents will only trade selected tokens
          </div>
        </div>
      </div>

      <div className="border-2 border-border/50 p-3 bg-muted/20">
        <div className="text-xs font-mono font-bold mb-2">FUNDING ROADMAP</div>
        <div className="text-[11px] space-y-1 text-muted-foreground">
          <div>🟢 <span className="font-mono">ASTER</span> - Start here</div>
          <div>🟡 <span className="font-mono">BTC + ETH</span> - When funded</div>
          <div>🟠 <span className="font-mono">SOL, BNB, DOGE</span> - Further funded</div>
          <div>🔴 <span className="font-mono">XRP + ALTs</span> - Full production</div>
        </div>
      </div>
    </div>
  )
}