import { TrendingUp, TrendingDown, Zap } from "lucide-react"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { AgentSparkline } from "./agent-sparkline"
import { AgentThinking } from "./agent-thinking"

interface AgentCardProps {
  agent: {
    id: string
    name: string
    model: string
    pnl: number
    roi: number
    status: "active" | "idle"
    trades: number
    color: string
    avatar?: string
  }
  recentPnlHistory?: number[]
  isThinking?: boolean
  thinkingMessage?: string
}

export function AgentCard({ 
  agent, 
  recentPnlHistory = [], 
  isThinking = false,
  thinkingMessage = "" 
}: AgentCardProps) {
  const [lastPnl, setLastPnl] = useState(agent.pnl)
  const [showWinAnimation, setShowWinAnimation] = useState(false)
  const [showLossAnimation, setShowLossAnimation] = useState(false)

  useEffect(() => {
    if (agent.pnl !== lastPnl) {
      if (agent.pnl > lastPnl) {
        setShowWinAnimation(true)
        setTimeout(() => setShowWinAnimation(false), 800)
      } else if (agent.pnl < lastPnl) {
        setShowLossAnimation(true)
        setTimeout(() => setShowLossAnimation(false), 800)
      }
      setLastPnl(agent.pnl)
    }
  }, [agent.pnl, lastPnl])

  const roiHistory = recentPnlHistory.slice(-10) // Last 10 data points

  return (
    <motion.div 
      className="panel p-6 hover:border-accent transition-all duration-300 hover:shadow-md relative overflow-hidden"
      animate={
        showWinAnimation
          ? { boxShadow: ["0 0 0px rgba(34, 197, 94, 0)", "0 0 12px rgba(34, 197, 94, 0.6)", "0 0 0px rgba(34, 197, 94, 0)"] }
          : showLossAnimation
            ? { boxShadow: ["0 0 0px rgba(239, 68, 68, 0)", "0 0 12px rgba(239, 68, 68, 0.6)", "0 0 0px rgba(239, 68, 68, 0)"] }
            : {}
      }
      transition={{ duration: 0.8 }}
    >
      {/* Win/Loss flash background */}
      {showWinAnimation && (
        <motion.div
          className="absolute inset-0 bg-green-500/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        />
      )}
      {showLossAnimation && (
        <motion.div
          className="absolute inset-0 bg-red-500/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        />
      )}

      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3 flex-1">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-sm flex-shrink-0"
            style={{ backgroundColor: agent.color + "20", color: agent.color }}
          >
            {agent.avatar || agent.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">{agent.name}</h3>
            <p className="text-xs text-muted-foreground">{agent.model}</p>
          </div>
        </div>
        <motion.div
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex-shrink-0 ml-2 flex items-center gap-1 ${
            agent.status === "active"
              ? "bg-green-100 text-green-700"
              : "bg-muted text-muted-foreground"
          }`}
          animate={isThinking ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.6, repeat: isThinking ? Infinity : 0 }}
        >
          {isThinking && <Zap className="w-3 h-3" />}
          {agent.status === "active" ? "Active" : "Idle"}
        </motion.div>
      </div>

      {/* Thinking indicator */}
      {isThinking && (
        <AgentThinking isThinking={true} message={thinkingMessage} />
      )}

      <div className="space-y-3 relative z-10">
        {/* Performance sparkline */}
        {roiHistory.length > 1 && (
          <div className="py-2">
            <p className="text-xs text-muted-foreground mb-1">PERFORMANCE</p>
            <AgentSparkline data={roiHistory} color={agent.color} height={24} />
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">PnL</span>
          <motion.div 
            className="flex items-center gap-2"
            animate={showWinAnimation ? { scale: 1.1 } : showLossAnimation ? { scale: 0.95 } : {}}
            transition={{ duration: 0.2 }}
          >
            <span className={`font-medium ${agent.pnl >= 0 ? "text-green-600" : "text-destructive"}`}>
              {agent.pnl >= 0 ? "+" : ""}${agent.pnl.toFixed(2)}
            </span>
            {agent.pnl >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-destructive" />
            )}
          </motion.div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">ROI</span>
          <span className={`font-medium ${agent.roi >= 0 ? "text-green-600" : "text-destructive"}`}>
            {agent.roi >= 0 ? "+" : ""}
            {agent.roi.toFixed(2)}%
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Trades</span>
          <span className="font-medium text-sm">{agent.trades}</span>
        </div>
      </div>
    </motion.div>
  )
}
